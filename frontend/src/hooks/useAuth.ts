import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, logout } from '../lib/api';
import type { LoginRequest } from '../types/api';

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
