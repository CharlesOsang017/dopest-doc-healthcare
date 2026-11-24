import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { bookAppointment } from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", protect, bookAppointment);

export default router;
