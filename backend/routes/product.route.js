import { Router } from "express";

import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  getAllProducts,
  getFeaturedProducts,
  createProduct,
  deleteProduct,
  getRecommendedProducts,
  toggleFeaturedProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", protectRoute, getAllProducts);

router.get("/featured", getFeaturedProducts);

router.get("/category/:category", getProductsByCategory);

router.get("/recommendations", getRecommendedProducts);

router.post("/create-product", protectRoute, adminRoute, createProduct);

router.patch(
  "/toggle-feature/:id",
  protectRoute,
  adminRoute,
  toggleFeaturedProduct
);

router.delete("/create-product/:id", protectRoute, adminRoute, deleteProduct);

export default router;
