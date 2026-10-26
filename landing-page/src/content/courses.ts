import type { ProjectPreviewKey } from "@/components/cards/ProjectPreviews";
import { TRACKS, TRAINERS, type Track, type Trainer } from "./site";

export type CourseWeek = { title: string; topics: string[]; lab: string; assignment: string };

export type CoursePhase = {
  title: string;
  summary: string;
  /** Inclusive week range within the core 12 weeks, e.g. [1, 4]. */
  weeks: [number, number];
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
  pricing: { instalments: string; international: string; nextCohort: string };
  problem: { title: string; body: string; points: string[] };
  outcomes: { value: string; label: string }[];
  builtFor: string[];
  notFor: string[];
  prerequisites: { required: string[]; helpful: string[]; notRequired?: string[] };
  tools: string[];
  coreWeeks: number;
  phases: CoursePhase[];
  paceNote: string;
  projects: CourseProject[];
  capstone: {
    title: string;
    body: string;
    dataset: string;
    stages: { title: string; body: string }[];
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
  notFor: ["Complete beginners to programming", "Learners who only want a theory overview of AI"],
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
  notFor: ["Learners without any Python", "Those looking for research-level deep learning"],
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
    { value: "3", label: "agentic projects with traces and eval sets" },
    { value: "100+", label: "test cases in your evaluation suite" },
    { value: "1", label: "MCP server exposing your own tools" },
  ],
  builtFor: [
    "Software and data engineers adding GenAI to products",
    "ML engineers moving to LLM systems",
    "Technical founders building AI features",
  ],
  notFor: ["Learners without Python or API experience"],
  prerequisites: {
    required: ["Python", "Working with REST APIs and JSON"],
    helpful: ["SQL", "Docker", "Git"],
    notRequired: ["Prior machine learning experience"],
  },
  tools: [
    "Python",
    "TypeScript",
    "LLM APIs",
    "Embeddings",
    "pgvector",
    "Hybrid search",
    "LangGraph",
    "MCP",
    "Langfuse",
    "Docker",
  ],
  coreWeeks: 10,
  phases: [
    {
      title: "LLM engineering",
      summary: "Control model behaviour",
      weeks: [1, 3],
      items: [
        {
          title: "LLM fundamentals and provider APIs",
          topics: ["Tokens, context and sampling", "Provider APIs and gateways", "Streaming"],
          lab: "Call two providers through a gateway and stream the responses.",
          assignment: "Compare quality, cost and latency for a support use case.",
        },
        {
          title: "Structured outputs and prompt systems",
          topics: ["JSON schemas and validation", "Prompt templates and versioning", "Few-shot design"],
          lab: "Extract structured fields from dispute emails with schema validation.",
          assignment: "Version your prompts and add regression tests.",
        },
        {
          title: "Embeddings and vector databases",
          topics: ["Embedding models", "Similarity and indexing", "pgvector"],
          lab: "Embed and index card-scheme rules in pgvector.",
          assignment: "Benchmark two embedding models on your own queries.",
        },
      ],
    },
    {
      title: "Retrieval and agents",
      summary: "Ground answers and take actions",
      weeks: [4, 6],
      items: [
        {
          title: "RAG, hybrid search and reranking",
          topics: ["Chunking strategies", "BM25 plus vectors", "Rerankers and citations"],
          lab: "Build a cited assistant over regulatory circulars.",
          assignment: "Measure retrieval quality before and after reranking.",
        },
        {
          title: "Tool calling and agents",
          topics: ["Function calling", "Planning loops", "Error recovery"],
          lab: "Build an agent that pulls transaction history and checks rules.",
          assignment: "Define tool contracts and handle every failure path.",
        },
        {
          title: "MCP and memory",
          topics: ["Model Context Protocol servers", "Short and long-term memory", "Multi-agent patterns"],
          lab: "Expose your own tools through an MCP server.",
          assignment: "Add memory to your agent and trace a multi-step run.",
        },
      ],
    },
    {
      title: "Production GenAI",
      summary: "Measure, secure and ship",
      weeks: [7, 10],
      items: [
        {
          title: "Evaluation",
          topics: ["Golden datasets", "LLM-as-judge and rubrics", "Regression testing"],
          lab: "Build a golden dataset and LLM grader for your assistant.",
          assignment: "Block merges that drop eval scores below a threshold.",
        },
        {
          title: "Guardrails and security",
          topics: ["Prompt injection", "PII and policy filters", "Permissioned tools"],
          lab: "Red-team your agent with prompt injection attempts.",
          assignment: "Add guardrails and permission checks on every tool.",
        },
        {
          title: "Observability, latency and cost",
          topics: ["Tracing", "Caching and routing", "Cost budgets"],
          lab: "Trace every request end to end in Langfuse.",
          assignment: "Cut cost per request with caching and model routing.",
        },
        {
          title: "Deployment and capstone",
          topics: ["Serving and scaling", "Human review queues", "Launch checklist"],
          lab: "Agree scope and milestones for your capstone workflow.",
          assignment: "Deliver the deployed workflow with tracing and a cost report.",
        },
      ],
    },
  ],
  paceNote:
    "The fast track covers the core in 10 weeks. The standard pace spreads the same content and the capstone over up to 12 weeks.",
  projects: [
    {
      windowTitle: "assistant · cited answer",
      preview: "citedAnswer",
      title: "Fintech knowledge assistant",
      description: "A cited assistant over card-scheme rules, RBI circulars and internal policies.",
      dataset: "Public regulatory circulars and synthetic internal policies",
      tags: ["Assistant", "Retrieval evals", "Citation audit"],
    },
    {
      windowTitle: "agent-trace · run 48",
      preview: "agentTrace",
      title: "Transaction investigation agent",
      description: "An agent that pulls transaction history, checks rules and drafts an investigation note.",
      dataset: "Flagged transactions with merchant and customer history",
      tags: ["Agent traces", "Tool contracts", "Eval suite"],
    },
    {
      windowTitle: "workflow · exceptions",
      preview: "workflow",
      title: "Reconciliation agent",
      description: "An agent that matches ledger and bank entries and routes exceptions for human review.",
      dataset: "Ledger, bank statement and PSP settlement files",
      tags: ["Match report", "Exception queue", "Cost dashboard"],
    },
  ],
  capstone: {
    title: "Agentic dispute-resolution workflow",
    body: "Build a production-style agentic workflow that triages customer disputes, gathers evidence through tools, drafts a resolution and escalates edge cases — with evaluation and guardrails throughout.",
    dataset: "Customer disputes, transaction logs and scheme rules",
    stages: [
      { title: "Design", body: "Workflow, tools and risk register" },
      { title: "Build", body: "RAG, agent and MCP tool layer" },
      { title: "Evaluate", body: "Eval suite, guardrails and red-team report" },
      { title: "Ship", body: "Deployed workflow with tracing and cost report" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "GENAI",
  roles: [
    { title: "GenAI Engineer", body: "Build LLM features and RAG systems" },
    { title: "AI Agent Engineer", body: "Design tool-using, auditable agents" },
    { title: "LLMOps Engineer", body: "Evaluate, monitor and optimise LLM systems" },
  ],
  certificate: { capstone: "Agentic dispute-resolution workflow", credentialId: "IIAA-GENAI-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
};

const AFDE: CourseDetail = {
  trackId: "az",
  enrolLabel: "Enrol in Azure/Fabric Data Engineering",
  hero: {
    title: "Engineer end-to-end data solutions on Azure and Microsoft Fabric.",
    lead: "Ingest with Azure Data Factory, transform with Databricks and Delta Lake, build in Microsoft Fabric and deliver Power BI reports — finishing with a metadata-driven, real-time project.",
  },
  pricing: { instalments: "or 3 instalments", international: "$449 international", nextCohort: "2 Nov 2026" },
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
    { value: "1", label: "metadata-driven ADF and Databricks project, bronze to gold" },
    { value: "3", label: "medallion layers built on Delta Lake" },
    { value: "1", label: "Power BI report published from the gold layer" },
  ],
  builtFor: [
    "Graduates and career switchers starting in data engineering",
    "SQL, ETL and BI developers moving to Azure",
    "Testers and support engineers moving into data roles",
  ],
  notFor: ["Experienced Azure data engineers seeking advanced platform architecture"],
  prerequisites: {
    required: ["Basic computer and spreadsheet skills", "Logical reasoning"],
    helpful: ["Any SQL or programming exposure"],
    notRequired: ["Prior cloud experience"],
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
      items: [
        {
          title: "Cloud and Azure data services",
          topics: ["Cloud computing and Azure basics", "ADLS Gen2, Blob Storage and Azure SQL", "ADF, Databricks, Synapse and Fabric overview"],
          lab: "Set up an Azure account, a storage account and an Azure SQL database.",
          assignment: "Land sample payments files in ADLS Gen2 and explain why a data lake fits.",
        },
        {
          title: "Azure Data Factory",
          topics: ["Linked services, datasets and integration runtimes", "Full, incremental and parameterised loads", "Triggers, monitoring and CI/CD"],
          lab: "Copy data from Azure SQL to ADLS with a parameterised pipeline.",
          assignment: "Build an incremental load and schedule it with a trigger.",
        },
        {
          title: "SQL and Python for data engineering",
          topics: ["Joins, subqueries and window functions", "Python data structures and functions", "Map, filter, reduce and lambdas"],
          lab: "Clean and aggregate transactions with SQL window functions.",
          assignment: "Write Python functions that validate and reshape transaction records.",
        },
      ],
    },
    {
      title: "Lakehouse engineering",
      summary: "Transform at scale with Spark and Databricks",
      weeks: [4, 5],
      items: [
        {
          title: "Spark and Azure Databricks",
          topics: ["Spark architecture and RDDs", "Workspaces, clusters, catalog and DBFS", "Volumes, dbutils and ADLS integration"],
          lab: "Connect Databricks to ADLS and manage files with dbutils.",
          assignment: "Use RDD transformations and actions, and explain lazy evaluation.",
        },
        {
          title: "PySpark, Delta Lake and medallion architecture",
          topics: ["DataFrames, joins and window functions", "Managed and external Delta tables", "Bronze, silver and gold layers, DLT and Unity Catalog"],
          lab: "Build bronze, silver and gold Delta tables for card transactions.",
          assignment: "Schedule the Databricks notebooks from an ADF pipeline.",
        },
      ],
    },
    {
      title: "Fabric, BI and delivery",
      summary: "Serve trusted data to the business",
      weeks: [6, 8],
      items: [
        {
          title: "Microsoft Fabric",
          topics: ["OneLake, pipelines and Dataflows Gen2", "Fabric lakehouse, notebooks and warehouse", "Direct Lake and row- and column-level security"],
          lab: "Load a Fabric lakehouse and warehouse with pipelines and COPY INTO.",
          assignment: "Compare lakehouse and warehouse, and migrate one ADF pipeline to Fabric.",
        },
        {
          title: "Data warehousing and Power BI",
          topics: ["OLTP vs OLAP, star and snowflake schemas", "Power Query and data modelling", "DAX, reports and Power BI Service"],
          lab: "Model a payments star schema in Power BI Desktop.",
          assignment: "Write DAX measures and publish a report to Power BI Service.",
        },
        {
          title: "Real-time project",
          topics: ["Key Vault, Azure DevOps repos and pull requests", "Dynamic linked services and metadata-driven pipelines", "Bronze and silver frameworks, triggers and job clusters"],
          lab: "Set up source stores, metadata tables and a DevOps repo for your project.",
          assignment: "Deliver the master pipeline and a Power BI report from the gold layer.",
        },
      ],
    },
  ],
  paceNote: "The core runs over 8 weeks, ending with a week-long real-time project.",
  projects: [
    {
      windowTitle: "pl_master_ingest.json",
      preview: "dag",
      title: "Metadata-driven ingestion pipeline",
      description: "ADF pipelines with dynamic linked services and datasets that load every source table from a metadata table.",
      dataset: "Payments, merchants and customers in Azure SQL",
      tags: ["ADF pipeline", "Metadata tables", "Triggers"],
    },
    {
      windowTitle: "gold/fct_transactions.sql",
      preview: "sql",
      title: "Databricks medallion lakehouse",
      description: "Bronze, silver and gold Delta tables built with PySpark notebooks and governed with Unity Catalog.",
      dataset: "Card transactions landed in ADLS Gen2",
      tags: ["Delta tables", "PySpark notebooks", "Unity Catalog"],
    },
    {
      windowTitle: "Payments Overview · Power BI",
      preview: "dashboard",
      title: "Fabric warehouse and Power BI report",
      description: "A Fabric warehouse and a Direct Lake Power BI report with DAX measures and row-level security.",
      dataset: "Gold-layer payments data in OneLake",
      tags: ["Fabric warehouse", "DAX measures", "Row-level security"],
    },
  ],
  capstone: {
    title: "End-to-end Azure payments data project",
    body: "Build a real-time project that ingests source data with metadata-driven ADF pipelines, transforms it through Databricks bronze, silver and gold layers and publishes a Power BI report — with secrets in Key Vault and code in Azure DevOps.",
    dataset: "Payments, merchants, refunds and customer tables from operational databases",
    stages: [
      { title: "Set up", body: "Azure services, source stores, Key Vault and DevOps repo" },
      { title: "Ingest", body: "Dynamic linked services and metadata-driven pipelines" },
      { title: "Transform", body: "Bronze and silver frameworks and gold tables" },
      { title: "Report", body: "Dimensional model, measures and published report" },
    ],
    altDomains: ["SaaS", "E-commerce", "Logistics", "Healthcare"],
  },
  trainerCode: "AFDE",
  roles: [
    { title: "Azure Data Engineer", body: "Build pipelines with ADF and Databricks" },
    { title: "Fabric Data Engineer", body: "Build lakehouses and warehouses in Fabric" },
    { title: "BI Developer", body: "Model data and build Power BI reports" },
  ],
  certificate: { capstone: "End-to-end Azure payments data project", credentialId: "IIAA-AFDE-2026-000123" },
  faqs: [COMMON_FAQS.week, COMMON_FAQS.handholding, COMMON_FAQS.fintech, COMMON_FAQS.job],
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
  notFor: ["Learners who have never written a query", "Those looking only for dashboarding skills"],
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
  notFor: ["Experienced data scientists seeking advanced ML research"],
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
  notFor: ["Engineers looking for deep model or infrastructure work"],
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

export const COURSE_DETAILS: Record<string, CourseDetail> = {
  "forward-deployed-ai-engineer": FDE,
  "azure-fabric-data-engineering": AFDE,
  "data-ai-platform-engineer": DAPE,
  "data-science-analytics-decision-intelligence": DSDI,
  "applied-ai-machine-learning-engineer": AIML,
  "generative-ai-agentic-systems-engineer": GENAI,
  "ai-product-automation-builder": APAB,
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
