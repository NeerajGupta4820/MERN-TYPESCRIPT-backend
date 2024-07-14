import { Request, Response, NextFunction } from "express";
import {Category} from "../Models/categoryModel.js";
import ErrorHandler from "../Utils/utility-class.js";
import { TryCatch } from "../Middlewares/error.js";
import { NewCategoryRequestBody } from "../Types/types.js";
import slugify from "slugify";
import { myCache } from "../app.js";
import { invalidateCache } from "../Utils/features.js";

export const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;

  if (myCache.has("all-categories")) {
    categories = JSON.parse(myCache.get("all-categories") as string);
  } else {
    categories = await Category.find();
    myCache.set("all-categories", JSON.stringify(categories));
  }

  res.status(200).json({
    success: true,
    categories,
  });
});

export const getCategory = TryCatch(async (req, res, next) => {
  let category;
  const slug = req.params.slug;

  if (myCache.has(`category-${slug}`)) {
    category = JSON.parse(myCache.get(`category-${slug}`) as string);
  } else {
    category = await Category.findOne({ slug });
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }
    myCache.set(`category-${slug}`, JSON.stringify(category));
  }

  res.status(200).json({
    success: true,
    category,
  });
});

export const newCategory = TryCatch(
  async (req: Request<{}, {}, NewCategoryRequestBody>, res, next) => {
    const { name } = req.body;

    if (!name) {
      return next(new ErrorHandler("All the fields are mandatory", 400));
    }
  
    const slug = slugify(name);
    const existingCategory = await Category.findOne({ slug });
  
    if (existingCategory) {
      return res.status(200).json({
        success: false,
        message: "Category already exists",
      });
    }
  
    await Category.create({ name, slug });
  
    invalidateCache({ category: true });
  
    return res.status(201).json({
      success: true,
      message: "Category Created Successfully",
    });
  });
  
export const updateCategory = TryCatch(async (req, res, next) => {
  const { name } = req.body;
  const slug = slugify(name);
  const category = await Category.findByIdAndUpdate(req.params.id, { name, slug }, { new: true, runValidators: true });

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  invalidateCache({ category: true, categoryId: req.params.id, admin: true });

  res.status(200).json({
    success: true,
    category,
  });
}); 

export const deleteCategory = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  await category.deleteOne();

  invalidateCache({ category: true, categoryId: req.params.id, admin: true  });

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});