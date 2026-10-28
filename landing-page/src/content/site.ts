import type { FooterColumn } from "@/components/navigation/Footer";
import type { NavLink } from "@/components/navigation/NavBar";
import { POLICY_LINKS } from "@/content/legal";

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
  /** False until this track is published in the backend billing catalog. */
  demoCheckoutEnabled?: boolean;
  /** Finder card only; falls back to `level` when absent. */
  need?: string;
  roles?: string;
  /** Course detail page; tracks without one link to the listing. */
  href?: string;
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
    href: "/courses/forward-deployed-ai-engineer",
  },
  {
    id: "az",
    demoCheckoutEnabled: false,
    number: "02",
    family: "Data",
    title: "Azure/Fabric Data Engineering",
    description: "Build Azure and Microsoft Fabric pipelines, from ADF ingestion and Databricks lakehouses to Power BI reports.",
    level: "Beginner–Advanced",
    duration: "8 weeks",
    weekly: "10–15 hrs",
    projects: "1 mini + 1 end-to-end",
    projectCount: 2,
    fee: "₹25,000",
    need: "SQL and Python basics — both covered in the training",
    roles: "Azure Data Engineer · Data Engineer · Fabric Data Engineer · Data Analyst",
    href: "/courses/azure-fabric-data-engineering",
  },
  {
    id: "dp",
    number: "03",
    family: "Data",
    title: "Data & AI Platform Engineer",
    description: "Build reliable batch and streaming platforms that feed analytics and AI workloads.",
    level: "Intermediate",
    duration: "12–16 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹49,999",
    need: "SQL and basic programming in any language",
    roles: "Data Engineer · Analytics Engineer · Data Platform Engineer",
    href: "/courses/data-ai-platform-engineer",
  },
  {
    id: "ds",
    number: "04",
    family: "Data",
    title: "Data Science, Analytics & Decision Intelligence",
    description: "Turn messy business data into analysis, models and recommendations leaders act on.",
    level: "Beginner–Intermediate",
    duration: "10–12 weeks",
    weekly: "8–10 hrs",
    projects: "5 incl. capstone",
    projectCount: 5,
    fee: "₹39,999",
    need: "Basic mathematics and spreadsheet familiarity",
    roles: "Data Analyst · Business / Product Analyst · Junior Data Scientist",
    href: "/courses/data-science-analytics-decision-intelligence",
  },
  {
    id: "ml",
    number: "05",
    family: "Build",
    title: "Applied AI & Machine Learning Engineer",
    description: "Train, deploy and monitor ML models as reliable services, not notebook experiments.",
    level: "Intermediate",
    duration: "12–16 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹49,999",
    need: "Python, SQL basics and statistics fundamentals",
    roles: "Machine Learning Engineer · Applied Scientist · MLOps Engineer",
    href: "/courses/applied-ai-machine-learning-engineer",
  },
  {
    id: "gen",
    number: "06",
    family: "Build",
    title: "Generative AI & Agentic Systems Engineer",
    description: "Build retrieval, tool-using agents and evaluation pipelines that hold up in production.",
    level: "Intermediate–Advanced",
    duration: "10–12 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹44,999",
    need: "Python and working with REST APIs",
    roles: "GenAI Engineer · AI Agent Engineer · LLMOps Engineer",
    href: "/courses/generative-ai-agentic-systems-engineer",
  },
  {
    id: "prod",
    number: "07",
    family: "Product",
    title: "AI Product & Automation Builder",
    description: "Find AI opportunities, write the PRD, prototype and launch workflows people adopt.",
    level: "All Levels",
    duration: "8–10 weeks",
    weekly: "8–10 hrs",
    projects: "4 incl. capstone",
    projectCount: 4,
    fee: "₹34,999",
    need: "Basic digital fluency — no coding required",
    roles: "AI Product Manager · Automation Specialist · AI Business Analyst",
    href: "/courses/ai-product-automation-builder",
  },
];

export const FINDER_OPTIONS: { label: string; trackId: Track["id"] }[] = [
  { label: "Ship AI into real businesses", trackId: "fde" },
  { label: "Engineer data on Azure and Fabric", trackId: "az" },
  { label: "Build data platforms and pipelines", trackId: "dp" },
  { label: "Turn data into decisions", trackId: "ds" },
  { label: "Train and deploy ML models", trackId: "ml" },
  { label: "Build LLM apps and agents", trackId: "gen" },
  { label: "Lead AI products and automation", trackId: "prod" },
];

export const ANNOUNCEMENTS = [
  "Explore seven career tracks in AI, data and product",
  "Structured learning and real-world projects",
  "Book free career guidance",
];

