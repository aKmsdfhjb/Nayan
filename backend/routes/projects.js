import { randomUUID } from "node:crypto";
import express from "express";
import { db, parseJsonArray } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function serializeProject(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    tools: parseJsonArray(row.tools),
    year: row.year,
    image: row.image,
    link: row.link,
  };
}

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM projects ORDER BY year DESC, title ASC");
    return res.json(result.rows.map(serializeProject));
  } catch (err) {
    console.error("Get projects error:", err);
    return res.status(500).json({ message: "Server error fetching projects." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const project = {
      id: randomUUID(),
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      tools: JSON.stringify(req.body.tools ?? []),
      year: req.body.year,
      image: req.body.image ?? null,
      link: req.body.link ?? null,
    };

    await db.execute({
      sql: `INSERT INTO projects (id, title, category, description, tools, year, image, link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        project.id,
        project.title,
        project.category,
        project.description,
        project.tools,
        project.year,
        project.image,
        project.link,
      ],
    });

    return res.status(201).json(serializeProject(project));
  } catch (err) {
    console.error("Create project error:", err);
    return res.status(500).json({ message: "Server error creating project." });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const project = {
      id: req.params.id,
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      tools: JSON.stringify(req.body.tools ?? []),
      year: req.body.year,
      image: req.body.image ?? null,
      link: req.body.link ?? null,
    };

    await db.execute({
      sql: `UPDATE projects
            SET title = ?,
                category = ?,
                description = ?,
                tools = ?,
                year = ?,
                image = ?,
                link = ?
            WHERE id = ?`,
      args: [
        project.title,
        project.category,
        project.description,
        project.tools,
        project.year,
        project.image,
        project.link,
        project.id,
      ],
    });

    return res.json(serializeProject(project));
  } catch (err) {
    console.error("Update project error:", err);
    return res.status(500).json({ message: "Server error updating project." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [req.params.id] });
    await db.execute({ sql: "DELETE FROM gallery WHERE project_id = ?", args: [req.params.id] });
    return res.status(204).send();
  } catch (err) {
    console.error("Delete project error:", err);
    return res.status(500).json({ message: "Server error deleting project." });
  }
});

export default router;
