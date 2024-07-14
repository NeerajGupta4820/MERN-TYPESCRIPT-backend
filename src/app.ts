import express from "express";
import connectDB from "./config/db.js";
import { errorMiddleware } from "./Middlewares/error.js";
import NodeCache from "node-cache";
import { config } from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from "cors";

// Importing Routes
import userRoute from "./Routes/userRoutes.js";
import productRoute from "./Routes/productRoutes.js";
import orderRoute from "./Routes/orderRoutes.js"
import paymentRoute from "./Routes/paymentRoutes.js";
import dashboardRoute from "./Routes/statsRoutes.js"
import categoryRoute from "./Routes/categoryRoutes.js"

config({
  path: "./.env",
});

const port = process.env.PORT || 4000;
const stripeKey = process.env.STRIPE_KEY || "";

connectDB();

export const stripe = new Stripe(stripeKey);
export const myCache = new NodeCache();

const app = express();

app.use(express.json());

app.use(morgan("dev"));
app.use(cors());

app.get("/", (req, res) => {
  res.send("API Working with /api/v1");
});

// Using Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);
app.use("/api/v1/category", categoryRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is Running  on http://localhost:${port}`);
});