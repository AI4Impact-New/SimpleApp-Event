// Courses hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Course } from '@/types/course';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses({ full: true, limit: 50 }),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () => api.getCourse(id),
    enabled: !!id,
  });
}

export function useRegisterCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => api.registerCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'learning'] });
    },
  });
}

export function useMarkCourseInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => api.markCourseInterest(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'courses'] });
    },
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: ['me', 'courses'],
    queryFn: () => api.getMyCourses(),
  });
}
