import express from "express";
import {
  changePassword,
  deactivateAccount,
  getCurrentUser,
  loginUser,
  logoutUser,
  reactivateAccount,
  registerUser,
  updateUserProfile,
} from "../controllers/auth.controller.js";
import { authorizeRoles, protect } from "../middleware/auth.middleware.js";
import { createPatientProfile } from "../controllers/patientProfile.controller.js";

const router = express.Router();

// public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// protected routes
router.get("/me", protect, getCurrentUser);
router.patch("/profile", protect, updateUserProfile);
router.patch("/change-password", protect, changePassword);
router.post("/logout", protect, logoutUser);
router.patch("/deactivate", protect, deactivateAccount);
router.patch(
  "/reactivate/:userId",
  protect,
  authorizeRoles("admin"),
  reactivateAccount,
);

// Example role-restricted route
router.get("/admin-only", protect, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the admin area.",
  });
});

export default router;
