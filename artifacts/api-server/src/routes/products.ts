import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, productsTable, tenantsTable, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  CreateProductBody,
  UpdateProductBody,
  ListProductsQueryParams,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  GetPublicMenuParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const qp = ListProductsQueryParams.safeParse(req.query);
  const categoryId = qp.success ? qp.data.categoryId ?? null : null;
  const available = qp.success ? qp.data.available ?? null : null;

  let query = db.select().from(productsTable).$dynamic();
  const conditions = [eq(productsTable.tenantId, req.tenantId!)];

  if (categoryId != null) conditions.push(eq(productsTable.categoryId, categoryId));
  if (available != null) conditions.push(eq(productsTable.available, available));

  const products = await query.where(and(...conditions)).orderBy(productsTable.id);
  res.json(products.map((p) => ({ ...p, price: parseFloat(p.price as unknown as string) })));
});

router.post("/products", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      tenantId: req.tenantId!,
      categoryId: parsed.data.categoryId ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: String(parsed.data.price),
      available: parsed.data.available ?? true,
      printSector: parsed.data.printSector ?? null,
    })
    .returning();

  res.status(201).json({ ...product, price: parseFloat(product.price as unknown as string) });
});

router.get("/products/:productId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ ...product, price: parseFloat(product.price as unknown as string) });
});

router.patch("/products/:productId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.available != null) updateData.available = parsed.data.available;
  if (parsed.data.categoryId != null) updateData.categoryId = parsed.data.categoryId;
  if (parsed.data.printSector != null) updateData.printSector = parsed.data.printSector;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.productId))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ ...product, price: parseFloat(product.price as unknown as string) });
});

router.delete("/products/:productId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.productId));
  res.sendStatus(204);
});

// Public menu — no auth
router.get("/menu/:tenantSlug", async (req, res): Promise<void> => {
  const params = GetPublicMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, params.data.tenantSlug));
  if (!tenant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const [categories, products] = await Promise.all([
    db.select().from(categoriesTable).where(eq(categoriesTable.tenantId, tenant.id)).orderBy(categoriesTable.sortOrder),
    db.select().from(productsTable).where(and(eq(productsTable.tenantId, tenant.id), eq(productsTable.available, true))).orderBy(productsTable.id),
  ]);

  res.json({
    tenant,
    categories,
    products: products.map((p) => ({ ...p, price: parseFloat(p.price as unknown as string) })),
  });
});

export default router;
