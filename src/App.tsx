import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  ImagePlus,
  KeyRound,
  Linkedin,
  LogOut,
  Mail,
  MapPin,
  Moon,
  ShieldCheck,
  Sliders,
  Sun,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import {
  defaultProfile,
  type ExperienceItem,
  type GalleryItem,
  type Profile,
  type Project,
  type ProjectCategory,
  type SkillItem,
} from "./lib/portfolioData";
import {
  changeAdminPassword,
  changeAdminUsername,
  clearAuthSession,
  deleteExperience as removeExperience,
  deleteGalleryItem,
  deleteProject as removeProject,
  deleteSkill,
  getAuthSession,
  getExperience,
  getGallery,
  getProfile,
  getProjects,
  getSkills,
  initializeLocalPortfolio,
  loginAdmin,
  saveExperience,
  saveGalleryItem,
  saveProfile,
  saveProject,
  saveSkill,
  uploadAvatar,
  type AuthSession,
  type GalleryMutation,
} from "./lib/portfolioApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const sectionLinks = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#gallery", label: "Gallery" },
  { href: "#contact", label: "Contact" },
];

const projectFilters = ["All", "Structural", "Estimation", "Inspection"] as const;

const inputCls =
  "h-11 w-full border border-[var(--panel-border)] bg-[var(--surface)] px-3 text-sm text-[var(--heading)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)]";
const textAreaCls =
  "min-h-32 w-full border border-[var(--panel-border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--heading)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--surface-strong)]";
const btnCls =
  "inline-flex h-11 items-center justify-center border border-[var(--panel-border)] bg-[var(--surface)] px-5 text-sm font-medium tracking-[0.12em] uppercase text-[var(--heading)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-strong)] cursor-pointer";
const btnPrimary =
  "inline-flex h-11 items-center justify-center px-5 text-sm font-medium tracking-[0.12em] uppercase bg-[var(--accent)] text-white transition hover:opacity-90 cursor-pointer";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectFilter = (typeof projectFilters)[number];
type AdminTab = "projects" | "gallery" | "experience" | "skills" | "profile" | "account";
type Toast = { id: string; message: string; tone: "success" | "error" };

type ProjectDraft = {
  id?: string;
  title: string;
  category: ProjectCategory;
  description: string;
  tools: string;
  year: string;
  image: string;
  link: string;
};

type ExperienceDraft = {
  id?: string;
  role: string;
  company: string;
  duration: string;
  description: string;
  skills: string;
};

type GalleryDraft = {
  id?: string;
  title: string;
  projectId: string;
  projectTitle: string;
  caption: string;
  imageUrl: string;
  file: File | null;
};

