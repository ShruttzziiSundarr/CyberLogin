import { useQuery } from '@tanstack/react-query';
import { getIntegrationInfo } from '../lib/api';

export function useIntegrationInfo() {
  return useQuery({
    queryKey: ['integration-info'],
    queryFn: getIntegrationInfo,
  });
}
