import { randomUUID } from "node:crypto";
import express from "express";
import { db, parseJsonArray } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function serializeProject(project) {
  return {
    id: project.id,
    title: project.title,
    category: project.category,
    description: project.description,
    tools: parseJsonArray(project.tools),
    year: project.year,
    image: project.image,
    link: project.link,
  };
}

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM projects ORDER BY year DESC, title ASC").all();
  return res.json(rows.map(serializeProject));
});

router.post("/", requireAuth, (req, res) => {
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

  db.prepare(
    `INSERT INTO projects (id, title, category, description, tools, year, image, link)
     VALUES (@id, @title, @category, @description, @tools, @year, @image, @link)`
  ).run(project);

  return res.status(201).json(serializeProject(project));
});

router.put("/:id", requireAuth, (req, res) => {
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

  db.prepare(
    `UPDATE projects
     SET title = @title,
         category = @category,
         description = @description,
         tools = @tools,
         year = @year,
         image = @image,
         link = @link
     WHERE id = @id`
  ).run(project);

  return res.json(serializeProject(project));
});

router.delete("/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  db.prepare("DELETE FROM gallery WHERE project_id = ?").run(req.params.id);
  return res.status(204).send();
});

export default router;