// Events hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AttendanceRecord, Event, EventAnalytics } from '@/types/event';

export function useEvents(visibility?: 'global' | 'private') {
  return useQuery({
    queryKey: ['events', visibility],
    queryFn: () => api.getEvents(visibility ? { visibility } : undefined),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => api.getEvent(id),
    enabled: !!id,
  });
}

export function useEventAnalytics(eventId: string) {
  return useQuery({
    queryKey: ['events', eventId, 'analytics'],
    queryFn: () => api.getEventAnalytics(eventId),
    enabled: !!eventId,
  });
}

/** The signed-in user's attendance history (newest first; the backend caps it at 200). */
export function useMyAttendance() {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.getAttendance({ limit: 200 }) as Promise<AttendanceRecord[]>,
  });
}

export function useJoinEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.joinEvent(eventId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });
}
