import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import tablesRouter from "./tables";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import waitersRouter from "./waiters";
import masterRouter from "./master";
import publicRouter from "./public";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicRouter);
router.use(masterRouter);
router.use(authRouter);
router.use(tenantsRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(tablesRouter);
router.use(ordersRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(waitersRouter);

export default router;
