export type ProjectCategory = "Structural" | "Estimation" | "Inspection";

export type Profile = {
  name: string;
  title: string;
  tagline: string;
  location: string;
  email: string;
  linkedin: string;
  bio: string;
  photo?: string | null;
};

export type Project = {
  id: string;
  title: string;
  category: ProjectCategory;
  description: string;
  tools: string[];
  year: string;
  image?: string;
  link?: string;
};

export type ExperienceItem = {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
  skills: string[];
};

export type GalleryItem = {
  id: string;
  title: string;
  projectId?: string;
  projectTitle: string;
  caption: string;
  imageUrl: string;
};

export type SkillItem = {
  label: string;
  level: number;
  note: string;
};

export type AdminSeed = {
  username: string;
  password: string;
  mustChangePassword: boolean;
};

export const defaultProfile: Profile = {
  name: "Nayan Kuikel",
  title: "Civil Engineer",
  tagline: "Structural precision, cost intelligence, and dependable site judgment.",
  location: "Kathmandu, Bāgmatī, Nepal",
  email: "er.nayan@email.com",
  linkedin: "linkedin.com/in/nayan-kuikel",
  bio: "Civil Engineer specializing in structural inspection and cost estimation. Skilled in analyzing project requirements, assessing costs, preparing detailed estimates, and ensuring structural integrity. Strong communicator and team leader with experience across inspection, reporting, and field coordination.",
  photo: null,
};

export const projects: Project[] = [
  {
    id: "project-residential-inspection",
    title: "Residential House Inspection",
    category: "Inspection",
    description: "Conducted structural inspection of a 3-storey residential building. Identified foundation cracks, documented the condition, and recommended a staged remediation approach.",
    tools: ["AutoCAD", "Field Inspection"],
    year: "2024",
    image: "/blueprint-1.svg",
  },
  {
    id: "project-commercial-estimation",
    title: "Repair Cost Estimation - Commercial Property",
    category: "Estimation",
    description: "Prepared a detailed repair and renovation estimate for a commercial space, covering materials, labor allocation, contingencies, and timeline projections.",
    tools: ["AutoCAD", "Microsoft Excel"],
    year: "2024",
    image: "/blueprint-2.svg",
  },
  {
    id: "project-structural-quality-control",
    title: "Structural Quality Control Report",
    category: "Structural",
    description: "Reviewed site execution against structural and safety standards during construction, then issued a corrective-action report for follow-up by the project team.",
    tools: ["Field Inspection", "Report Writing"],
    year: "2024",
    image: "/blueprint-3.svg",
  },
];

export const experience: ExperienceItem[] = [
  {
    id: "experience-estimator-skillssewa",
    role: "Estimator",
    company: "SkillSewa Pvt. Ltd.",
    duration: "Nov 2024 - Present",
    description: "Developing repair and renovation estimates, evaluating project requirements, preparing quantity takeoffs, and aligning cost decisions with site realities and client expectations.",
    skills: ["Cost Estimation", "Quantity Takeoff", "AutoCAD", "Site Assessment"],
  },
];

export const gallery: GalleryItem[] = [];

export const skillSet: SkillItem[] = [
  { label: "Structural Inspection", level: 90, note: "Field assessment & reporting" },
  { label: "Cost Estimation", level: 88, note: "Quantity takeoff & budgeting" },
  { label: "AutoCAD", level: 80, note: "2D drafting & site plans" },
  { label: "Report Writing", level: 85, note: "Technical documentation" },
  { label: "Site Coordination", level: 82, note: "Team & contractor management" },
];

export const defaultAdmin: AdminSeed = {
  username: "admin",
  password: "nayan2024",
  mustChangePassword: true,
};
