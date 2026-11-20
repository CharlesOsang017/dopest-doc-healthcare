import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";
import patientProfileRoutes from "./routes/patientProfile.route.js";
import doctorProfileRoutes from "./routes/doctorProfile.route.js";

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

export default app;
