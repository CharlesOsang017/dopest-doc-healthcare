import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createDoctorProfile,
  deleteDoctorProfilePhoto,
  getDoctorProfile,
  updateDoctorProfile,
  uploadDoctorProfilePhoto,
} from "../controllers/doctorProfile.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", protect, createDoctorProfile);
router.get("/me", protect, getDoctorProfile);
router.patch("/me", protect, updateDoctorProfile);
router.post(
  "/me/photo",
  protect,
  upload.single("photo"),
  uploadDoctorProfilePhoto,
);
router.delete("/me/photo", protect, deleteDoctorProfilePhoto);
export default router;
