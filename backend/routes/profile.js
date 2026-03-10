import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import { db, uploadsDir } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Multer storage — saves avatar files to the uploads directory
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `avatar-${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

router.get("/", (_req, res) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 'primary'").get();
  return res.json(profile);
});

// Accepts multipart/form-data so avatar image file can be uploaded alongside text fields
router.put("/", requireAuth, upload.single("avatar"), (req, res) => {
  // If a new file was uploaded, use its path. Otherwise keep the existing avatar.
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : req.body.avatar ?? undefined;

  // Delete the old avatar file from disk when a new one is uploaded
  if (req.file) {
    const existing = db.prepare("SELECT avatar FROM profile WHERE id = 'primary'").get();
    if (existing?.avatar?.startsWith("/uploads/")) {
      const oldPath = path.join(uploadsDir, existing.avatar.replace("/uploads/", ""));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
  }

  const profile = {
    id: "primary",
    name: req.body.name,
    title: req.body.title,
    tagline: req.body.tagline,
    location: req.body.location,
    email: req.body.email,
    linkedin: req.body.linkedin,
    bio: req.body.bio,
    // COALESCE: only overwrite avatar if a new value was provided
    avatar: avatarUrl ?? null,
  };

  db.prepare(
    `UPDATE profile
     SET name     = @name,
         title    = @title,
         tagline  = @tagline,
         location = @location,
         email    = @email,
         linkedin = @linkedin,
         bio      = @bio,
         avatar   = CASE WHEN @avatar IS NOT NULL THEN @avatar ELSE avatar END
     WHERE id = @id`
  ).run(profile);

  // Return the full updated row (includes the preserved or new avatar value)
  return res.json(db.prepare("SELECT * FROM profile WHERE id = 'primary'").get());
});

export default router;
