<template>
  <div class="admin-container">
    <header class="header">
      <div>
        <p class="eyebrow">Panel de administracion</p>
        <h1>Admin Portex</h1>
      </div>
      <div class="header-actions">
        <button class="btn-refresh" :disabled="isLoading" @click="loadDashboard">Actualizar</button>
        <button class="btn-logout" @click="cerrarSesion">Cerrar sesion</button>
      </div>
    </header>

    <div v-if="toastMessage" :class="['toast', toastType]">
      {{ toastMessage }}
    </div>

    <section class="stats-grid">
      <article class="stat-card">
        <p class="stat-label">Usuarios</p>
        <p class="stat-value">{{ users.length }}</p>
      </article>
      <article class="stat-card">
        <p class="stat-label">Choferes online</p>
        <p class="stat-value">{{ driversOnline.length }}</p>
      </article>
      <article class="stat-card">
        <p class="stat-label">Portes (sin cancelar)</p>
        <p class="stat-value">{{ trips.length }}</p>
      </article>
      <article class="stat-card">
        <p class="stat-label">Facturacion del mes</p>
        <p class="stat-value">{{ formatCurrency(totalRevenue) }}</p>
      </article>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>Usuarios</h2>
        <input
          v-model.trim="userSearch"
          type="search"
          class="search-input"
          placeholder="Buscar por nombre o telefono"
        />
      </div>

      <div v-if="isLoading" class="empty-message">Cargando usuarios...</div>
      <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Telefono</th>
            <th>Rol</th>
            <th>Fecha de creacion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.name || '-' }}</td>
            <td>{{ user.phone || '-' }}</td>
            <td>
              <div class="role-selector">
                <button
                  :class="['role-badge', user.role, 'clickable']"
                  @click="toggleRoleSelector(user.id)"
                >
                  {{ user.role || 'user' }}
                </button>
                <div v-if="selectedUserId === user.id" class="role-dropdown">
                  <button
                    v-for="role in availableRoles"
                    :key="role"
                    :class="['role-option', { active: user.role === role }]"
                    @click="changeRole(user, role)"
                  >
                    {{ role }}
                  </button>
                </div>
              </div>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="!isLoading && !errorMessage && filteredUsers.length === 0" class="empty-message">
        No hay usuarios para ese filtro
      </p>
    </section>

    <section class="card">
      <h2>Choferes online</h2>
      <div v-if="isLoading" class="empty-message">Cargando choferes...</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Telefono</th>
            <th>Ultima ubicacion</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="driver in driversOnline" :key="driver.id">
            <td>{{ driver.name || '-' }}</td>
            <td>{{ driver.phone || '-' }}</td>
            <td>{{ driver.locationLabel }}</td>
            <td><span class="status-badge online">Online</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!isLoading && driversOnline.length === 0" class="empty-message">No hay choferes online</p>
    </section>

    <section class="card">
      <h2>Viajes</h2>

      <div v-if="isLoading" class="empty-message">Cargando portes...</div>
      <div v-else>
        <div class="trips-block">
          <h3 class="trips-title">En progreso</h3>
          <p v-if="inProgressTrips.length === 0" class="empty-message">No hay viajes en progreso</p>
          <div v-else class="trips-list">
            <article class="trip-card" v-for="trip in inProgressTrips" :key="`in-progress-${trip.id}`">
              <div class="trip-header">
                <h3 :title="`ID real: ${trip.id}`">Porte {{ formatTripCode(trip.id) }} ({{ trip.tipo || 'porte' }})</h3>
                <span :class="['trip-state', trip.status]">{{ formatStateLabel(trip.status) }}</span>
              </div>

              <div class="trip-body">
                <p><strong>Origen:</strong> {{ trip.origen }}</p>
                <p><strong>Destino:</strong> {{ trip.destino }}</p>
                <p><strong>Distancia:</strong> {{ formatDistance(trip.kmTotal) }}</p>
                <p><strong>Precio:</strong> <span class="trip-price-value">{{ formatCurrency(trip.precio) }}</span></p>
                <p><strong>Fecha solicitud:</strong> {{ formatDate(trip.fecha) }}</p>
                <p><strong>Cliente:</strong> {{ trip.pasajero_nombre || 'N/A' }}</p>
              </div>
            </article>
          </div>
        </div>

        <div class="trips-block">
          <h3 class="trips-title">Completados por mes</h3>
          <p v-if="completedTripsByMonth.length === 0" class="empty-message">No hay viajes completados</p>
          <div v-else class="completed-months">
            <section class="month-group" v-for="monthGroup in completedTripsByMonth" :key="monthGroup.key">
              <h4 class="month-title">{{ monthGroup.label }}</h4>
              <div class="completed-list">
                <details class="completed-item" v-for="trip in monthGroup.trips" :key="`completed-${trip.id}`">
                  <summary class="completed-summary">
                    <span class="completed-origin">{{ trip.origen }}</span>
                    <span class="completed-date">{{ formatDate(trip.fecha) }}</span>
                  </summary>

                  <div class="completed-details">
                    <p :title="`ID real: ${trip.id}`"><strong>Porte:</strong> {{ formatTripCode(trip.id) }} ({{ trip.tipo || 'porte' }})</p>
                    <p><strong>Destino:</strong> {{ trip.destino }}</p>
                    <p><strong>Distancia:</strong> {{ formatDistance(trip.kmTotal) }}</p>
                    <p><strong>Precio:</strong> <span class="trip-price-value">{{ formatCurrency(trip.precio) }}</span></p>
                    <p><strong>Cliente:</strong> {{ trip.pasajero_nombre || 'N/A' }}</p>
                  </div>
                </details>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '../utilidades/auth'
