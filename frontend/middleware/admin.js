export default defineNuxtRouteMiddleware(() => {
  const auth = useAuth();
  if (!auth.isAuthenticated || auth.rol !== 'admin') {
    return navigateTo('/');
  }
});
