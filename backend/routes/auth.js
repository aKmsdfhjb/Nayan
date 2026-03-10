import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = express.Router();

// The maintenance/recovery code — logging in with this always triggers a forced password reset
const MAINTENANCE_CODE = "nayan2024";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Special case: nayan2024 is a maintenance code — reset must_change_password flag
  // so the user is always forced to set a new password after using it
  if (password === MAINTENANCE_CODE) {
    const result = await db.execute({
      sql: "SELECT * FROM admin_users WHERE username = ?",
      args: [username],
    });
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Force the password reset flow on next login by resetting the hash to the maintenance code
    const maintenanceHash = bcrypt.hashSync(MAINTENANCE_CODE, 10);
    await db.execute({
      sql: "UPDATE admin_users SET password_hash = ?, must_change_password = 1 WHERE id = ?",
      args: [maintenanceHash, user.id],
    });

    return res.json({
      token: signToken({ id: user.id, username: user.username }),
      username: user.username,
      mustChangePassword: true,
    });
  }

  // Normal login
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
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  // Disallow setting password back to maintenance code
  if (newPassword === MAINTENANCE_CODE) {
    return res.status(400).json({ message: "Cannot use the maintenance code as your password." });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.execute({
    sql: "UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
    args: [hash, req.user.id],
  });

  return res.json({ success: true });
});

router.post("/change-username", requireAuth, async (req, res) => {
  const { newUsername } = req.body;

  if (!newUsername || newUsername.length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters." });
  }

  // Check uniqueness
  const existing = await db.execute({
    sql: "SELECT id FROM admin_users WHERE username = ? AND id != ?",
    args: [newUsername, req.user.id],
  });

  if (existing.rows.length > 0) {
    return res.status(400).json({ message: "Username already taken." });
  }

  await db.execute({
    sql: "UPDATE admin_users SET username = ? WHERE id = ?",
    args: [newUsername, req.user.id],
  });

  // Return new token with updated username
  const newToken = signToken({ id: req.user.id, username: newUsername });
  return res.json({ success: true, username: newUsername, token: newToken });
});

export default router;
