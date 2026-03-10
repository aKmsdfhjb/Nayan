import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.execute({
      sql: "SELECT * FROM admin_users WHERE username = ?",
      args: [username],
    });
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return res.json({
      token: signToken({ id: user.id, username: user.username }),
      username: user.username,
      mustChangePassword: Boolean(user.must_change_password),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const hash = bcrypt.hashSync(newPassword, 10);

    await db.execute({
      sql: `UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?`,
      args: [hash, req.user.id],
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ message: "Server error while changing password." });
  }
});

router.post("/change-username", requireAuth, async (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters." });
    }

    // Check if username already taken
    const existing = await db.execute({
      sql: "SELECT id FROM admin_users WHERE username = ? AND id != ?",
      args: [newUsername.trim(), req.user.id],
    });

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Username already taken." });
    }

    await db.execute({
      sql: `UPDATE admin_users SET username = ? WHERE id = ?`,
      args: [newUsername.trim(), req.user.id],
    });

    // Return new token with updated username
    const newToken = signToken({ id: req.user.id, username: newUsername.trim() });
    return res.json({ success: true, username: newUsername.trim(), token: newToken });
  } catch (err) {
    console.error("Change username error:", err);
    return res.status(500).json({ message: "Server error while changing username." });
  }
});

export default router;
