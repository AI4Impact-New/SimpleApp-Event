import { CalendarClock, CirclePlay, Hammer, Workflow, type LucideIcon } from "lucide-react";
import type { ProjectPreviewKey } from "@/components/cards/ProjectPreviews";
import { TRACKS, TRAINERS, type Track, type Trainer } from "./site";

/** A syllabus module inside a week, with its full topic list. */
export type CourseModule = { title: string; topics: string[] };

/**
 * `lab`, `assignment` and `modules` are optional; a week with none of them renders as a plain topic row.
 * `modules` shows the full syllabus breakdown when the week is opened.
 */
export type CourseWeek = {
  title: string;
  topics: string[];
  lab?: string;
  assignment?: string;
  modules?: CourseModule[];
};

export type CoursePhase = {
  title: string;
  summary: string;
  /** Inclusive week range within the core 12 weeks, e.g. [1, 4]. */
  weeks: [number, number];
  /** Tools taught in this phase, shown as logos; names must be keys of `TOOL_LOGOS`. */
  tools?: string[];
  items: CourseWeek[];
};

export type CourseProject = {
  windowTitle: string;
  preview: ProjectPreviewKey;
  title: string;
  description: string;
  dataset: string;
  tags: string[];
};

export type CourseDetail = {
  trackId: Track["id"];
  /** Wording on the hero enrol button, e.g. "Enrol in Forward Deployed AI Engineering". */
  enrolLabel: string;
  hero: { title: string; lead: string };
  pricing: { instalments?: string; international: string; nextCohort: string };
  problem: { title: string; body: string; points: string[] };
  outcomes: { value: string; label: string }[];
  builtFor: string[];
  prerequisites: { required: string[]; helpful?: string[]; notRequired?: string[] };
  /** Overrides the default "How you learn" section (recorded lessons with weekly live help). */
  delivery?: {
    title: [string, string];
    features: { icon: LucideIcon; title: string; description: string }[];
    note: string;
  };
  tools: string[];
  coreWeeks: number;
  phases: CoursePhase[];
  paceNote: string;
  projects: CourseProject[];
  capstone: {
    /** Panel label; defaults to "Fintech-first capstone". */
    eyebrow?: string;
    title: string;
    body: string;
    dataset?: string;
    stages: { title: string; body: string }[];
    /** Empty hides the "Prefer another domain?" note. */
    altDomains: string[];
  };
  /** Trainer assignment code, matched against `Trainer.assignments`. */
  trainerCode: string;
  roles: { title: string; body: string }[];
  certificate: { capstone: string; credentialId: string };
  faqs: { question: string; answer: string }[];
};

/** FAQs every track answers the same way. */
const COMMON_FAQS = {
  week: {
    question: "How is a typical week structured?",
    answer:
      "Each week has short recorded lessons, a hands-on lab and an assignment, plus a live clarification session with your trainer. Plan for 8–10 hours a week, including the live session.",
  },
  handholding: {
    question: "What are the five individual handholding sessions?",
    answer:
      "They are part of Programme+: five one-to-one 30-minute sessions you book through your learner dashboard and use for scoping, reviews or career direction.",
  },
  fintech: {
    question: "Is the capstone always in fintech?",
    answer:
      "Fintech is the default. If you prefer another domain, you can choose SaaS, E-commerce, Logistics or Healthcare at the capstone kick-off.",
  },
  job: {
    question: "Does the course guarantee a job?",
    answer:
      "No. AI4Impact provides career support and recommendations, but it does not guarantee employment, interviews or a particular salary. Hiring decisions are made by employers.",
  },
} satisfies Record<string, CourseDetail["faqs"][number]>;

