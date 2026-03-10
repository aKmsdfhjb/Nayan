
// Types
export interface Profile {
  name: string;
  title: string;
  bio: string;
  avatar: string;
  email: string;
  phone: string;
  location: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
  logo?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  image: string;
  category?: string;
}

// Default data
const defaultProfile: Profile = {
  name: "Nayan",
  title: "Full Stack Developer",
  bio: "Passionate developer building modern web applications.",
  avatar: "/avatar.jpg",
  email: "nayan@example.com",
  phone: "+977-9800000000",
  location: "Nepal",
  socialLinks: {
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    twitter: "https://twitter.com",
    website: "",
  },
};

const defaultProjects: Project[] = [
  {
    id: "1",
    title: "Portfolio Website",
    description: "A modern portfolio website built with React and Tailwind CSS.",
    image: "/project1.jpg",
    tags: ["React", "Tailwind CSS", "TypeScript"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: "2",
    title: "E-commerce App",
    description: "Full-stack e-commerce application with payment integration.",
    image: "/project2.jpg",
    tags: ["Next.js", "Node.js", "MongoDB"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: "3",
    title: "Chat Application",
    description: "Real-time chat application with WebSocket support.",
    image: "/project3.jpg",
    tags: ["React", "Socket.io", "Express"],
    liveUrl: "#",
    githubUrl: "#",
    featured: false,
  },
];

const defaultExperience: Experience[] = [
  {
    id: "1",
    company: "Tech Company",
    role: "Senior Developer",
    duration: "2023 - Present",
    description: "Leading development of web applications using modern technologies.",
    logo: "/company1.png",
  },
  {
    id: "2",
    company: "Startup Inc",
    role: "Full Stack Developer",
    duration: "2021 - 2023",
    description: "Built and maintained multiple client-facing applications.",
    logo: "/company2.png",
  },
  {
    id: "3",
    company: "Freelance",
    role: "Web Developer",
    duration: "2019 - 2021",
    description: "Worked with various clients to deliver custom web solutions.",
    logo: "/freelance.png",
  },
];

const defaultGallery: GalleryItem[] = [
  {
    id: "1",
    title: "Mountain View",
    image: "/gallery1.jpg",
    category: "Nature",
  },
  {
    id: "2",
    title: "City Lights",
    image: "/gallery2.jpg",
    category: "Urban",
  },
  {
    id: "3",
    title: "Workspace",
    image: "/gallery3.jpg",
    category: "Work",
  },
];

// Storage keys
const STORAGE_KEYS = {
  PROFILE: "portfolio_profile",
  PROJECTS: "portfolio_projects",
  EXPERIENCE: "portfolio_experience",
  GALLERY: "portfolio_gallery",
};

// Helper to get from localStorage
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
  }
  return fallback;
}

// Helper to save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

// Initialize local portfolio data
export function initializeLocalPortfolio(): void {
  if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
    saveToStorage(STORAGE_KEYS.PROFILE, defaultProfile);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    saveToStorage(STORAGE_KEYS.PROJECTS, defaultProjects);
  }
  if (!localStorage.getItem(STORAGE_KEYS.EXPERIENCE)) {
    saveToStorage(STORAGE_KEYS.EXPERIENCE, defaultExperience);
  }
  if (!localStorage.getItem(STORAGE_KEYS.GALLERY)) {
    saveToStorage(STORAGE_KEYS.GALLERY, defaultGallery);
  }
}

// GET functions
export async function getProfile(): Promise<Profile> {
  return getFromStorage<Profile>(STORAGE_KEYS.PROFILE, defaultProfile);
}

export async function getProjects(): Promise<Project[]> {
  return getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, defaultProjects);
}

export async function getExperience(): Promise<Experience[]> {
  return getFromStorage<Experience[]>(STORAGE_KEYS.EXPERIENCE, defaultExperience);
}

export async function getGallery(): Promise<GalleryItem[]> {
  return getFromStorage<GalleryItem[]>(STORAGE_KEYS.GALLERY, defaultGallery);
}

// UPDATE functions
export async function updateProfile(profile: Profile): Promise<Profile> {
  saveToStorage(STORAGE_KEYS.PROFILE, profile);
  return profile;
}

export async function updateProjects(projects: Project[]): Promise<Project[]> {
  saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  return projects;
}

export async function updateExperience(experience: Experience[]): Promise<Experience[]> {
  saveToStorage(STORAGE_KEYS.EXPERIENCE, experience);
  return experience;
}

export async function updateGallery(gallery: GalleryItem[]): Promise<GalleryItem[]> {
  saveToStorage(STORAGE_KEYS.GALLERY, gallery);
  return gallery;
}

// Optional: API-based functions (if you have a backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export async function fetchProfileFromAPI(): Promise<Profile> {
  if (!API_BASE_URL) return getProfile();
  const response = await axios.get(`${API_BASE_URL}/api/profile`);
  return response.data;
}

export async function fetchProjectsFromAPI(): Promise<Project[]> {
  if (!API_BASE_URL) return getProjects();
  const response = await axios.get(`${API_BASE_URL}/api/projects`);
  return response.data;
}

export async function fetchExperienceFromAPI(): Promise<Experience[]> {
  if (!API_BASE_URL) return getExperience();
  const response = await axios.get(`${API_BASE_URL}/api/experience`);
  return response.data;
}

export async function fetchGalleryFromAPI(): Promise<GalleryItem[]> {
  if (!API_BASE_URL) return getGallery();
  const response = await axios.get(`${API_BASE_URL}/api/gallery`);
  return response.data;
}

export default {
  initializeLocalPortfolio,
  getProfile,
  getProjects,
  getExperience,
  getGallery,
  updateProfile,
  updateProjects,
  updateExperience,
  updateGallery,
  fetchProfileFromAPI,
  fetchProjectsFromAPI,
  fetchExperienceFromAPI,
  fetchGalleryFromAPI,
};
