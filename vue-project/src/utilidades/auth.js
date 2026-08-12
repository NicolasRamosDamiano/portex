// auth.js
import { supabase } from './supabase'
/**
 * Inicia sesión con email y contraseña en Supabase.
 * Guarda un usuario "simplificado" en localStorage para uso fácil en la app.
 */
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  }) // [web:58]

  if (error || !data.user) {
    console.error('Error al iniciar sesión:', error?.message)
    return null
  }

  const user = data.user

  // ⬇️ NUEVO: leer el perfil desde la tabla profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error cargando perfil:', profileError.message)
  }

  const previousUser = getCurrentUser()
  const resolvedRole = profile?.role ?? previousUser?.role ?? 'user'

  if (!profile?.role) {
    console.warn('loginUser: profile.role no disponible, usando fallback role=', resolvedRole, {
      userId: user.id,
      profile,
      profileError: profileError?.message || null
    })
  }

  const userData = {
    id: user.id,                         // UUID real de Supabase
    email: user.email,
    role: resolvedRole,
    name: profile?.name || user.user_metadata?.name || user.email,
  }

  localStorage.setItem('currentUser', JSON.stringify(userData))
  return userData
}


/**
 * Obtiene el usuario actual desde localStorage.
 * (Rápido para la UI, asumiendo que ya iniciaste sesión antes).
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Obtiene el usuario actual directamente desde Supabase (opcional, más “fino”).
 */
export async function getSupabaseUser() {
  const { data, error } = await supabase.auth.getUser() // [web:39]
  if (error) {
    console.error('Error al obtener usuario de Supabase:', error.message)
    return null
  }
  return data.user
}

/**
 * Cierra sesión en Supabase y limpia localStorage.
 */
export async function logout() {
  await supabase.auth.signOut() // [web:67]
  localStorage.removeItem('currentUser')
}

/**
 * Verifica si hay sesión activa según localStorage.
 */
export function isAuthenticated() {
  return getCurrentUser() !== null
}

/**
 * Mantengo tu función de rutas por rol.
 * Por ahora todos los usuarios Supabase los tratamos como 'user'.
 */
export function getRouteByRole(role) {
  const roleRoutes = {
    user: '/inicio',
    client: '/inicio',
    driver: '/choferes',
    admin: '/admin',
  }
  return roleRoutes[role] || '/login'
}


export async function registerUser(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // se guarda en user.user_metadata.name
    },
  }) // [web:100]

  if (error || !data.user) {
    console.error('Error al registrar usuario:', error?.message)
    return null
  }

  return data.user
}