export const NAV_LINKS: NavLink[] = [
  { label: "Career tracks", href: "/courses" },
  { label: "Programme+", href: "/programme-plus" },
  { label: "Certification", href: "/certification" },
  { label: "Verify certificate", href: "/verify" },
  { label: "Trainers", href: "/trainers" },
  { label: "Hire from us", href: "/hire-from-us" },
];

export type Trainer = {
  /** Profile route: /trainers/[slug]. */
  slug: string;
  name: string;
  initials: string;
  /** Specialism line, shown on the home row and the trainer card. */
  subtitle: string;
  /** Optional job title under the name on the trainers page. */
  role?: string;
  /** e.g. "Lead trainer · DAPE"; codes are the short track names used in timetables. */
  assignments: string[];
  /** Weekly clarification topics on the profile page. */
  topics: string[];
};

export const TRAINERS: Trainer[] = [
  {
    slug: "bhaskar-m",
    name: "Bhaskar M",
    initials: "BM",
    role: "Hands-on Azure Data Engineer & Analyst",
    subtitle: "15+ years in data engineering and BI; 10 years teaching Azure Data Factory, Databricks and Microsoft Fabric",
    assignments: ["Lead trainer · AFDE", "Lead trainer · DAPE"],
    topics: ["Azure Data Factory", "Databricks", "Delta Lake", "Microsoft Fabric", "Power BI"],
  },
  {
    slug: "kamal-k-naidu",
    name: "Kamal K Naidu",
    initials: "KN",
    subtitle: "Analytics, SQL, KPIs and business dashboards",
    assignments: ["Lead trainer · DSDI"],
    topics: ["SQL for analysis", "KPI design", "Funnels and cohorts", "Power BI"],
  },
  {
    slug: "shuja-l-p",
    name: "Shuja L P",
    initials: "SL",
    subtitle: "Data visualisation, storytelling and web visuals",
    assignments: ["Co-trainer · DSDI"],
    topics: ["Chart selection", "Data storytelling", "Dashboard layout", "Web visuals"],
  },
  {
    slug: "naveen-g",
    name: "Naveen G",
    initials: "NG",
    subtitle: "Statistics, machine learning and explainable models",
    assignments: ["Lead trainer · AIML", "Lead trainer · DSDI"],
    topics: ["Statistics", "Model evaluation", "Feature engineering", "Explainability"],
  },
  {
    slug: "puneet-nischal",
    name: "Puneet Nischal",
    initials: "PN",
    subtitle: "LLM applications, RAG and agentic systems",
    assignments: ["Lead trainer · GENAI", "Lead trainer · FDE"],
    topics: ["RAG pipelines", "Prompt design", "Agent workflows", "LLM evaluation"],
  },
  {
    slug: "ritesh",
    name: "Ritesh",
    initials: "R",
    subtitle: "Product discovery, PRDs, metrics and AI products",
    assignments: ["Lead trainer · APAB"],
    topics: ["Product discovery", "Writing PRDs", "Product metrics", "AI automation"],
  },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  { title: "Career tracks", links: TRACKS.map((t) => ({ label: t.title, href: t.href ?? "/courses#compare" })) },
  {
    title: "Programme",
    links: [
      { label: "Programme+", href: "/programme-plus" },
      { label: "Certification", href: "/certification" },
      { label: "Verify a certificate", href: "/verify" },
      { label: "Trainers", href: "/trainers" },
    ],
  },
  {
    title: "For employers",
    links: [
      { label: "Hire from us", href: "/hire-from-us" },
      { label: "Become a partner consultancy", href: "/hire-from-us#consultancies" },
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
  policies: POLICY_LINKS,
};

export const CERT_TIERS = {
  completion: {
    eyebrow: "What you get by finishing",
    title: "Course completion",
    subtitle: "You watched the lessons and submitted the work.",
    items: ["90%+ of lessons completed", "All weekly assignments submitted", "Quizzes attempted"],
    footer: "Record of completion in your learner profile",
  },
  professional: {
    eyebrow: "What employers can verify",
    title: "Professional certificate",
    subtitle: "You proved you can do the work, under assessment.",
    items: [
      "Overall assessed score of 70% or more",
      "Capstone passed by an independent reviewer",
      "Capstone defence: a recorded walkthrough and Q&A",
    ],
    footer: "Verifiable certificate with credential ID and QR code",
  },
};

export const CERT_ISSUERS = [
  { icon: "shield", title: "IIAA", body: "Sets the assessment standard, reviews capstones and issues certificates." },
  { icon: "university", title: "XYZ University", body: "Academic collaboration on curriculum and assessment design." },
  { icon: "employer", title: "Employers", body: "Verify any certificate by credential ID or QR code." },
] as const;

/** Numbered to match the markers on `<Certificate annotated />`. */
export const CERT_ANATOMY = [
  { title: "Learner name", body: "The legal name you register with, checked at enrolment." },
  { title: "Professional certificate title", body: "Names the role-led track, not a generic course." },
  { title: "Course", body: "The track and core weeks you completed." },
  { title: "Capstone", body: "The capstone you built and defended." },
  { title: "Assessment", body: "Your result band after independent review." },
  { title: "Issue date", body: "When the certificate was awarded." },
  { title: "Credential ID", body: "A unique ID that employers can look up." },
  { title: "Verification QR / URL", body: "Scan or visit to confirm it is genuine." },
  { title: "Authorised signatures", body: "Signed for IIAA and the academic partner." },
];

export const SCORE_WEIGHTS = [
  { label: "Capstone", weight: 40, color: "bg-(--teal-600)" },
  { label: "Projects", weight: 30, color: "bg-(--navy-800)" },
  { label: "Weekly assignments", weight: 20, color: "bg-(--amber-500)" },
  { label: "Quizzes", weight: 10, color: "bg-(--slate-300)" },
];

export const PROGRAMME_PLUS = {
  price: "₹24,999",
  internationalPrice: "$329",
  journey: ["Learn", "Build", "Intern", "Practise", "Apply", "Interview"],
  modules: [
    {
      number: "01",
      title: "Real-World Internship",
      description: "3 months on a live project, with mentor reviews.",
      note: "Freshers and recent graduates only. Subject to eligibility and project availability.",
      items: [
        "Fintech-first or alternative-domain project",
        "Weekly mentor reviews",
        "Internship certificate and recommendation letter on successful completion",
      ],
    },
    {
      number: "02",
      title: "Interview Builder",
      description: "CV review, 10 AI-assisted mock interviews and a plan to improve.",
      items: [
        "CV and LinkedIn review against target roles",
        "10 AI-assisted mock interview sessions",
        "Written feedback after each session",
        "Personal improvement plan",
      ],
    },
    {
      number: "03",
      title: "Recruitment Support",
      description: "Recommendations through 10+ recruitment and consultancy relationships.",
      items: [
        "Profile shared with suitable recruitment and consultancy partners",
        "Recommendations for Indian and international opportunities",
        "Application guidance for each recommendation",
      ],
    },
    {
      number: "04",
      title: "Weekly Group Clarification",
      description: "A recurring live session every week for questions and reviews.",
      items: [
        "Live group session each week",
        "Bring blockers from labs, projects and interviews",
        "Recordings available afterwards",
      ],
    },
    {
      number: "05",
      title: "Personal Handholding",
      description: "Five individual 30-minute sessions, booked when you need them.",
      items: [
        "Five 30-minute one-to-one sessions",
        "Use them for scoping, reviews or career direction",
        "Booked through your learner dashboard",
      ],
    },
  ] as { number: string; title: string; description: string; note?: string; items: string[] }[],
  notGuaranteed: [
    "Employment, interviews or a specific salary — hiring decisions are made by employers.",
    "An internship for every learner — places depend on eligibility and project availability.",
    "Visa sponsorship or work authorisation for international roles.",
  ],
};

export const HIRE = {
  benefits: [
    {
      icon: "verified",
      title: "Verified skills",
      body: "Every candidate carries a verifiable credential ID and a scored capstone.",
    },
    {
      icon: "tested",
      title: "Project-tested",
      body: "Fintech-first capstones mean candidates have shipped realistic, domain-relevant work.",
    },
    {
      icon: "shortlist",
      title: "Role-matched shortlists",
      body: "We shortlist by role, level and location so you only see relevant profiles.",
    },
  ] as const,
  consultancy: {
    title: "Recruitment consultancies",
    body: "Join our Exclusive Hiring Network to receive pre-screened candidates in India and abroad. Partner consultancies must never charge learners.",
  },
  disclaimer:
    "AI4Impact provides career support and recommendations. It does not guarantee employment, interviews, a specific salary or visa sponsorship. Hiring decisions are made by employers.",
};

export const LOGIN_FEATURES = [
  { icon: "recordings", title: "Recorded sessions", body: "Pick up every module where you left off." },
  { icon: "calls", title: "Weekly clarification calls", body: "Join live calls and see the recordings." },
  { icon: "projects", title: "Projects & capstone", body: "Submit work and read your mentor’s feedback." },
  { icon: "certificates", title: "Certificates", body: "Download and share verifiable credentials." },
] as const;

/** Keep marketing-only tracks on guidance until their backend catalog entry is ready. */
export function getTrackAction(track: Track | undefined) {
  const slug = track?.href?.split("/").pop();
  if (!slug || track?.demoCheckoutEnabled === false) {
    return { href: "#guidance", label: "Book free guidance" };
  }
  return {
    href: `https://main.d16744ddqs159z.amplifyapp.com/student?course=${encodeURIComponent(slug)}`,
    label: "View demo checkout",
  };
}
