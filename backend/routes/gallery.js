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
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || ".jpg";
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({ storage });

function serializeGallery(row) {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    projectTitle: row.project_title,
    caption: row.caption,
    imageUrl: row.image_url,
  };
}

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM gallery ORDER BY rowid DESC");
    return res.json(result.rows.map(serializeGallery));
  } catch (err) {
    console.error("Get gallery error:", err);
    return res.status(500).json({ message: "Server error fetching gallery." });
  }
});

router.post("/upload", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const id = req.body.id || randomUUID();
    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.imageUrl || "/blueprint-1.svg";

    const galleryItem = {
      id,
      title: req.body.title,
      project_id: req.body.projectId || null,
      project_title: req.body.projectTitle,
      caption: req.body.caption,
      image_url: imageUrl,
    };

    // Upsert: insert or update if id already exists
    const existing = await db.execute({
      sql: "SELECT id FROM gallery WHERE id = ?",
      args: [id],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE gallery
              SET title = ?,
                  project_id = ?,
                  project_title = ?,
                  caption = ?,
                  image_url = ?
              WHERE id = ?`,
        args: [
          galleryItem.title,
          galleryItem.project_id,
          galleryItem.project_title,
          galleryItem.caption,
          galleryItem.image_url,
          id,
        ],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO gallery (id, title, project_id, project_title, caption, image_url)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          galleryItem.title,
          galleryItem.project_id,
          galleryItem.project_title,
          galleryItem.caption,
          galleryItem.image_url,
        ],
      });
    }

    return res.status(201).json(serializeGallery(galleryItem));
  } catch (err) {
    console.error("Upload gallery error:", err);
    return res.status(500).json({ message: "Server error uploading gallery item." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM gallery WHERE id = ?",
      args: [req.params.id],
    });
    const item = result.rows[0];

    if (item?.image_url?.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, item.image_url.replace("/uploads/", ""));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.execute({ sql: "DELETE FROM gallery WHERE id = ?", args: [req.params.id] });
    return res.status(204).send();
  } catch (err) {
    console.error("Delete gallery error:", err);
    return res.status(500).json({ message: "Server error deleting gallery item." });
  }
});

export default router;
