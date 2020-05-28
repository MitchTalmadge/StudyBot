import { Router } from "express";
import verificationRoutes from "./verification";

const router = Router();

router.use("/api", verificationRoutes);

export default router;