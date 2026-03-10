import { randomUUID } from "node:crypto";
import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM skills ORDER BY sort_order ASC, label ASC").all();
  return res.json(rows);
});

router.post("/", requireAuth, (req, res) => {
  const maxOrder = db.prepare("SELECT MAX(sort_order) AS m FROM skills").get();
  const skill = {
    id: randomUUID(),
    label: req.body.label,
    level: Number(req.body.level),
    note: req.body.note ?? "",
    sort_order: (maxOrder?.m ?? -1) + 1,
  };
  db.prepare(
    `INSERT INTO skills (id, label, level, note, sort_order)
     VALUES (@id, @label, @level, @note, @sort_order)`
  ).run(skill);
  return res.status(201).json(skill);
});

router.put("/:id", requireAuth, (req, res) => {
  const skill = {
    id: req.params.id,
    label: req.body.label,
    level: Number(req.body.level),
    note: req.body.note ?? "",
    sort_order: Number(req.body.sort_order ?? 0),
  };
  db.prepare(
    `UPDATE skills SET label = @label, level = @level, note = @note, sort_order = @sort_order
     WHERE id = @id`
  ).run(skill);
  return res.json(skill);
});

router.delete("/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM skills WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

export default router;
