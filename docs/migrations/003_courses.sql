-- Migration: courses and related tables (Samagyaan Data solutions courses feature)
-- Run once on existing RDS. Requires uuid-ossp extension (already in schema).

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    short_description TEXT,
    full_description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_status_display_order ON courses(status, display_order);

-- ============================================
-- COURSE_HIGHLIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_highlights_course_id ON course_highlights(course_id);

-- ============================================
-- COURSE_PHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_phases_course_id ON course_phases(course_id);

-- ============================================
-- COURSE_PHASE_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_phase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES course_phases(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_phase_items_phase_id ON course_phase_items(phase_id);

-- ============================================
-- COURSE_BENEFITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_benefits_course_id ON course_benefits(course_id);

-- ============================================
-- COURSE_AUDIENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_audience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_audience_course_id ON course_audience(course_id);

-- ============================================
-- COURSE_CAREER_OUTCOMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_career_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_career_outcomes_course_id ON course_career_outcomes(course_id);

-- ============================================
-- COURSE_CERTIFICATE TABLE (one per course)
-- ============================================
CREATE TABLE IF NOT EXISTS course_certificate (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255),
    provider VARCHAR(255),
    description TEXT,
    image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_course_certificate_course_id ON course_certificate(course_id);

-- ============================================
-- COURSE_REGISTRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT course_registrations_course_user_unique UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_registrations_course_id ON course_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_user_id ON course_registrations(user_id);

-- ============================================
-- SEED DATA (4 courses from Samagyaan Data solutions)
-- ============================================

DO $$
DECLARE
  c_id UUID;
  p_id UUID;
BEGIN
  -- Course 1: Generative AI & Agentic Systems
  INSERT INTO courses (title, slug, short_description, full_description, status, display_order)
  VALUES (
    'Generative AI & Agentic Systems',
    'generative-ai-agentic-systems',
    'Deep dive into a complete lab to learn, gain insights on how to build and deploy advanced AI solutions including generative AI, LLM-powered applications, and autonomous agentic systems.',
    'A structured curriculum to master cutting-edge AI skills and applications. Build a strong foundation in Generative AI, master LLM application development, explore agentic multi-modality and RAG, and apply your knowledge in a capstone project with industry relevance.',
    'published',
    1
  )
  RETURNING id INTO c_id;

  INSERT INTO course_highlights (course_id, label, value, sort_order) VALUES
    (c_id, 'Projects', '3', 0),
    (c_id, 'Duration', '12 weeks', 1),
    (c_id, 'Delivery', 'Online + Live', 2),
    (c_id, 'Schedule', 'Flexible Schedule', 3);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 1: Generative AI Foundations', 'Build a strong foundation in Generative AI concepts and applications.', 0)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Deep dive into Generative AI concepts', 0),
    (p_id, 'what_you_learn', 'Build and deploy Generative AI models', 1),
    (p_id, 'what_you_learn', 'Understand Transformers architecture', 2);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 2: LLM Application Development', 'Master building powerful applications powered by Large Language Models.', 1)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Build prompt engineering skills', 0),
    (p_id, 'what_you_learn', 'Develop RAG-based systems', 1),
    (p_id, 'what_you_learn', 'Integrate LLMs with various tools', 2);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 3: Agentic Multi-Modality & RAG', 'Explore advanced agentic systems, multi-modal applications, and RAG architectures.', 2)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Design and implement autonomous AI agents', 0),
    (p_id, 'what_you_learn', 'Work with multi-modal inputs and outputs', 1),
    (p_id, 'what_you_learn', 'Optimize RAG systems for performance', 2);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 4: Capstone Project & Industry Relevance', 'Apply your knowledge to real-world projects and understand industry applications.', 3)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Develop a full-stack Generative AI application', 0),
    (p_id, 'what_you_learn', 'Collaborate with industry experts', 1),
    (p_id, 'what_you_learn', 'Understand the ethical implications of AI', 2);

  INSERT INTO course_benefits (course_id, title, description, sort_order) VALUES
    (c_id, 'End-to-End AI Development', 'Build complete AI solutions from concept to deployment', 0),
    (c_id, 'Career Advancement', 'Position yourself for high-demand AI roles', 1),
    (c_id, 'Real-world Project Experience', 'Hands-on capstone and industry projects', 2),
    (c_id, 'Deep AI Expertise', 'Master generative AI, LLMs, and agentic systems', 3);

  INSERT INTO course_certificate (course_id, title, provider, description) VALUES
    (c_id, 'Generative AI & Agentic Systems', 'Samagyaan Data solutions', 'Industry-recognized certification. Verify your skills. Enhance your professional profile.');