import { supabase, obtenerChoferes, obtenerPortesParaChofer } from '../utilidades/supabase'

const router = useRouter()

const users = ref([])
const driversOnline = ref([])
const trips = ref([])

const selectedUserId = ref(null)
const userSearch = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')
const toastType = ref('success')

const availableRoles = ['driver', 'client', 'admin']
let toastTimer = null
let realtimeRefreshTimer = null
const realtimeChannels = []

const filteredUsers = computed(() => {
  const query = userSearch.value.toLowerCase()
  if (!query) return users.value

  return users.value.filter((user) => {
    const name = String(user.name || '').toLowerCase()
    const phone = String(user.phone || '').toLowerCase()
    return name.includes(query) || phone.includes(query)
  })
})

const inProgressTrips = computed(() => {
  return trips.value
    .filter((trip) => trip.status === 'in_progress')
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
})

const completedTripsByMonth = computed(() => {
  const completedTrips = trips.value
    .filter((trip) => trip.status === 'completed')
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  const grouped = new Map()
  const monthFormatter = new Intl.DateTimeFormat('es-UY', {
    month: 'long',
    year: 'numeric'
  })

  completedTrips.forEach((trip) => {
    const date = new Date(trip.fecha)
    if (Number.isNaN(date.getTime())) return

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!grouped.has(monthKey)) {
      const rawLabel = monthFormatter.format(date)
      const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
      grouped.set(monthKey, { key: monthKey, label, trips: [] })
    }

    grouped.get(monthKey).trips.push(trip)
  })

  return Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key))
})

const totalRevenue = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  return trips.value.reduce((sum, trip) => {
    const tripDate = new Date(trip.fecha)
    if (Number.isNaN(tripDate.getTime())) return sum
    if (tripDate.getFullYear() !== currentYear || tripDate.getMonth() !== currentMonth) return sum
    return sum + Number(trip.precio || 0)
  }, 0)
})

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDistance = (km) => {
  const value = Number(km)
  if (!Number.isFinite(value)) return '-'
  if (value < 1) return `${Math.round(value * 1000)} m`
  return `${value.toFixed(1)} km`
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

const formatStateLabel = (status) => {
  const labels = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completado',
    cancelled: 'Cancelado'
  }
  return labels[status] || status || 'Pendiente'
}

const mapStatus = (status) => {
  const value = String(status || '').trim().toLowerCase()
  if (['pending', 'pendiente'].includes(value)) return 'pending'
  if (['in_progress', 'in progress', 'en_progreso', 'en progreso'].includes(value)) return 'in_progress'
  if (['completed', 'completado'].includes(value)) return 'completed'
  if (['cancelled', 'cancelado'].includes(value)) return 'cancelled'
  return 'pending'
}

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getLocationRow = (locationValue) => {
  if (Array.isArray(locationValue)) return locationValue[0] || null
  if (locationValue && typeof locationValue === 'object') return locationValue
  return null
}

