import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      tagline TEXT NOT NULL,
      location TEXT NOT NULL,
      email TEXT NOT NULL,
      linkedin TEXT NOT NULL,
      bio TEXT NOT NULL,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      tools TEXT NOT NULL,
      year TEXT NOT NULL,
      image TEXT,
      link TEXT
    );

    CREATE TABLE IF NOT EXISTS experience (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      company TEXT NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL,
      skills TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT,
      project_title TEXT NOT NULL,
      caption TEXT NOT NULL,
      image_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Migration: add photo column to existing DBs
  try {
    await db.execute("ALTER TABLE profile ADD COLUMN photo TEXT");
  } catch {
    // Already exists — ignore
  }

  // Seed profile
  const profileResult = await db.execute("SELECT COUNT(*) AS count FROM profile");
  if (Number(profileResult.rows[0].count) === 0) {
    await db.execute({
      sql: `INSERT INTO profile (id, name, title, tagline, location, email, linkedin, bio, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ["primary", "Nayan Kuikel", "Civil Engineer", "Structural precision, cost intelligence, and dependable site judgment.", "Kathmandu, Bāgmatī, Nepal", "nayan@email.com", "linkedin.com/in/nayan-kuikel", "Civil Engineer specializing in structural inspection and cost estimation. Skilled in analyzing project requirements, assessing costs, preparing detailed estimates, and ensuring structural integrity. Strong communicator and team leader with experience across inspection, reporting, and field coordination.", null],
    });
  }

  // Seed projects
  const projectResult = await db.execute("SELECT COUNT(*) AS count FROM projects");
  if (Number(projectResult.rows[0].count) === 0) {
    const sql = `INSERT INTO projects (id, title, category, description, tools, year, image, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.execute({ sql, args: [randomUUID(), "Residential House Inspection", "Inspection", "Conducted structural inspection of a 3-storey residential building. Identified foundation cracks, documented the condition, and recommended a staged remediation approach.", JSON.stringify(["AutoCAD", "Field Inspection"]), "2024", "/blueprint-1.svg", null] });
    await db.execute({ sql, args: [randomUUID(), "Repair Cost Estimation - Commercial Property", "Estimation", "Prepared a detailed repair and renovation estimate for a commercial space, covering materials, labor allocation, contingencies, and timeline projections.", JSON.stringify(["AutoCAD", "Microsoft Excel"]), "2024", "/blueprint-2.svg", null] });
    await db.execute({ sql, args: [randomUUID(), "Structural Quality Control Report", "Structural", "Reviewed site execution against structural and safety standards during construction, then issued a corrective-action report for follow-up by the project team.", JSON.stringify(["Field Inspection", "Report Writing"]), "2024", "/blueprint-3.svg", null] });
  }

  // Seed experience
  const expResult = await db.execute("SELECT COUNT(*) AS count FROM experience");
  if (Number(expResult.rows[0].count) === 0) {
    await db.execute({ sql: `INSERT INTO experience (id, role, company, duration, description, skills) VALUES (?, ?, ?, ?, ?, ?)`, args: [randomUUID(), "Estimator", "SkillSewa Pvt. Ltd.", "Nov 2024 - Present", "Developing repair and renovation estimates, evaluating project requirements, preparing quantity takeoffs, and aligning cost decisions with site realities and client expectations.", JSON.stringify(["Cost Estimation", "Quantity Takeoff", "AutoCAD", "Site Assessment"])] });
  }

  // Seed admin — nayan2024 is the MAINTENANCE/RECOVERY code (must_change_password=1 forces reset)
  const adminResult = await db.execute("SELECT COUNT(*) AS count FROM admin_users");
  if (Number(adminResult.rows[0].count) === 0) {
    const hash = bcrypt.hashSync("nayan2024", 10);
    await db.execute({ sql: `INSERT INTO admin_users (id, username, password_hash, must_change_password) VALUES (?, ?, ?, 1)`, args: [randomUUID(), "admin", hash] });
  }
}
