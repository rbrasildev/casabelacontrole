import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import residentsRouter from "./residents";
import financesRouter from "./finances";
import inventoryRouter from "./inventory";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";
import usersRouter from "./users";
import storageRouter from "./storage";
import notificationsRouter from "./notifications";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/users", usersRouter);
router.use("/residents", residentsRouter);
router.use("/finances", financesRouter);
router.use("/inventory", inventoryRouter);
router.use("/activities", activitiesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/campaigns", campaignsRouter);
router.use("/contributions", campaignsRouter);
router.use("/notifications", notificationsRouter);
router.use("/settings", settingsRouter);
router.use(storageRouter);

export default router;
