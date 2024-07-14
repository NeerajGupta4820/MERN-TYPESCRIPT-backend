import { User } from "../Models/userModel.js";
import ErrorHandler from "../Utils/utility-class.js"
import { TryCatch } from "./error.js";

// Middleware to make sure only admin is allowed
export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  if (!id) return next(new ErrorHandler("Login Required", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid Credentials", 401));
  if (user.role !== "admin")
    return next(new ErrorHandler("Bad Request", 403)); 

  next();
});
