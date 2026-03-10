import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { db, uploadsDir } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || ".jpg";
    callback(null, `avatar-${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({ storage });

function serializeProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    title: profile.title,
    tagline: profile.tagline,
    location: profile.location,
    email: profile.email,
    linkedin: profile.linkedin,
    bio: profile.bio,
    avatar: profile.avatar ?? undefined,
  };
}

router.get("/", (_req, res) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 'primary'").get();
  if (!profile) return res.status(404).json({ message: "Profile not found." });
  return res.json(serializeProfile(profile));
});

router.put("/", requireAuth, (req, res) => {
  db.prepare(
    `UPDATE profile
     SET name = @name,
         title = @title,
         tagline = @tagline,
         location = @location,
         email = @email,
         linkedin = @linkedin,
         bio = @bio,
         avatar = @avatar
     WHERE id = @id`
  ).run({
    id: "primary",
    name: req.body.name,
    title: req.body.title,
    tagline: req.body.tagline,
    location: req.body.location,
    email: req.body.email,
    linkedin: req.body.linkedin,
    bio: req.body.bio,
    avatar: req.body.avatar ?? null,
  });

  const updated = db.prepare("SELECT * FROM profile WHERE id = 'primary'").get();
  return res.json(serializeProfile(updated));
});

// POST /api/profile/avatar — upload profile photo
router.post("/avatar", requireAuth, upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;

  // Remove old avatar file if it was a local upload
  const current = db.prepare("SELECT avatar FROM profile WHERE id = 'primary'").get();
  if (current?.avatar?.startsWith("/uploads/")) {
    const oldPath = path.join(uploadsDir, current.avatar.replace("/uploads/", ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.prepare("UPDATE profile SET avatar = ? WHERE id = 'primary'").run(avatarUrl);

  return res.json({ url: avatarUrl });
});

export default router;
