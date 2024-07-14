import express from "express";
import { adminOnly } from "../Middlewares/auth.js";
import {allReviewsOfProduct,deleteProduct,deleteReview,getAdminProducts,getAllProducts,
  getlatestProducts,getSingleProduct,newProduct,newReview,productCategoryController,relatedProductController,searchData,
  updateProduct,} from "../Controllers/productController.js";
import { multipleUpload } from "../Middlewares/multer.js";

const app = express.Router();

app.post("/new",multipleUpload,adminOnly,newProduct);
app.get("/all", getAllProducts);
app.get("/latest", getlatestProducts);
app.get("/admin-products", adminOnly, getAdminProducts);
app.get("/search-data", searchData);
app.get("/product-category/:slug", productCategoryController);
app.get("/:id",getSingleProduct)
app.get('/related-products/:productId', relatedProductController);
app.put("/:id",adminOnly, multipleUpload, updateProduct)
app.delete("/:id",adminOnly, deleteProduct);

app.get("/review/:id", allReviewsOfProduct);
app.post("/review/new/:id", newReview);
app.delete("/deletereview/:id", deleteReview);


export default app;
