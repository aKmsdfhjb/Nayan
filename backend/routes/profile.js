import express from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM profile WHERE id = 'primary'");
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Server error fetching profile." });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const { name, title, tagline, location, email, linkedin, bio } = req.body;

    await db.execute({
      sql: `UPDATE profile
            SET name = ?,
                title = ?,
                tagline = ?,
                location = ?,
                email = ?,
                linkedin = ?,
                bio = ?
            WHERE id = 'primary'`,
      args: [name, title, tagline, location, email, linkedin, bio],
    });

    return res.json({ id: "primary", name, title, tagline, location, email, linkedin, bio });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Server error updating profile." });
  }
});

export default router;
