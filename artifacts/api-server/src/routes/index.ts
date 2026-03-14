import { Router, type IRouter } from "express";
import healthRouter from "./health";
import residentsRouter from "./residents";
import financesRouter from "./finances";
import inventoryRouter from "./inventory";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/residents", residentsRouter);
router.use("/finances", financesRouter);
router.use("/inventory", inventoryRouter);
router.use("/activities", activitiesRouter);
router.use("/dashboard", dashboardRouter);

export default router;
