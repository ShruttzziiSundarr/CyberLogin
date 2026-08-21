import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteApp, getAppDetail, getApps } from '../lib/api';
import type { AppType } from '../types/api';

export const APPS_QUERY_KEY = ['apps'];

export function useApps() {
  return useQuery({
    queryKey: APPS_QUERY_KEY,
    queryFn: getApps,
  });
}

export function useAppDetail(type: AppType, id: string) {
  return useQuery({
    queryKey: ['apps', type, id],
    queryFn: () => getAppDetail(type, id),
    enabled: Boolean(type) && Boolean(id),
  });
}

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: AppType; id: string }) => deleteApp(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
