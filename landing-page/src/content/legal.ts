/** Legal policy pages: shared navigation and per-policy copy. */

export type PolicyLink = { label: string; href: string };

/** One paragraph, or a bulleted list. */
export type PolicyBlock = string | { list: string[] };

export type PolicySection = { id: string; title: string; blocks: PolicyBlock[] };

export type Policy = {
  title: string;
  lead: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export const SUPPORT_EMAIL = "support@ai4impact.in";
const PRIVACY_EMAIL = "privacy@ai4impact.in";
const SECURITY_EMAIL = "security@ai4impact.in";

export const POLICY_LINKS: PolicyLink[] = [
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "ISMS Policy", href: "/isms-policy" },
];

export const TERMS: Policy = {
  title: "Terms of Use",
  lead: "The rules that apply when you browse ai4impact.in, create a learner account, enrol in a career track or use any AI4Impact service.",
  lastUpdated: "1 Oct 2026",
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of these terms",
      blocks: [
        'By accessing the AI4Impact website, learner portal, live sessions or any related service (together, the "Platform"), you agree to these Terms of Use, our Privacy Policy and our Refund Policy. If you do not agree, please do not use the Platform.',
        "If you use the Platform on behalf of an employer or another organisation, you confirm that you are authorised to accept these terms on its behalf.",
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility and accounts",
      blocks: [
        {
          list: [
            "You must be at least 18 years old, or have verifiable consent from a parent or legal guardian.",
            "You must give accurate registration details and keep them up to date.",
            "Your account is personal. Do not share your login credentials or let anyone else attend sessions or submit assessments for you.",
            `You are responsible for all activity under your account. Tell us at once at ${SUPPORT_EMAIL} if you suspect unauthorised access.`,
          ],
        },
      ],
    },
    {
      id: "programmes",
      title: "Programmes, schedules and content",
      blocks: [
        "Career tracks are delivered by cohort, with live sessions, recorded material, projects and assessments. Start dates, session timings, trainers and curriculum may change for operational or quality reasons. We will tell enrolled learners about any material change in advance whenever we reasonably can.",
        "You keep access to recorded content for the period stated on the programme page. After that period, access may be limited.",
      ],
    },
    {
      id: "certification",
      title: "Certification",
      blocks: [
        "AI4Impact professional certificates are issued by the AI4Impact Institute of Applied AI (IIAA) once you meet the published assessment criteria. Professional certificates are not academic degrees or diplomas.",
        "We may withhold or revoke a certificate if we find plagiarism, impersonation, assessment misconduct or a false claim. Every certificate can be verified publicly using its credential ID.",
      ],
    },
    {
      id: "career-support",
      title: "Career support",
      blocks: [
        "Career services such as mock interviews, portfolio reviews and employer introductions are offered on a best-effort basis. AI4Impact does not guarantee employment, interviews, a specific salary or a specific role.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      blocks: [
        {
          list: [
            "Do not record, redistribute, resell or publicly share live sessions, recordings, datasets or course materials without written permission.",
            "Do not upload unlawful, abusive, defamatory or infringing content to the Platform or community channels.",
            "Do not try to probe, scan or disrupt the Platform, or access data that does not belong to you.",
            "Treat trainers, mentors and fellow learners with respect. Harassment of any kind will lead to removal from the programme.",
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      blocks: [
        "All Platform content, including curriculum, videos, code templates, datasets and brand assets, belongs to AI4Impact or its licensors. You receive a limited, non-exclusive, non-transferable licence to use it only for your own learning.",
        "You keep ownership of the original work you create in projects and capstones. You grant AI4Impact a non-exclusive licence to show anonymised or attributed excerpts for showcase and quality purposes, and you can opt out by writing to us.",
      ],
    },
    {
      id: "fees",
      title: "Fees and payments",
      blocks: [
        "Programme fees, taxes and any instalment options are shown at checkout. Payments are processed by third-party payment gateways. Refunds are governed by our Refund Policy.",
      ],
    },
    {
      id: "liability",
      title: "Disclaimers and limitation of liability",
      blocks: [
        'The Platform is provided "as is". We work to keep it accurate and available, but we do not promise uninterrupted or error-free service.',
        "To the extent permitted by law, AI4Impact's total liability for any claim connected with the Platform is limited to the fees you paid for the programme the claim relates to.",
      ],
    },
    {
      id: "termination",
      title: "Suspension and termination",
      blocks: [
        "We may suspend or end your access if you breach these terms. You may close your account at any time by contacting support. Clauses that by their nature should survive termination will continue to apply.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law and disputes",
      blocks: [
        "These terms are governed by the laws of India. We will first try to resolve any dispute amicably. Disputes that cannot be resolved are subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana.",
      ],
    },
    {
      id: "changes",
      title: "Changes to these terms",
      blocks: [
        'We may update these terms from time to time. The "Last updated" date shows the latest revision. If you keep using the Platform after a change, you accept the revised terms.',
      ],
    },
  ],
};

export const PRIVACY: Policy = {
  title: "Privacy Policy",
  lead: "How AI4Impact collects, uses, shares and protects your personal data, and the rights you have under the Digital Personal Data Protection Act, 2023.",
  lastUpdated: "1 Oct 2026",
  sections: [
    {
      id: "scope",
      title: "Who we are and what this covers",
      blocks: [
        'AI4Impact ("we", "us") is the Data Fiduciary for personal data processed through our website, learner portal, live sessions, webinars and enrolment flows. This policy explains our practices in line with the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable Indian law.',
      ],
    },
    {
      id: "data-we-collect",
      title: "Data we collect",
      blocks: [
        {
          list: [
            "Identity and contact data: your name, email address, phone number, city and country.",
            "Profile and eligibility data: your education, work experience, current role and career goals, which you share during counselling or enrolment.",
            "Learning data: attendance, submissions, project repositories, assessment scores and certificate records.",
            "Transaction data: invoice details and payment status. We never store full card numbers or UPI PINs; these are handled by our payment partners.",
            "Technical data: IP address, device and browser type, and usage events, collected through essential cookies and privacy-respecting analytics.",
          ],
        },
      ],
    },
    {
      id: "how-we-use",
      title: "Why we use your data",
      blocks: [
        {
          list: [
            "To create and secure your account and to deliver the programmes you enrol in.",
            "To assess your work, issue certificates and keep the public credential-verification service running.",
            "To provide counselling, mentoring and career support, including sharing your profile with hiring partners when you opt in.",
            "To process payments, invoices and refunds, and to meet tax and legal obligations.",
            "To send programme updates and, with your consent, information about webinars and new tracks.",
            "To improve the Platform, prevent fraud and keep our systems secure.",
          ],
        },
      ],
    },
    {
      id: "consent",
      title: "Consent and legal basis",
      blocks: [
        "We process personal data based on your consent, or for legitimate uses permitted under the DPDP Act, such as fulfilling a service you requested or meeting a legal obligation. You can withdraw consent at any time. This does not affect processing that happened before you withdrew it.",
      ],
    },
    {
      id: "sharing",
      title: "Who we share data with",
      blocks: [
        "We do not sell your personal data.",
        {
          list: [
            "Our academic partner, for assessment moderation and certificate co-signing.",
            "Hiring partners and recruitment consultancies, only for learners who opt in to career support.",
            "Service providers (Data Processors) for hosting, video delivery, email, payments and analytics, under written contracts that require confidentiality and security.",
            "Government or regulatory authorities, when the law requires it.",
          ],
        },
      ],
    },
    {
      id: "retention",
      title: "How long we keep data",
      blocks: [
        "We keep account and learning data for as long as your account is active, plus a reasonable period afterwards to support re-enrolment and verification requests. Certificate records are kept so that employers can verify credentials. Financial records are kept for the period required by tax law. After that, data is deleted or anonymised.",
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      blocks: [
        {
          list: [
            "Access a summary of the personal data we process about you.",
            "Correct, complete or update inaccurate data.",
            "Ask us to erase data that is no longer needed, subject to legal retention requirements.",
            "Withdraw consent and opt out of marketing communications.",
            "Nominate another person to exercise your rights in case of death or incapacity.",
            "Raise a grievance with us. If it is not resolved, you can approach the Data Protection Board of India.",
          ],
        },
      ],
    },
    {
      id: "security",
      title: "How we protect data",
      blocks: [
        "We use encryption in transit and at rest, role-based access controls, audit logging and regular security reviews. The measures are described in our ISMS Policy. If a personal data breach occurs, we will notify affected learners and the Data Protection Board as required by law.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      blocks: [
        "We use essential cookies to keep you signed in and to remember preferences such as the Web/Mobile preview mode. Analytics cookies are used only to understand aggregate usage. You can control cookies through your browser settings.",
      ],
    },
    {
      id: "children",
      title: "Children",
      blocks: [
        "Our programmes are meant for adults. We do not knowingly process children's data without verifiable parental consent.",
      ],
    },
    {
      id: "grievance-officer",
      title: "Grievance Officer",
      blocks: [
        `For privacy questions, requests or complaints, contact our Grievance Officer at ${PRIVACY_EMAIL}. We acknowledge requests within 72 hours and aim to resolve them within 30 days.`,
      ],
    },
  ],
};

export const REFUND: Policy = {
  title: "Refund Policy",
  lead: "When you can cancel an enrolment, how much is refunded, and how long the refund takes to reach you.",
  lastUpdated: "1 Oct 2026",
  sections: [
    {
      id: "overview",
      title: "Overview",
      blocks: [
        "We want you to join a career track with confidence. This policy applies to all AI4Impact career tracks and Programme+ add-ons bought directly from ai4impact.in. Purchases made through an employer, a scholarship or a financing partner may follow the terms of that arrangement.",
      ],
    },
    {
      id: "eligibility",
      title: "Refund eligibility",
      blocks: [
        {
          list: [
            "Before the cohort start date: 100% refund of the programme fee paid, minus any non-refundable payment-gateway charges.",
            "Within 7 days of the cohort start date: 80% refund, provided you have attended no more than 2 live sessions and have not submitted any graded project.",
            "Between 8 and 14 days after the cohort start date: 50% refund of the programme fee paid.",
            "After 14 days from the cohort start date: no refund. You may still ask for a one-time cohort deferral (see below).",
          ],
        },
      ],
    },
    {
      id: "non-refundable",
      title: "Non-refundable items",
      blocks: [
        {
          list: [
            "Application or assessment fees, where these are charged separately.",
            "Programme+ add-ons after the first mentoring session or mock interview has been used.",
            "Any programme for which a certificate has already been issued.",
            "Enrolments ended because of a breach of our Terms of Use.",
          ],
        },
      ],
    },
    {
      id: "deferral",
      title: "Cohort deferral",
      blocks: [
        "If you cannot continue because of a medical, family or work emergency, you may move once, free of charge, to a later cohort that starts within 6 months. Progress and graded work carry over wherever the curriculum allows.",
      ],
    },
    {
      id: "instalments",
      title: "Instalments and financing",
      blocks: [
        "If you paid in instalments, the refund is calculated on the total programme fee, and any instalments still due are cancelled. For loans or no-cost EMI through a financing partner, the refund is sent to the partner. The partner's own cancellation terms, including any interest already charged, apply.",
      ],
    },
    {
      id: "how-to-request",
      title: "How to request a refund",
      blocks: [
        {
          list: [
            `Email ${SUPPORT_EMAIL} from your registered email address with the subject "Refund request".`,
            "Include your full name, enrolled track, cohort start date and payment reference.",
            "Our team will confirm eligibility within 3 business days.",
          ],
        },
      ],
    },
    {
      id: "processing-time",
      title: "Processing time",
      blocks: [
        "Once a refund is approved, it is sent to the original payment method within 7 to 10 business days. Your bank or card issuer may take a few more days to show it on your statement. Refunds are always made in the currency of the original payment.",
      ],
    },
    {
      id: "cancellation-by-us",
      title: "If we cancel or reschedule",
      blocks: [
        "If AI4Impact cancels a cohort, or delays its start by more than 30 days, you can choose a full refund or a free move to another cohort.",
      ],
    },
  ],
};

export const ISMS: Policy = {
  title: "Information Security Management System (ISMS) Policy",
  lead: "Our commitment to protecting the confidentiality, integrity and availability of learner, partner and company information, aligned with ISO/IEC 27001.",
  lastUpdated: "1 Oct 2026",
  sections: [
    {
      id: "purpose",
      title: "Purpose",
      blocks: [
        "AI4Impact handles personal, academic and financial information for learners, trainers, academic partners and employers. This policy sets out how our Information Security Management System (ISMS) protects that information from unauthorised access, loss, alteration or disruption.",
      ],
    },
    {
      id: "scope",
      title: "Scope",
      blocks: [
        "The ISMS covers all people, processes, systems and facilities that support the AI4Impact Platform. This includes the website, learner portal, assessment and certification systems, live-session infrastructure, and corporate IT. It applies to employees, trainers, contractors and third-party service providers who handle AI4Impact information.",
      ],
    },
    {
      id: "objectives",
      title: "Security objectives",
      blocks: [
        {
          list: [
            "Confidentiality: only authorised people can access information, on a need-to-know basis.",
            "Integrity: assessment records, certificates and learner data stay accurate and tamper-evident.",
            "Availability: learning and verification services are available when learners and employers need them.",
            "Compliance: we meet the DPDP Act 2023, the IT Act 2000, contractual obligations and the security expectations of our partners.",
          ],
        },
      ],
    },
    {
      id: "commitments",
      title: "Our commitments",
      blocks: [
        {
          list: [
            "Maintain an ISMS aligned with ISO/IEC 27001 and improve it continually.",
            "Run risk assessments at least once a year and whenever significant changes occur, and treat risks to an acceptable level.",
            "Use encryption in transit and at rest, multi-factor authentication for privileged access, and least-privilege access controls.",
            "Keep secure development practices, including code review, dependency scanning and separate production environments.",
            "Monitor systems, keep audit logs and test backup and recovery procedures regularly.",
            "Review the security posture of vendors and data processors before onboarding and from time to time afterwards.",
            "Provide security and privacy awareness training to all staff and trainers.",
          ],
        },
      ],
    },
    {
      id: "roles",
      title: "Roles and responsibilities",
      blocks: [
        "Senior leadership owns this policy and provides the resources for the ISMS. The Information Security Officer runs the ISMS day to day, coordinates risk management and reports on performance. Every person in scope is responsible for following security policies and reporting incidents promptly.",
      ],
    },
    {
      id: "incident-management",
      title: "Incident management",
      blocks: [
        "Security incidents are logged, assessed, contained and investigated under a documented response procedure. Personal data breaches are reported to affected individuals and the relevant authorities within the timelines required by law.",
      ],
    },
    {
      id: "responsible-disclosure",
      title: "Responsible disclosure",
      blocks: [
        `If you believe you have found a security vulnerability in the AI4Impact Platform, please report it to ${SECURITY_EMAIL}. Include enough detail for us to reproduce it. Please do not access other users' data or disrupt the service. We will acknowledge reports within 2 business days.`,
      ],
    },
    {
      id: "review",
      title: "Review",
      blocks: [
        "This policy is reviewed at least once a year, or sooner if there are significant changes in the business, technology or regulation. Any breach of this policy may lead to disciplinary or contractual action.",
      ],
    },
  ],
};
