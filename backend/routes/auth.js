import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({
    token: signToken({ id: user.id, username: user.username }),
    username: user.username,
    mustChangePassword: Boolean(user.must_change_password),
  });
});

router.post("/change-password", requireAuth, (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?")
    .run(hash, req.user.id);

  return res.json({ success: true });
});

router.post("/change-username", requireAuth, (req, res) => {
  const { newUsername } = req.body;

  if (!newUsername || newUsername.trim().length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters." });
  }

  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ? AND id != ?")
    .get(newUsername.trim(), req.user.id);

  if (existing) {
    return res.status(409).json({ message: "Username already taken." });
  }

  db.prepare("UPDATE admin_users SET username = ? WHERE id = ?")
    .run(newUsername.trim(), req.user.id);

  return res.json({ success: true });
});

export default router;
