// Event types

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  event_type: 'offline' | 'online' | 'hybrid';
  start_time?: string;
  end_time?: string;
  created_by?: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  qr_code?: string;
  max_attendees?: number;
  visibility?: 'global' | 'private';
  created_at: string;
}

export interface EventAnalytics {
  event_id: string;
  attendance_count: number;
  poll_participation: number;
  average_engagement_score: number;
  polls: {
    total_polls: number;
    total_votes: number;
    participation_rate: number;
  };
  materials: {
    total_materials: number;
  };
  top_students: {
    user_id: string;
    score: number;
    total_actions: number;
  }[];
}

export interface AttendanceRecord {
  id: string;
  event_id: string;
  timestamp?: string;
}
