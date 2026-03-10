export type ProjectCategory = "Structural" | "Estimation" | "Inspection";

export type Profile = {
  name: string;
  title: string;
  tagline: string;
  location: string;
  email: string;
  linkedin: string;
  bio: string;
  avatar?: string | null; // URL to profile photo, stored on server
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

// Easy edits:
// Change name, bio, contact details, and tagline -> update profile below.
// New project -> add another object to projects below.
// New job -> add another object to experience below.
// Change colors -> update CSS variables at the top of src/index.css.

export const defaultProfile: Profile = {
  name: "Nayan Kuikel",
  title: "Civil Engineer",
  tagline: "Structural precision, cost intelligence, and dependable site judgment.",
  location: "Kathmandu, Bāgmatī, Nepal",
  email: "er.nayan@email.com",
  linkedin: "linkedin.com/in/nayan-kuikel",
  bio: "Civil Engineer specializing in structural inspection and cost estimation. Skilled in analyzing project requirements, assessing costs, preparing detailed estimates, and ensuring structural integrity. Strong communicator and team leader with experience across inspection, reporting, and field coordination.",
  avatar: null,
};

// New project -> add object to projects[] below.
export const projects: Project[] = [
  {
    id: "project-residential-inspection",
    title: "Residential House Inspection",
    category: "Inspection",
    description:
      "Conducted structural inspection of a 3-storey residential building. Identified foundation cracks, documented the condition, and recommended a staged remediation approach.",
    tools: ["AutoCAD", "Field Inspection"],
    year: "2024",
    image: "/blueprint-1.svg",
  },
  {
    id: "project-commercial-estimation",
    title: "Repair Cost Estimation - Commercial Property",
    category: "Estimation",
    description:
      "Prepared a detailed repair and renovation estimate for a commercial space, covering materials, labor allocation, contingencies, and timeline projections.",
    tools: ["AutoCAD", "Microsoft Excel"],
    year: "2024",
    image: "/blueprint-2.svg",
  },
  {
    id: "project-structural-quality-control",
    title: "Structural Quality Control Report",
    category: "Structural",
    description:
      "Reviewed site execution against structural and safety standards during construction, then issued a corrective-action report for follow-up by the project team.",
    tools: ["AutoCAD", "Report Writing"],
    year: "2024",
    image: "/blueprint-3.svg",
  },
];

export const experience: ExperienceItem[] = [
  {
    id: "experience-estimation-aagaman",
    role: "Estimation Engineer",
    company: "Aagaman Engineering Pvt. Ltd.",
    duration: "Nov 2024 - Present",
    description:
      "Developing repair and renovation estimates, evaluating project requirements, preparing quantity takeoffs, and aligning cost decisions with site realities and client expectations.",
    skills: ["Cost Estimation", "Microsoft Excel", "AutoCAD", "Client Coordination"],
  },
  {
    id: "experience-inspection-skillssewa",
    role: "Inspection Engineer",
    company: "SkillSewa Pvt. Ltd.",
    duration: "Sep 2024 - Nov 2024",
    description:
      "Performed field inspections, reviewed structural conditions, produced inspection notes, and coordinated corrective recommendations with execution teams and stakeholders.",
    skills: ["Field Inspection", "Structural Analysis", "Report Writing", "Team Leadership"],
  },
];

export const gallery: GalleryItem[] = [
  {
    id: "gallery-foundation-map",
    title: "Foundation Crack Mapping",
    projectId: "project-residential-inspection",
    projectTitle: "Residential House Inspection",
    caption: "Annotated crack mapping used to brief the inspection outcome and next repair priorities.",
    imageUrl: "/blueprint-1.svg",
  },
  {
    id: "gallery-cost-scope",
    title: "Commercial Repair Scope",
    projectId: "project-commercial-estimation",
    projectTitle: "Repair Cost Estimation - Commercial Property",
    caption: "Cost planning visual showing the phased renovation scope prepared for budgeting review.",
    imageUrl: "/blueprint-2.svg",
  },
  {
    id: "gallery-quality-report",
    title: "Quality Control Snapshot",
    projectId: "project-structural-quality-control",
    projectTitle: "Structural Quality Control Report",
    caption: "Site documentation panel used to support the report and corrective action log.",
    imageUrl: "/blueprint-3.svg",
  },
];

export const skillSet: SkillItem[] = [
  { label: "Structural Inspection", level: 90, note: "Field-tested across residential and commercial sites" },
  { label: "Cost Estimation", level: 85, note: "Detailed BOQ and repair cost planning" },
  { label: "AutoCAD", level: 80, note: "Drawings, markups, and site documentation" },
  { label: "Microsoft Excel", level: 75, note: "Estimation sheets, data tracking, reporting" },
  { label: "Report Writing", level: 85, note: "Inspection notes, QC reports, client summaries" },
  { label: "Team Leadership", level: 70, note: "Site coordination and stakeholder communication" },
];

export const defaultAdmin: AdminSeed = {
  username: "admin",
  password: "nayan2024",
  mustChangePassword: true,
};
