import PingRoutes from "./ping";
import { Router } from "express";

const router = Router();

router.use("/api", PingRoutes);

export default router;