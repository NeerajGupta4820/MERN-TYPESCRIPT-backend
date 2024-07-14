import { Request } from "express";
import { TryCatch } from "../Middlewares/error.js";
import {BaseQuery,NewProductRequestBody,SearchRequestQuery,} from "../Types/types.js";
import { Product } from "../Models/productModel.js"
import ErrorHandler from "../Utils/utility-class.js"
import { rm } from "fs";
import { myCache } from "../app.js";
import { findAverageRatings, invalidateCache } from "../Utils/features.js"
import slugify from "slugify";
import { Category } from "../Models/categoryModel.js";
import { User } from "../Models/userModel.js";
import { Review } from "../Models/reviewModel.js";
// import { faker } from "@faker-js/faker";

export const getlatestProducts = TryCatch(async (req, res, next) => {
  let products;

  if (myCache.has("latest-products"))
    products = JSON.parse(myCache.get("latest-products") as string);
  else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(8);
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("all-products"))
    products = JSON.parse(myCache.get("all-products") as string);
  else {
     products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getSingleProduct = TryCatch(async (req, res, next) => {
  let product;
  const id = req.params.id;
  if (myCache.has(`product-${id}`))
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  else {
     product = await Product.findById(id);

    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

export const newProduct = TryCatch(
  async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {
    const { name, price, stock, description, category,brand,discount } = req.body;
    const { id: userId } = req.query;
    const photos = req.files as Express.Multer.File[];

    if (!photos || photos.length === 0)
      return next(new ErrorHandler("Please upload at least one photo", 400));

    if (!name || !price || !stock || !description || !category ||!brand) {
      photos.forEach((photo) => {
        rm(photo.path, () => {
          console.log("Deleted");
        });
      });

      return next(new ErrorHandler("All the fields are mandatory", 400));
    }

    const user = await User.findById(userId);
    if (!user) return next(new ErrorHandler("Invalid Credentials", 401));

    const dealer = user.name; // Get the dealer name from the user

    const photoPaths = photos.map((photo) => photo.path);

    const productData: any = {
      name,
      slug: slugify(name),
      price,
      stock,
      description,
      category,
      brand,
      dealer,
      photos: photoPaths,
    };

    if (discount !== undefined) {
      productData.discount = discount;
    }

    await Product.create(productData);

    invalidateCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product Created Successfully",
    });
  }
);

export const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { name, price, stock, description, category, brand,discount  } = req.body;
  const photos = req.files as Express.Multer.File[];
  const product = await Product.findById(id);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  if (photos && photos.length > 0) {
    product.photos.forEach(photo => {
      rm(photo, () => {
        console.log("Old Photo Deleted");
      });
    });
    const photoPaths = photos.map(photo => photo.path);
    product.photos = photoPaths;
  }

  if (name) {
    product.name = name;
    product.slug = slugify(name);
  }
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (description) product.description = description;
  if (category) product.category = category;
  if (brand) product.brand = brand;
  if (discount !== undefined) product.discount = discount;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  product.photos.forEach(photo => {
    rm(photo, () => {
      console.log("Product Photo Deleted");
    });
  });

  await product.deleteOne();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Deleted Successfully",
  });
});

// export const getAllProducts = TryCatch(
//   async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
//     const { search, sort, price } = req.query;

//     const page = Number(req.query.page) || 1;
//     const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
//     const skip = (page - 1) * limit;

//     const baseQuery: BaseQuery = {};

//     if (search)
//       baseQuery.name = {
//         $regex: search,
//         $options: "i",
//       };

//     if (price)
//       baseQuery.price = {
//         $lte: Number(price),
//       };

//     // if (category) baseQuery.category = category;

//     const productsPromise = Product.find(baseQuery)
//       .sort(sort && { price: sort === "asc" ? 1 : -1 })
//       .limit(limit)
//       .skip(skip);

//     const [products, filteredOnlyProduct] = await Promise.all([
//       productsPromise,
//       Product.find(baseQuery),
//     ]);

//     const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

//     return res.status(200).json({
//       success: true,
//       products,
//       totalPage,
//     });
//   }
// );


