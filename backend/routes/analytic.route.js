import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAnalyticsRoute } from "../controllers/analytic.controller.js";
const router = express.Router();

router.get("/", protectRoute, adminRoute, getAnalyticsRoute);

module.exports = router;
