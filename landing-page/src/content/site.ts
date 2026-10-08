import type { FooterColumn } from "@/components/navigation/Footer";
import type { NavLink } from "@/components/navigation/NavBar";

export type Track = {
  id: string;
  number: string;
  family: "Build" | "Data" | "Product";
  title: string;
  badge?: string;
  description: string;
  level: string;
  duration: string;
  weekly: string;
  projects: string;
  projectCount: number;
  fee: string;
  /** Finder card only; falls back to `level` when absent. */
  need?: string;
  roles?: string;
};

export const TRACKS: Track[] = [
  {
    id: "fde",
    number: "01",
    family: "Build",
    title: "Forward Deployed AI Engineer",
    badge: "Flagship",
    description: "Own an AI solution end to end — from client discovery to a deployed, monitored system.",
    level: "Advanced",
    duration: "12–24 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹69,999",
    need: "Programming fundamentals in any language",
    roles: "Forward Deployed Engineer · Applied AI Engineer · AI Solutions Engineer",
  },
  {
    id: "dp",
    number: "02",
    family: "Data",
    title: "Data & AI Platform Engineer",
    description: "Build reliable batch and streaming platforms that feed analytics and AI workloads.",
    level: "Intermediate",
    duration: "12–16 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹49,999",
  },
  {
    id: "ds",
    number: "03",
    family: "Data",
    title: "Data Science, Analytics & Decision Intelligence",
    description: "Turn messy business data into analysis, models and recommendations leaders act on.",
    level: "Beginner–Intermediate",
    duration: "10–12 weeks",
    weekly: "8–10 hrs",
    projects: "5 incl. capstone",
    projectCount: 5,
    fee: "₹39,999",
  },
  {
    id: "ml",
    number: "04",
    family: "Build",
    title: "Applied AI & Machine Learning Engineer",
    description: "Train, deploy and monitor ML models as reliable services, not notebook experiments.",
    level: "Intermediate",
    duration: "12–16 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹49,999",
  },
  {
    id: "gen",
    number: "05",
    family: "Build",
    title: "Generative AI & Agentic Systems Engineer",
    description: "Build retrieval, tool-using agents and evaluation pipelines that hold up in production.",
    level: "Intermediate–Advanced",
    duration: "10–12 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹44,999",
  },
  {
    id: "prod",
    number: "06",
    family: "Product",
    title: "AI Product & Automation Builder",
    description: "Find AI opportunities, write the PRD, prototype and launch workflows people adopt.",
    level: "All Levels",
    duration: "8–10 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹34,999",
  },
];

export const FINDER_OPTIONS: { label: string; trackId: Track["id"] }[] = [
  { label: "Ship AI into real businesses", trackId: "fde" },
  { label: "Build data platforms and pipelines", trackId: "dp" },
  { label: "Turn data into decisions", trackId: "ds" },
  { label: "Train and deploy ML models", trackId: "ml" },
  { label: "Build LLM apps and agents", trackId: "gen" },
  { label: "Lead AI products and automation", trackId: "prod" },
];

export const ANNOUNCEMENTS = [
  "Free webinar this Sunday · Sun, 11 Oct, 11:00 AM – 1:00 PM IST",
  "Data & GenAI Career Masterclass",
  "Worth ₹4,999 — now FREE",
  "Live with Puneet Nischal & Bhaskar M",
  "Real fintech case study + career roadmap",
];

export const NAV_LINKS: NavLink[] = [
  { label: "Career tracks", href: "/courses" },
  { label: "Programme+", href: "/#programme" },
  { label: "Certification", href: "/#certification" },
  { label: "Trainers", href: "/#trainers" },
  { label: "Hire from us", href: "#" },
];

export const TRAINERS = [
  { name: "Bhaskar M", initials: "BM", subtitle: "Azure data engineering, Databricks and lakehouse design" },
  { name: "Kamal K Naidu", initials: "KN", subtitle: "Analytics, SQL, KPIs and business storytelling" },
  { name: "Shuja L P", initials: "SL", subtitle: "Data visualisation, storytelling and dashboards" },
  { name: "Naveen G", initials: "NG", subtitle: "Statistics, machine learning and model evaluation" },
  { name: "Puneet Nischal", initials: "PN", subtitle: "LLM applications, RAG and agentic systems" },
  { name: "Ritesh", initials: "R", subtitle: "Product discovery, PRDs, metrics and launches" },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  { title: "Career tracks", links: TRACKS.map((t) => ({ label: t.title, href: "/courses#compare" })) },
  {
    title: "Programme",
    links: [
      { label: "Programme+", href: "/#programme" },
      { label: "Certification", href: "/#certification" },
      { label: "Verify a certificate", href: "#" },
      { label: "Trainers", href: "/#trainers" },
    ],
  },
  {
    title: "For employers",
    links: [
      { label: "Hire from us", href: "#" },
      { label: "Become a partner consultancy", href: "#" },
    ],
  },
];

export const TRACK_FAMILIES: { family: Track["family"]; eyebrow: string; title: string }[] = [
  { family: "Build", eyebrow: "Build tracks", title: "Ship AI systems into production." },
  { family: "Data", eyebrow: "Data tracks", title: "Build the data that AI runs on." },
  { family: "Product", eyebrow: "Product tracks", title: "Decide what gets built, and why." },
];

/** Shared footer copy. */
export const FOOTER_COPY = {
  tagline: "Learn AI. Build real systems. Create impact.",
  note: "Issued by the AI4Impact Institute of Applied AI (IIAA) in academic collaboration with XYZ University. Final wording is subject to the approved collaboration language.",
  legal: "© 2026 AI4Impact. Professional certificates are not academic degrees. Career support does not guarantee employment.",
  legalRight: "Learner data is handled in line with the DPDP Act 2023.",
};
