import { Router } from "express";
import {
  signup,
  login,
  logout,
  refreshAcessToken,
  getProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/refresh-token", refreshAcessToken);

router.get("/profile", protectRoute, getProfile);

export default router;
