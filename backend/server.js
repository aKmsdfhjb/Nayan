import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import "./db.js";
import authRoutes from "./routes/auth.js";
import experienceRoutes from "./routes/experience.js";
import galleryRoutes from "./routes/gallery.js";
import profileRoutes from "./routes/profile.js";
import projectsRoutes from "./routes/projects.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const distDir = path.resolve(process.cwd(), "dist");

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3001"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "backend/uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/experience", experienceRoutes);
app.use("/api/profile", profileRoutes);

// Serve the built React app so /admin and the public portfolio can be hosted from one Express process.
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Nayan portfolio backend running on http://localhost:${port}`);
});
