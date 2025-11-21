import Product from "../models/product.model.js";
import { redisClient } from "../lib/redis-client.lib.js";
import cloudinaryClient from "../lib/cloudinary.config.js";

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redisClient.set(
      "featured_products",
      JSON.stringify(featuredProducts)
    );
  } catch (error) {
    console.log("error in update cache function");
  }
}

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redisClient.get("featured_products");
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }
    // if not in redis, fetch from db
    // .lean() returns plain js object instead of mongo document, which is good for performance
    featuredProducts = await Product.find({ isFeatured: true }).lean();
    if (!featuredProducts) {
      res.status(404).josn({ message: "No featured products found" });
    }

    // store in redis
    await redisClient.set(
      "featured_products",
      JSON.stringify(featuredProducts)
    );

    res.json(featuredProducts);
  } catch (error) {
    console.log("Error in getFeaturedProducts controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category: category });
    res.json(products);
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          image: 1,
          price: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    let { name, description, price, image, category } = req.body;
    let cloudinaryResponse = null;
    if (image) {
      cloudinaryResponse = (
        await cloudinaryClient.uploader.upload(image, {
          folder: "products",
        })
      ).secure_url;
      // debug
      console.log(cloudinaryResponse);
    }
    const newProduct = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse ? [cloudinaryResponse] : [],
      category,
    });

    res.json(201).json(newProduct);
  } catch (error) {
    console.log("Error in createProduct controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();
    await updateFeaturedProductsCache();

    res.json(updatedProduct);
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.image && product.image.length > 0) {
      const publicIds = product.image.map(
        (url) => url.split("/").pop().split(".")[0]
      );
      try {
        const results = await Promise.allSettled(
          publicIds.map((id) =>
            cloudinaryClient.uploader.destroy(`products/${id}`)
          )
        );
        results.forEach((res, index) => {
          if (res.status === "fulfilled") {
            console.log(`Image ${publicIds[index]} deleted successfully`);
          } else {
            console.log(
              `Error deleting image ${publicIds[index]}:`,
              res.reason
            );
          }
        });
      } catch (error) {
        console.log("error deleting images from cloudinary, ", error);
      }
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Error in deleteProduct controller", error.message);
    res.status(500).josn({ message: "Internal server error" });
  }
};
