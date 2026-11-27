import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPrescription,
  getMyPrescriptions,
} from "../controllers/prescription.controller.js";

const router = express.Router();

router.post("/", protect, createPrescription);
router.get("/my", protect, getMyPrescriptions);

export default router;
