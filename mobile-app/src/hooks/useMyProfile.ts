import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

/** The signed-in learner's profile row (GET /users/me). Shares the ['me'] key checkout already invalidates. */
export function useMyProfile() {
  return useQuery({ queryKey: ['me'], queryFn: () => api.getMyProfile(), staleTime: 5 * 60 * 1000 });
}