const FDE: CourseDetail = {
  trackId: "fde",
  enrolLabel: "Enrol in Forward Deployed AI Engineering",
  hero: {
    title: "Become the engineer who takes AI from problem to production.",
    lead: "Learn to discover the business problem, design the solution, build the system, deploy it and work with the people who use it.",
  },
  pricing: { instalments: "or 3 instalments", international: "$899 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "Most AI projects stall between the demo and the people who need it.",
    body: "Companies have models, APIs and pilots — what they lack are engineers who can sit with an operations team, understand the real workflow, and ship a system that survives contact with production. Forward deployed engineers close that gap.",
    points: [
      "Pilots that never leave the notebook",
      "Engineering and business teams speaking different languages",
      "No evaluation, monitoring or owner after launch",
    ],
  },
  outcomes: [
    { value: "1", label: "client-style engagement run from discovery to executive demo" },
    { value: "4", label: "deployed services: API, pipeline, RAG app and agent workflow" },
    { value: "3", label: "stakeholder artefacts: discovery brief, architecture, rollout plan" },
  ],
  builtFor: [
    "Software engineers who want to lead applied AI delivery",
    "Data or ML engineers moving into client-facing solution roles",
    "Technical consultants who want to build, not only advise",
  ],
  prerequisites: {
    required: [
      "Programming fundamentals in any language",
      "Logical reasoning and problem decomposition",
      "Basic computer science: data structures, HTTP, databases",
    ],
    helpful: ["Python", "SQL", "Git"],
    notRequired: ["Prior machine learning experience"],
  },
  tools: [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Docker",
    "GitHub Actions",
    "AWS / Azure",
    "Airflow",
    "LLM APIs",
    "pgvector",
    "LangGraph",
    "OpenTelemetry",
  ],
  coreWeeks: 12,
  phases: [
    {
      title: "Engineering foundations",
      summary: "Ship clean, tested, containerised services",
      weeks: [1, 4],
      items: [
        {
          title: "Python and software engineering for delivery",
          topics: ["Project structure and typing", "Testing with pytest", "Git workflows and code review"],
          lab: "Refactor a scrappy script into a typed, tested package.",
          assignment: "Open a pull request with tests and respond to a code review.",
        },
        {
          title: "APIs and databases",
          topics: ["REST design with FastAPI", "PostgreSQL schema design", "Auth, pagination and errors"],
          lab: "Build a settlements endpoint backed by PostgreSQL.",
          assignment: "Add auth, pagination and audit logging to the API.",
        },
        {
          title: "Cloud and DevOps",
          topics: ["Docker and environments", "CI/CD with GitHub Actions", "Secrets and IAM basics"],
          lab: "Containerise the API and run it locally with Docker Compose.",
          assignment: "Ship a CI pipeline that tests, builds and deploys on merge.",
        },
        {
          title: "Data pipelines",
          topics: ["Batch ingestion patterns", "Orchestration with Airflow", "Data quality checks"],
          lab: "Write an Airflow DAG that ingests daily transaction files.",
          assignment: "Add data quality checks and alert on failed loads.",
        },
      ],
    },
    {
      title: "Applied AI systems",
      summary: "Build retrieval, agent and evaluation layers",
      weeks: [5, 8],
      items: [
        {
          title: "LLM applications",
          topics: ["Provider APIs and structured outputs", "Prompt systems and versioning", "Cost and latency basics"],
          lab: "Extract structured fields from dispute emails with an LLM.",
          assignment: "Version your prompts and report cost and latency per call.",
        },
        {
          title: "Retrieval-augmented generation",
          topics: ["Chunking and embeddings", "Vector search with pgvector", "Citations and grounding"],
          lab: "Index a policy handbook in pgvector and answer questions over it.",
          assignment: "Return cited answers and refuse when the source is missing.",
        },
        {
          title: "Agentic systems",
          topics: ["Tool calling and planning", "State and memory", "Human-in-the-loop approvals"],
          lab: "Build a LangGraph agent that calls transaction lookup tools.",
          assignment: "Add an approval step before the agent takes any action.",
        },
        {
          title: "Evaluation, guardrails and observability",
          topics: ["Offline eval sets and graders", "PII redaction and policy checks", "Tracing with OpenTelemetry"],
          lab: "Build an eval set and grader for your RAG app.",
          assignment: "Add PII redaction and trace every request end to end.",
        },
      ],
    },
    {
      title: "Forward deployment",
      summary: "Run an engagement like a forward deployed engineer",
      weeks: [9, 12],
      items: [
        {
          title: "Solution architecture",
          topics: ["Build vs buy decisions", "Reference architectures", "Security and data residency"],
          lab: "Compare three architectures for an operations copilot.",
          assignment: "Write an architecture decision record for your choice.",
        },
        {
          title: "Client discovery",
          topics: ["Discovery interviews", "Workflow and pain mapping", "Success metrics"],
          lab: "Run a mock discovery interview with a reconciliation team.",
          assignment: "Write a discovery brief with measurable success metrics.",
        },
        {
          title: "Stakeholder communication and deployment",
          topics: ["Demo storytelling", "Rollout and change management", "Runbooks and handover"],
          lab: "Rehearse a five-minute demo for a non-technical audience.",
          assignment: "Write a rollout plan and an on-call runbook.",
        },
        {
          title: "Capstone engagement",
          topics: ["Scope agreement", "Iteration cadence", "Executive demo"],
          lab: "Agree scope and milestones for your capstone engagement.",
          assignment: "Deliver the executive demo and technical documentation.",
        },
      ],
    },
  ],
  paceNote:
    "The fast track covers the core in 12 weeks. The standard pace spreads the same content and a full client-style engagement over up to 24 weeks.",
  projects: [
    {
      windowTitle: "POST /v1/score",
      preview: "api",
      title: "Merchant settlements API",
      description:
        "A production-style API that exposes daily merchant settlements with auth, pagination and audit logs.",
      dataset: "Synthetic merchant transactions and settlement batches",
      tags: ["OpenAPI spec", "Test suite", "Deployed endpoint"],
    },
    {
      windowTitle: "agent-trace · run 48",
      preview: "agentTrace",
      title: "Chargeback investigation agent",
      description:
        "An agent that gathers transaction evidence, drafts a dispute response and waits for analyst approval.",
      dataset: "Card disputes with transaction and merchant history",
      tags: ["Agent traces", "Eval set", "Approval workflow"],
    },
    {
      windowTitle: "PRD-012.md",
      preview: "prd",
      title: "Operations copilot architecture",
      description: "A decision record and architecture for rolling an AI copilot into a bank operations team.",
      dataset: "Discovery notes from a reconciliation team",
      tags: ["Architecture diagram", "ADR", "Rollout plan"],
    },
  ],
  capstone: {
    title: "Payments reconciliation copilot engagement",
    body: "Run a client-style engagement for a payments operations team that spends hours matching bank statements to ledger entries. Discover the workflow, build the system, deploy it and iterate with feedback.",
    dataset: "Bank statements, internal ledger and PSP settlement files with realistic mismatches",
    stages: [
      { title: "Discovery", body: "Discovery brief and success metrics" },
      { title: "Build", body: "Matching pipeline, RAG over policies and exception agent" },
      { title: "Deploy", body: "Containerised deployment with evals and tracing" },
      { title: "Iterate", body: "Executive demo and technical documentation" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "FDE",
  roles: [
    { title: "Forward Deployed Engineer", body: "Embed with customers to ship AI solutions" },
    { title: "Applied AI Engineer", body: "Build LLM and agent systems for products" },
    { title: "AI Solutions Engineer", body: "Design and prove solutions with clients" },
  ],
  certificate: { capstone: "Payments reconciliation copilot engagement", credentialId: "IIAA-FDE-2026-000123" },
  faqs: [
    {
      question: "Why is the duration 12–24 weeks?",
      answer:
        "The fast track covers the core curriculum in 12 weeks. The standard pace spreads the same content and a full client-style engagement over up to 24 weeks, for learners balancing work or study.",
    },
    COMMON_FAQS.week,
    COMMON_FAQS.handholding,
    COMMON_FAQS.fintech,
    COMMON_FAQS.job,
  ],
};

const AIML: CourseDetail = {
  trackId: "ml",
  enrolLabel: "Enrol in Applied AI & Machine Learning Engineering",
  hero: {
    title: "Build machine learning systems that work beyond the notebook.",
    lead: "Go from features and experiments to served, monitored models — with the engineering discipline production teams expect.",
  },
  pricing: { instalments: "or 3 instalments", international: "$649 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "A model in a notebook is not a product.",
    body: "Most models never reach users because nobody versioned the data, tracked experiments or planned for drift. ML engineers turn promising models into services that keep working after week one.",
    points: [
      "Results nobody can reproduce",
      "Models silently degrading in production",
      "No clear path from experiment to API",
    ],
  },
  outcomes: [
    { value: "3", label: "models trained, tracked and compared end to end" },
    { value: "1", label: "production inference API with monitoring" },
    { value: "1", label: "drift detection and retraining plan" },
  ],
  builtFor: [
    "Analysts and developers with Python moving into ML",
    "Data scientists who want to deploy their own models",
    "Software engineers joining ML teams",
  ],
  prerequisites: {
    required: ["Python", "SQL basics", "Statistics fundamentals: mean, variance, distributions"],
    helpful: ["Git", "Linear algebra intuition"],
  },
  tools: ["Python", "scikit-learn", "XGBoost", "PyTorch", "MLflow", "FastAPI", "Docker", "Evidently", "AWS / Azure"],
  coreWeeks: 12,
  phases: [
    {
      title: "Machine learning core",
      summary: "Build models you can trust",
      weeks: [1, 4],
      items: [
        {
          title: "Python and statistics for ML",
          topics: ["NumPy and pandas for modelling", "Probability refresher", "Bias and variance"],
          lab: "Profile a card transactions dataset and document its quirks.",
          assignment: "Write an EDA report with the distributions that matter for fraud.",
        },
        {
          title: "Supervised learning",
          topics: ["Linear and logistic regression", "Trees and ensembles", "Cross-validation"],
          lab: "Train a baseline and a gradient-boosted fraud classifier.",
          assignment: "Compare models with cross-validation and justify your pick.",
        },
        {
          title: "Unsupervised learning",
          topics: ["Clustering", "Dimensionality reduction", "Anomaly detection"],
          lab: "Segment merchants by behaviour with clustering.",
          assignment: "Flag anomalous merchants and explain what makes them unusual.",
        },
        {
          title: "Feature engineering and selection",
          topics: ["Time-window features", "Leakage prevention", "Encoding and scaling"],
          lab: "Build velocity and time-window features for transactions.",
          assignment: "Audit your pipeline for leakage and document the fixes.",
        },
      ],
    },
    {
      title: "Advanced modelling",
      summary: "Choose and evaluate the right model",
      weeks: [5, 8],
      items: [
        {
          title: "Model selection and evaluation",
          topics: ["Precision, recall and PR-AUC", "Calibration", "Cost-sensitive evaluation"],
          lab: "Plot a cost curve for your fraud classifier.",
          assignment: "Choose and document a decision threshold from the cost curve.",
        },
        {
          title: "Deep learning foundations",
          topics: ["Neural networks with PyTorch", "Training loops", "Regularisation"],
          lab: "Train a PyTorch network on tabular transaction data.",
          assignment: "Compare it against your gradient-boosted model.",
        },
        {
          title: "NLP and computer vision overview",
          topics: ["Text classification", "Embeddings", "Image models and transfer learning"],
          lab: "Classify support tickets with pretrained embeddings.",
          assignment: "Fine-tune a small model and report per-class errors.",
        },
        {
          title: "Experiment tracking",
          topics: ["MLflow runs and registry", "Reproducibility", "Dataset versioning"],
          lab: "Track every experiment in MLflow and register the best model.",
          assignment: "Reproduce your best run from a single command.",
        },
      ],
    },
    {
      title: "ML in production",
      summary: "Serve, monitor and improve",
      weeks: [9, 12],
      items: [
        {
          title: "Model serving and APIs",
          topics: ["FastAPI inference service", "Batch vs real-time scoring", "Latency budgets"],
          lab: "Serve the fraud model behind a scoring endpoint.",
          assignment: "Add input validation, health checks and a load test.",
        },
        {
          title: "MLOps and cloud deployment",
          topics: ["Docker and CI/CD for models", "Cloud deployment", "Rollbacks"],
          lab: "Containerise the service and deploy it to the cloud.",
          assignment: "Ship a CI pipeline that can roll back a bad model.",
        },
        {
          title: "Monitoring and drift",
          topics: ["Data and concept drift", "Performance monitoring", "Retraining triggers"],
          lab: "Detect drift on a shifted dataset with Evidently.",
          assignment: "Write a retraining plan with clear triggers.",
        },
        {
          title: "Capstone build",
          topics: ["System design", "Documentation", "Demo"],
          lab: "Agree scope and milestones for your capstone system.",
          assignment: "Deliver the model card, runbook and demo.",
        },
      ],
    },
  ],
  paceNote:
    "The fast track covers the core in 12 weeks. The standard pace spreads the same content and the capstone over up to 16 weeks.",
  projects: [
    {
      windowTitle: "model_card.md",
      preview: "modelCard",
      title: "Fraud prediction model",
      description: "A cost-aware fraud classifier with calibrated scores and a documented threshold.",
      dataset: "Labelled card transactions with heavy class imbalance",
      tags: ["Model card", "Cost curve", "Registered model"],
    },
    {
      windowTitle: "analysis.ipynb",
      preview: "notebook",
      title: "Credit risk model",
      description: "A probability-of-default model with explanations suitable for a credit committee.",
      dataset: "Loan applications and repayment history",
      tags: ["Scorecard", "Explanations", "Fairness check"],
    },
    {
      windowTitle: "POST /v1/score",
      preview: "api",
      title: "Production inference API",
      description: "A containerised real-time scoring service with health checks and latency SLOs.",
      dataset: "Live transaction payloads",
      tags: ["API", "Load test", "Runbook"],
    },
  ],
  capstone: {
    title: "Monitored real-time fraud scoring system",
    body: "Ship a deployed ML system that scores card transactions in real time, logs predictions, detects drift and documents how and when to retrain.",
    dataset: "Card authorisations with delayed fraud labels",
    stages: [
      { title: "Model", body: "Tracked experiments and a registered model" },
      { title: "Serve", body: "Real-time inference API in the cloud" },
      { title: "Monitor", body: "Drift and performance monitoring" },
      { title: "Document", body: "Model card, runbook and demo" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "AIML",
  roles: [
    { title: "Machine Learning Engineer", body: "Build and deploy ML systems" },
    { title: "Applied Scientist", body: "Solve product problems with ML" },
    { title: "MLOps Engineer", body: "Run training, serving and monitoring" },
  ],
  certificate: { capstone: "Monitored real-time fraud scoring system", credentialId: "IIAA-AIML-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const GENAI: CourseDetail = {
  trackId: "gen",
  enrolLabel: "Enrol in Generative AI & Agentic Systems Engineering",
  hero: {
    title: "Build AI systems that can reason, retrieve, act and improve.",
    lead: "Engineer LLM applications, RAG, agents and MCP integrations with the evaluation, guardrails and observability that real users require.",
  },
  pricing: { instalments: "or 3 instalments", international: "$599 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "Anyone can build a chatbot demo. Few can make it reliable.",
    body: "Companies are moving from prompts to systems that retrieve knowledge, call tools and take actions. They need engineers who can measure quality, control cost and stop an agent doing the wrong thing.",
    points: [
      "Hallucinated answers in front of customers",
      "Agents with no audit trail",
      "Costs and latency nobody measured",
    ],
  },
  outcomes: [
    { value: "18", label: "hands-on practicals across four topics" },
    { value: "3", label: "portfolio projects plus a fintech capstone" },
    { value: "1", label: "deployed agent you can share with a live URL" },
  ],
  builtFor: [
    "Software and data engineers adding GenAI to products",
    "ML engineers moving to LLM systems",
    "Technical founders building AI features",
  ],
  prerequisites: {
    required: ["Python", "Working with REST APIs and JSON"],
    helpful: ["SQL", "Docker", "Git"],
    notRequired: ["Prior machine learning experience"],
  },
  tools: [
    "Python",
    "LLM APIs",
    "Embeddings",
    "Chroma",
    "FAISS",
    "pgvector",
    "LangGraph",
    "MCP",
    "Streamlit / Gradio",
    "FastAPI",
    "Docker",
  ],
  coreWeeks: 10,
  phases: [
    {
      title: "Foundations of Generative AI and LLMs",
      summary: "Understand, prompt and call LLMs",
      weeks: [1, 3],
      items: [
        {
          title: "How generative AI and LLMs work",
          topics: [
            "Text, image, audio and video models",
            "Tokens, context window and next-word prediction",
            "Pretraining, instruction tuning and human feedback",
            "Hallucinations and limitations",
          ],
          lab: "Compare models side by side and inspect their tokens.",
          assignment: "Hallucination hunt: find and explain cases where models answer confidently and wrongly.",
        },
        {
          title: "Prompt engineering",
          topics: ["System prompts", "Few-shot examples", "Chain-of-thought"],
          lab: "Build a personal prompt library.",
          assignment: "Test your prompts across two models and record which version works best.",
        },
        {
          title: "Working with LLM APIs and structured outputs",
          topics: ["Messages and temperature", "Streaming and cost", "Structured JSON outputs", "Basic evaluation"],
          lab: "Build a Python command-line chatbot with memory.",
          assignment: "Build a data extractor that returns validated JSON.",
        },
      ],
    },
    {
      title: "Embeddings and Retrieval-Augmented Generation (RAG)",
      summary: "Ground answers in your own documents",
      weeks: [4, 5],
      items: [
        {
          title: "Embeddings, vector databases and chunking",
          topics: ["Embeddings and semantic search", "Chroma, FAISS and pgvector", "Document chunking and metadata"],
          lab: "Run a similarity search over a set of sentences.",
          assignment: "Index a PDF with different chunking strategies and compare the results.",
        },
        {
          title: "The RAG pipeline and evaluation",
          topics: [
            "Retrieve, augment, generate",
            "Hybrid search, reranking and query rewriting",
            "Citations and handling 'I don't know'",
            "Retrieval quality and answer faithfulness",
          ],
          lab: "Build a Q&A app over your documents with citations.",
          assignment: "Chat with your own knowledge base through a Streamlit or Gradio UI.",
        },
      ],
    },
    {
      title: "AI Agents and Tool Use",
      summary: "Give models tools and a loop",
      weeks: [6, 7],
      items: [
        {
          title: "Agents, tools and agent patterns",
          topics: [
            "LLM + tools + loop + memory",
            "Workflows vs agents, and when not to use an agent",
            "Tool and function calling",
            "ReAct, planning, reflection and routing",
            "Stop conditions and step limits",
          ],
          lab: "Build a tool-using agent with a calculator, search and a file reader.",
          assignment: "Build a ReAct agent from scratch in plain Python.",
        },
        {
          title: "Agent frameworks, memory and MCP",
          topics: ["LangGraph and agent SDKs", "Agent memory", "Model Context Protocol (MCP) for external tools"],
          lab: "Rebuild your agent in a framework with memory.",
          assignment: "Build a research agent that writes a short cited report.",
        },
      ],
    },
    {
      title: "Multi-Agent Systems, Safety and Deployment",
      summary: "Coordinate, secure and ship",
      weeks: [8, 10],
      items: [
        {
          title: "Multi-agent systems and safety",
          topics: [
            "Orchestrator-worker, handoffs and critic patterns",
            "Prompt injection, data leaks and tool permissions",
            "Human-in-the-loop approvals for risky actions",
          ],
          lab: "Build a three-agent team: researcher, writer and critic.",
          assignment: "Attack your own agent, then add guardrails.",
        },
        {
          title: "Observability, evaluation and deployment",
          topics: [
            "Tracing, cost and latency tracking",
            "Evaluating agents with test sets",
            "FastAPI, Docker and secrets",
            "Rate limits and fallback models",
          ],
          lab: "Add tracing and a test set to your agent.",
          assignment: "Deploy your agent and share a live URL.",
        },
        {
          title: "Capstone: transaction fraud triage agent",
          topics: ["Flagged payment review", "Customer history tools", "Policy RAG", "Human approval for risky cases"],
          lab: "Agree the scope, tools and escalation rules for your fraud triage agent.",
          assignment: "Deliver the deployed agent with tracing, a test set and human approval for risky cases.",
        },
      ],
    },
  ],
  paceNote:
    "The fast track covers the core in 10 weeks. The standard pace spreads the same content and the capstone over up to 12 weeks.",
  projects: [
    {
      windowTitle: "docs-qa · cited answer",
      preview: "citedAnswer",
      title: "Document Q&A with citations",
      description: "A Q&A app over your own documents that cites its sources and says 'I don't know' when it should.",
      dataset: "Your own PDFs and documents",
      tags: ["RAG", "Citations", "Streamlit / Gradio"],
    },
    {
      windowTitle: "agent-trace · research run",
      preview: "agentTrace",
      title: "Research agent",
      description: "A tool-using agent, rebuilt in a framework with memory, that researches a topic and writes a short cited report.",
      dataset: "Web search results and files you choose",
      tags: ["ReAct", "Tool calling", "Agent memory"],
    },
    {
      windowTitle: "workflow · agent team",
      preview: "workflow",
      title: "Three-agent team",
      description: "A researcher, writer and critic working together, hardened with guardrails, tracing and a test set.",
      dataset: "A research brief of your choice",
      tags: ["Multi-agent", "Guardrails", "Tracing"],
    },
  ],
  capstone: {
    title: "Transaction fraud triage agent",
    body: "Build an agent that reviews flagged payments, pulls customer history with tools, checks policy documents with RAG and escalates risky cases for human approval.",
    dataset: "Flagged payments, customer history and policy documents",
    stages: [
      { title: "Design", body: "Workflow, tools and escalation rules" },
      { title: "Build", body: "Customer-history tools and policy RAG" },
      { title: "Evaluate", body: "Test set, guardrails and tracing" },
      { title: "Ship", body: "Deployed agent with human approval for risky cases" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "GENAI",
  roles: [
    { title: "GenAI Engineer", body: "Build LLM features and RAG systems" },
    { title: "AI Agent Engineer", body: "Design tool-using, auditable agents" },
    { title: "LLMOps Engineer", body: "Evaluate, monitor and optimise LLM systems" },
  ],
  certificate: { capstone: "Transaction fraud triage agent", credentialId: "IIAA-GENAI-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const AFDE: CourseDetail = {
  trackId: "az",
  enrolLabel: "Enrol in Azure/Fabric Data Engineering",
  hero: {
    title: "Engineer end-to-end data solutions on Azure and Microsoft Fabric.",
    lead: "Ingest with Azure Data Factory, transform with Databricks and Delta Lake, build in Microsoft Fabric and deliver Power BI reports — finishing with a metadata-driven, real-time project.",
  },
  pricing: { international: "$300 international", nextCohort: "14 Dec 2026" },
  problem: {
    title: "Most companies run their data on Azure. Few engineers can build it end to end.",
    body: "Teams moving to Azure and Fabric need engineers who can connect sources, build a lakehouse and hand trusted data to the business — not just click through one service. This track covers the full stack, from ingestion to the report.",
    points: [
      "Hand-built pipelines that do not scale past a few tables",
      "Raw, cleaned and reporting data mixed in one place",
      "Reports built on data nobody can trace",
    ],
  },
  outcomes: [
    { value: "1", label: "mini project applying the Azure services you learn" },
    { value: "1", label: "end-to-end metadata-driven project, from ADF ingestion to a published Power BI report" },
    { value: "3", label: "medallion layers — bronze, silver and gold — built on Delta Lake" },
  ],
  builtFor: [
    "Graduates and career switchers starting in data engineering",
    "SQL, ETL and BI developers moving to Azure",
    "Testers and support engineers moving into data roles",
  ],
  prerequisites: {
    required: ["SQL basics — covered in Week 3", "Python basics — covered in Week 3"],
  },
  delivery: {
    title: ["Online and recorded.", "One hour every weekday."],
    features: [
      { icon: CirclePlay, title: "Online, recorded lessons", description: "Structured recorded lessons you watch online." },
      { icon: CalendarClock, title: "One hour a day", description: "A one-hour session every weekday, Monday to Friday." },
      { icon: Hammer, title: "Mini project", description: "Apply the Azure services you learn in a guided mini project." },
      { icon: Workflow, title: "End-to-end project", description: "Build a metadata-driven project from source data to Power BI." },
    ],
    note: "Plan for 10–15 hrs/week, including practice.",
  },
  tools: [
    "Azure Data Factory",
    "ADLS Gen2",
    "Azure SQL Database",
    "Azure Databricks",
    "PySpark",
    "Delta Lake",
    "Unity Catalog",
    "Microsoft Fabric",
    "Power BI",
    "Azure Key Vault",
    "Azure DevOps",
  ],
  coreWeeks: 8,
  phases: [
    {
      title: "Azure foundations",
      summary: "Store, ingest and query data on Azure",
      weeks: [1, 3],
      tools: ["Azure", "Azure SQL", "Azure Data Factory", "Python"],
      items: [
        {
          title: "Cloud Introduction · Overview of ADE Services · Azure Data Storages",
          topics: [
            "On-premises vs cloud, cloud computing and Azure basics",
            "Data engineering processes, Azure data engineer roles and cloud use cases",
            "ADF, Databricks, Synapse Analytics and Microsoft Fabric overview",
            "File, relational and non-relational stores: Blob Storage, ADLS Gen2 and Azure SQL",
          ],
          modules: [
            {
              title: "Cloud Introduction",
              topics: [
                "On-premises vs cloud-based servers",
                "Cloud computing basics",
                "Setting up an Azure account",
                "Introduction to Microsoft Azure",
                "Applications of Azure",
                "Data engineering processes",
                "Azure data engineer roles and tasks",
                "Use cases for the cloud",
                "Azure Data Lake Storage (ADLS) Gen2",
                "Azure Blob Storage",
                "Azure SQL Database",
              ],
            },
            {
              title: "Overview of ADE Services",
              topics: ["Azure Data Factory", "Azure Databricks", "Azure Synapse Analytics", "Microsoft Fabric"],
            },
            {
              title: "Azure Data Storages",
              topics: [
                "File stores",
                "Relational data stores",
                "Non-relational data stores",
                "Azure Blob Storage",
                "Azure Data Lake Storage",
                "Why a data lake",
                "Azure SQL Database",
              ],
            },
          ],
        },
        {
          title: "Azure Data Factory · ADF Scenarios",
          topics: [
            "ETL vs ELT, on-prem vs cloud ETL tools and why ADF",
            "ADF components, linked services and Azure, self-hosted and SSIS integration runtimes",
            "Pipelines and activities: copy data, control flow and data flows",
            "Full, batch, sequential and incremental loads with the copy data tool",
            "Parameters, data migration, scheduling, triggers, monitoring and CI/CD",
          ],
          modules: [
            {
              title: "Azure Data Factory",
              topics: [
                "Introduction to Azure Data Factory (ADF)",
                "ETL vs ELT",
                "On-prem vs cloud ETL tools",
                "Why ADF",
                "ADF components",
                "Linked services in ADF",
                "Integration runtime (IR): Azure, self-hosted and SSIS",
                "Pipelines and activities: copy data, control flow and data flow",
                "Data ingestion methods",
                "Full load",
                "Copy data tool",
                "Batch load",
                "Sequential load",
                "Incremental load",
                "Working with various copy data scenarios",
              ],
            },
            {
              title: "ADF Scenarios",
              topics: [
                "Working with Azure SQL Database",
                "Working with parameters in ADF",
                "ADF data migration",
                "Scheduling and triggering pipelines",
                "Monitoring pipelines",
                "CI/CD in ADF",
              ],
            },
          ],
        },
        {
          title: "SQL · Python Basics",
          topics: [
            "SQL DDL and DML, aggregates, grouping, joins and set operators",
            "Subqueries, data cleaning and transformation",
            "Window, logical, string, date and analytical functions",
            "Python variables, datatypes, operators, strings, indexing and slicing",
            "Lists, tuples, sets, dictionaries, and built-in and user-defined functions",
            "If, while, for, range(), map, filter, reduce and lambdas",
          ],
          modules: [
            {
              title: "SQL",
              topics: [
                "SQL commands for data analysis (DDL and DML)",
                "Aggregate functions and grouping data",
                "SQL joins and set operators",
                "Advanced data analysis: subqueries",
                "Data cleaning and transformation",
                "Window and logical functions",
                "String and date functions",
                "Analytical functions",
              ],
            },
            {
              title: "Python Basics",
              topics: [
                "Variables",
                "Datatypes in Python",
                "Operators in Python: arithmetic, logical and comparison",
                "Working with strings",
                "Indexing",
                "Slicing",
                "Data structures in Python: lists, tuples, sets and dictionaries",
                "Functions: built-in and user-defined",
                "Conditional flow statements: if condition, while loop and for iteration",
                "range() function",
                "Map",
                "Filter",
                "Reduce",
                "Lambda expressions",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Lakehouse engineering",
      summary: "Transform at scale with Spark and Databricks",
      weeks: [4, 5],
      tools: ["Apache Spark", "Databricks"],
      items: [
        {
          title: "Spark Introduction · Azure Databricks Introduction · Databricks Utils · RDD (PySpark)",
          topics: [
            "Apache Spark, Hadoop vs Spark, Spark architecture, context and APIs",
            "Databricks Free Edition and runtime: workspace, cluster, catalog, DBFS, tables and Hive metastore",
            "Volumes and dbutils file commands: create, copy, move, list and remove",
            "Mounting ADLS with access keys",
            "RDD transformations, actions, lazy evaluation and fault tolerance",
          ],
          modules: [
            {
              title: "Spark Introduction",
              topics: [
                "Introduction to Apache Spark",
                "Hadoop vs Spark",
                "Understanding Spark architecture",
                "Spark context",
                "Spark APIs",
                "Spark data structures: RDDs and DataFrames",
                "Introduction to Azure Databricks",
                "Azure Databricks Free Edition",
                "Databricks runtime engine",
              ],
            },
            {
              title: "Azure Databricks Introduction",
              topics: [
                "Databricks components: workspace, cluster, catalog, DBFS, tables and Hive metastore",
              ],
            },
            {
              title: "Databricks Utils",
              topics: [
                "Volume: introduction and creating a volume",
                "Working with files using dbutils: notebook introduction",
                "Creating a directory",
                "Copy, move, list and remove commands",
                "Use cases",
              ],
            },
            {
              title: "RDD (PySpark)",
              topics: [
                "Integrating ADLS with Databricks",
                "Mounting with access keys",
                "Creating Spark RDDs",
                "Spark transformations",
                "Spark actions",
                "Lazy evaluation",
                "Fault tolerance",
              ],
            },
          ],
        },
        {
          title: "DataFrames (PySpark) · Delta Lake",
          topics: [
            "DataFrames: reading files, column manipulation, group by, aggregates and joins",
            "Caching, schema evolution, DAG, write formats, partitionBy and window functions",
            "Spark SQL views, and tables from the UI and notebooks",
            "Managed and external Delta tables and the lakehouse",
            "Bronze, silver and gold layers, Delta Live Tables and Unity Catalog",
            "Scheduling Databricks jobs from ADF pipelines",
          ],
          modules: [
            {
              title: "DataFrames (PySpark)",
              topics: [
                "DataFrame introduction",
                "Creating Spark DataFrames",
                "Reading data from different files",
                "Column manipulations",
                "Group by and aggregate functions",
                "Joins in PySpark",
                "Caching",
                "Schema evolution",
                "DAG",
                "Writing data to different formats",
                "Partitioning data using partitionBy",
                "Window functions",
              ],
            },
            {
              title: "Delta Lake",
              topics: [
                "Spark SQL: creating a view and SQL statements on a view",
                "Creating tables using the UI and using notebooks",
                "Delta Lake",
                "Creating Delta tables: managed and external tables",
                "Lakehouse",
                "Medallion architecture: bronze, silver and gold layers",
                "Scheduling Databricks jobs using ADF pipelines",
                "Delta Live Tables (DLT)",
                "Unity Catalog",
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Fabric, BI and delivery",
      summary: "Serve trusted data to the business",
      weeks: [6, 8],
      tools: ["Microsoft Fabric", "Power BI", "Azure DevOps"],
      items: [
        {
          title: "Microsoft Fabric",
          topics: [
            "Fabric analytics platform and OneLake",
            "Fabric Data Factory: pipelines, Dataflows Gen2, copy jobs and ADF-to-Fabric migration",
            "Synapse Data Engineering: notebooks, Apache Spark, lakehouse and Delta tables",
            "Synapse Data Warehouse: tables and loads with COPY INTO, pipelines and Dataflow Gen2",
            "Lakehouse vs warehouse",
            "Power BI in Fabric: Direct Lake, DirectQuery, and row- and column-level security",
          ],
          modules: [
            {
              title: "Microsoft Fabric",
              topics: [
                "Introduction to Microsoft Fabric",
                "Fabric analytics platform",
                "Fabric OneLake",
                "Fabric Data Factory: data pipelines and Dataflows Gen2",
                "Transforming data",
                "Loading data to a lakehouse",
                "Copy job",
                "Creating a pipeline in Fabric",
                "Transforming data with Dataflow Gen2",
                "ADF to Fabric migration",
                "Fabric Synapse Data Engineering",
                "Fabric notebooks",
                "Analysing data with Apache Spark",
                "Lakehouse",
                "Delta tables",
                "Fabric Synapse Data Warehouse",
                "Creating a warehouse in Fabric",
                "Ways to load data into a warehouse",
                "Creating tables in a warehouse",
                "Loading data using the COPY INTO command",
                "Loading data using a pipeline to a warehouse",
                "Loading data using Dataflow Gen2",
                "Lakehouse vs warehouse",
                "Microsoft Power BI in Fabric",
                "Accessing data using Power BI Desktop",
                "Direct Lake",
                "DirectQuery",
                "Row-level security",
                "Column-level security",
              ],
            },
          ],
        },
        {
          title: "Real Time Project",
          topics: [
            "Azure services, source data stores and metadata tables",
            "Key Vault credentials, and Azure DevOps repos, branches and pull requests",
            "Dynamic linked services, dynamic datasets and metadata-driven pipelines",
            "Bronze and silver frameworks, a notebook per table and transformations",
            "ADF job clusters and triggers for the master pipeline",
            "Gold layer to Power BI: dimensional model, measures and published report",
          ],
          modules: [
            {
              title: "Real Time Project",
              topics: [
                "Overview of the project",
                "Creating Azure services",
                "Setting up data stores for the source",
                "Creating metadata tables",
                "Masking credentials with Key Vault",
                "Creating and setting up an Azure DevOps repo",
                "Creating a working branch",
                "Creating a PR",
                "Merging code with the collaboration branch",
                "Creating dynamic linked services",
                "Creating dynamic datasets",
                "Creating metadata-driven pipelines",
                "Creating a framework for the bronze layer",
                "Creating a framework for the silver layer",
                "Creating a notebook for every table",
                "Applying required transformations",
                "Creating a job cluster in Azure Data Factory",
                "Creating a trigger to call the master pipeline",
                "Scheduling a trigger to call the master pipeline",
                "Loading data from the gold layer to Power BI",
                "Creating dimensional modelling",
                "Creating measures",
                "Creating a report",
                "Publishing the report to Power BI Service",
              ],
            },
          ],
        },
        {
          title: "Power BI",
          topics: [
            "Data warehousing, OLTP vs OLAP, star and snowflake schemas",
            "Power BI Desktop, connecting data sources and Power Query",
            "Data modelling and DAX",
            "Reports, visualisation types, dashboards and publishing to Power BI Service",
          ],
          modules: [
            {
              title: "Power BI",
              topics: [
                "Introduction to data warehousing",
                "OLTP vs OLAP",
                "Star schema vs snowflake schema",
                "Overview of Power BI",
                "Power BI Desktop",
                "Connecting Power BI with different data sources",
                "Power Query for data transformation",
                "Data modelling",
                "DAX",
                "Reports and visualisation types",
                "Dashboards",
                "Publishing reports",
                "Power BI Service",
              ],
            },
          ],
        },
      ],
    },
  ],
  paceNote: "The course runs online over 8 weeks, with one hour of recorded lessons every weekday, including a week-long real-time project.",
  projects: [],
  capstone: {
    eyebrow: "Week 7 · Real-time project",
    title: "End-to-end Azure data engineering project",
    body: "Build a metadata-driven project that ingests source data with ADF pipelines, transforms it through Databricks bronze and silver frameworks and loads the gold layer into Power BI — with credentials in Key Vault and code in Azure DevOps.",
    stages: [
      { title: "Set up", body: "Azure services, source data stores, metadata tables, Key Vault and DevOps repo" },
      { title: "Ingest", body: "Dynamic linked services, dynamic datasets and metadata-driven pipelines" },
      { title: "Transform", body: "Bronze and silver frameworks, a notebook per table, job cluster and master pipeline trigger" },
      { title: "Report", body: "Gold layer to Power BI: dimensional model, measures and report published to Power BI Service" },
    ],
    altDomains: [],
  },
  trainerCode: "AFDE",
  roles: [
    { title: "Azure Data Engineer", body: "Build pipelines with Azure Data Factory and Databricks" },
    { title: "Data Engineer", body: "Build Spark and Delta Lake lakehouses with medallion layers" },
    { title: "Fabric Data Engineer", body: "Build lakehouses and warehouses in Microsoft Fabric" },
    { title: "Data Analyst", body: "Analyse data with SQL and build Power BI reports" },
  ],
  certificate: { capstone: "End-to-end Azure data engineering project", credentialId: "IIAA-AFDE-2026-000123" },
  faqs: [COMMON_FAQS.handholding, COMMON_FAQS.job],
};

const DAPE: CourseDetail = {
  trackId: "dp",
  enrolLabel: "Enrol in Data & AI Platform Engineering",
  hero: {
    title: "Build the data platforms that AI depends on.",
    lead: "Design pipelines, warehouses and streams that are tested, governed and cost-aware — the foundation every analytics and AI team needs.",
  },
  pricing: { instalments: "or 3 instalments", international: "$649 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "AI is only as good as the data platform underneath it.",
    body: "Teams want dashboards, models and copilots, but the data arrives late, duplicated or untrusted. Platform engineers make data dependable: modelled, monitored and fast enough for the business.",
    points: [
      "Pipelines that break silently overnight",
      "Three versions of the same revenue number",
      "Cloud bills growing faster than usage",
    ],
  },
  outcomes: [
    { value: "3", label: "production-style pipelines: batch, streaming and ELT" },
    { value: "1", label: "dimensional warehouse with tests and documentation" },
    { value: "20+", label: "data quality checks wired into orchestration" },
  ],
  builtFor: [
    "Analysts and developers moving into data engineering",
    "BI developers who want to own pipelines",
    "Backend engineers supporting data and ML teams",
  ],
  prerequisites: {
    required: ["Basic programming in any language", "SQL: SELECT, JOIN and GROUP BY"],
    helpful: ["Git", "Command line basics"],
  },
  tools: [
    "Python",
    "SQL",
    "dbt",
    "Airflow",
    "Spark",
    "Kafka",
    "Databricks",
    "Snowflake / BigQuery",
    "Great Expectations",
    "AWS / Azure",
  ],
  coreWeeks: 12,
  phases: [
    {
      title: "Data foundations",
      summary: "Model and move data correctly",
      weeks: [1, 4],
      items: [
        {
          title: "Python for data engineering",
          topics: ["Files, APIs and JSON", "Virtual environments", "Logging and retries"],
          lab: "Pull daily FX rates from an API and land them as files.",
          assignment: "Add retries, structured logging and tests to the loader.",
        },
        {
          title: "Advanced SQL",
          topics: ["Window functions", "CTEs and query plans", "Incremental patterns"],
          lab: "Rewrite a slow settlement report with window functions.",
          assignment: "Read the query plan and document what made it faster.",
        },
        {
          title: "Data modelling",
          topics: ["Star and snowflake schemas", "Slowly changing dimensions", "Grain and keys"],
          lab: "Design a star schema for card payments.",
          assignment: "Model merchant changes as a type 2 dimension.",
        },
        {
          title: "ETL, ELT and APIs",
          topics: ["Batch vs incremental loads", "Idempotency", "Change data capture"],
          lab: "Build an incremental load for card transactions.",
          assignment: "Prove the load is idempotent by re-running it safely.",
        },
      ],
    },
    {
      title: "Modern data stack",
      summary: "Transform, orchestrate and scale",
      weeks: [5, 8],
      items: [
        {
          title: "Transformations with dbt",
          topics: ["Models, sources and refs", "Tests and documentation", "Snapshots"],
          lab: "Build staging and mart models for payments in dbt.",
          assignment: "Add tests and publish dbt docs for every model.",
        },
        {
          title: "Orchestration with Airflow",
          topics: ["DAGs and scheduling", "Sensors and dependencies", "Alerting"],
          lab: "Orchestrate extract, load and dbt runs in one DAG.",
          assignment: "Alert on failures and missed SLAs.",
        },
        {
          title: "Warehouses and lakes",
          topics: ["Lakehouse and medallion layers", "Partitioning and clustering", "Table formats"],
          lab: "Organise raw, cleaned and curated layers in a lakehouse.",
          assignment: "Partition the largest table and measure the query speed-up.",
        },
        {
          title: "Distributed processing with Spark",
          topics: ["DataFrames and joins", "Shuffles and skew", "Performance tuning"],
          lab: "Aggregate a year of transactions with Spark on Databricks.",
          assignment: "Fix a skewed join and report the before and after.",
        },
      ],
    },
    {
      title: "Platform in production",
      summary: "Stream, govern and operate",
      weeks: [9, 12],
      items: [
        {
          title: "Kafka and streaming",
          topics: ["Topics and partitions", "Stream processing", "Exactly-once trade-offs"],
          lab: "Stream card authorisations through Kafka.",
          assignment: "Emit velocity-based fraud signals within seconds.",
        },
        {
          title: "Data quality and observability",
          topics: ["Expectations and contracts", "Freshness and volume monitors", "Lineage"],
          lab: "Add Great Expectations checks to your pipeline.",
          assignment: "Write a data contract and block loads that break it.",
        },
        {
          title: "Cloud, security and cost",
          topics: ["IAM and encryption", "PII masking", "Cost and performance tuning"],
          lab: "Mask card numbers and lock down access by role.",
          assignment: "Produce a cost report with three savings you made.",
        },
        {
          title: "Capstone build",
          topics: ["Platform architecture", "Serving an AI workload", "Runbooks"],
          lab: "Agree scope and milestones for your capstone platform.",
          assignment: "Deliver the platform, runbook and stakeholder demo.",
        },
      ],
    },
  ],
  paceNote:
    "The fast track covers the core in 12 weeks. The standard pace spreads the same content and the capstone over up to 16 weeks.",
  projects: [
    {
      windowTitle: "dags/transactions_daily.py",
      preview: "dag",
      title: "Fintech transaction pipeline",
      description: "Incremental ingestion of card transactions into a tested, documented warehouse.",
      dataset: "Card transactions, merchants and FX rates",
      tags: ["DAG", "dbt docs", "Quality report"],
    },
    {
      windowTitle: "fraud-signals · kafka",
      preview: "stream",
      title: "Real-time fraud data stream",
      description: "A Kafka stream that enriches transactions and emits velocity-based fraud signals in seconds.",
      dataset: "Streaming card authorisations",
      tags: ["Stream topology", "Latency benchmark", "Alert rules"],
    },
    {
      windowTitle: "marts/fct_payments.sql",
      preview: "sql",
      title: "Analytics warehouse",
      description: "A dimensional model with marts for finance, risk and growth teams.",
      dataset: "Payments, refunds and customer accounts",
      tags: ["Star schema", "Data dictionary", "Mart tests"],
    },
  ],
  capstone: {
    title: "Payments data platform for AI and analytics",
    body: "Build a production-style platform that ingests batch and streaming payments data, models it into trusted marts and serves features to a fraud model and an analytics dashboard.",
    dataset: "Authorisations, settlements, refunds and chargebacks across 12 months",
    stages: [
      { title: "Design", body: "Architecture, contracts and SLAs" },
      { title: "Build", body: "Batch and streaming pipelines with dbt marts" },
      { title: "Operate", body: "Quality gates, monitoring and cost report" },
      { title: "Serve", body: "Feature table for AI and a stakeholder demo" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "DAPE",
  roles: [
    { title: "Data Engineer", body: "Build and run pipelines and warehouses" },
    { title: "Analytics Engineer", body: "Own modelling, testing and semantic layers" },
    { title: "Data Platform Engineer", body: "Operate infrastructure for data and AI teams" },
  ],
  certificate: { capstone: "Payments data platform for AI and analytics", credentialId: "IIAA-DAPE-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const DSDI: CourseDetail = {
  trackId: "ds",
  enrolLabel: "Enrol in Data Science, Analytics & Decision Intelligence",
  hero: {
    title: "Turn data into decisions — not just dashboards.",
    lead: "Learn SQL, Python, statistics, BI and machine learning foundations, and use them to answer the questions businesses actually ask.",
  },
  pricing: { instalments: "or 3 instalments", international: "$499 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "Organisations are full of dashboards and short on decisions.",
    body: "Leaders do not need another chart — they need someone who can frame the question, test it properly and recommend what to do next. Decision-focused analysts and data scientists are the people who get listened to.",
    points: [
      "Dashboards nobody opens after launch",
      "Experiments read wrongly or not at all",
      "Analysis that ends without a recommendation",
    ],
  },
  outcomes: [
    { value: "4", label: "portfolio projects with business recommendations" },
    { value: "2", label: "BI dashboards built in Power BI or Tableau" },
    { value: "1", label: "predictive model explained to a non-technical audience" },
  ],
  builtFor: [
    "Graduates and career switchers starting in data",
    "Business, finance and operations professionals",
    "Excel-heavy analysts ready to move to SQL and Python",
  ],
  prerequisites: {
    required: ["Basic mathematics", "Spreadsheet familiarity"],
    helpful: ["Curiosity about how businesses make money"],
    notRequired: ["Prior coding experience"],
  },
  tools: ["Excel / Sheets", "SQL", "Python", "pandas", "Power BI", "Tableau", "scikit-learn", "Jupyter"],
  coreWeeks: 10,
  phases: [
    {
      title: "Analysis foundations",
      summary: "Query, clean and explore data",
      weeks: [1, 4],
      items: [
        {
          title: "Spreadsheets to SQL",
          topics: ["Excel and Sheets orientation", "Thinking in tables", "SELECT, WHERE and JOIN"],
          lab: "Rebuild a spreadsheet report as SQL queries.",
          assignment: "Answer five business questions about payments with SQL.",
        },
        {
          title: "SQL for analysis",
          topics: ["Aggregations and CASE", "Window functions", "Funnels and cohorts"],
          lab: "Build a checkout funnel from payment attempts.",
          assignment: "Find the step with the biggest drop-off and size it.",
        },
        {
          title: "Python and data cleaning",
          topics: ["pandas essentials", "Missing values and outliers", "Joins and reshaping"],
          lab: "Clean a messy wallet transactions export in pandas.",
          assignment: "Document every cleaning decision and its impact.",
        },
        {
          title: "Statistics and exploratory analysis",
          topics: ["Distributions and variance", "Sampling and confidence", "Correlation vs causation"],
          lab: "Explore what separates active and churned wallet users.",
          assignment: "Write up three findings with confidence intervals.",
        },
      ],
    },
    {
      title: "Insight and storytelling",
      summary: "Communicate findings that drive action",
      weeks: [5, 7],
      items: [
        {
          title: "BI with Power BI and Tableau",
          topics: ["Data models and measures", "Dashboard design", "Filters and drill-through"],
          lab: "Build a payments conversion dashboard in Power BI.",
          assignment: "Add drill-through by method and bank, plus a KPI dictionary.",
        },
        {
          title: "Storytelling and business metrics",
          topics: ["North-star and input metrics", "Narrative structure", "Executive summaries"],
          lab: "Turn your dashboard into a one-page insight summary.",
          assignment: "Present your findings in three minutes to a mock leadership team.",
        },
        {
          title: "Experimentation",
          topics: ["A/B test design", "Significance and power", "Common pitfalls"],
          lab: "Analyse a checkout A/B test end to end.",
          assignment: "Recommend ship or no-ship and explain the risks.",
        },
      ],
    },
    {
      title: "Predictive decisions",
      summary: "Use ML to support decisions",
      weeks: [8, 10],
      items: [
        {
          title: "ML foundations: regression and classification",
          topics: ["Train, validate, test", "Linear and logistic models", "Tree-based models"],
          lab: "Predict which card transactions are fraudulent.",
          assignment: "Compare two models and explain the trade-offs.",
        },
        {
          title: "Model interpretation and decision frameworks",
          topics: ["Feature importance and SHAP", "Thresholds and cost of errors", "Decision trees for leaders"],
          lab: "Explain your fraud model with SHAP values.",
          assignment: "Write a threshold memo based on the cost of errors.",
        },
        {
          title: "Capstone and executive decision pack",
          topics: ["Problem framing", "Analysis plan", "Presenting to leadership"],
          lab: "Frame your capstone decision question and success metrics.",
          assignment: "Deliver the decision pack and recorded presentation.",
        },
      ],
    },
  ],
  paceNote:
    "Learners new to coding can take up to 12 weeks; the extra two weeks are reserved for SQL and Python practice.",
  projects: [
    {
      windowTitle: "Payments Conversion · Power BI",
      preview: "dashboard",
      title: "Payments conversion dashboard",
      description: "A dashboard tracking authorisation rates, failure reasons and conversion by method and bank.",
      dataset: "Checkout sessions and payment attempts",
      tags: ["Dashboard", "KPI dictionary", "Insight summary"],
    },
    {
      windowTitle: "analysis.ipynb",
      preview: "notebook",
      title: "Churn analysis",
      description: "Cohort and survival analysis showing when and why wallet users stop transacting.",
      dataset: "Wallet users, top-ups and transactions",
      tags: ["Notebook", "Cohort chart", "Retention levers"],
    },
    {
      windowTitle: "model_card.md",
      preview: "modelCard",
      title: "Fraud-risk analysis",
      description: "Segment-level fraud rates with a cost-based review threshold recommendation.",
      dataset: "Labelled card transactions",
      tags: ["Risk segments", "Model card", "Threshold memo"],
    },
    {
      windowTitle: "PRD-012.md",
      preview: "prd",
      title: "Executive decision pack",
      description: "A five-slide pack that recommends one decision, with evidence and expected impact.",
      dataset: "Combined outputs from your projects",
      tags: ["Decision pack", "Appendix", "Recorded presentation"],
    },
  ],
  capstone: {
    title: "Merchant growth and risk decision project",
    body: "Combine business intelligence and a predictive model to recommend which merchants a payments company should grow, monitor or offboard.",
    dataset: "Merchant profiles, monthly volumes, refunds and chargebacks",
    stages: [
      { title: "Frame", body: "Decision question and success metrics" },
      { title: "Analyse", body: "SQL and Python analysis with BI dashboard" },
      { title: "Predict", body: "Interpretable risk model with thresholds" },
      { title: "Decide", body: "Executive decision pack and presentation" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "DSDI",
  roles: [
    { title: "Data Analyst", body: "Answer business questions with SQL and BI" },
    { title: "Business / Product Analyst", body: "Measure and improve products and operations" },
    { title: "Junior Data Scientist", body: "Build and explain predictive models" },
  ],
  certificate: { capstone: "Merchant growth and risk decision project", credentialId: "IIAA-DSDI-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const APAB: CourseDetail = {
  trackId: "prod",
  enrolLabel: "Enrol in AI Product & Automation Building",
  hero: {
    title: "Turn business problems into AI products people actually use.",
    lead: "Learn discovery, PRDs, prototyping and automation — then build a working AI workflow and a plan to launch and measure it.",
  },
  pricing: { instalments: "or 3 instalments", international: "$449 international", nextCohort: "2 Nov 2026" },
  problem: {
    title: "The bottleneck in AI is no longer the model — it is the product.",
    body: "Teams buy AI tools and see little change because nobody mapped the workflow, defined success or drove adoption. AI product builders connect the real problem, the right tool and the people who will use it.",
    points: [
      "AI pilots with no owner or metric",
      "Automation that breaks the actual workflow",
      "Tools bought but never adopted",
    ],
  },
  outcomes: [
    { value: "1", label: "PRD for an AI product, from problem to metrics" },
    { value: "3", label: "working automations built with low-code and LLM APIs" },
    { value: "1", label: "launch and adoption plan with success metrics" },
  ],
  builtFor: [
    "Product managers and business analysts",
    "Operations, finance and customer-support leads",
    "Founders and non-engineers who want to build with AI",
  ],
  prerequisites: {
    required: ["Basic digital fluency: docs, spreadsheets and web apps"],
    helpful: ["Experience in any business function"],
    notRequired: ["Coding experience"],
  },
  tools: ["Miro / FigJam", "Notion", "Figma", "LLM APIs", "n8n / Zapier", "Retool", "Airtable", "Mixpanel"],
  coreWeeks: 8,
  phases: [
    {
      title: "Discover",
      summary: "Find problems worth solving",
      weeks: [1, 2],
      items: [
        {
          title: "Problem discovery and customer interviews",
          topics: ["Jobs to be done", "Interview scripts", "Synthesising insights"],
          lab: "Interview a mock support team about their busiest workflow.",
          assignment: "Synthesise interviews into three problem statements.",
        },
        {
          title: "Workflow mapping and AI opportunity assessment",
          topics: ["Process mapping", "Automation vs augmentation", "Value and feasibility scoring"],
          lab: "Map the merchant KYC follow-up workflow in Miro.",
          assignment: "Score five AI opportunities on value and feasibility.",
        },
      ],
    },
    {
      title: "Define and design",
      summary: "Specify and prototype the solution",
      weeks: [3, 4],
      items: [
        {
          title: "PRDs and user journeys",
          topics: ["PRD structure", "User journeys and edge cases", "Non-functional requirements"],
          lab: "Draft a PRD for your top-scoring opportunity.",
          assignment: "Add user journeys, edge cases and success metrics.",
        },
        {
          title: "Prototyping",
          topics: ["Wireframes in Figma", "Clickable prototypes", "Usability tests"],
          lab: "Build a clickable prototype of your AI feature.",
          assignment: "Run three usability tests and list what you changed.",
        },
      ],
    },
    {
      title: "Build and launch",
      summary: "Ship, measure and drive adoption",
      weeks: [5, 8],
      items: [
        {
          title: "LLM APIs and automation",
          topics: ["Prompts for business tasks", "n8n / Zapier workflows", "Connecting apps and data"],
          lab: "Automate support ticket triage with an LLM in n8n.",
          assignment: "Build a prompt library and quality checks for the workflow.",
        },
        {
          title: "No/low-code product building",
          topics: ["Internal tools with Retool", "Data with Airtable", "Handling errors"],
          lab: "Build an internal sales intelligence tool in Retool.",
          assignment: "Handle failures gracefully and collect user test notes.",
        },
        {
          title: "Analytics, experimentation and product metrics",
          topics: ["Activation and adoption metrics", "Experiment design", "Dashboards"],
          lab: "Instrument your tool with Mixpanel events.",
          assignment: "Define an adoption metric and a dashboard to track it.",
        },
        {
          title: "Responsible AI, launch and adoption",
          topics: ["Risk and bias reviews", "Change management", "Launch plan"],
          lab: "Run a risk and bias review of your AI workflow.",
          assignment: "Write a launch and adoption plan with an ROI estimate.",
        },
      ],
    },
  ],
  paceNote: "Learners new to product work can take up to 10 weeks; the extra time is for discovery practice.",
  projects: [
    {
      windowTitle: "workflow · exceptions",
      preview: "workflow",
      title: "AI support workflow",
      description: "Automated triage and drafted replies for a fintech support queue, with human approval.",
      dataset: "Support tickets from a payments app",
      tags: ["Workflow", "Prompt library", "Quality checks"],
    },
    {
      windowTitle: "assistant · cited answer",
      preview: "citedAnswer",
      title: "Sales intelligence assistant",
      description: "An internal tool that summarises accounts and suggests next actions before sales calls.",
      dataset: "CRM exports and public company data",
      tags: ["Internal tool", "User test notes", "Adoption metric"],
    },
    {
      windowTitle: "PRD-012.md",
      preview: "prd",
      title: "Fintech operations automation",
      description: "A PRD and automation that removes manual steps from merchant KYC follow-ups.",
      dataset: "Merchant onboarding workflow and KYC checklist",
      tags: ["PRD", "Automation", "ROI estimate"],
    },
  ],
  capstone: {
    title: "Merchant onboarding AI product",
    body: "Take a real fintech operations problem from discovery to a working AI workflow, and plan how to launch, measure and scale it.",
    dataset: "Merchant onboarding cases, KYC documents and support logs",
    stages: [
      { title: "Problem", body: "Discovery insights and opportunity score" },
      { title: "PRD", body: "PRD with journeys and metrics" },
      { title: "Prototype", body: "Tested prototype and working AI workflow" },
      { title: "Launch", body: "Metrics dashboard and adoption plan" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "APAB",
  roles: [
    { title: "AI Product Manager", body: "Own AI features from idea to adoption" },
    { title: "Automation Specialist", body: "Design and run business automations" },
    { title: "AI Business Analyst", body: "Translate workflows into AI requirements" },
  ],
  certificate: { capstone: "Merchant onboarding AI product", credentialId: "IIAA-APAB-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const ABT: CourseDetail = {
  trackId: "abt",
  enrolLabel: "Enquire about AI-Driven Business Transformation",
  hero: {
    title: "Turn strategy, P&L and AI into measurable business outcomes.",
    lead: "Build the commercial judgement to understand how businesses create value, the intelligence to make better decisions, and the practical capability to identify and lead AI-enabled transformation.",
  },
  pricing: { international: "Fees announced with cohort dates", nextCohort: "To be announced" },
  problem: {
    title: "Knowing your function is no longer enough. Leaders need to understand the whole business.",
    body: "Professionals are increasingly expected to connect functional decisions with financial performance, use data to identify what is happening across the business, and understand where AI can create real value.",
    points: [
      "Strategy without execution: priorities never become clear plans, owners and measurable outcomes",
      "Activity without P&L visibility: functions look healthy while margins, costs or cash flow tell a different story",
      "AI adoption without business value: tools and pilots that never deliver a measurable return",
    ],
  },
  outcomes: [
    { value: "8", label: "weekly practical outputs, from strategic diagnostic to 90-day roadmap" },
    { value: "1", label: "ROI-led business case with a benefits-realisation scorecard" },
    { value: "1", label: "executive-ready transformation proposal, presented to a simulated executive committee" },
  ],
  builtFor: [
    "Professionals with 8+ years of experience ready to take on broader business responsibility",
    "Mid-level and senior managers preparing for senior leadership or general management",
    "Functional heads across finance, operations, sales, marketing, HR, technology and digital",
    "Business unit leaders and general managers accountable for business performance",
    "Consultants, independent advisors, entrepreneurs and business owners",
  ],
  prerequisites: {
    required: [
      "At least eight years of professional experience",
      "Interest in business strategy and performance",
      "Willingness to work with business scenarios, data and practical exercises",
    ],
    helpful: ["Curiosity about how AI can be applied in your day-to-day work", "A business challenge from your own organisation (anonymised)"],
    notRequired: ["Programming background", "Advanced financial qualification"],
  },
  delivery: {
    title: ["Strategic in approach.", "Commercial in outcome."],
    features: [
      { icon: CirclePlay, title: "Live and recorded sessions", description: "Business strategy, organisational context and a structured method for finding transformation priorities." },
      { icon: Workflow, title: "Cases and simulations", description: "Select and scope the right projects using strategic fit, business value and feasibility." },
      { icon: Hammer, title: "Applied AI demonstrations", description: "Evaluate AI through a business lens: revenue, operations, customers, productivity and risk." },
      { icon: CalendarClock, title: "Capstone and faculty feedback", description: "Build a complete transformation proposal, with structured feedback on every assignment." },
    ],
    note: "Plan for 10–15 hrs/week across live sessions, guided exercises, independent application and capstone development.",
  },
  tools: [
    "Strategic diagnostic",
    "Value-vs-feasibility matrix",
    "Data-to-P&L map",
    "ROI & sensitivity analysis",
    "Build-vs-buy decision matrix",
    "90-day roadmap",
  ],
  coreWeeks: 8,
  phases: [
    {
      title: "Strategic methodology and project selection",
      summary: "Start with the business, not the technology",
      weeks: [1, 2],
      items: [
        {
          title: "Strategic methodology: start with the business, not the technology",
          topics: [
            "Purpose, business model, strategic priorities and competitive context",
            "Diagnosing where value is created, constrained, lost or at risk",
            "Translating strategy into outcomes, operating priorities and measurable objectives",
            "Strategic gaps across revenue, customers, operations, people, technology and risk",
          ],
          lab: "Conduct a strategic diagnostic of a selected organisation or business unit. Define the business challenge, desired outcomes and measures of success.",
          assignment: "Strategic diagnostic and transformation opportunity map.",
        },
        {
          title: "Project selection: prioritising the right business problems",
          topics: [
            "From a long list of ideas to a focused transformation portfolio",
            "Business value, strategic fit, feasibility, urgency, complexity and risk",
            "Symptoms vs root causes; technology opportunities vs business needs",
            "Scope, stakeholders, dependencies, ownership and success criteria",
          ],
          lab: "Evaluate a set of potential initiatives and select one priority project using a value-versus-feasibility framework.",
          assignment: "Prioritised project charter with objectives, scope, sponsor, baseline measures and success criteria.",
        },
      ],
    },
    {
      title: "Data to P&L and AI applications",
      summary: "Find the value, then test where AI fits",
      weeks: [3, 5],
      items: [
        {
          title: "Data to P&L: core revenue, operational and financial indicators",
          topics: [
            "Revenue indicators: growth, conversion, order value, retention, churn and lifetime value",
            "Operational indicators: productivity, utilisation, throughput, quality and cost-to-serve",
            "Financial drivers: gross and contribution margin, opex, working capital and unit economics",
            "Dashboards, trend analysis and root-cause diagnostics",
          ],
          lab: "Analyse a business performance dataset and trace revenue and operational indicators through to their P&L implications.",
          assignment: "Data-to-P&L performance map, KPI baseline and quantified opportunity hypotheses.",
        },
        {
          title: "AI applications with a business mindset",
          topics: [
            "Generative, predictive and agentic AI in business terms",
            "Where AI improves revenue, customer experience, productivity and decisions",
            "Assessing use cases on value, data readiness, process fit, adoption and risk",
            "Limitations: hallucinations, bias, security, privacy and human oversight",
          ],
          lab: "For your Week 2 project, decide where AI fits, where automation or process redesign is better, and where human judgement must stay central.",
          assignment: "AI opportunity assessment linked to business outcomes and measurable KPIs.",
        },
        {
          title: "Revenue levers, ROI and the economics of transformation",
          topics: [
            "Growth levers: acquisition, conversion, pricing, frequency, retention and expansion",
            "Operational levers: automation, productivity, cycle time, quality and cost-to-serve",
            "Investment case: costs, benefits, payback, ROI and sensitivity analysis",
            "Projected vs realised value, and how benefits will be tracked",
          ],
          lab: "Build a financial value case for your project, including assumptions, costs, benefits, ROI and measurable indicators.",
          assignment: "Commercial business case and benefits-realisation scorecard.",
        },
      ],
    },
    {
      title: "Build, buy and long-term transformation",
      summary: "Decide, plan and present the proposition",
      weeks: [6, 8],
      items: [
        {
          title: "Build vs buy: choosing the right technology and operating model",
          topics: [
            "Build, buy, partner or configure: criteria and trade-offs",
            "Total cost of ownership, time to value, scalability and vendor dependency",
            "Data ownership, integration, security, compliance and interoperability",
            "Proof of concept, procurement, adoption and exit considerations",
          ],
          lab: "Compare build, buy and partner options for your project using a weighted decision matrix.",
          assignment: "Build-versus-buy recommendation and solution-selection rationale.",
        },
        {
          title: "Building blocks, execution roadmap and long-term vision",
          topics: [
            "People, process, data, technology, governance and operating model",
            "Sequencing foundations, pilots, scale-up and continuous improvement",
            "Roles, decision rights, change management and adoption",
            "A 90-day execution plan alongside a multi-year vision",
          ],
          lab: "Define the building blocks, dependencies, owners, milestones and measures for your initiative, and connect it to a longer-term vision.",
          assignment: "90-day roadmap and long-term transformation blueprint.",
        },
        {
          title: "Executive capstone: presenting the transformation proposition",
          topics: [
            "Strategic context, business problem and why this project",
            "Baseline across revenue, operational and financial indicators",
            "The AI-enabled intervention, investment case, ROI and risks",
            "Build-vs-buy decision, building blocks, 90-day roadmap and governance",
          ],
          lab: "Present the proposition to a simulated executive committee, showing strategic fit, commercial logic, implementation readiness and expected value.",
          assignment: "Executive-ready business transformation proposal.",
        },
      ],
    },
  ],
  paceNote: "The exact weekly mix and timetable will be published for each cohort.",
  projects: [
    {
      windowTitle: "performance · P&L drivers",
      preview: "dashboard",
      title: "Business performance & P&L assessment",
      description: "Analyse a simulated business, interpret its financial and operating performance, find the underlying drivers and recommend improvements.",
      dataset: "Simulated business financials and operating KPIs",
      tags: ["Performance diagnosis", "P&L and KPI interpretation", "Commercial recommendations"],
    },
    {
      windowTitle: "proposal · exec committee",
      preview: "prd",
      title: "AI-enabled transformation proposal",
      description: "An executive-ready proposal connecting strategy and project selection to data, revenue levers, an AI-enabled intervention and measurable value.",
      dataset: "Your own organisation's challenge (anonymised) or a simulated business",
      tags: ["ROI case", "Build vs buy", "90-day roadmap"],
    },
  ],
  capstone: {
    eyebrow: "Executive capstone",
    title: "Strategic AI-enabled business transformation proposal",
    body: "Start with strategic context and project selection, then connect data, revenue and operational indicators to an AI-enabled intervention and measurable business value.",
    stages: [
      { title: "Select", body: "Strategic diagnosis and project selection" },
      { title: "Measure", body: "Data-to-P&L indicators and revenue levers" },
      { title: "Decide", body: "AI application, ROI and build-versus-buy" },
      { title: "Realise", body: "Building blocks, roadmap and long-term vision" },
    ],
    altDomains: [],
  },
  trainerCode: "ABT",
  roles: [
    { title: "Business and functional leaders", body: "Strategic thinking, financial understanding and cross-functional decisions" },
    { title: "Technology and transformation professionals", body: "Tie technology initiatives to commercial priorities and business cases" },
    { title: "Entrepreneurs and consultants", body: "Sharper performance assessments and practical AI transformation proposals" },
  ],
  certificate: { capstone: "AI-enabled business transformation proposal", credentialId: "IIAA-ABT-2026-000123" },
  faqs: [
    {
      question: "Do I need a technical or programming background?",
      answer: "No. The programme is designed for business and working professionals. AI concepts and demonstrations are taught from a business application perspective, with no coding required.",
    },
    {
      question: "Do I need to work in finance to understand the P&L module?",
      answer: "No. The P&L module helps professionals from any function understand financial statements, profitability drivers, costs, margins and cash flow.",
    },
    {
      question: "Is this an AI tools course?",
      answer: "No. AI tools are used for demonstrations and exercises, but the focus is strategic business thinking, financial performance, business intelligence and the evaluation and execution of AI-enabled transformation.",
    },
    {
      question: "Will I build an AI agent?",
      answer: "The programme introduces agentic AI and intelligent workflows from a business perspective. You map and propose an AI-enabled process; it is not a software engineering or agent-development certification.",
    },
    {
      question: "Can I use a challenge from my own organisation?",
      answer: "Yes, where you are authorised to. Do not share confidential, personal or commercially sensitive data; simulated or anonymised examples can be used instead.",
    },
    {
      question: "How is the programme delivered?",
      answer: "An eight-week, faculty-led programme with 10–15 hours a week of live sessions, guided work, practical exercises and project development. Online delivery comes first, with classroom or hybrid delivery possible for selected cohorts.",
    },
    {
      question: "Does the programme guarantee career advancement?",
      answer: "No. It strengthens professional capabilities and business judgement, but it does not guarantee a promotion, placement, salary increase or appointment to a P&L role.",
    },
  ],
};

export const COURSE_DETAILS: Record<string, CourseDetail> = {
  "azure-fabric-data-engineering": AFDE,
  "forward-deployed-ai-engineer": FDE,
  "data-ai-platform-engineer": DAPE,
  "data-science-analytics-decision-intelligence": DSDI,
  "applied-ai-machine-learning-engineer": AIML,
  "generative-ai-agentic-systems-engineer": GENAI,
  "ai-product-automation-builder": APAB,
  "ai-driven-business-transformation": ABT,
};

/** Splits "Lead trainer · DSDI" into its label and course code. */
function parseAssignment(assignment: string) {
  const [label, code] = assignment.split(" · ");
  return { label, code };
}

/** Trainers on a course with their assignment label, leads first. */
export function getCourseTrainers(course: CourseDetail) {
  return TRAINERS.flatMap((trainer) =>
    trainer.assignments
      .map(parseAssignment)
      .filter((a) => a.code === course.trainerCode)
      .map((a) => ({ trainer, label: a.label })),
  ).sort((a, b) => Number(b.label.startsWith("Lead")) - Number(a.label.startsWith("Lead")));
}

/** Tracks a trainer teaches, with their assignment label and course code. */
export function getTrainerCourses(trainer: Trainer) {
  return trainer.assignments.map(parseAssignment).flatMap(({ label, code }) => {
    const course = Object.values(COURSE_DETAILS).find((c) => c.trainerCode === code);
    const track = course && TRACKS.find((t) => t.id === course.trackId);
    return track ? [{ label, code, track }] : [];
  });
}
