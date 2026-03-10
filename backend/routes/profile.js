import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const uploadsDir = path.resolve(process.cwd(), "backend/uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `photo-${Date.now()}-${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", async (_req, res) => {
  const result = await db.execute("SELECT * FROM profile WHERE id = 'primary'");
  return res.json(result.rows[0]);
});

router.put("/", requireAuth, async (req, res) => {
  const { name, title, tagline, location, email, linkedin, bio, photo } = req.body;
  await db.execute({
    sql: `UPDATE profile SET name=?, title=?, tagline=?, location=?, email=?, linkedin=?, bio=?, photo=? WHERE id='primary'`,
    args: [name, title, tagline, location, email, linkedin, bio, photo ?? null],
  });
  return res.json({ id: "primary", name, title, tagline, location, email, linkedin, bio, photo: photo ?? null });
});

// Upload profile photo
router.post("/photo", requireAuth, upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const photoUrl = `/uploads/${req.file.filename}`;

  // Remove old photo file if it was an upload
  const existing = await db.execute("SELECT photo FROM profile WHERE id = 'primary'");
  const oldPhoto = existing.rows[0]?.photo;
  if (oldPhoto && oldPhoto.startsWith("/uploads/")) {
    const oldPath = path.join(uploadsDir, oldPhoto.replace("/uploads/", ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await db.execute({
    sql: "UPDATE profile SET photo = ? WHERE id = 'primary'",
    args: [photoUrl],
  });

  return res.json({ photoUrl });
});

// Remove profile photo
router.delete("/photo", requireAuth, async (_req, res) => {
  const existing = await db.execute("SELECT photo FROM profile WHERE id = 'primary'");
  const oldPhoto = existing.rows[0]?.photo;
  if (oldPhoto && oldPhoto.startsWith("/uploads/")) {
    const oldPath = path.join(uploadsDir, oldPhoto.replace("/uploads/", ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await db.execute({ sql: "UPDATE profile SET photo = NULL WHERE id = 'primary'", args: [] });
  return res.json({ success: true });
});

export default router;
