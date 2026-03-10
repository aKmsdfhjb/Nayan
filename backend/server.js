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
import skillsRoutes from "./routes/skills.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const distDir = path.resolve(process.cwd(), "dist");

app.use(cors({ origin: true, credentials: true }));

app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
    ].join("; ")
  );
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

app.use("/uploads", express.static(path.resolve(process.cwd(), "backend/uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/experience", experienceRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillsRoutes);

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Nayan portfolio backend running on http://localhost:${port}`);
});
