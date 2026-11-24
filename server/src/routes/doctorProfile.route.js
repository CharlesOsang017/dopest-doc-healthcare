import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  approveDoctorLicense,
  createDoctorProfile,
  deleteDoctorProfilePhoto,
  getDoctorLicenseStatus,
  getDoctorProfile,
  getPendingDoctorLicenses,
  rejectDoctorLicense,
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
router.get("/admin/pending-licenses", protect, getPendingDoctorLicenses);
router.get("/me/license-status", protect, getDoctorLicenseStatus);
// Administrator: approve a doctor's license
router.patch("/:profileId/license/approve", protect, approveDoctorLicense);
// Administrator: reject a doctor's license
router.patch("/:profileId/license/reject", protect, rejectDoctorLicense);

export default router;