const isOnlineByLocation = (locationValue) => {
  const row = getLocationRow(locationValue)
  if (!row?.updated_at) return false

  const updatedAt = new Date(row.updated_at).getTime()
  if (!Number.isFinite(updatedAt)) return false

  const minutesAgo = (Date.now() - updatedAt) / 60000
  return minutesAgo <= 20
}

const locationLabel = (locationValue) => {
  const row = getLocationRow(locationValue)
  if (!row) return '-'

  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '-'

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

const formatTripCode = (id) => {
  const raw = String(id || '').trim()
  if (!raw) return 'PX-000000'
  const compact = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `PX-${compact.slice(-6).padStart(6, '0')}`
}

const resolveLocationName = (name, lat, lng) => {
  if (name && String(name).trim()) return name

  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return '-'

  return `${latNum.toFixed(3)}, ${lngNum.toFixed(3)}`
}

const mapTrip = (trip) => {
  const originLat = Number(trip.origin_lat)
  const originLng = Number(trip.origin_lng)
  const destinationLat = Number(trip.destination_lat)
  const destinationLng = Number(trip.destination_lng)

  const kmTotal = Number.isFinite(originLat) && Number.isFinite(originLng) && Number.isFinite(destinationLat) && Number.isFinite(destinationLng)
    ? calcularDistancia(originLat, originLng, destinationLat, destinationLng)
    : null

  return {
    id: trip.id,
    tipo: trip.tipo || trip.type || 'porte',
    origen: resolveLocationName(trip.origin_name, trip.origin_lat, trip.origin_lng),
    destino: resolveLocationName(trip.destination_name, trip.destination_lat, trip.destination_lng),
    status: mapStatus(trip.status),
    fecha: trip.created_at,
    kmTotal,
    precio: Number(trip.price) || 0,
    pasajero_nombre: trip.client?.name || 'N/A'
  }
}

const toggleRoleSelector = (userId) => {
  selectedUserId.value = selectedUserId.value === userId ? null : userId
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2600)
}

const scheduleDashboardRefresh = () => {
  if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer)
  realtimeRefreshTimer = setTimeout(() => {
    loadDashboard()
  }, 400)
}

const handleDocumentClick = (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.role-selector')) {
    selectedUserId.value = null
  }
}

