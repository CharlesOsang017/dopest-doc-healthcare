import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createLaboratoryProfile,
  getMyLaboratoryProfile,
  updateLaboratoryProfile,
} from "../controllers/laboratoryProfile.controller.js";

const router = express.Router();

router.post("/", protect, createLaboratoryProfile);
router.get("/me", protect, getMyLaboratoryProfile);
router.patch("/me", protect, updateLaboratoryProfile);

export default router;
