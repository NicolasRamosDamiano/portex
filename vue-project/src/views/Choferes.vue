<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { obtenerPortesParaChofer, eliminarPortePorId, actualizarEstadoPorte } from "../utilidades/supabase";
import { getCurrentUser, logout } from "../utilidades/auth";

const portes = ref([]);
const vistaActiva = ref("portes"); // 'portes', 'mapa' o 'cuenta'
const usuario = ref(null);
const mapContainer = ref(null);
const router = useRouter();
let map = null;
let marcadorActual = null;

const portesActivos = computed(() =>
  portes.value.filter((porte) => porte._trip?.status !== "completed")
);

const portesHistorial = computed(() =>
  portes.value.filter((porte) => porte._trip?.status === "completed")
);

onMounted(() => {
  // Obtener los portes guardados al cargar
  cargarPortes();
  // Obtener datos del usuario actual
  usuario.value = getCurrentUser();
});

// Función para cargar los portes desde localStorage
async function cargarPortes() {
  try {
    const datosDB = await obtenerPortesParaChofer();
    portes.value = datosDB.map((trip) => {
      const distancia = calcularDistanciaCoords(
        trip.origin_lat,
        trip.origin_lng,
        trip.destination_lat,
        trip.destination_lng
      );

      return {
        id: trip.id,
        tipo: trip.tipo || trip.type || "porte",
        destino: resolverNombreUbicacion(trip.destination_name, trip.destination_lat, trip.destination_lng),
        origen: resolverNombreUbicacion(trip.origin_name, trip.origin_lat, trip.origin_lng),
        estado: mapearEstado(trip.status),
        fecha: trip.created_at,
        kmTotal: distancia.toFixed(1),
        precio: Number(trip.price) || 0,
        pasajero_nombre: trip.client?.name || "N/A",
        _trip: trip
      };
    });
  } catch (error) {
    console.error("Error al cargar portes:", error);
    portes.value = [];
  }
}

// Función para cambiar de pestaña
function calcularDistanciaCoords(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function resolverNombreUbicacion(nombre, lat, lng) {
  if (nombre && String(nombre).trim()) return nombre;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return "N/A";
  return `${latNum.toFixed(3)}, ${lngNum.toFixed(3)}`;
}

function mapearEstado(estadoDB) {
  const mapeo = {
    pending: "pendiente",
    in_progress: "en_progreso",
    completed: "completado",
    cancelled: "cancelado"
  };
  return mapeo[estadoDB] || estadoDB;
}

function formatTripCode(id) {
  const raw = String(id || "").trim();
  if (!raw) return "PX-000000";
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `PX-${compact.slice(-6).padStart(6, "0")}`;
}

function cambiarTab(tab) {
  tabActiva.value = tab;
}

// Función para seleccionar un porte
function seleccionarPorte(porte) {
  porteSeleccionado.value = porte;
}

// Función para eliminar un porte
async function eliminarPorte(idPorte) {
  const ok = await eliminarPortePorId(idPorte);
  if (!ok) {
    alert(`No se pudo eliminar el porte ${formatTripCode(idPorte)}.`);
    return;
  }

  portes.value = portes.value.filter(porte => porte.id !== idPorte);
  alert(`Porte ${formatTripCode(idPorte)} eliminado correctamente.`);
}

async function aceptarPorte(porte) {
  const currentUser = getCurrentUser();
  const actualizado = await actualizarEstadoPorte(porte.id, "in_progress", currentUser?.id || null);

  if (!actualizado) {
    alert(`No se pudo aceptar el porte ${formatTripCode(porte.id)}.`);
    return;
  }

  porte.estado = mapearEstado(actualizado.status);
  router.push({ name: "Rastreo", params: { id: porte.id } });
}

function abrirRastreo(porte) {
  if (!porte?.id) return;
  router.push({ name: "Rastreo", params: { id: porte.id } });
}

// Función para formatear la distancia
function formatearDistancia(km) {
  const distancia = parseFloat(km);
  if (isNaN(distancia) || distancia === undefined) {
    return "0 km";
  }
  return distancia < 1 ? `${(distancia * 1000).toFixed(0)} m` : `${distancia.toFixed(1)} km`;
}

// Función para cerrar sesión
function cerrarSesion() {
  logout();
  // Redirigir al login
  window.location.href = '/login';
}

// Función para cambiar de vista
function cambiarVista(vista) {
  vistaActiva.value = vista;
  if (vista === "mapa") {
    setTimeout(inicializarMapa, 100);
  }
}

// Función para inicializar y mostrar el mapa
function inicializarMapa() {
  if (!mapContainer.value) return;
  
  // Verificar si Google Maps está cargado
  if (typeof google === "undefined" || !google.maps) {
    alert("Error: Google Maps no está disponible");
    return;
  }

  // Obtener ubicación actual del usuario
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitud = position.coords.latitude;
        const longitud = position.coords.longitude;
        mostrarMapa(latitud, longitud);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        // Ubicación por defecto (Buenos Aires)
        mostrarMapa(-34.6037, -58.3816);
      }
    );
  } else {
    console.error("Geolocation no soportado");
    mostrarMapa(-34.6037, -58.3816);
  }
}

