import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
  uploadPatientProfilePhoto,
} from "../controllers/patientProfile.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", protect, createPatientProfile);
router.get("/me", protect, getPatientProfile);
router.patch("/me", protect, updatePatientProfile);
router.post(
  "/me/photo",
  protect,
  upload.single("photo"),
  uploadPatientProfilePhoto,
);
export default router;