END $$;

DO $$
DECLARE
  c_id UUID;
  p_id UUID;
BEGIN
  -- Course 2: MicroMasters in Applied FinTech & Agentic AI Systems
  INSERT INTO courses (title, slug, short_description, full_description, status, display_order)
  VALUES (
    'MicroMasters in Applied FinTech & Agentic AI Systems',
    'micromasters-fintech-agentic-ai',
    'An immersive 12-week program delivered in live, interactive sessions for professionals wanting to upgrade their skillset in AI and FinTech. Agile AI MicroMasters to supercharge your career.',
    'Gain foundational knowledge in FinTech and PropTech, dive deep into Generative AI and LLMs, and explore Agentic AI and Multi-Agent Systems. Includes capstone project and career jumpstart.',
    'published',
    2
  )
  RETURNING id INTO c_id;

  INSERT INTO course_highlights (course_id, label, value, sort_order) VALUES
    (c_id, 'Duration', '12 Weeks', 0),
    (c_id, 'Learning Style', 'Expert-led', 1),
    (c_id, 'Delivery Method', 'Online', 2),
    (c_id, 'Flexibility', 'Flexible', 3);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 1: Applied FinTech & PropTech Engineering', 'Gain foundational knowledge in FinTech & PropTech applications and master the engineering principles to build robust, scalable, and secure systems.', 0)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Foundational Concepts', 0),
    (p_id, 'what_you_learn', 'Core AI for FinTech', 1),
    (p_id, 'what_you_learn', 'Data Engineering for FinTech', 2),
    (p_id, 'what_you_learn', 'Blockchain & Cryptocurrency', 3),
    (p_id, 'what_you_learn', 'Algorithmic Trading Strategies', 4),
    (p_id, 'what_you_learn', 'Credit Scoring & Risk Management', 5);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 2: Generative AI & LLM Systems', 'Dive deep into the transformative power of Generative AI and Large Language Models, mastering their architectures, training, and deployment for innovative FinTech solutions.', 1)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Generative AI Foundations', 0),
    (p_id, 'what_you_learn', 'LLM Architectures', 1),
    (p_id, 'what_you_learn', 'Fine-tuning & Prompt Engineering', 2),
    (p_id, 'what_you_learn', 'Applications in FinTech', 3),
    (p_id, 'what_you_learn', 'Fraud Detection with AI', 4),
    (p_id, 'what_you_learn', 'Capstone Project', 5);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 3: Agentic AI & Multi-Agent Systems', 'Explore the cutting-edge field of Agentic AI and Multi-Agent Systems, learning how autonomous agents can collaborate and interact within complex FinTech ecosystems.', 2)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Agentic AI Principles', 0),
    (p_id, 'what_you_learn', 'Multi-Agent System Design', 1),
    (p_id, 'what_you_learn', 'Reinforcement Learning for Agents', 2),
    (p_id, 'what_you_learn', 'Agent Communication & Coordination', 3),
    (p_id, 'what_you_learn', 'Algorithmic Trading Agents', 4),
    (p_id, 'what_you_learn', 'Real-world Case Studies', 5);

  INSERT INTO course_benefits (course_id, title, description, sort_order) VALUES
    (c_id, 'Project Portfolio', 'Showcase applied research and real-world projects', 0),
    (c_id, 'Industry Connections', 'Connect with FinTech and AI leaders', 1),
    (c_id, 'Problem-Solving Skills', 'Apply knowledge to real-world problems', 2),
    (c_id, 'Publication Potential', 'Opportunity to publish your work', 3);

  INSERT INTO course_audience (course_id, title, description, sort_order) VALUES
    (c_id, 'FinTech Professionals', 'Individuals aiming to upskill with AI and FinTech', 0),
    (c_id, 'Software Developers', 'Build AI-powered financial applications', 1),
    (c_id, 'Data Scientists', 'Apply ML and AI in finance', 2),
    (c_id, 'Financial Analysts', 'Leverage AI for analysis and decision-making', 3),
    (c_id, 'Entrepreneurs', 'Launch FinTech ventures', 4),
    (c_id, 'Recent Graduates', 'Start a career in FinTech and AI', 5);

  INSERT INTO course_career_outcomes (course_id, text, sort_order) VALUES
    (c_id, 'AI/ML Engineer', 0),
    (c_id, 'FinTech Analyst', 1),
    (c_id, 'Quantitative Researcher', 2),
    (c_id, 'Data Scientist', 3),
    (c_id, 'Product Manager (AI/FinTech)', 4),
    (c_id, 'Blockchain Developer', 5);

  INSERT INTO course_certificate (course_id, title, provider, description) VALUES
    (c_id, 'MicroMasters in Applied FinTech & Agentic AI Systems', 'Samagyaan Data solutions', 'Upon successful completion, you will receive an industry-recognized certificate, showcasing your expertise to potential employers worldwide.');
