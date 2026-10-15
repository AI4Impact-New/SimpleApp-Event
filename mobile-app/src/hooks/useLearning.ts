// Learning hooks — enrollment, lectures, exams, completion, certificates, notifications
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ExamAnswers } from '@/types/learning';

export function useMyLearning() {
  return useQuery({
    queryKey: ['me', 'learning'],
    queryFn: () => api.getMyLearning(),
  });
}

export function useLearningHome(courseId: string) {
  return useQuery({
    queryKey: ['learning', 'course', courseId],
    queryFn: () => api.getLearningHome(courseId),
    enabled: !!courseId,
    // 403 = not enrolled; retrying will not change that
    retry: (count, error: any) => error?.response?.status !== 403 && count < 1,
  });
}

export function useCourseExams(courseId: string) {
  return useQuery({
    queryKey: ['learning', 'exams', courseId],
    queryFn: () => api.getCourseExams(courseId),
    enabled: !!courseId,
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => api.issueCertificate(courseId),
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'certificates'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'learning'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'course', courseId] });
    },
  });
}

export function useSubmitExamAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: ExamAnswers }) =>
      api.submitExamAttempt(attemptId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
    },
  });
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ['me', 'certificates'],
    queryFn: () => api.getMyCertificates(),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: () => api.getNotifications(),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });
}

/** Pull the API's `{error}` message out of an axios error. */
export function apiErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error ?? err?.response?.data?.message ?? fallback;
}
