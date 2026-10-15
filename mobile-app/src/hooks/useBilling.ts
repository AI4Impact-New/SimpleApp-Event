// Demo commerce hooks — quotes, demo checkout and purchase history. Never grants enrollment.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { DemoCheckoutAction } from '@/types/billing';

export function useBillingCatalog() {
  return useQuery({
    queryKey: ['billing', 'catalog'],
    queryFn: () => api.getBillingCatalog(),
    staleTime: 5 * 60_000,
  });
}

export function useCoursePrice(courseId: string) {
  const catalog = useBillingCatalog();
  return { ...catalog, data: catalog.data?.find((p) => p.id === courseId) };
}

export function useMyPurchases() {
  return useQuery({
    queryKey: ['me', 'purchases'],
    queryFn: () => api.getMyPurchases(),
  });
}

export function useDemoOrder(orderId: string) {
  return useQuery({
    queryKey: ['billing', 'order', orderId],
    queryFn: () => api.getDemoOrder(orderId),
    enabled: !!orderId,
  });
}

export function useCreateDemoOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, requestId }: { courseId: string; requestId: string }) =>
      api.createDemoOrder(courseId, requestId),
    onSuccess: (order) => {
      queryClient.setQueryData(['billing', 'order', order.id], order);
      queryClient.invalidateQueries({ queryKey: ['me', 'purchases'] });
    },
  });
}

export function useFinishDemoCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: DemoCheckoutAction }) =>
      api.finishDemoCheckout(orderId, action),
    onSuccess: (order) => {
      queryClient.setQueryData(['billing', 'order', order.id], order);
      queryClient.invalidateQueries({ queryKey: ['me', 'purchases'] });
    },
  });
}
