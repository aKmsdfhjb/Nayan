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
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({ storage });

function serializeGallery(item) {
  return {
    id: item.id,
    title: item.title,
    projectId: item.project_id,
    projectTitle: item.project_title,
    caption: item.caption,
    imageUrl: item.image_url,
  };
}

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM gallery ORDER BY rowid DESC").all();
  return res.json(rows.map(serializeGallery));
});

router.post("/upload", requireAuth, upload.single("image"), (req, res) => {
  const id = req.body.id || randomUUID();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl || "/blueprint-1.svg";

  const galleryItem = {
    id,
    title: req.body.title,
    project_id: req.body.projectId || null,
    project_title: req.body.projectTitle,
    caption: req.body.caption,
    image_url: imageUrl,
  };

  db.prepare(
    `INSERT INTO gallery (id, title, project_id, project_title, caption, image_url)
     VALUES (@id, @title, @project_id, @project_title, @caption, @image_url)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       project_id = excluded.project_id,
       project_title = excluded.project_title,
       caption = excluded.caption,
       image_url = excluded.image_url`
  ).run(galleryItem);

  return res.status(201).json(serializeGallery(galleryItem));
});

router.delete("/:id", requireAuth, (req, res) => {
  const item = db.prepare("SELECT * FROM gallery WHERE id = ?").get(req.params.id);

  if (item?.image_url?.startsWith("/uploads/")) {
    const filePath = path.join(uploadsDir, item.image_url.replace("/uploads/", ""));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare("DELETE FROM gallery WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

export default router;