END $$;

DO $$
DECLARE
  c_id UUID;
  p_id UUID;
BEGIN
  -- Course 3: Global FinTech & AI-Driven Finance
  INSERT INTO courses (title, slug, short_description, full_description, status, display_order)
  VALUES (
    'Global FinTech & AI-Driven Finance',
    'global-fintech-ai-driven-finance',
    'An AI-driven immersive programme for graduates, consultants, and early-to-mid career professionals seeking to gain a competitive edge in the evolving landscape of FinTech.',
    'This programme equips learners with business acumen, technology proficiency, and the strategic foresight to thrive in a data-driven financial world. Our comprehensive program goes beyond basic learning, focusing on advanced concepts and real-world applications.',
    'published',
    3
  )
  RETURNING id INTO c_id;

  INSERT INTO course_highlights (course_id, label, value, sort_order) VALUES
    (c_id, 'Duration', '3 Months', 0),
    (c_id, 'Live Sessions', '25+ Hours', 1),
    (c_id, 'Case Studies', '5+ Industry Cases', 2),
    (c_id, 'Career Support', '1-on-1 Mentorship', 3);

  INSERT INTO course_benefits (course_id, title, description, sort_order) VALUES
    (c_id, 'AI-Driven Curriculum', 'Focuses on cutting-edge AI and machine learning techniques applied to finance', 0),
    (c_id, 'Experiential Learning', 'Engage in hands-on projects, case studies, and simulations', 1),
    (c_id, 'Industry-Ready Skills', 'Develop practical skills highly sought after by employers', 2),
    (c_id, 'Global Network', 'Connect with a diverse cohort of professionals and industry leaders', 3),
    (c_id, 'Career Advancement', 'Enhance your career prospects in FinTech', 4),
    (c_id, 'Expert Faculty', 'Learn from seasoned practitioners and academic leaders', 5);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 1: Global Financial Ecosystem and FinTech', 'Introduction to FinTech, AI, and their intersection.', 0);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 2: Machine Learning & Deep Learning Essentials in FinTech', 'Supervised, unsupervised learning, neural networks.', 1);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 3: AI in Quantitative Finance & Trading', 'Algorithmic trading, risk management, portfolio optimization.', 2);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 4: AI & Blockchain in Lending & Financial Services', 'Credit scoring, fraud detection, smart contracts.', 3);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 5: AI-Driven Risk Management & Compliance', 'Regulatory technology, cyber security.', 4);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 6: FinTech Startups & Innovation', 'Venture capital, business models.', 5);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 7: Capstone Project & Deployment', 'Real-world project, deployment strategies.', 6);
  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Module 8: Professional Development & Career Pathways', 'Resume building, interview prep.', 7);

  INSERT INTO course_audience (course_id, title, description, sort_order) VALUES
    (c_id, 'Fresh Graduates and Students', 'Aspirants looking to build a career in FinTech', 0),
    (c_id, 'Finance Professionals', 'Individuals aiming to upskill with AI and FinTech', 1),
    (c_id, 'Technology Enthusiasts', 'Developers interested in applying AI to finance', 2);

  INSERT INTO course_career_outcomes (course_id, text, sort_order) VALUES
    (c_id, 'FinTech Analyst', 0),
    (c_id, 'AI/ML Engineer in Finance', 1),
    (c_id, 'Quantitative Analyst', 2),
    (c_id, 'Risk Management Specialist', 3),
    (c_id, 'Blockchain Developer', 4),
    (c_id, 'Financial Data Scientist', 5),
    (c_id, 'Compliance Officer (RegTech)', 6),
    (c_id, 'FinTech Consultant', 7);

  INSERT INTO course_certificate (course_id, title, provider, description) VALUES
    (c_id, 'Global FinTech & AI-Driven Finance', 'Samagyaan Data solutions', 'Upon successful completion of the program, participants will be awarded a certificate from Samagyaan Data solutions. Industry-recognized, skill-based, globally recognized.');
END $$;

DO $$
DECLARE
  c_id UUID;
  p_id UUID;
