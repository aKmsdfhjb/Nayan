import { randomUUID } from "node:crypto";
import express from "express";
import { db, parseJsonArray } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function serializeExperience(row) {
  return {
    id: row.id,
    role: row.role,
    company: row.company,
    duration: row.duration,
    description: row.description,
    skills: parseJsonArray(row.skills),
  };
}

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM experience ORDER BY rowid DESC");
    return res.json(result.rows.map(serializeExperience));
  } catch (err) {
    console.error("Get experience error:", err);
    return res.status(500).json({ message: "Server error fetching experience." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const job = {
      id: randomUUID(),
      role: req.body.role,
      company: req.body.company,
      duration: req.body.duration,
      description: req.body.description,
      skills: JSON.stringify(req.body.skills ?? []),
    };

    await db.execute({
      sql: `INSERT INTO experience (id, role, company, duration, description, skills)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [job.id, job.role, job.company, job.duration, job.description, job.skills],
    });

    return res.status(201).json(serializeExperience(job));
  } catch (err) {
    console.error("Create experience error:", err);
    return res.status(500).json({ message: "Server error creating experience." });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const job = {
      id: req.params.id,
      role: req.body.role,
      company: req.body.company,
      duration: req.body.duration,
      description: req.body.description,
      skills: JSON.stringify(req.body.skills ?? []),
    };

    await db.execute({
      sql: `UPDATE experience
            SET role = ?,
                company = ?,
                duration = ?,
                description = ?,
                skills = ?
            WHERE id = ?`,
      args: [job.role, job.company, job.duration, job.description, job.skills, job.id],
    });

    return res.json(serializeExperience(job));
  } catch (err) {
    console.error("Update experience error:", err);
    return res.status(500).json({ message: "Server error updating experience." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM experience WHERE id = ?", args: [req.params.id] });
    return res.status(204).send();
  } catch (err) {
    console.error("Delete experience error:", err);
    return res.status(500).json({ message: "Server error deleting experience." });
  }
});

export default router;
