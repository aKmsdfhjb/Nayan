import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const backendRoot = path.resolve(process.cwd(), "backend");
const uploadsDir = path.join(backendRoot, "uploads");
const databasePath = path.join(backendRoot, "database.sqlite");

fs.mkdirSync(uploadsDir, { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    location TEXT NOT NULL,
    email TEXT NOT NULL,
    linkedin TEXT NOT NULL,
    bio TEXT NOT NULL,
    avatar TEXT
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

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    level INTEGER NOT NULL,
    note TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1
  );
`);

// Safe migrations for databases created before these columns existed
try { db.exec("ALTER TABLE profile ADD COLUMN avatar TEXT"); } catch { /* already exists */ }

// ── Seed profile ──────────────────────────────────────────────────────────────
const profileCount = db.prepare("SELECT COUNT(*) AS count FROM profile").get();
if (!profileCount.count) {
  db.prepare(
    `INSERT INTO profile (id, name, title, tagline, location, email, linkedin, bio, avatar)
     VALUES (@id, @name, @title, @tagline, @location, @email, @linkedin, @bio, @avatar)`
  ).run({
    id: "primary",
    name: "Nayan Kuikel",
    title: "Civil Engineer",
    tagline: "Structural precision, cost intelligence, and dependable site judgment.",
    location: "Kathmandu, Bāgmatī, Nepal",
    email: "nayan@email.com",
    linkedin: "linkedin.com/in/nayan-kuikel",
    bio: "Civil Engineer specializing in structural inspection and cost estimation. Skilled in analyzing project requirements, assessing costs, preparing detailed estimates, and ensuring structural integrity. Strong communicator and team leader with experience across inspection, reporting, and field coordination.",
    avatar: null,
  });
}

// ── Seed projects ─────────────────────────────────────────────────────────────
const projectCount = db.prepare("SELECT COUNT(*) AS count FROM projects").get();
if (!projectCount.count) {
  const insertProject = db.prepare(
    `INSERT INTO projects (id, title, category, description, tools, year, image, link)
     VALUES (@id, @title, @category, @description, @tools, @year, @image, @link)`
  );
  [
    {
      id: "project-residential-inspection",
      title: "Residential House Inspection",
      category: "Inspection",
      description: "Conducted structural inspection of a 3-storey residential building. Identified foundation cracks, documented the condition, and recommended a staged remediation approach.",
      tools: JSON.stringify(["AutoCAD", "Field Inspection"]),
      year: "2024",
      image: "/blueprint-1.svg",
      link: null,
    },
    {
      id: "project-commercial-estimation",
      title: "Repair Cost Estimation - Commercial Property",
      category: "Estimation",
      description: "Prepared a detailed repair and renovation estimate for a commercial space, covering materials, labor allocation, contingencies, and timeline projections.",
      tools: JSON.stringify(["AutoCAD", "Microsoft Excel"]),
      year: "2024",
      image: "/blueprint-2.svg",
      link: null,
    },
    {
      id: "project-structural-quality-control",
      title: "Structural Quality Control Report",
      category: "Structural",
      description: "Reviewed site execution against structural and safety standards during construction, then issued a corrective-action report for follow-up by the project team.",
      tools: JSON.stringify(["Field Inspection", "Report Writing"]),
      year: "2024",
      image: "/blueprint-3.svg",
      link: null,
    },
  ].forEach((p) => insertProject.run(p));
}

// ── Seed experience ───────────────────────────────────────────────────────────
const experienceCount = db.prepare("SELECT COUNT(*) AS count FROM experience").get();
if (!experienceCount.count) {
  const insertExp = db.prepare(
    `INSERT INTO experience (id, role, company, duration, description, skills)
     VALUES (@id, @role, @company, @duration, @description, @skills)`
  );
  [
    {
      id: "experience-estimator-skillssewa",
      role: "Estimator",
      company: "SkillSewa Pvt. Ltd.",
      duration: "Nov 2024 - Present",
      description: "Developing repair and renovation estimates, evaluating project requirements, preparing quantity takeoffs, and aligning cost decisions with site realities and client expectations.",
      skills: JSON.stringify(["Cost Estimation", "Microsoft Excel", "AutoCAD", "Client Coordination"]),
    },
    {
      id: "experience-inspection-skillssewa",
      role: "Inspection Engineer",
      company: "SkillSewa Pvt. Ltd.",
      duration: "Sep 2024 - Nov 2024",
      description: "Performed field inspections, reviewed structural conditions, produced inspection notes, and coordinated corrective recommendations with execution teams and stakeholders.",
      skills: JSON.stringify(["Field Inspection", "Structural Analysis", "Report Writing", "Team Leadership"]),
    },
  ].forEach((j) => insertExp.run(j));
}

// ── Seed gallery ──────────────────────────────────────────────────────────────
const galleryCount = db.prepare("SELECT COUNT(*) AS count FROM gallery").get();
if (!galleryCount.count) {
  const insertGallery = db.prepare(
    `INSERT INTO gallery (id, title, project_id, project_title, caption, image_url)
     VALUES (@id, @title, @project_id, @project_title, @caption, @image_url)`
  );
  [
    { id: "gallery-foundation-map", title: "Foundation Crack Mapping", project_id: "project-residential-inspection", project_title: "Residential House Inspection", caption: "Annotated crack mapping used to brief the inspection outcome and next repair priorities.", image_url: "/blueprint-1.svg" },
    { id: "gallery-cost-scope", title: "Commercial Repair Scope", project_id: "project-commercial-estimation", project_title: "Repair Cost Estimation - Commercial Property", caption: "Cost planning visual showing the phased renovation scope prepared for budgeting review.", image_url: "/blueprint-2.svg" },
    { id: "gallery-quality-report", title: "Quality Control Snapshot", project_id: "project-structural-quality-control", project_title: "Structural Quality Control Report", caption: "Site documentation panel used to support the report and corrective action log.", image_url: "/blueprint-3.svg" },
  ].forEach((i) => insertGallery.run(i));
}

// ── Seed skills ───────────────────────────────────────────────────────────────
const skillCount = db.prepare("SELECT COUNT(*) AS count FROM skills").get();
if (!skillCount.count) {
  const insertSkill = db.prepare(
    `INSERT INTO skills (id, label, level, note, sort_order)
     VALUES (@id, @label, @level, @note, @sort_order)`
  );
  [
    { id: "skill-autocad",       label: "AutoCAD",            level: 92, note: "Drawing review and coordination",      sort_order: 0 },
    { id: "skill-excel",         label: "Microsoft Excel",    level: 95, note: "Takeoffs, estimates, and analysis",    sort_order: 1 },
    { id: "skill-estimation",    label: "Cost Estimation",    level: 93, note: "Materials, labor, and planning",       sort_order: 2 },
    { id: "skill-inspection",    label: "Field Inspection",   level: 90, note: "Condition review and reporting",       sort_order: 3 },
    { id: "skill-structural",    label: "Structural Analysis",level: 88, note: "Checks, observations, recommendations",sort_order: 4 },
    { id: "skill-reporting",     label: "Report Writing",     level: 91, note: "Clear technical communication",        sort_order: 5 },
  ].forEach((s) => insertSkill.run(s));
}

// ── Seed admin ────────────────────────────────────────────────────────────────
const adminCount = db.prepare("SELECT COUNT(*) AS count FROM admin_users").get();
if (!adminCount.count) {
  db.prepare(
    `INSERT INTO admin_users (id, username, password_hash, must_change_password)
     VALUES (@id, @username, @password_hash, @must_change_password)`
  ).run({
    id: randomUUID(),
    username: "admin",
    password_hash: bcrypt.hashSync("nayan2024", 10),
    must_change_password: 1,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export { uploadsDir };
