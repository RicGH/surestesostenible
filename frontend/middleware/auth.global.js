export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuth();
  const publicRoutes = ['/login', '/registro-proveedor', '/forgot-password', '/reset-password'];

  if (!auth.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login');
  }
  if (auth.isAuthenticated && to.path === '/login') {
    return navigateTo('/');
  }
});
