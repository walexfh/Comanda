import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/public/tenant/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug));

  if (!tenant) {
    res.status(404).json({ error: "Restaurante não encontrado" });
    return;
  }

  res.json(tenant);
});

export default router;
