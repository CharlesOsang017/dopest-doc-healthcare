import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";

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

export default app;