// Función para mostrar el mapa con la ubicación
function mostrarMapa(latitud, longitud) {
  const ubicacion = { lat: latitud, lng: longitud };

  // Crear el mapa
  map = new google.maps.Map(mapContainer.value, {
    zoom: 15,
    center: ubicacion,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
  });

  // Marcar la ubicación actual
  marcadorActual = new google.maps.Marker({
    position: ubicacion,
    map: map,
    title: "Tu ubicación actual",
    icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  });
}
</script>

<template>
  <div class="choferes-app">
    <!-- HEADER NEGRO -->
    <header class="header-negro">
      <div class="header-content">
        <h1 class="logo">PorteX</h1>
      </div>
    </header>

    <!-- CONTENIDO PRINCIPAL -->
    <div class="main-content">
      <!-- VISTA MAPA -->
      <div v-if="vistaActiva === 'mapa'" class="section-mapa">
        <div ref="mapContainer" class="mapa-container-full"></div>
      </div>

      <!-- VISTA PORTES -->
      <div v-if="vistaActiva === 'portes'" class="section-portes">
        <div v-if="portesActivos.length === 0" class="mensaje-vacio">
          <p>No hay portes en este momento</p>
          <p class="emoji">🎉</p>
        </div>

        <div v-else class="portes-lista">
          <div 
            v-for="porte in portesActivos"
            :key="porte.id"
            class="porte-card"
          >
            <div class="card-header">
              <h3 :title="`ID real: ${porte.id}`">Porte {{ formatTripCode(porte.id) }} ({{ porte.tipo }})</h3>
              <span :class="['estado-tag', porte.estado]">{{ porte.estado.toUpperCase() }}</span>
            </div>
            
            <div class="card-body">
              <p><strong>Origen:</strong> {{ porte.origen }}</p>
              <p><strong>Destino:</strong> {{ porte.destino }}</p>
              <p><strong>Distancia Total:</strong> {{ formatearDistancia(porte.kmTotal) }}</p>
              <p class="precio"><strong>Precio:</strong> <span class="precio-valor">${{ porte.precio }}</span></p>
              <p><strong>Fecha Solicitud:</strong> {{ new Date(porte.fecha).toLocaleDateString() }}</p>
              <p><strong>Cliente:</strong> {{ porte.pasajero_nombre || 'N/A' }}</p>
            </div>
            
            <button 
              v-if="porte.estado === 'pendiente'"
              class="aceptar-btn"
              @click="aceptarPorte(porte)"
            >
              Aceptar porte
            </button>

            <button
              v-if="porte.estado === 'en_progreso'"
              class="aceptar-btn"
              @click="abrirRastreo(porte)"
            >
              Volver al rastreo
            </button>

            <button 
              class="eliminar-btn"
              @click="eliminarPorte(porte.id)"
            >
              Eliminar Porte (DEBUG)
            </button>
          </div>
        </div>
      </div>

      <!-- VISTA HISTORIAL -->
      <div v-if="vistaActiva === 'historial'" class="section-portes">
        <div v-if="portesHistorial.length === 0" class="mensaje-vacio">
          <p>No hay viajes completados</p>
        </div>

        <div v-else class="portes-lista">
          <div
            v-for="porte in portesHistorial"
            :key="porte.id"
            class="porte-card"
          >
            <div class="card-header">
              <h3 :title="`ID real: ${porte.id}`">Porte {{ formatTripCode(porte.id) }} ({{ porte.tipo }})</h3>
              <span :class="['estado-tag', porte.estado]">{{ porte.estado.toUpperCase() }}</span>
            </div>

            <div class="card-body">
              <p><strong>Origen:</strong> {{ porte.origen }}</p>
              <p><strong>Destino:</strong> {{ porte.destino }}</p>
              <p><strong>Distancia Total:</strong> {{ formatearDistancia(porte.kmTotal) }}</p>
              <p class="precio"><strong>Precio:</strong> <span class="precio-valor">${{ porte.precio }}</span></p>
              <p><strong>Fecha Solicitud:</strong> {{ new Date(porte.fecha).toLocaleDateString() }}</p>
              <p><strong>Cliente:</strong> {{ porte.pasajero_nombre || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- VISTA CUENTA -->
      <div v-if="vistaActiva === 'cuenta'" class="section-cuenta">
        <div v-if="usuario" class="cuenta-container">
          <!-- AVATAR Y NOMBRE -->
          <div class="cuenta-header">
            <div class="cuenta-avatar">👤</div>
            <h2>{{ usuario.name }}</h2>
            <p class="cuenta-rol">{{ usuario.role.toUpperCase() }}</p>
          </div>

          <!-- DATOS DE LA CUENTA -->
          <div class="cuenta-datos">
            <div class="dato-item">
              <label>Email:</label>
              <p>{{ usuario.email }}</p>
            </div>
            <div class="dato-item">
              <label>Rol:</label>
              <p>{{ usuario.role === 'driver' ? 'Chofer' : usuario.role === 'admin' ? 'Administrador' : 'Usuario' }}</p>
            </div>
          </div>

          <!-- BOTÓN CERRAR SESIÓN -->
          <button class="btn-cerrar-sesion" @click="cerrarSesion">
            🚪 Cerrar Sesión
          </button>
        </div>

        <div v-else class="mensaje-vacio">
          <p>No hay sesión activa</p>
        </div>
      </div>
    </div>

    <!-- NAVEGACIÓN INFERIOR -->
    <nav class="bottom-nav">
      <button 
        :class="['nav-btn', { active: vistaActiva === 'mapa' }]"
        @click="cambiarVista('mapa')"
      >
        📍 Tu Mapa
      </button>
      <button 
        :class="['nav-btn', { active: vistaActiva === 'portes' }]"
        @click="cambiarVista('portes')"
      >
        🚗 Portes
      </button>
      <button
        :class="['nav-btn', { active: vistaActiva === 'historial' }]"
        @click="cambiarVista('historial')"
      >
        📜 Historial
      </button>
      <button 
        :class="['nav-btn', { active: vistaActiva === 'cuenta' }]"
        @click="cambiarVista('cuenta')"
      >
        👤 Cuenta
      </button>
    </nav>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');

:root {
  --portex-green: #7edb76;
  --portex-black: #000000;
  --portex-white: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.choferes-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Montserrat', sans-serif;
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: #fff;
}

.header-negro {
  text-align: center;
  padding: 18px 0 10px;
  background: transparent;
  color: var(--portex-black);
}

.header-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 95px;
}

.section-mapa {
  height: calc(100vh - 185px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.mapa-container-full {
  width: 100%;
  height: 100%;
}

.section-portes {
  min-height: calc(100vh - 220px);
}

.portes-lista {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* VISTA EN CAMINO */
.portes-lista {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 0;
}

.subtitle {
  margin-bottom: 15px;
  font-weight: 700;
}

.porte-card {
  background: white;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  border-left: 5px solid #7edb76;
  transition: transform 0.2s ease;
}

.porte-card:hover {
  transform: translateY(-3px);
}

.card-header,
.porte-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid #ececec;
  padding-bottom: 10px;
}

.porte-destino {
  font-weight: 700;
}

.estado-tag {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 20px;
  text-transform: capitalize;
}

.estado-tag.pendiente {
  background: #fff3cd;
  color: #856404;
}

.estado-tag.completado {
  background: #d4edda;
  color: #155724;
}

.estado-tag.cancelado {
  background: #f8d7da;
  color: #721c24;
}

.estado-tag.en_progreso {
  background: #d1ecf1;
  color: #0c5460;
}

.card-body p {
  margin: 5px 0;
  color: #444;
}

.precio-valor {
  font-weight: 700;
}

.eliminar-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background-color: #ff6b6b;
  border: none;
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #fff;
  cursor: pointer;
  transition: 0.2s ease;
}

.aceptar-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background-color: #7edb76;
  border: none;
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #000;
  cursor: pointer;
  transition: 0.2s ease;
}

.aceptar-btn:hover {
  transform: scale(1.01);
}

.eliminar-btn:hover {
  transform: scale(1.01);
}

.mensaje-vacio {
  padding: 40px;
  text-align: center;
  color: #999;
  margin-top: 50px;
}

.mensaje-vacio p {
  font-size: 1rem;
  font-weight: 600;
}

.mensaje-vacio .emoji {
  font-size: 2rem;
  margin-top: 10px;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  justify-content: space-around;
  background-color: var(--portex-white);
  border-top: 1px solid #e0e0e0;
  padding: 10px 0;
  gap: 5px;
}

.nav-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 10px 5px;
  font-size: 0.7rem;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  color: #999;
  cursor: pointer;
  text-align: center;
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.nav-btn.active {
  color: var(--portex-green);
}

.nav-btn:hover {
  color: var(--portex-black);
}

.section-cuenta {
  min-height: calc(100vh - 220px);
  padding: 5px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.cuenta-container {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.cuenta-header {
  margin-bottom: 20px;
}

.cuenta-avatar {
  font-size: 4rem;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--portex-green);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--portex-black);
}

.cuenta-header h2 {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--portex-black);
  margin: 15px 0 5px 0;
}

.cuenta-rol {
  font-size: 0.85rem;
  color: #666;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cuenta-datos {
  background-color: #f9f9f9;
  border: 2px solid var(--portex-black);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: left;
}

.dato-item {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.dato-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.dato-item label {
  font-weight: 700;
  color: var(--portex-black);
  font-size: 0.9rem;
  display: block;
  margin-bottom: 5px;
}

.dato-item p {
  color: #555;
  font-size: 1rem;
  margin: 0;
}

.btn-cerrar-sesion {
  width: 100%;
  padding: 15px;
  background-color: #FF6B6B;
  border: 2px solid var(--portex-black);
  border-radius: 25px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--portex-white);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cerrar-sesion:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .main-content {
    padding: 15px;
    padding-bottom: 90px;
  }

  .logo {
    font-size: 1.2rem;
  }
}
</style>
