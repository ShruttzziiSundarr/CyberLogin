import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardOAuth, onboardSaml } from '../lib/api';
import { APPS_QUERY_KEY } from './useApps';

export function useOnboardOAuth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardOAuth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}

export function useOnboardSaml() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardSaml,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_QUERY_KEY });
    },
  });
}
