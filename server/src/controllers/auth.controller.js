import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { registerSchema } from "../schemas.js";

dotenv.config();

const token = jwt.sign(
  { id: User._id, role: User.role },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
);

export const registerUser = async (req, res) => {
  try {
    // 1. Validate request data
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please check your registration details.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, email, password, phone } = validation.data;

    // 2. Check whether the email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: "patient",
    });

    // 6. Return response
    return res.status(201).json({
      success: true,
      message: "Your account has been created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    // Handle duplicate email race conditions
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating your account.",
    });
  }
};