type SkillDraft = {
  id?: string;
  label: string;
  level: string;
  note: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now().toString(36)}`;
}

function splitCsv(value: string) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function upsertItem<T extends { id: string }>(items: T[], item: T) {
  return items.some((e) => e.id === item.id)
    ? items.map((e) => (e.id === item.id ? item : e))
    : [item, ...items];
}

function blankProjectDraft(): ProjectDraft {
  return { title: "", category: "Structural", description: "", tools: "", year: "2025", image: "/blueprint-1.svg", link: "" };
}

function blankExperienceDraft(): ExperienceDraft {
  return { role: "", company: "", duration: "", description: "", skills: "" };
}

function blankGalleryDraft(projects: Project[]): GalleryDraft {
  return { title: "", projectId: projects[0]?.id ?? "", projectTitle: projects[0]?.title ?? "", caption: "", imageUrl: "/blueprint-1.svg", file: null };
}

function blankSkillDraft(): SkillDraft {
  return { label: "", level: "85", note: "" };
}

function projectToDraft(p: Project): ProjectDraft {
  return { id: p.id, title: p.title, category: p.category, description: p.description, tools: p.tools.join(", "), year: p.year, image: p.image ?? "", link: p.link ?? "" };
}

function experienceToDraft(j: ExperienceItem): ExperienceDraft {
  return { id: j.id, role: j.role, company: j.company, duration: j.duration, description: j.description, skills: j.skills.join(", ") };
}

function skillToDraft(s: SkillItem): SkillDraft {
  return { id: s.id, label: s.label, level: String(s.level), note: s.note };
}

// ── Store ─────────────────────────────────────────────────────────────────────

function usePortfolioStore() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [projects, setProjects] = useState<Project[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const next = { id: makeId("toast"), message, tone };
    setToasts((c) => [...c, next]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== next.id)), 3200);
  }, []);

  const hydrate = useCallback(async () => {
    setIsBooting(true);
    try {
      const [nextProfile, nextProjects, nextExperience, nextGallery, nextSkills] = await Promise.all([
        getProfile(), getProjects(), getExperience(), getGallery(), getSkills(),
      ]);
      setProfile(nextProfile);
      setProjects([...nextProjects].sort((a, b) => Number(b.year || 0) - Number(a.year || 0)));
      setExperience(nextExperience);
      setGallery(nextGallery);
      setSkills(nextSkills);
    } catch (error) {
      pushToast(toMessage(error), "error");
    } finally {
      setIsBooting(false);
    }
  }, [pushToast]);

  useEffect(() => { initializeLocalPortfolio(); setSession(getAuthSession()); void hydrate(); }, [hydrate]);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const s = await loginAdmin(username, password);
    setSession(s);
    pushToast("Admin access granted.");
    return s;
  }, [pushToast]);

  const handleLogout = useCallback(() => { clearAuthSession(); setSession(null); pushToast("Logged out."); }, [pushToast]);

  const handlePasswordChange = useCallback(async (newPassword: string) => {
    await changeAdminPassword(newPassword);
    setSession((c) => c ? { ...c, mustChangePassword: false } : c);
    pushToast("Password updated.");
  }, [pushToast]);

  const handleSaveProfile = useCallback(async (nextProfile: Profile) => {
    const saved = await saveProfile(nextProfile);
    setProfile(saved);
    pushToast("Profile updated.");
  }, [pushToast]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    const url = await uploadAvatar(file);
    const updated = { ...profile, avatar: url };
    await saveProfile(updated);
    setProfile(updated);
    pushToast("Profile photo updated.");
  }, [profile, pushToast]);

  const handleSaveProject = useCallback(async (draft: ProjectDraft) => {
    const saved = await saveProject({ id: draft.id, title: draft.title, category: draft.category, description: draft.description, tools: splitCsv(draft.tools), year: draft.year, image: draft.image, link: draft.link || undefined });
    setProjects((c) => upsertItem(c, saved).sort((a, b) => Number(b.year || 0) - Number(a.year || 0)));
    pushToast(draft.id ? "Project updated." : "Project added.");
    return saved;
  }, [pushToast]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await removeProject(id);
    setProjects((c) => c.filter((p) => p.id !== id));
    setGallery((c) => c.filter((i) => i.projectId !== id));
    pushToast("Project removed.");
  }, [pushToast]);

  const handleSaveExperience = useCallback(async (draft: ExperienceDraft) => {
    const saved = await saveExperience({ id: draft.id, role: draft.role, company: draft.company, duration: draft.duration, description: draft.description, skills: splitCsv(draft.skills) });
    setExperience((c) => upsertItem(c, saved));
    pushToast(draft.id ? "Experience updated." : "Experience added.");
    return saved;
  }, [pushToast]);

  const handleDeleteExperience = useCallback(async (id: string) => {
    await removeExperience(id);
    setExperience((c) => c.filter((j) => j.id !== id));
    pushToast("Experience removed.");
  }, [pushToast]);

  const handleSaveGallery = useCallback(async (draft: GalleryMutation) => {
    const saved = await saveGalleryItem(draft);
    setGallery((c) => upsertItem(c, saved));
    pushToast("Gallery updated.");
    return saved;
  }, [pushToast]);

  const handleDeleteGallery = useCallback(async (id: string) => {
    await deleteGalleryItem(id);
    setGallery((c) => c.filter((i) => i.id !== id));
    pushToast("Gallery item removed.");
  }, [pushToast]);

  const handleSaveSkill = useCallback(async (draft: SkillDraft) => {
    const saved = await saveSkill({ id: draft.id, label: draft.label, level: Number(draft.level), note: draft.note });
    setSkills((c) => upsertItem(c, saved));
    pushToast(draft.id ? "Skill updated." : "Skill added.");
    return saved;
  }, [pushToast]);

  const handleDeleteSkill = useCallback(async (id: string) => {
    await deleteSkill(id);
    setSkills((c) => c.filter((s) => s.id !== id));
    pushToast("Skill removed.");
  }, [pushToast]);

  return {
    profile, projects, experience, gallery, skills, session, isBooting, toasts,
    handleLogin, handleLogout, handlePasswordChange, handleSaveProfile, handleAvatarUpload,
    handleSaveProject, handleDeleteProject, handleSaveExperience, handleDeleteExperience,
    handleSaveGallery, handleDeleteGallery, handleSaveSkill, handleDeleteSkill,
  };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function SectionIntro({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--muted)]">{number}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-[var(--heading)] md:text-5xl">{title}</h2>
      <p className="max-w-xl text-sm leading-7 text-[var(--muted)] md:text-base">{description}</p>
    </div>
  );
}

function Cursor() {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return;
    const onMove = (e: MouseEvent) => { setVisible(true); setCoords({ x: e.clientX, y: e.clientY }); };
    const onLeave = () => setVisible(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseout", onLeave); };
  }, []);
  return (
    <motion.div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-4 w-4 rounded-full border border-[var(--accent)] bg-[rgba(106,135,165,0.14)] md:block"
      animate={{ x: coords.x - 8, y: coords.y - 8, opacity: visible ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.2 }} />
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[95] flex max-w-sm flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className={`border px-4 py-3 text-sm backdrop-blur-xl ${t.tone === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-[var(--panel-border)] bg-[rgba(255,252,247,0.94)] text-[var(--heading)]"}`}>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Portfolio Page ─────────────────────────────────────────────────────────────

function PortfolioPage({ profile, projects, experience, gallery, skills }: {
  profile: Profile; projects: Project[]; experience: ExperienceItem[]; gallery: GalleryItem[]; skills: SkillItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("theme") as "light" | "dark") || "light");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("theme", theme); }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("All");
  const [galleryFilter, setGalleryFilter] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => { const max = document.body.scrollHeight - window.innerHeight; setProgress(max > 0 ? window.scrollY / max : 0); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelectedProject(null); setLightboxIndex(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredProjects = useMemo(() => projectFilter === "All" ? projects : projects.filter((p) => p.category === projectFilter), [projects, projectFilter]);
  const galleryFilters = useMemo(() => ["All", ...Array.from(new Set(gallery.map((i) => i.projectTitle)))], [gallery]);
  const filteredGallery = useMemo(() => galleryFilter === "All" ? gallery : gallery.filter((i) => i.projectTitle === galleryFilter), [gallery, galleryFilter]);
  const selectedProjectGallery = useMemo(() => !selectedProject ? [] : gallery.filter((i) => i.projectId === selectedProject.id || i.projectTitle === selectedProject.title), [gallery, selectedProject]);
  const lightboxItem = lightboxIndex === null ? null : filteredGallery[lightboxIndex] ?? null;

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = `Project enquiry from ${contactForm.name}`;
    const body = [`Name: ${contactForm.name}`, `Email: ${contactForm.email}`, "", contactForm.message].join("\n");
    setSubmitted(true);
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--panel-border)] bg-[var(--nav-bg)] backdrop-blur-xl">
        <motion.div className="absolute left-0 top-0 h-px bg-[var(--accent)]" style={{ width: `${progress * 100}%` }} />
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10 lg:px-16">
          <a href="#hero" className="flex items-center gap-4 text-[var(--heading)]">
            <div className="flex h-10 w-10 items-center justify-center border border-[var(--panel-border)] font-mono text-xs tracking-[0.3em]">NK</div>
            <div>
              <p className="text-sm font-medium tracking-[0.18em] uppercase">{profile.name}</p>
              <p className="text-xs text-[var(--muted)]">Civil Engineer</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {sectionLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-xs uppercase tracking-[0.22em] text-[var(--nav-link)] transition hover:text-[var(--nav-link-hover)]">{l.label}</a>
            ))}
            <Link to="/admin" className="border border-[var(--accent)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">Admin</Link>
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="flex h-9 w-9 items-center justify-center border border-[var(--panel-border)] transition hover:border-[var(--accent)]">
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </nav>
          <button type="button" onClick={() => setMenuOpen((c) => !c)} className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--heading)] md:hidden">Menu</button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[var(--panel-border)] md:hidden">
              <div className="flex flex-col gap-3 px-6 py-4 text-sm">
                {sectionLinks.map((l) => <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-[var(--nav-link)]">{l.label}</a>)}
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-[var(--accent)]">Admin</Link>
                <button type="button" onClick={() => { toggleTheme(); setMenuOpen(false); }} className="flex items-center gap-2 text-left text-[var(--nav-link)]">
                  {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}{theme === "light" ? "Dark mode" : "Light mode"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* HERO */}
        <section id="hero" className="relative flex min-h-screen items-center overflow-hidden px-6 pt-32 md:px-10 lg:px-16">
          <div className="hero-grid absolute inset-0" />
          <div className="hero-fade absolute inset-0" />
          <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-center">
            <div className="max-w-4xl space-y-8">
              {profile.avatar && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
                  <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[var(--accent)] shadow-lg md:h-32 md:w-32">
                    <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                  </div>
                </motion.div>
              )}
              <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="font-mono text-xs uppercase tracking-[0.48em] text-[var(--muted)]">
                Kathmandu, Bāgmatī, Nepal
              </motion.p>
              <div className="space-y-5">
                <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.08 }} className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-[var(--heading)] md:text-7xl lg:text-[6.4rem]">
                  {profile.name}
                </motion.h1>
                <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 1.1, delay: 0.28 }} className="h-px w-48 origin-left bg-[linear-gradient(90deg,var(--accent),transparent)]" />
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.22 }} className="space-y-4">
                <p className="max-w-2xl text-xl font-medium text-[var(--heading)] md:text-2xl">{profile.title}</p>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">{profile.tagline}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36 }} className="flex flex-col gap-4 sm:flex-row">
                <a href="#projects" className={btnPrimary}>View Projects</a>
                <a href="#contact" className="inline-flex h-11 items-center justify-center border border-[var(--accent)] px-5 text-sm font-medium tracking-[0.12em] uppercase text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">Contact Me</a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-16">
          <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <Reveal><SectionIntro number="01" title="Blueprint thinking, delivered on site." description="Nayan combines field inspection discipline with estimator precision, translating conditions on the ground into reliable budgets, reports, and structural decisions." /></Reveal>
            <Reveal className="grid gap-8 md:grid-cols-2" delay={0.08}>
              <div className="space-y-6">
                <p className="text-sm leading-7 text-[var(--muted)] md:text-base">{profile.bio}</p>
                <div className="space-y-3 border-t border-[var(--panel-border)] pt-6">
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]"><MapPin className="h-4 w-4 text-[var(--accent)]" /><span>{profile.location}</span></div>
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]"><BriefcaseBusiness className="h-4 w-4 text-[var(--accent)]" /><span>Estimator at SkillSewa Pvt. Ltd.</span></div>
                  <div className="flex items-center gap-3 text-sm text-[var(--heading)]"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" /><span>Pokhara University Engineering Graduate</span></div>
                </div>
              </div>
              <div className="space-y-5 border border-[var(--panel-border)] bg-[rgba(9,18,31,0.5)] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[var(--muted)]"><span>Core Capabilities</span><span>Current</span></div>
                {skills.slice(0, 4).map((skill) => (
                  <div key={skill.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-[var(--heading)]"><span>{skill.label}</span><span className="font-mono text-xs text-[var(--muted)]">{skill.level}%</span></div>
                    <div className="h-px w-full bg-white/10">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${skill.level}%` }} viewport={{ once: true }} transition={{ duration: 1 }} className="h-px bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* EXPERIENCE */}
        <section id="experience" className="border-y border-white/5 bg-[rgba(6,12,21,0.52)] py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
            <Reveal className="mb-16"><SectionIntro number="02" title="Recent experience in inspection and estimation." description="A focused track record at SkillSewa, moving from site-led inspection into project estimation with reporting, communication, and decision support built into every stage." /></Reveal>
            <div className="relative ml-4 space-y-14 border-l border-[var(--panel-border)] pl-8 md:ml-8 md:pl-12">
              {experience.map((job, i) => (
                <Reveal key={job.id} delay={i * 0.08} className="relative">
                  <div className="absolute -left-[3.2rem] top-2 h-4 w-4 rounded-full border border-[var(--accent)] bg-[var(--bg)] md:-left-[3.4rem]" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="font-mono text-xs uppercase tracking-[0.34em] text-[var(--muted)]">{job.duration}</p>
                      <h3 className="text-2xl font-semibold text-[var(--heading)]">{job.role} <span className="text-[var(--muted)]">/ {job.company}</span></h3>
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] md:text-base">{job.description}</p>
                    <div className="flex flex-wrap gap-3">
                      {job.skills.map((s) => <span key={s} className="border border-[var(--panel-border)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{s}</span>)}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section id="projects" className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-16">
          <Reveal className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionIntro number="03" title="Project work at the center of the portfolio." description="Inspection findings, structural checks, and cost planning work presented in a clear, filterable system." />
            <div className="flex flex-wrap gap-3">
              {projectFilters.map((f) => (
                <button key={f} type="button" onClick={() => setProjectFilter(f)}
                  className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] transition ${projectFilter === f ? "border-[var(--accent)] bg-[rgba(93,143,202,0.12)] text-[var(--heading)]" : "border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--heading)]"}`}>
                  {f}
                </button>
              ))}
            </div>
          </Reveal>
          <motion.div layout className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.button key={project.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                  type="button" onClick={() => setSelectedProject(project)}
                  className="group flex flex-col overflow-hidden border border-[var(--panel-border)] bg-[var(--surface)] text-left transition hover:border-[var(--accent)]">
                  <div className="relative h-52 overflow-hidden">
                    <img src={project.image ?? "/blueprint-1.svg"} alt={project.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,14,24,0.75))]" />
                  </div>
                  <div className="flex flex-1 flex-col gap-5 p-6">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]"><span>{project.category}</span><span>{project.year}</span></div>
                    <div className="space-y-3"><h3 className="text-2xl font-semibold text-[var(--heading)]">{project.title}</h3><p className="text-sm leading-7 text-[var(--muted)]">{project.description}</p></div>
                    <div className="mt-auto flex flex-wrap gap-2">{project.tools.map((t) => <span key={t} className="border border-[var(--panel-border)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{t}</span>)}</div>
                    <div className="mt-4 h-px w-full bg-white/10"><div className="h-px w-16 bg-[var(--accent)] transition duration-500 group-hover:w-full" /></div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* SKILLS */}
        <section id="skills" className="border-y border-white/5 py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
            <Reveal className="mb-12"><SectionIntro number="04" title="Technical skill set with field-ready depth." description="A concise view of the tools and engineering capabilities used most often in inspection, structural review, estimation, and reporting workflows." /></Reveal>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill, i) => (
                <Reveal key={skill.id} delay={i * 0.04} className="space-y-3 border-t border-[var(--panel-border)] pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div><p className="text-lg font-medium text-[var(--heading)]">{skill.label}</p><p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{skill.note}</p></div>
                    <span className="font-mono text-xs text-[var(--muted)]">{skill.level}%</span>
                  </div>
                  <div className="h-px bg-white/10">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${skill.level}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.05 }} className="h-px bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section id="gallery" className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32 lg:px-16">
          <Reveal className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionIntro number="05" title="Gallery for site records and project visuals." description="A dedicated image layer for inspections, site documentation, and reporting snapshots." />
            <div className="flex flex-wrap gap-3">
              {galleryFilters.map((f) => (
                <button key={f} type="button" onClick={() => setGalleryFilter(f)}
                  className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] transition ${galleryFilter === f ? "border-[var(--accent)] bg-[rgba(93,143,202,0.12)] text-[var(--heading)]" : "border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--heading)]"}`}>
                  {f}
                </button>
              ))}
            </div>
          </Reveal>
          <div className="columns-1 gap-5 md:columns-2 xl:columns-3 [&>button:not(:first-child)]:mt-5">
            {filteredGallery.map((item, index) => (
              <button key={item.id} type="button" onClick={() => setLightboxIndex(index)}
                className="group relative mb-5 block w-full break-inside-avoid overflow-hidden border border-[var(--panel-border)] bg-[rgba(9,18,31,0.5)] text-left">
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,14,24,0.82))] opacity-80 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{item.projectTitle}</p>
                  <p className="text-lg font-medium text-[var(--heading)]">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="border-t border-white/5 bg-[rgba(7,13,22,0.66)] py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-16">
            <Reveal>
              <SectionIntro number="06" title="Available for structural review and estimation work." description="For consultations, inspections, or project budgeting conversations, reach out directly or use the form." />
              <div className="mt-10 space-y-4 text-sm">
                <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-[var(--heading)]"><Mail className="h-4 w-4 text-[var(--accent)]" />{profile.email}</a>
                <a href={`https://${profile.linkedin.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[var(--heading)]"><Linkedin className="h-4 w-4 text-[var(--accent)]" />{profile.linkedin}</a>
                <div className="flex items-center gap-3 text-[var(--heading)]"><MapPin className="h-4 w-4 text-[var(--accent)]" />{profile.location}</div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <form onSubmit={handleContactSubmit} className="space-y-4 border border-[var(--panel-border)] bg-[rgba(9,18,31,0.52)] p-6 backdrop-blur-xl md:p-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-[var(--muted)]">Name<input required value={contactForm.name} onChange={(e) => setContactForm((c) => ({ ...c, name: e.target.value }))} className={inputCls} placeholder="Your name" /></label>
                  <label className="space-y-2 text-sm text-[var(--muted)]">Email<input required type="email" value={contactForm.email} onChange={(e) => setContactForm((c) => ({ ...c, email: e.target.value }))} className={inputCls} placeholder="you@example.com" /></label>
                </div>
                <label className="space-y-2 text-sm text-[var(--muted)]">Message<textarea required value={contactForm.message} onChange={(e) => setContactForm((c) => ({ ...c, message: e.target.value }))} className={textAreaCls} placeholder="Tell me about the project scope." /></label>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="submit" className={btnPrimary}>Send Enquiry</button>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Opens your email client.</p>
                </div>
                {submitted && <p className="text-sm text-[var(--accent)]">Your default mail app should open with the drafted enquiry.</p>}
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-6 py-6 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
        {profile.name} / {new Date().getFullYear()} / Built with precision
      </footer>

      {/* Project modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[rgba(3,7,14,0.82)] p-4 backdrop-blur-xl md:p-8" onClick={() => setSelectedProject(null)}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.35 }}
              className="mx-auto grid h-full max-w-6xl overflow-hidden border border-[var(--panel-border)] bg-[var(--surface)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" onClick={(e) => e.stopPropagation()}>
              <div className="relative min-h-72 border-b border-[var(--panel-border)] md:min-h-full md:border-b-0 md:border-r">
                <img src={selectedProject.image ?? "/blueprint-1.svg"} alt={selectedProject.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col gap-6 overflow-y-auto p-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]"><span>{selectedProject.category}</span><span>{selectedProject.year}</span></div>
                  <h2 className="text-3xl font-semibold text-[var(--heading)]">{selectedProject.title}</h2>
                  <p className="text-sm leading-7 text-[var(--muted)]">{selectedProject.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">{selectedProject.tools.map((t) => <span key={t} className="border border-[var(--panel-border)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{t}</span>)}</div>
                {selectedProjectGallery.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Site photos</p>
                    <div className="grid grid-cols-2 gap-3">{selectedProjectGallery.map((img) => <img key={img.id} src={img.imageUrl} alt={img.title} className="aspect-square w-full border border-[var(--panel-border)] object-cover" />)}</div>
                  </div>
                )}
                {selectedProject.link && <a href={selectedProject.link} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline">View report <ArrowRight className="h-4 w-4" /></a>}
                <button type="button" onClick={() => setSelectedProject(null)} className="mt-2 text-left text-xs uppercase tracking-[0.28em] text-[var(--muted)] hover:text-[var(--heading)]">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,7,14,0.92)] p-4 backdrop-blur-xl" onClick={() => setLightboxIndex(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
              className="relative max-h-[90vh] max-w-5xl overflow-hidden border border-[var(--panel-border)]" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxItem.imageUrl} alt={lightboxItem.title} className="max-h-[80vh] w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent,rgba(7,14,24,0.9))] p-5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{lightboxItem.projectTitle}</p>
                  <p className="text-lg font-medium text-[var(--heading)]">{lightboxItem.title}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLightboxIndex((c) => c === null ? null : (c - 1 + filteredGallery.length) % filteredGallery.length)} className="border border-[var(--panel-border)] p-3"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setLightboxIndex((c) => c === null ? null : (c + 1) % filteredGallery.length)} className="border border-[var(--panel-border)] p-3"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Admin Login ───────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true); setError(null);
    try { await onLogin(username, password); }
    catch (err) { setError(toMessage(err)); }
    finally { setPending(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-6 py-12">
      <div className="hero-grid absolute inset-0" />
      <div className="hero-fade absolute inset-0" />
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md space-y-6 border border-[var(--panel-border)] bg-[var(--surface)] p-8 backdrop-blur-xl">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Admin Portal</p>
          <h1 className="text-3xl font-semibold text-[var(--heading)]">Content control for the portfolio.</h1>
          <p className="text-sm leading-7 text-[var(--muted)]">Log in to edit profile details, experience, projects, skills, and the image gallery.</p>
        </div>
        <label className="block space-y-2 text-sm text-[var(--muted)]">Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
        </label>
        <label className="block space-y-2 text-sm text-[var(--muted)]">Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <button type="submit" className={btnPrimary}>{pending ? "Signing in…" : "Sign in"}</button>
          <Link to="/" className="text-sm text-[var(--muted)] transition hover:text-[var(--heading)]">← Back to site</Link>
        </div>
      </form>
    </div>
  );
}

// ── Force Password Change ─────────────────────────────────────────────────────

function ForcePasswordChange({ onSubmit, onLogout }: { onSubmit: (p: string) => Promise<void>; onLogout: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setPending(true); setError(null);
    try { await onSubmit(password); }
    catch (err) { setError(toMessage(err)); }
    finally { setPending(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 border border-[var(--panel-border)] bg-[var(--surface)] p-8">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Security</p>
          <h1 className="text-3xl font-semibold text-[var(--heading)]">Set your new password.</h1>
          <p className="text-sm leading-7 text-[var(--muted)]">You used the maintenance code. Set a personal password before continuing.</p>
        </div>
        <label className="block space-y-2 text-sm text-[var(--muted)]">New Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></label>
        <label className="block space-y-2 text-sm text-[var(--muted)]">Confirm Password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} /></label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <button type="submit" className={btnPrimary}>{pending ? "Saving…" : "Save Password"}</button>
          <button type="button" onClick={onLogout} className="text-sm text-[var(--muted)] transition hover:text-[var(--heading)]">Logout</button>
        </div>
      </form>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ profile, projects, experience, gallery, skills, onSaveProfile, onSaveProject, onDeleteProject, onSaveExperience, onDeleteExperience, onSaveGallery, onDeleteGallery, onSaveSkill, onDeleteSkill, onLogout, onAvatarUpload }: {
  profile: Profile; projects: Project[]; experience: ExperienceItem[]; gallery: GalleryItem[]; skills: SkillItem[];
  onSaveProfile: (p: Profile) => Promise<void>;
  onSaveProject: (d: ProjectDraft) => Promise<Project>;
  onDeleteProject: (id: string) => Promise<void>;
  onSaveExperience: (d: ExperienceDraft) => Promise<ExperienceItem>;
  onDeleteExperience: (id: string) => Promise<void>;
  onSaveGallery: (d: GalleryMutation) => Promise<GalleryItem>;
  onDeleteGallery: (id: string) => Promise<void>;
  onSaveSkill: (d: SkillDraft) => Promise<SkillItem>;
  onDeleteSkill: (id: string) => Promise<void>;
  onLogout: () => void;
  onAvatarUpload: (f: File) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(blankProjectDraft());
  const [experienceDraft, setExperienceDraft] = useState<ExperienceDraft>(blankExperienceDraft());
  const [galleryDraft, setGalleryDraft] = useState<GalleryDraft>(blankGalleryDraft(projects));
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(blankSkillDraft());
  const [profileDraft, setProfileDraft] = useState(profile);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setProfileDraft(profile), [profile]);
  useEffect(() => {
    setGalleryDraft((c) => {
      if (c.projectId && projects.some((p) => p.id === c.projectId)) return c;
      return blankGalleryDraft(projects);
    });
  }, [projects]);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" /> },
    { id: "gallery", label: "Gallery", icon: <ImagePlus className="h-4 w-4" /> },
    { id: "experience", label: "Experience", icon: <BriefcaseBusiness className="h-4 w-4" /> },
    { id: "skills", label: "Skills", icon: <Sliders className="h-4 w-4" /> },
    { id: "profile", label: "Profile", icon: <UserRound className="h-4 w-4" /> },
    { id: "account", label: "Account", icon: <KeyRound className="h-4 w-4" /> },
  ];

  const handleGallerySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSaveGallery({ id: galleryDraft.id, title: galleryDraft.title, projectId: galleryDraft.projectId || undefined, projectTitle: galleryDraft.projectTitle, caption: galleryDraft.caption, imageUrl: galleryDraft.imageUrl, file: galleryDraft.file });
    setGalleryDraft(blankGalleryDraft(projects));
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try { await onSaveProfile(profileDraft); }
    finally { setPending(false); }
  };

  const handleSkillSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSaveSkill(skillDraft);
    setSkillDraft(blankSkillDraft());
  };

  const handleChangeUsername = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAccountMsg(null); setAccountErr(null);
    try { await changeAdminUsername(newUsername); setAccountMsg("Username updated."); setNewUsername(""); }
    catch (err) { setAccountErr(toMessage(err)); }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setAccountMsg(null); setAccountErr(null);
    if (newPassword.length < 8) { setAccountErr("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setAccountErr("Passwords do not match."); return; }
    try { await changeAdminPassword(newPassword); setAccountMsg("Password updated."); setNewPassword(""); setConfirmPassword(""); }
    catch (err) { setAccountErr(toMessage(err)); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-4 text-[var(--text)] md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="border border-[var(--panel-border)] bg-[var(--surface)] p-6 backdrop-blur-xl">
          <div className="space-y-3 border-b border-[var(--panel-border)] pb-6">
            <div className="inline-flex h-10 w-10 items-center justify-center border border-[var(--panel-border)] font-mono text-xs tracking-[0.3em]">NK</div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[var(--muted)]">Admin Dashboard</p>
              <p className="mt-2 text-xl font-semibold text-[var(--heading)]">Portfolio content manager</p>
            </div>
          </div>
          <nav className="mt-6 space-y-2">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex w-full cursor-pointer items-center gap-3 border px-4 py-3 text-left text-sm transition ${activeTab === tab.id ? "border-[var(--accent)] bg-[rgba(93,143,202,0.14)] text-[var(--heading)]" : "border-[var(--panel-border)] text-[var(--muted)] hover:border-[var(--panel-border)] hover:text-[var(--heading)]"}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-8 space-y-3 border-t border-[var(--panel-border)] pt-6 text-sm text-[var(--muted)]">
            <p>{projects.length} projects</p><p>{gallery.length} gallery assets</p><p>{experience.length} roles</p><p>{skills.length} skills</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/" className={btnCls}>View Site</Link>
            <button type="button" onClick={onLogout} className={`${btnCls} justify-center`}><LogOut className="mr-2 h-4 w-4" />Logout</button>
          </div>
        </aside>

        {/* Main content */}
        <main className="border border-[var(--panel-border)] bg-[var(--surface)] p-6 backdrop-blur-xl md:p-8">

          {/* PROJECTS TAB */}
          {activeTab === "projects" && (
            <form onSubmit={async (e) => { e.preventDefault(); await onSaveProject(projectDraft); setProjectDraft(blankProjectDraft()); }} className="space-y-6">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Projects</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Add or edit projects</h2></div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Title<input value={projectDraft.title} onChange={(e) => setProjectDraft((c) => ({ ...c, title: e.target.value }))} className={inputCls} /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">Category
                  <select value={projectDraft.category} onChange={(e) => setProjectDraft((c) => ({ ...c, category: e.target.value as ProjectCategory }))} className={inputCls}>
                    <option value="Structural">Structural</option><option value="Estimation">Estimation</option><option value="Inspection">Inspection</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Description<textarea value={projectDraft.description} onChange={(e) => setProjectDraft((c) => ({ ...c, description: e.target.value }))} className={textAreaCls} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Tools (comma separated)<input value={projectDraft.tools} onChange={(e) => setProjectDraft((c) => ({ ...c, tools: e.target.value }))} className={inputCls} /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">Year<input value={projectDraft.year} onChange={(e) => setProjectDraft((c) => ({ ...c, year: e.target.value }))} className={inputCls} /></label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className={btnPrimary}>{projectDraft.id ? "Update Project" : "Add Project"}</button>
                {projectDraft.id && <button type="button" onClick={() => setProjectDraft(blankProjectDraft())} className={btnCls}>Cancel</button>}
              </div>
              {projects.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-[var(--panel-border)] pt-6">
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Existing Projects</p>
                  {projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 border border-[var(--panel-border)] px-4 py-3">
                      <div><p className="text-sm font-medium text-[var(--heading)]">{p.title}</p><p className="text-xs text-[var(--muted)]">{p.category} · {p.year}</p></div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setProjectDraft(projectToDraft(p))} className="cursor-pointer text-xs text-[var(--accent)] hover:underline">Edit</button>
                        <button type="button" onClick={() => onDeleteProject(p.id)} className="cursor-pointer text-xs text-red-400 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* GALLERY TAB */}
          {activeTab === "gallery" && (
            <form onSubmit={handleGallerySubmit} className="space-y-6">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Gallery</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Add site photos</h2></div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Title<input value={galleryDraft.title} onChange={(e) => setGalleryDraft((c) => ({ ...c, title: e.target.value }))} className={inputCls} /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Project
                <select value={galleryDraft.projectId} onChange={(e) => { const sel = projects.find((p) => p.id === e.target.value); setGalleryDraft((c) => ({ ...c, projectId: e.target.value, projectTitle: sel?.title ?? c.projectTitle })); }} className={inputCls}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Caption<textarea value={galleryDraft.caption} onChange={(e) => setGalleryDraft((c) => ({ ...c, caption: e.target.value }))} className={textAreaCls} /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Image URL<input value={galleryDraft.imageUrl} onChange={(e) => setGalleryDraft((c) => ({ ...c, imageUrl: e.target.value, file: null }))} className={inputCls} placeholder="https://... or /blueprint-1.svg" /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Upload File
                <input type="file" accept="image/*" onChange={(e) => setGalleryDraft((c) => ({ ...c, file: e.target.files?.[0] ?? null }))} className="block w-full text-sm text-[var(--muted)] file:mr-4 file:border file:border-[var(--panel-border)] file:bg-transparent file:px-4 file:py-3 file:text-xs file:uppercase file:tracking-[0.22em] file:text-[var(--heading)] file:cursor-pointer" />
              </label>
              <button type="submit" className={btnPrimary}>Save Photo</button>
              {gallery.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-[var(--panel-border)] pt-6">
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Gallery Items</p>
                  {gallery.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 border border-[var(--panel-border)] px-4 py-3">
                      <div><p className="text-sm font-medium text-[var(--heading)]">{item.title}</p><p className="text-xs text-[var(--muted)]">{item.projectTitle}</p></div>
                      <button type="button" onClick={() => onDeleteGallery(item.id)} className="cursor-pointer text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* EXPERIENCE TAB */}
          {activeTab === "experience" && (
            <form onSubmit={async (e) => { e.preventDefault(); await onSaveExperience(experienceDraft); setExperienceDraft(blankExperienceDraft()); }} className="space-y-6">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Experience</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Add or edit roles</h2></div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Role<input value={experienceDraft.role} onChange={(e) => setExperienceDraft((c) => ({ ...c, role: e.target.value }))} className={inputCls} /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">Company<input value={experienceDraft.company} onChange={(e) => setExperienceDraft((c) => ({ ...c, company: e.target.value }))} className={inputCls} /></label>
              </div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Duration<input value={experienceDraft.duration} onChange={(e) => setExperienceDraft((c) => ({ ...c, duration: e.target.value }))} className={inputCls} placeholder="e.g. Jan 2024 - Present" /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Description<textarea value={experienceDraft.description} onChange={(e) => setExperienceDraft((c) => ({ ...c, description: e.target.value }))} className={textAreaCls} /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Skills (comma separated)<input value={experienceDraft.skills} onChange={(e) => setExperienceDraft((c) => ({ ...c, skills: e.target.value }))} className={inputCls} /></label>
              <div className="flex gap-3">
                <button type="submit" className={btnPrimary}>{experienceDraft.id ? "Update Role" : "Add Role"}</button>
                {experienceDraft.id && <button type="button" onClick={() => setExperienceDraft(blankExperienceDraft())} className={btnCls}>Cancel</button>}
              </div>
              {experience.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-[var(--panel-border)] pt-6">
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Existing Roles</p>
                  {experience.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-4 border border-[var(--panel-border)] px-4 py-3">
                      <div><p className="text-sm font-medium text-[var(--heading)]">{job.role}</p><p className="text-xs text-[var(--muted)]">{job.company} · {job.duration}</p></div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setExperienceDraft(experienceToDraft(job))} className="cursor-pointer text-xs text-[var(--accent)] hover:underline">Edit</button>
                        <button type="button" onClick={() => onDeleteExperience(job.id)} className="cursor-pointer text-xs text-red-400 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* SKILLS TAB */}
          {activeTab === "skills" && (
            <form onSubmit={handleSkillSubmit} className="space-y-6">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Skills</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Add or edit skills</h2></div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Skill name<input value={skillDraft.label} onChange={(e) => setSkillDraft((c) => ({ ...c, label: e.target.value }))} className={inputCls} placeholder="e.g. AutoCAD" /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">Level (0–100)
                  <input type="number" min="0" max="100" value={skillDraft.level} onChange={(e) => setSkillDraft((c) => ({ ...c, level: e.target.value }))} className={inputCls} />
                </label>
              </div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Note / description<input value={skillDraft.note} onChange={(e) => setSkillDraft((c) => ({ ...c, note: e.target.value }))} className={inputCls} placeholder="e.g. Drawing review and coordination" /></label>
              {/* Live preview */}
              {skillDraft.label && (
                <div className="space-y-2 border border-[var(--panel-border)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Preview</p>
                  <div className="flex items-end justify-between text-sm text-[var(--heading)]"><span>{skillDraft.label}</span><span className="font-mono text-xs text-[var(--muted)]">{skillDraft.level}%</span></div>
                  <div className="h-px bg-white/10"><div className="h-px bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]" style={{ width: `${Math.min(Number(skillDraft.level), 100)}%` }} /></div>
                  {skillDraft.note && <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{skillDraft.note}</p>}
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" className={btnPrimary}>{skillDraft.id ? "Update Skill" : "Add Skill"}</button>
                {skillDraft.id && <button type="button" onClick={() => setSkillDraft(blankSkillDraft())} className={btnCls}>Cancel</button>}
              </div>
              {skills.length > 0 && (
                <div className="mt-8 space-y-3 border-t border-[var(--panel-border)] pt-6">
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Existing Skills</p>
                  {skills.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 border border-[var(--panel-border)] px-4 py-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[var(--heading)]">{s.label}</span>
                          <span className="font-mono text-xs text-[var(--muted)]">{s.level}%</span>
                        </div>
                        <div className="h-px bg-white/10"><div className="h-px bg-[var(--accent)]" style={{ width: `${s.level}%` }} /></div>
                      </div>
                      <div className="ml-4 flex shrink-0 gap-2">
                        <button type="button" onClick={() => setSkillDraft(skillToDraft(s))} className="cursor-pointer text-xs text-[var(--accent)] hover:underline">Edit</button>
                        <button type="button" onClick={() => onDeleteSkill(s.id)} className="cursor-pointer text-xs text-red-400 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Profile</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Edit public identity and contact details</h2></div>
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted)]">Profile Photo</p>
                <div className="flex items-center gap-5">
                  {profileDraft.avatar ? (
                    <img src={profileDraft.avatar} alt="Avatar" className="h-20 w-20 rounded-full border-2 border-[var(--accent)] object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--panel-border)] bg-[var(--surface-strong)] text-[var(--muted)]"><UserRound className="h-8 w-8" /></div>
                  )}
                  <div className="space-y-2">
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onAvatarUpload(f); }} />
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className={btnCls}>Upload Photo</button>
                    {profileDraft.avatar && (
                      <button type="button" onClick={() => { const next = { ...profileDraft, avatar: undefined }; setProfileDraft(next); onSaveProfile(next); }} className="block cursor-pointer text-xs text-red-400 hover:underline">Remove photo</button>
                    )}
                  </div>
                </div>
              </div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Name<input value={profileDraft.name} onChange={(e) => setProfileDraft((c) => ({ ...c, name: e.target.value }))} className={inputCls} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Title<input value={profileDraft.title} onChange={(e) => setProfileDraft((c) => ({ ...c, title: e.target.value }))} className={inputCls} /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">Location<input value={profileDraft.location} onChange={(e) => setProfileDraft((c) => ({ ...c, location: e.target.value }))} className={inputCls} /></label>
              </div>
              <label className="space-y-2 text-sm text-[var(--muted)]">Tagline<input value={profileDraft.tagline} onChange={(e) => setProfileDraft((c) => ({ ...c, tagline: e.target.value }))} className={inputCls} /></label>
              <label className="space-y-2 text-sm text-[var(--muted)]">Bio<textarea value={profileDraft.bio} onChange={(e) => setProfileDraft((c) => ({ ...c, bio: e.target.value }))} className={textAreaCls} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--muted)]">Email<input value={profileDraft.email} onChange={(e) => setProfileDraft((c) => ({ ...c, email: e.target.value }))} className={inputCls} /></label>
                <label className="space-y-2 text-sm text-[var(--muted)]">LinkedIn<input value={profileDraft.linkedin} onChange={(e) => setProfileDraft((c) => ({ ...c, linkedin: e.target.value }))} className={inputCls} /></label>
              </div>
              <button type="submit" className={btnPrimary}>{pending ? "Saving…" : "Save Profile"}</button>
            </form>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            <div className="space-y-10">
              <div className="space-y-3"><p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Account</p><h2 className="text-2xl font-semibold text-[var(--heading)]">Change username & password</h2><p className="text-sm text-[var(--muted)]">Changes apply immediately on all devices.</p></div>
              {accountMsg && <p className="text-sm text-[var(--accent)]">{accountMsg}</p>}
              {accountErr && <p className="text-sm text-red-400">{accountErr}</p>}
              <form onSubmit={handleChangeUsername} className="space-y-4 border border-[var(--panel-border)] p-6">
                <p className="font-medium text-[var(--heading)]">Change Username</p>
                <label className="block space-y-2 text-sm text-[var(--muted)]">New Username<input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inputCls} placeholder="min. 3 characters" /></label>
                <button type="submit" className={btnPrimary}>Update Username</button>
              </form>
              <form onSubmit={handleChangePassword} className="space-y-4 border border-[var(--panel-border)] p-6">
                <p className="font-medium text-[var(--heading)]">Change Password</p>
                <label className="block space-y-2 text-sm text-[var(--muted)]">New Password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="min. 8 characters" /></label>
                <label className="block space-y-2 text-sm text-[var(--muted)]">Confirm Password<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} /></label>
                <button type="submit" className={btnPrimary}>Update Password</button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────

export function App() {
  const store = usePortfolioStore();

  if (store.isBooting) {
    return (
      <div className="light-theme flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--heading)]">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse border border-[var(--panel-border)] bg-[rgba(93,143,202,0.14)]" />
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Loading portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="light-theme">
        <Cursor />
        <Routes>
          <Route path="/" element={<PortfolioPage profile={store.profile} projects={store.projects} experience={store.experience} gallery={store.gallery} skills={store.skills} />} />
          <Route path="/admin" element={
            store.session ? (
              store.session.mustChangePassword ? (
                <ForcePasswordChange onSubmit={store.handlePasswordChange} onLogout={store.handleLogout} />
              ) : (
                <AdminDashboard
                  profile={store.profile} projects={store.projects} experience={store.experience}
                  gallery={store.gallery} skills={store.skills}
                  onSaveProfile={store.handleSaveProfile} onSaveProject={store.handleSaveProject}
                  onDeleteProject={store.handleDeleteProject} onSaveExperience={store.handleSaveExperience}
                  onDeleteExperience={store.handleDeleteExperience} onSaveGallery={store.handleSaveGallery}
                  onDeleteGallery={store.handleDeleteGallery} onSaveSkill={store.handleSaveSkill}
                  onDeleteSkill={store.handleDeleteSkill} onLogout={store.handleLogout}
                  onAvatarUpload={store.handleAvatarUpload}
                />
              )
            ) : (
              <AdminLogin onLogin={async (u, p) => { await store.handleLogin(u, p); }} />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastStack toasts={store.toasts} />
      </div>
    </BrowserRouter>
  );
}
