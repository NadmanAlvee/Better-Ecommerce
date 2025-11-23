import { Router } from "express";
const router = Router();

import { protectRoute } from "../middleware/auth.middleware.js";
import { getCoupon, validateCoupon } from "../controllers/coupon.controller.js";

router.get("/", protectRoute, getCoupon);

router.get("/validate", protectRoute, validateCoupon);

export default router;
