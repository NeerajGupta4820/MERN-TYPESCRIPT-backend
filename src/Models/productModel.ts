import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter Name"],
    },
    slug: {
      type: String,
      required: [true, "Please enter Slug"],
    },
    description: {
      type: String,
      required: [true, "Please enter description"],
      trim: true,
    },
    photos: {
      type: [String],
      required: [true, "Please upload at least one photo"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please enter Category"],
    },
    price: {
      type: Number,
      required: [true, "Please enter Price"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter Stock"],
    },  
    ratings: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    discount:{
      type:Number,
    },
    brand:{
      type:String,
      required:[true,"Please enter dealer name"]
    },
    dealer:{
      type:String,
      required:[true,"Please enter the name of dealer"]
    }
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", schema);
