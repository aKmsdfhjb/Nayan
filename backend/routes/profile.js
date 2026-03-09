import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 'primary'").get();
  return res.json(profile);
});

router.put("/", requireAuth, (req, res) => {
  const profile = {
    id: "primary",
    name: req.body.name,
    title: req.body.title,
    tagline: req.body.tagline,
    location: req.body.location,
    email: req.body.email,
    linkedin: req.body.linkedin,
    bio: req.body.bio,
  };

  db.prepare(
    `UPDATE profile
     SET name = @name,
         title = @title,
         tagline = @tagline,
         location = @location,
         email = @email,
         linkedin = @linkedin,
         bio = @bio
     WHERE id = @id`
  ).run(profile);

  return res.json(profile);
});

export default router;