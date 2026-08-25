import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSamlIdpSettings, updateSamlIdpSettings } from '../lib/api';

export function useSamlIdpSettings() {
  return useQuery({
    queryKey: ['saml-idp-settings'],
    queryFn: getSamlIdpSettings,
  });
}

export function useUpdateSamlIdpSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSamlIdpSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['saml-idp-settings'], data);
      queryClient.invalidateQueries({ queryKey: ['integration-info'] });
    },
  });
}