BEGIN
  -- Course 4: Applied FinTech & Payments Engineering
  INSERT INTO courses (title, slug, short_description, full_description, status, display_order)
  VALUES (
    'Applied FinTech & Payments Engineering',
    'applied-fintech-payments-engineering',
    'Build a lucrative career in FinTech by learning to apply the latest technology skills, enhance your profile, and qualify for high-paying FinTech jobs.',
    'Industry-ready curriculum focused on FinTech Fundamentals, AI in Finance, Blockchain & Cryptocurrency, Payment Systems, Regulatory Compliance, and Data Analytics. Through 20+ industry projects and 5+ capstone projects, you will become an expert in AI-driven finance solutions.',
    'published',
    4
  )
  RETURNING id INTO c_id;

  INSERT INTO course_highlights (course_id, label, value, sort_order) VALUES
    (c_id, 'Duration', '6 Months', 0),
    (c_id, 'Industry Projects', '20+', 1),
    (c_id, 'Capstone Projects', '5+', 2),
    (c_id, 'Career Support', '100%', 3);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 1: Generative AI Foundations', 'Build a strong foundation in Gen AI and LLMs.', 0)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Foundational concepts of Gen AI', 0),
    (p_id, 'what_you_learn', 'Pre-trained Large Language Models (LLMs)', 1),
    (p_id, 'what_you_learn', 'Fine-tuning LLMs with custom data', 2),
    (p_id, 'what_you_learn', 'Prompt Engineering and techniques', 3),
    (p_id, 'what_you_learn', 'Ethical consideration and responsible AI', 4),
    (p_id, 'what_you_learn', 'Real-world application', 5);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 2: FinTech & Payment System', 'Master FinTech ecosystem and payment architecture.', 1)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'FinTech Ecosystem and its trends', 0),
    (p_id, 'what_you_learn', 'Payment System architecture', 1),
    (p_id, 'what_you_learn', 'Digital wallets and mobile payments', 2),
    (p_id, 'what_you_learn', 'Blockchain technology in Fintech', 3),
    (p_id, 'what_you_learn', 'Cybersecurity in payments', 4),
    (p_id, 'what_you_learn', 'Regulations and compliance', 5);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 3: Risk Management & Fraud Detection', 'Apply analytics and AI to risk and fraud.', 2)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Risk assessment and mitigation strategies', 0),
    (p_id, 'what_you_learn', 'Fraud detection techniques', 1),
    (p_id, 'what_you_learn', 'Machine learning for fraud detection', 2),
    (p_id, 'what_you_learn', 'Regulatory frameworks in risk management', 3),
    (p_id, 'what_you_learn', 'Case studies in risk and fraud', 4);

  INSERT INTO course_phases (course_id, title, subtitle, sort_order) VALUES
    (c_id, 'Phase 4: Capstone Project & Deployment', 'Apply knowledge to a real-world project.', 3)
  RETURNING id INTO p_id;
  INSERT INTO course_phase_items (phase_id, item_type, text, sort_order) VALUES
    (p_id, 'what_you_learn', 'Project ideation and planning', 0),
    (p_id, 'what_you_learn', 'Data collection and preparation', 1),
    (p_id, 'what_you_learn', 'Model development and evaluation', 2),
    (p_id, 'what_you_learn', 'Deployment strategies', 3),
    (p_id, 'what_you_learn', 'Presentation and documentation', 4);

  INSERT INTO course_benefits (course_id, title, description, sort_order) VALUES
    (c_id, 'Become an expert in AI-driven finance solutions', 'Develop skills in machine learning, NLP, and predictive analytics tailored for financial applications.', 0),
    (c_id, 'Master FinTech innovations', 'Gain a deep understanding of blockchain, cryptocurrencies, and digital payment systems.', 1),
    (c_id, 'Lead in FinTech strategy', 'Formulate and execute strategies for digital transformation and innovation in financial services.', 2),
    (c_id, 'Enhance risk management', 'Apply advanced analytics and AI tools to identify, assess, and mitigate financial risks.', 3),
    (c_id, 'Drive regulatory compliance', 'Navigate complex regulatory landscapes and ensure adherence to financial laws.', 4),
    (c_id, 'Unlock new career opportunities', 'Position yourself for high-demand roles in FinTech, from analysts to product managers.', 5);

  INSERT INTO course_certificate (course_id, title, provider, description) VALUES
    (c_id, 'Applied FinTech & Payments Engineering', 'Samagyaan Data solutions', 'Post Graduate Program, Verified by NASSCOM. Industry Recognized, Skills Verified, Global Recognition.');
END $$;
