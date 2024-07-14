import { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody {
  name: string;
  email: string;
  photo: string;
  gender: string;
  _id: string;
  dob: Date;
}

export interface NewProductRequestBody {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  brand:string,
  dealer:string,
  discount?:number
}
export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface NewCategoryRequestBody {
  name: string;
}

export type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;

export type SearchRequestQuery = {
  search?: string;
  price?: string;
  sort?: string;
  page?: string;
  brand?: string;
  discount?: string;
  ratings?: string;
};


export interface BaseQuery {
  name?: {
    $regex: string;
    $options: string;
  };
  price?: { $lte: number };
  brand?: {
    $regex: string;
    $options: string;
  };
  discount?: { $gte: number };
  ratings?: { $gte: number };
}


export type InvalidateCacheProps = {
  product?: boolean;
  order?: boolean;
  admin?: boolean;
  category?: boolean;
  review?: boolean;
  userId?: string;
  orderId?: string;
  productId?: string | string[];
  categoryId?: string | string[];
  reviewId?: string | string[];
};

export type OrderItemType = {
  name: string;
  photo: string;
  price: number;
  quantity: number;
  productId: string;
};

export type Review = {
  rating: number;
  comment: string;
  product: string;
  user: {
    name: string;
    photo: string;
    _id: string;
  };
  _id: string;
};


export type ShippingInfoType = {
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: number;
};

export interface NewOrderRequestBody {
  shippingInfo: ShippingInfoType;
  user: string;
  subtotal: number;
  tax: number;
  shippingCharges: number;
  discount: number;
  total: number;
  orderItems: OrderItemType[];
}
