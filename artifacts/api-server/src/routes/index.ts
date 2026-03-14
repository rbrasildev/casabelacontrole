import { Router, type IRouter } from "express";
import healthRouter from "./health";
import residentsRouter from "./residents";
import financesRouter from "./finances";
import inventoryRouter from "./inventory";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/residents", residentsRouter);
router.use("/finances", financesRouter);
router.use("/inventory", inventoryRouter);
router.use("/activities", activitiesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/campaigns", campaignsRouter);
router.use("/contributions", campaignsRouter);

export default router;
