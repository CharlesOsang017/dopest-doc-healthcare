import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createMedicalRecord,
  getMyMedicalRecords,
} from "../controllers/medicalRecord.controller.js";

const router = express.Router();

router.post("/", protect, createMedicalRecord);
router.get("/my", protect, getMyMedicalRecords);

export default router;
