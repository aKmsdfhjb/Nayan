import {
  defaultAdmin,
  defaultProfile,
  defaultSkills,
  experience,
  gallery,
  projects,
  type ExperienceItem,
  type GalleryItem,
  type Profile,
  type Project,
  type SkillItem,
} from "./portfolioData";

export type AuthSession = {
  token: string;
  username: string;
  mustChangePassword: boolean;
};

export type GalleryMutation = {
  id?: string;
  title: string;
  projectId?: string;
  projectTitle: string;
  caption: string;
  imageUrl?: string;
  file?: File | null;
};

const API_BASE =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE as string | undefined) ?? "";

const storageKeys = {
  profile: "nk-profile",
  projects: "nk-projects",
  experience: "nk-experience",
  gallery: "nk-gallery",
  skills: "nk-skills",
  admin: "nk-admin",
  session: "nk-session",
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now().toString(36)}`;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function shouldFallback(error: unknown) {
  if (error instanceof ApiError) return error.status === 404 || error.status === 405;
  if (error instanceof TypeError) {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    return isLocalhost;
  }
  return false;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getAuthSession();
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { message?: string };
      message = data.message ?? message;
    } catch {
      message = response.statusText || "Request failed";
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  return items.some((e) => e.id === item.id)
    ? items.map((e) => (e.id === item.id ? item : e))
    : [item, ...items];
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initializeLocalPortfolio() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(storageKeys.profile)) writeStorage(storageKeys.profile, defaultProfile);
  if (!window.localStorage.getItem(storageKeys.projects)) writeStorage(storageKeys.projects, projects);
  if (!window.localStorage.getItem(storageKeys.experience)) writeStorage(storageKeys.experience, experience);
  if (!window.localStorage.getItem(storageKeys.gallery)) writeStorage(storageKeys.gallery, gallery);
  if (!window.localStorage.getItem(storageKeys.skills)) writeStorage(storageKeys.skills, defaultSkills);
  if (!window.localStorage.getItem(storageKeys.admin)) writeStorage(storageKeys.admin, defaultAdmin);
}

// ── Auth session ──────────────────────────────────────────────────────────────

export function getAuthSession() {
  if (typeof window === "undefined") return null;
  return readStorage<AuthSession | null>(storageKeys.session, null);
}

function setAuthSession(session: AuthSession) {
  writeStorage(storageKeys.session, session);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKeys.session);
}

// ── Auth actions ──────────────────────────────────────────────────────────────

export async function loginAdmin(username: string, password: string) {
  try {
    const data = await request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAuthSession(data);
    return data;
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const admin = readStorage(storageKeys.admin, defaultAdmin);
    if (admin.username !== username || admin.password !== password) {
      throw new Error("Invalid admin credentials.");
    }
    const session: AuthSession = { token: "local-admin-session", username, mustChangePassword: admin.mustChangePassword };
    setAuthSession(session);
    return session;
  }
}

export async function changeAdminPassword(newPassword: string) {
  try {
    await request<{ success: true }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const admin = readStorage(storageKeys.admin, defaultAdmin);
    writeStorage(storageKeys.admin, { ...admin, password: newPassword, mustChangePassword: false });
  }
  const session = getAuthSession();
  if (session) setAuthSession({ ...session, mustChangePassword: false });
}

export async function changeAdminUsername(newUsername: string) {
  try {
    await request<{ success: true }>("/api/auth/change-username", {
      method: "POST",
      body: JSON.stringify({ newUsername }),
    });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const admin = readStorage(storageKeys.admin, defaultAdmin);
    writeStorage(storageKeys.admin, { ...admin, username: newUsername });
  }
  const session = getAuthSession();
  if (session) setAuthSession({ ...session, username: newUsername });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile() {
  try {
    return await request<Profile>("/api/profile");
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return readStorage(storageKeys.profile, defaultProfile);
  }
}

export async function saveProfile(profile: Profile) {
  try {
    return await request<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    writeStorage(storageKeys.profile, profile);
    return profile;
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const data = await request<{ url: string }>("/api/profile/avatar", { method: "POST", body: formData });
    return data.url;
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return fileToDataUrl(file);
  }
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function getSkills() {
  try {
    return await request<SkillItem[]>("/api/skills");
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return readStorage(storageKeys.skills, defaultSkills);
  }
}

export async function saveSkill(skill: Omit<SkillItem, "id"> & { id?: string }) {
  try {
    if (skill.id) {
      return await request<SkillItem>(`/api/skills/${skill.id}`, {
        method: "PUT",
        body: JSON.stringify(skill),
      });
    }
    return await request<SkillItem>("/api/skills", { method: "POST", body: JSON.stringify(skill) });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const saved: SkillItem = { ...skill, id: skill.id ?? createId("skill") };
    writeStorage(storageKeys.skills, upsert(readStorage(storageKeys.skills, defaultSkills), saved));
    return saved;
  }
}

export async function deleteSkill(id: string) {
  try {
    await request(`/api/skills/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    writeStorage(storageKeys.skills, readStorage<SkillItem[]>(storageKeys.skills, defaultSkills).filter((s) => s.id !== id));
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  try {
    return await request<Project[]>("/api/projects");
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return readStorage(storageKeys.projects, projects);
  }
}

