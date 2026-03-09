import { randomUUID } from "node:crypto";
import express from "express";
import { db, parseJsonArray } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function serializeExperience(job) {
  return {
    id: job.id,
    role: job.role,
    company: job.company,
    duration: job.duration,
    description: job.description,
    skills: parseJsonArray(job.skills),
  };
}

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM experience ORDER BY rowid DESC").all();
  return res.json(rows.map(serializeExperience));
});

router.post("/", requireAuth, (req, res) => {
  const job = {
    id: randomUUID(),
    role: req.body.role,
    company: req.body.company,
    duration: req.body.duration,
    description: req.body.description,
    skills: JSON.stringify(req.body.skills ?? []),
  };

  db.prepare(
    `INSERT INTO experience (id, role, company, duration, description, skills)
     VALUES (@id, @role, @company, @duration, @description, @skills)`
  ).run(job);

  return res.status(201).json(serializeExperience(job));
});

router.put("/:id", requireAuth, (req, res) => {
  const job = {
    id: req.params.id,
    role: req.body.role,
    company: req.body.company,
    duration: req.body.duration,
    description: req.body.description,
    skills: JSON.stringify(req.body.skills ?? []),
  };

  db.prepare(
    `UPDATE experience
     SET role = @role,
         company = @company,
         duration = @duration,
         description = @description,
         skills = @skills
     WHERE id = @id`
  ).run(job);

  return res.json(serializeExperience(job));
});

router.delete("/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM experience WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

export default router;