const setupRealtimeSubscriptions = () => {
  const tableNames = ['profiles', 'trips', 'driver_locations']

  tableNames.forEach((tableName) => {
    const channel = supabase
      .channel(`admin-realtime-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        scheduleDashboardRefresh
      )
      .subscribe()

    realtimeChannels.push(channel)
  })
}

const changeRole = async (user, newRole) => {
  if (!user?.id || user.role === newRole) {
    selectedUserId.value = null
    return
  }

  if (!availableRoles.includes(newRole)) {
    errorMessage.value = `Rol invalido: ${newRole}`
    showToast(`Rol invalido: ${newRole}`, 'error')
    selectedUserId.value = null
    return
  }

  const previousRole = user.role
  user.role = newRole
  selectedUserId.value = null

  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)

  if (error) {
    user.role = previousRole
    errorMessage.value = `No se pudo actualizar el rol de ${user.name || user.id}`
    showToast(errorMessage.value, 'error')
    console.error('Error actualizando rol:', error)
  } else {
    showToast(`Rol actualizado a ${newRole}`, 'success')
  }
}

const loadDashboard = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [profilesRes, choferesRes, tripsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, phone, role, created_at').order('created_at', { ascending: false }),
      obtenerChoferes(),
      obtenerPortesParaChofer()
    ])

    if (profilesRes.error) {
      throw profilesRes.error
    }

    users.value = profilesRes.data || []

    driversOnline.value = (choferesRes || [])
      .filter((driver) => isOnlineByLocation(driver.location))
      .map((driver) => ({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        locationLabel: locationLabel(driver.location)
      }))

    trips.value = (tripsRes || [])
      .map(mapTrip)
      .filter((trip) => trip.status !== 'cancelled')
  } catch (error) {
    errorMessage.value = 'Error cargando datos del panel admin'
    showToast(errorMessage.value, 'error')
    console.error('Error en Admin:', error)
  } finally {
    isLoading.value = false
  }
}

const cerrarSesion = async () => {
  await logout()
  router.replace({ name: 'Login' })
}

onMounted(() => {
  loadDashboard()
  setupRealtimeSubscriptions()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  realtimeChannels.forEach((channel) => {
    supabase.removeChannel(channel)
  })
  if (toastTimer) clearTimeout(toastTimer)
  if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer)
})
</script>

<style scoped>
.admin-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 36px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #0f172a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #64748b;
}

.toast {
  position: sticky;
  top: 10px;
  z-index: 1200;
  margin-bottom: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.toast.success {
  background: #ecfdf3;
  color: #166534;
  border-color: #bbf7d0;
}

.toast.error {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

h1 {
  margin: 2px 0 0;
  font-size: 1.8rem;
}

.card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 14px;
  margin-top: 14px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.stat-card {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 12px;
}

.stat-label {
  margin: 0;
  color: #475569;
  font-size: 0.85rem;
}

.stat-value {
  margin: 6px 0 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.search-input,
.trip-filter {
  min-width: 220px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.9rem;
  background: #fff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: visible;
}

.data-table thead {
  background: #0f172a;
  color: #fff;
}

.data-table th,
.data-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table tbody tr:hover {
  background: #f1f5f9;
}

.role-selector {
  position: relative;
  display: inline-block;
}

.role-badge {
  border: 0;
  border-radius: 999px;
  padding: 5px 10px;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: lowercase;
}

.role-badge.clickable {
  cursor: pointer;
}

.role-badge.driver {
  background: #166534;
  color: #fff;
}

.role-badge.client {
  background: #1d4ed8;
  color: #fff;
}

.role-badge.admin {
  background: #9a3412;
  color: #fff;
}

.role-badge.user {
  background: #475569;
  color: #fff;
}

.role-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 120px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  z-index: 1000;
}

.role-option {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.role-option:last-child {
  border-bottom: 0;
}

.role-option:hover {
  background: #f8fafc;
}

.role-option.active {
  background: #ecfeff;
  font-weight: 700;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.78rem;
}

.status-badge.online {
  background: #166534;
  color: #fff;
}

.empty-message {
  margin: 12px 0 4px;
  text-align: center;
  color: #64748b;
}

.error-message {
  margin: 12px 0 4px;
  text-align: center;
  color: #b91c1c;
  font-weight: 600;
}

.trips-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.trips-block {
  margin-top: 10px;
}

.trips-title {
  margin: 0 0 10px;
  font-size: 1rem;
  color: #334155;
}

.completed-months {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.month-group {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}

.month-title {
  margin: 0 0 10px;
  font-size: 0.95rem;
  color: #1e293b;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.completed-item {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
}

.completed-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
}

.completed-summary::-webkit-details-marker {
  display: none;
}

.completed-origin {
  font-weight: 700;
  color: #0f172a;
}

.completed-date {
  font-size: 0.85rem;
  color: #475569;
}

.completed-details {
  margin-top: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
}

.completed-details p {
  margin: 4px 0;
  font-size: 0.9rem;
}

.trip-card {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.trip-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.trip-body p {
  margin: 5px 0;
  font-size: 0.9rem;
}

.trip-price-value {
  font-weight: 700;
  color: #166534;
}

.trip-state {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
}

.trip-state.pending {
  background: #d97706;
}

.trip-state.in_progress {
  background: #0369a1;
}

.trip-state.completed {
  background: #0f766e;
}

.trip-state.cancelled {
  background: #b91c1c;
}

.btn-logout,
.btn-refresh {
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-refresh {
  border: 1px solid #334155;
  background: #fff;
  color: #334155;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-logout {
  border: 1px solid #b91c1c;
  background: #ef4444;
  color: #fff;
}

.btn-logout:hover {
  background: #dc2626;
}

@media (max-width: 720px) {
  .header,
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .btn-refresh,
  .btn-logout,
  .search-input,
  .trip-filter {
    width: 100%;
    min-width: 0;
  }
}
</style>
