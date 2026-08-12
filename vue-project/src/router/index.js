import { createRouter, createWebHistory } from "vue-router";
import { isAuthenticated, getCurrentUser } from "../utilidades/auth.js";

// Importar las páginas
import Inicio from "../views/Inicio.vue";
import Presupuesto from "../views/Presupuesto.vue";
import Calculo from "../views/Calculo.vue";
import Choferes from "../views/Choferes.vue";
import Rastreo from "../views/Rastreo.vue";
import Admin from "../views/Admin.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";

const routes = [

  {
    path: "/rastreo",
    name: "Rastreo",
    component: Rastreo,
    props: true,
    
  },

  {
    path: "/register",
    name: "Register",
    component: Register    
  },
  
  {
    path: "/login",
    name: "Login",
    component: Login
  },
  {
    path: "/presupuesto",
    name: "Presupuesto", 
    component: Presupuesto,
    meta: { requiresAuth: true }
  },
  {
    path: "/choferes",
    name: "Choferes", 
    component: Choferes,
    meta: { requiresAuth: true, roles: ['driver', 'admin'] }
  },
  {
    path: "/rastreo/:id",
    name: "Rastreo",
    component: Rastreo,
    meta: { requiresAuth: true }
  },
  {
    path: "/calculo",
    name: "Calculo", 
    component: Calculo,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: "/admin",
    name: "Admin",
    component: Admin,
    meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: "/inicio",
    name: "Inicio",
    component: Inicio,
    meta: { requiresAuth: true, roles: ['user', 'client', 'admin'] }
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/login"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard de navegación
router.beforeEach((to, from, next) => {
  const isAuth = isAuthenticated();
  const user = getCurrentUser();
  const requiresAuth = to.meta.requiresAuth;
  const roles = to.meta.roles;

  // Si necesita autenticación
  if (requiresAuth) {
    if (!isAuth) {
      // No autenticado, ir al login
      next({ name: 'Login' });
    } else if (roles && !roles.includes(user.role)) {
      // Autenticado pero no tiene el rol requerido
      // Redirigir al dashboard del usuario según su rol
      const roleRoutes = {
        'user': 'Inicio',
        'client': 'Inicio',
        'driver': 'Choferes',
        'admin': 'Admin'
      };
      next({ name: roleRoutes[user.role] || 'Inicio' });
    } else {
      // Autenticado y tiene permisos
      next();
    }
  } else {
    // No requiere autenticación
    // Si va al login pero ya está autenticado, redirigir a su dashboard
    if (to.name === 'Login' && isAuth) {
      const roleRoutes = {
        'user': 'Inicio',
        'client': 'Inicio',
        'driver': 'Choferes',
        'admin': 'Admin'
      };
      next({ name: roleRoutes[user.role] || 'Inicio' });
    } else {
      next();
    }
  }
});

export default router;
