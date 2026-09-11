export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuth();
  const publicRoutes = ['/login', '/registro-proveedor', '/forgot-password', '/reset-password'];
  // Firma de documentos: el acceso lo autoriza el token personal del enlace, no la sesión
  const esFirmaPublica = to.path.startsWith('/firma/');

  if (!auth.isAuthenticated && !publicRoutes.includes(to.path) && !esFirmaPublica) {
    return navigateTo('/login');
  }
  if (auth.isAuthenticated && to.path === '/login') {
    return navigateTo('/');
  }
});
