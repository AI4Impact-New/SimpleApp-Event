// Build-time feature switches (EXPO_PUBLIC_* values are inlined into the bundle)

/**
 * Self-service "Register" (POST /courses/{id}/register) grants course access immediately, so it is only for
 * an approved pilot/free cohort build (guide §7). Off by default: staff enroll learners from the admin dashboard.
 */
export const PILOT_SELF_REGISTRATION = process.env.EXPO_PUBLIC_ENABLE_PILOT_REGISTRATION === '1';
