import { Router, type IRouter } from "express";

import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import marketplaceRouter from "./marketplace";
import mediaRouter from "./media";
import supportRouter from "./support";
import storefrontsRouter from "./storefronts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(marketplaceRouter);
router.use(mediaRouter);
router.use(supportRouter);
router.use(storefrontsRouter);

export default router;