export async function saveProject(project: Omit<Project, "id"> & { id?: string }) {
  try {
    if (project.id) {
      return await request<Project>(`/api/projects/${project.id}`, { method: "PUT", body: JSON.stringify(project) });
    }
    return await request<Project>("/api/projects", { method: "POST", body: JSON.stringify(project) });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const saved: Project = { ...project, id: project.id ?? createId("project") };
    writeStorage(storageKeys.projects, upsert(readStorage(storageKeys.projects, projects), saved));
    return saved;
  }
}

export async function deleteProject(id: string) {
  try {
    await request(`/api/projects/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    writeStorage(storageKeys.projects, readStorage<Project[]>(storageKeys.projects, projects).filter((p) => p.id !== id));
    writeStorage(storageKeys.gallery, readStorage<GalleryItem[]>(storageKeys.gallery, gallery).filter((i) => i.projectId !== id));
  }
}

// ── Experience ────────────────────────────────────────────────────────────────

export async function getExperience() {
  try {
    return await request<ExperienceItem[]>("/api/experience");
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return readStorage(storageKeys.experience, experience);
  }
}

export async function saveExperience(job: Omit<ExperienceItem, "id"> & { id?: string }) {
  try {
    if (job.id) {
      return await request<ExperienceItem>(`/api/experience/${job.id}`, { method: "PUT", body: JSON.stringify(job) });
    }
    return await request<ExperienceItem>("/api/experience", { method: "POST", body: JSON.stringify(job) });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const saved: ExperienceItem = { ...job, id: job.id ?? createId("experience") };
    writeStorage(storageKeys.experience, upsert(readStorage(storageKeys.experience, experience), saved));
    return saved;
  }
}

export async function deleteExperience(id: string) {
  try {
    await request(`/api/experience/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    writeStorage(storageKeys.experience, readStorage<ExperienceItem[]>(storageKeys.experience, experience).filter((j) => j.id !== id));
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export async function getGallery() {
  try {
    return await request<GalleryItem[]>("/api/gallery");
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    return readStorage(storageKeys.gallery, gallery);
  }
}

export async function saveGalleryItem(item: GalleryMutation) {
  try {
    const formData = new FormData();
    formData.append("title", item.title);
    formData.append("projectTitle", item.projectTitle);
    formData.append("caption", item.caption);
    if (item.id) formData.append("id", item.id);
    if (item.projectId) formData.append("projectId", item.projectId);
    if (item.imageUrl) formData.append("imageUrl", item.imageUrl);
    if (item.file) formData.append("image", item.file);
    return await request<GalleryItem>("/api/gallery/upload", { method: "POST", body: formData });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const imageUrl = item.file ? await fileToDataUrl(item.file) : item.imageUrl || "/blueprint-1.svg";
    const saved: GalleryItem = {
      id: item.id ?? createId("gallery"),
      title: item.title,
      projectId: item.projectId,
      projectTitle: item.projectTitle,
      caption: item.caption,
      imageUrl,
    };
    writeStorage(storageKeys.gallery, upsert(readStorage(storageKeys.gallery, gallery), saved));
    return saved;
  }
}

export async function deleteGalleryItem(id: string) {
  try {
    await request(`/api/gallery/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    writeStorage(storageKeys.gallery, readStorage<GalleryItem[]>(storageKeys.gallery, gallery).filter((i) => i.id !== id));
  }
}
