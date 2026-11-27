import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";
import patientProfileRoutes from "./routes/patientProfile.route.js";
import doctorProfileRoutes from "./routes/doctorProfile.route.js";
import doctorAvailabilityRoutes from "./routes/doctorAvailability.route.js";
import appointmentRoutes from "./routes/appointment.route.js";
import medicalRecordRoutes from "./routes/medicalRecord.route.js";
import prescriptionRoutes from "./routes/prescription.route.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Dopest Doc Healthcare API is healthy and running!",
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);
// patient-profile routes
app.use("/api/v1/patient-profile", patientProfileRoutes);
// doctor-profile routes
app.use("/api/v1/doctor-profile", doctorProfileRoutes);
// doctor availability route
app.use("/api/v1/doctor-availability", doctorAvailabilityRoutes);
// appointments route
app.use("/api/v1/appointments", appointmentRoutes);
// medical records route
app.use("/api/v1/medical-records", medicalRecordRoutes);
// prescription route
app.use("/api/v1/prescriptions", prescriptionRoutes);
export default app;
