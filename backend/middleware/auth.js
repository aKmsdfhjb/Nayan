import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "nayan-kuikel-portfolio-secret";

export function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token." });
  }

  try {
    req.user = jwt.verify(header.replace("Bearer ", ""), secret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid authorization token." });
  }
}