import express from "express";
import { getAllCategories, getCategory, newCategory, updateCategory, deleteCategory } from "../Controllers/categoryController.js";
import { adminOnly } from "../Middlewares/auth.js";

const app = express.Router();

app.get("/", getAllCategories);
app.post("/new", newCategory);

app.get("/:slug", getCategory);
app.put("/:id",adminOnly, updateCategory);
app.delete("/:id",adminOnly, deleteCategory);


export default app;
