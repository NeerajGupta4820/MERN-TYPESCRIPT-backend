import mongoose, { Document } from "mongoose";
import { myCache } from "../app.js";
import { Product } from "../Models/productModel.js";
import { InvalidateCacheProps, OrderItemType } from "../Types/types.js";
import { Category } from "../Models/categoryModel.js";
import { Review } from "../Models/reviewModel.js";

export const findAverageRatings = async (productId: mongoose.Types.ObjectId) => {
  let totalRating = 0;

  const reviews = await Review.find({ product: productId });
  reviews.forEach((review) => {
    totalRating += review.rating;
  });

  const averageRating = Math.floor(totalRating / reviews.length) || 0;

  return {
    numOfReviews: reviews.length,
    ratings: averageRating,
  };
};


export const invalidateCache = async({
  product,
  order,
  admin,
  category,
  review,
  userId,
  orderId,
  productId,
  categoryId,
  reviewId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "all-products",
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productId.forEach((i) => productKeys.push(`product-${i}`));
    
     myCache.keys().forEach(key => {
      if (key.startsWith('search-products-')) {
        myCache.del(key);
      }
    });

    if (typeof productId === "string") {
      myCache.del(`related-products-${productId}`);
    } else if (Array.isArray(productId)) {
      productId.forEach((id) => {
        myCache.del(`related-products-${id}`);
      });
    }

    if (typeof categoryId === "string") {
      const category = await Category.findById(categoryId);
      if (category) {
        const slug = category.slug;
        myCache.del(`category-${slug}`);
        myCache.del(`products-category-${slug}`);
      }
    } else if (Array.isArray(categoryId)) {
      for (const id of categoryId) {
        const category = await Category.findById(id);
        if (category) {
          const slug = category.slug;
          myCache.del(`category-${slug}`);
          myCache.del(`products-category-${slug}`);
        }
      }
    }

    myCache.del(productKeys);
  }
  if (category) {
    const categoryKeys: string[] = ["all-categories"];

    if (typeof categoryId === "string") categoryKeys.push(`category-${categoryId}`);
    
    if (typeof categoryId === "object")
      categoryId.forEach((i) => categoryKeys.push(`category-${i}`));
        
    if (Array.isArray(categoryId)) {
      categoryId.forEach((id) => {
        categoryKeys.push(`category-${id}`);
        myCache.del(`products-category-${id}`);
      });
    }


    myCache.del(categoryKeys);
  }
  if (order) {
    const ordersKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];

    myCache.del(ordersKeys);
  }
  if (admin) {
    myCache.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
  }
  if (review) {
    const reviewKeys = Array.isArray(reviewId)
      ? reviewId.map((id) => `reviews-${id}`)
      : [`review-${reviewId}`];

    reviewKeys.forEach((key) => myCache.del(key));
  }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const order = orderItems[i];
    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product Not Found");
    product.stock -= order.quantity;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

interface GetInventoriesParams {
  categories: string[];
  productsCount: number;
}

interface CategoryCount {
  [key: string]: number;
}

export const getInventories = async ({ categories, productsCount }: GetInventoriesParams): Promise<CategoryCount> => {
  const categoriesCountPromise = categories.map((category: string) =>
    Product.countDocuments({ category })
  );

  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: CategoryCount = categories.reduce((acc: CategoryCount, category: string, i: number) => {
    acc[category] = Math.round((categoriesCount[i] / productsCount) * 100);
    return acc;
  }, {});

  return categoryCount;
};

interface MyDocument extends Document {
  createdAt: Date;
  discount?: number | null;
  total?: number;
}
type FuncProps = {
  length: number;
  docArr: MyDocument[];
  today: Date;
  property?: "discount" | "total";
};

export const getChartData = ({length,docArr,today,property,}: FuncProps) => {
  const data: number[] = new Array(length).fill(0);
  docArr.forEach((i) => {
    const creationDate = i.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

    if (monthDiff < length) {
      if (property) {
        data[length - monthDiff - 1] += i[property]!;
      } else {
        data[length - monthDiff - 1] += 1;
      }
    }
  });

  return data;
};