export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, price, brand, discount, ratings } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};

    if (search) {
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (price) {
      baseQuery.price = {
        $lte: Number(price),
      };
    }
    if (brand) {
      baseQuery.brand = {
        $regex: brand, // Handle brand filter appropriately (e.g., regex search)
        $options: "i",
      };
    }
    
    if (discount) {
      baseQuery.discount = {
        $gte: Number(discount),
      };
    }

    if (ratings) {
      baseQuery.ratings = {
        $gte: Number(ratings),
      };
    }

    const productsPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    const [products, filteredOnlyProduct] = await Promise.all([
      productsPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);



export const productCategoryController = TryCatch(async (req, res, next) => {
  const { slug } = req.params;
  let category;
  let products;

  if (myCache.has(`category-${slug}`) && myCache.has(`products-category-${slug}`)) {
    category = JSON.parse(myCache.get(`category-${slug}`) as string);
    products = JSON.parse(myCache.get(`products-category-${slug}`) as string);
  } else {
    category = await Category.findOne({ slug });
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }
    
    products = await Product.find({ category: category._id }).populate("category")

    myCache.set(`category-${slug}`, JSON.stringify(category));
    myCache.set(`products-category-${slug}`, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    category,
    products,
  });
});

export const searchData = TryCatch(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return res.status(404).json({
      success: false,
      message: "No products found",
    });
  }

  const cacheKey=`search-products-${query}`;
  if(myCache.has(cacheKey)){
    const cachedProducts=JSON.parse(myCache.get(cacheKey) as string);
    return res.status(200).json({
      success:true,
      products:cachedProducts,
    });
  }

  let products = await Product.find({ name: { $regex: query, $options: "i" } });


    const categories = await Category.find({ name: { $regex: query, $options: "i" } });

    if (categories.length > 0) {
      const categoryIds = categories.map(category => category._id);
      products = await Product.find({ category: { $in: categoryIds } });
    }
  

  if (products.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No products found",
    });
  }
  myCache.set(cacheKey,JSON.stringify(products),3600)
  return res.status(200).json({
    success: true,
    products,
  });
});

export const relatedProductController = TryCatch(async (req, res, next) => {
  let relatedProducts;
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const category = await Category.findById(product.category);
  if (!category) {
    return next(new ErrorHandler("Category not found for the product", 404));
  }

  const cacheKey = `related-products-${productId}`;
  if (myCache.has(cacheKey)) {
    const cachedRelatedProducts = JSON.parse(myCache.get(cacheKey) as string);
    return res.status(200).json({
      success: true,
      products: cachedRelatedProducts,
    });
  } else {
    relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    })
      .populate("category")
      .limit(8);
    myCache.set(cacheKey, JSON.stringify(relatedProducts), 3600);
  }

  return res.status(200).json({
    success: true,
    products: relatedProducts,
  });
});




export const allReviewsOfProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const cacheKey = `reviews-${id}`;
  let reviews;

  if (myCache.has(cacheKey)) {
    reviews = JSON.parse(myCache.get(cacheKey) as string);
  } else {
    reviews = await Review.find({ product: id })
      .populate('user', 'name photo')
      .sort({ updatedAt: -1 });
    
    myCache.set(cacheKey, JSON.stringify(reviews), 3600); // Cache for 1 hour
  }

  return res.status(200).json({
    success: true,
    reviews,
  });
});

export const newReview = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.query.id);

  if (!user) return next(new ErrorHandler("Not Logged In", 404));

  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const { comment, rating } = req.body;

  let alreadyReviewed = await Review.findOne({
    user: user._id,
    product: product._id,
  });

  if (alreadyReviewed) {
    alreadyReviewed.comment = comment;
    alreadyReviewed.rating = rating;

    await alreadyReviewed.save();
  } else {
    alreadyReviewed = await Review.create({
      comment,
      rating,
      user: user._id,
      product: product._id,
    });
  }


  const { ratings, numOfReviews } = await findAverageRatings(product._id);
  product.ratings = ratings;
  product.numOfReviews = numOfReviews;
  await product.save();

  await invalidateCache({
    product: true,
    productId: String(product._id),
    review: true,
  });

  return res.status(alreadyReviewed ? 200 : 201).json({
    success: true,
    message: alreadyReviewed ? "Review Updated" : "Review Added",
  });
});

export const deleteReview = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.query.id);

  if (!user) return next(new ErrorHandler("Not Logged In", 404));

  const review = await Review.findById(req.params.id);
  if (!review) return next(new ErrorHandler("Review Not Found", 404));

  const isAuthenticUser = review.user.toString() === user._id.toString();

  if (!isAuthenticUser) return next(new ErrorHandler("Not Authorized", 401));

  await review.deleteOne();

  const product = await Product.findById(review.product);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  const { ratings, numOfReviews } = await findAverageRatings(product._id);

  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  await invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Review Deleted",
  });
});



// const generateRandomProducts = async (count: number = 10) => {
//   const products = [];

//   for (let i = 0; i < count; i++) {
//     const product = {
//       name: faker.commerce.productName(),
//       photo: "uploads\\5ba9bd91-b89c-40c2-bb8a-66703408f986.png",
//       price: faker.commerce.price({ min: 1500, max: 80000, dec: 0 }),
//       stock: faker.commerce.price({ min: 0, max: 100, dec: 0 }),
//       category: faker.commerce.department(),
//       createdAt: new Date(faker.date.past()),
//       updatedAt: new Date(faker.date.recent()),
//       __v: 0,
//     };

//     products.push(product);
//   }

//   await Product.create(products);

//   console.log({ succecss: true });
// };

// const deleteRandomsProducts = async (count: number = 10) => {
//   const products = await Product.find({}).skip(2);

//   for (let i = 0; i < products.length; i++) {
//     const product = products[i];
//     await product.deleteOne();
//   }

//   console.log({ succecss: true });
// };
