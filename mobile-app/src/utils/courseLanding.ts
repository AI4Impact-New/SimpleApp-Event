// Public marketing page for a course on ai4impact.in (landing-page/src/content/courses.ts COURSE_DETAILS keys).
import { Linking, Platform } from 'react-native';

export const LANDING_SITE = 'https://www.ai4impact.in';

/** Slugs with a full course page on the landing site. Keep in sync with COURSE_DETAILS in landing-page. */
const LANDING_COURSE_SLUGS = new Set([
  'azure-fabric-data-engineering',
  'forward-deployed-ai-engineer',
  'data-ai-platform-engineer',
  'data-science-analytics-decision-intelligence',
  'applied-ai-machine-learning-engineer',
  'generative-ai-agentic-systems-engineer',
  'ai-product-automation-builder',
]);

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The course's landing page when it has one (by slug, then by title), else the landing site's course list. */
export function courseLandingUrl(course: { slug?: string | null; title?: string | null }) {
  const candidates = [course.slug?.trim().toLowerCase(), course.title ? slugify(course.title) : undefined].filter(
    (s): s is string => !!s
  );
  // Exact match first; then a backend slug that is a shortened landing slug (e.g. "...-agentic-systems" → "...-systems-engineer").
  const slug =
    candidates.find((s) => LANDING_COURSE_SLUGS.has(s)) ??
    [...LANDING_COURSE_SLUGS].find((l) => candidates.some((s) => s.length >= 12 && l.startsWith(`${s}-`)));
  return slug ? `${LANDING_SITE}/courses/${slug}` : `${LANDING_SITE}/courses`;
}

/** Opens the landing page in a new browser tab on web, or the system browser on native. */
export function openCourseLanding(course: { slug?: string | null; title?: string | null }) {
  const url = courseLandingUrl(course);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => {});
}
