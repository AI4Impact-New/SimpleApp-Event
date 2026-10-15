// Course types (matches API response)

export interface CourseHighlight {
  id: string;
  course_id?: string;
  label: string;
  value: string;
  sort_order?: number;
}

export interface CoursePhaseItem {
  id: string;
  phase_id?: string;
  item_type: string;
  text: string;
  sort_order?: number;
}

export interface CoursePhase {
  id: string;
  course_id?: string;
  title: string;
  subtitle?: string;
  sort_order?: number;
  phase_items?: CoursePhaseItem[];
}

export interface CourseBenefit {
  id: string;
  course_id?: string;
  title: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}

export interface CourseAudience {
  id: string;
  course_id?: string;
  title: string;
  description?: string;
  sort_order?: number;
}

export interface CourseCareerOutcome {
  id: string;
  course_id?: string;
  text: string;
  sort_order?: number;
}

export interface CourseCertificate {
  id: string;
  course_id?: string;
  title?: string;
  provider?: string;
  description?: string;
  image_url?: string;
}

export type ClassType = 'recorded' | 'online' | 'in_person';

export interface CourseClass {
  id: string;
  course_id?: string;
  title: string;
  description?: string;
  class_type: ClassType;
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  zoom_link?: string;
  location?: string;
  recording_material_id?: string;
  event_id?: string;
  sort_order?: number;
  created_at?: string;
}

export interface Course {
  id: string;
  title: string;
  slug?: string;
  short_description?: string;
  full_description?: string;
  status: 'draft' | 'published';
  display_order: number;
  created_at?: string;
  updated_at?: string;
  delivery_modes?: ClassType[];
  highlights?: CourseHighlight[];
  phases?: CoursePhase[];
  benefits?: CourseBenefit[];
  audience?: CourseAudience[];
  career_outcomes?: CourseCareerOutcome[];
  certificate?: CourseCertificate | null;
  classes?: CourseClass[];
  /** True when the caller is enrolled (registered/completed) or staff. */
  learning_access?: boolean;
}
