import { useAuthStore } from '~/stores/auth';

export const useAuth = () => {
  const store = useAuthStore();
  return store;
};
