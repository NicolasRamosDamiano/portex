<template>

  <div class="app-container">

    <!-- HEADER -->
    <div class="header">
      <img class="logo" src="/assets/Portexlogo.JPG" alt="Portex logo" />
      <h1 class="title">BIENVENIDO A PORTEX</h1>
    </div>

    <!-- CONTENIDO DINÁMICO -->
    <div class="contenido">

      <!-- TAB PORTES -->
    <transition name="slide" mode="out-in">
    <div :key="tabActiva">
      <div v-if="tabActiva === 'portes'">

        <div v-if="portesActivos.length > 0">
          <h2 class="subtitle">Portes Activos</h2>

          <div class="portes-list">
            <div v-for="porte in portesActivos" :key="porte.id" class="porte-card" @click="abrirPorte(porte)">
              <div class="porte-header">
                <span class="porte-destino">📍 {{ porte.destino }}</span>
                <span class="porte-estado" :class="porte.estado">{{ porte.estado === 'en_progreso' ? 'En camino' : porte.estado }}</span>
              </div>
              <div class="porte-info">
                <p>🕒 {{ formatearFecha(porte.fecha) }}</p>
              </div>
              
            </div>
          </div>
        </div>

        <div v-else class="no-portes">
          <img
            src="/assets/Portex Camioneta.jpg"
            alt="No hay portes"
            class="no-portes-img"
            :class="{ moverCamioneta: animandoCamioneta }"
          />
          <p class="no-portes-text">
            Aún no tienes ningún porte
          </p>
        </div>

        <button class="primary-button" @click="animarYRedirigir">
          CALCULAR UN PRESUPUESTO
        </button>

      </div>

      <!-- TAB HISTORIAL -->
      <div v-else-if="tabActiva === 'historial'">
        <h2 class="subtitle">Historial</h2>
        <div v-if="portesHistorial.length > 0" class="portes-list">
          <div v-for="porte in portesHistorial" :key="porte.id" class="porte-card" @click="abrirPorte(porte)">
            <div class="porte-header">
              <span class="porte-destino">📍 {{ porte.destino }}</span>
              <span class="porte-estado" :class="porte.estado">{{ porte.estado }}</span>
            </div>
            <div class="porte-info">
              <p>🕒 {{ formatearFecha(porte.fecha) }}</p>
            </div>
          </div>
        </div>
        <p v-else>No hay viajes completados todavía.</p>
      </div>

      <!-- TAB CUENTA -->
      <div v-else-if="tabActiva === 'cuenta'" class="cuenta-container">

        <div class="perfil-header">
          <img v-if="usuario?.avatar" :src="usuario.avatar" />
          <span v-else>👤</span>


        </div>

        <div class="info-card">
          <div class="info-item">
            <p class="label">Email:</p>
            <p class="value">{{ usuario?.email || "-" }}</p>
          </div>

          <div class="divider"></div>

          <div class="info-item">
            <p class="label">Tipo de cuenta:</p>
            <p class="value">{{ usuario?.role || "-" }}</p>
          </div>
        </div>

        <button class="changePass-button" @click="mostrarModalPassword = true">🔐 Cambiar contraseña</button>

        <button class="logout-button" @click="cerrarSesion">🚪 Cerrar sesión</button>

      </div>
    </div>
    
    </transition>
    </div>
    

    <!-- FONDO GEOMÉTRICO -->
    <div
      v-if="tabActiva === 'portes' && portes.length === 0"
      class="geometric-footer"
    >
      <div class="triangle-black-left"></div>
      <div class="triangle-green-center"></div>
      <div class="triangle-black-right"></div>
    </div>

    <!-- NAVBAR INFERIOR -->
     
    <div class="bottom-nav" ref="navbar">
      <div class="nav-indicator" :style="{ width: '33.33%', transform: `translateX(${indicatorIndex * 100}%)` }"></div>

      <button ref="portes" :class="{ activo: tabActiva === 'portes' }" @click="cambiarTab('portes', $event)">
        🚛
        <span>Portes</span>
      </button>

      <button ref="historial" :class="{ activo: tabActiva === 'historial' }" @click="cambiarTab('historial', $event)">
        🕓
        <span>Historial</span>
      </button>

      <button ref="cuenta" :class="{ activo: tabActiva === 'cuenta' }" @click="cambiarTab('cuenta', $event)">

        👤
        <span>Cuenta</span>
      </button>
    </div>
    
    <!-- Modal para el cambio de contraseña-->

    <div v-if="mostrarModalPassword" class="modal-overlay">
      <div class="modal">
        <h3>Cambiar contraseña</h3>

        <input type="password" v-model="nuevaPassword" placeholder="Nueva contraseña" />
        <input type="password" v-model="confirmNuevaPassword" placeholder="Confirmar contraseña" />

        <button @click="guardarPassword">Guardar</button>
        <button @click="mostrarModalPassword = false">Cancelar</button>
      </div>
    </div>


    <!--Mosal para los portes-->
    <div v-if="mostrarModalPorte" class="modal-overlay">
      <div class="modal">
        <h3>Detalles del Porte</h3>

        <p><strong>Origen:</strong> {{  porteSeleccionado.origen }}</p>
        <p><strong>Destino:</strong> {{  porteSeleccionado.destino }}</p>
        <p><strong>Fecha:</strong> {{ formatearFecha(porteSeleccionado.fecha) }}</p>
        <p><strong>Estado:</strong> {{ porteSeleccionado.estado }}</p>
        <p><strong>Km:</strong> {{  porteSeleccionado.kmTotal }}</p>
        <p><strong>Precio:</strong> €{{ porteSeleccionado.precio }}</p>

        <button class="cerrarModalPorte" @click="mostrarModalPorte = false">Cerrar</button>

        <button v-if="porteSeleccionado.estado === 'en_progreso'" class="rastrear-btn" @click="irARastreo">🚛 Rastrear camión</button>
      </div>

    </div>

    <!-- Burbuja de contacto flotante -->

    <div class="burbujaDeContacto">
      <div class="menuContacto" :class="{ open: mostrarContacto}">
        <a href="tel:+34670424679">📞 Llamar</a>
        <a href="https://wa.me/34670424679?text=Hola%20tengo%20una%20consulta">💬 WhatsApp</a>
      </div>

      <button class="botonContacto" @click.stop="mostrarContacto = !mostrarContacto">💬</button>

    </div>

  </div>
    

</template>

<script>
import { obtenerPortesCliente } from "../utilidades/supabase";
import { logout } from "../utilidades/auth";
export default {
  name: "PortexHome",

  data() {
    return {
      tabActiva: "portes",
      indicatorIndex: 0,
      portes: [],
      animandoCamioneta: false,
      usuario: null,
      mostrarModalPassword: false,
      nuevaPassword: "",
      confirmNuevaPassword: "",
      mostrarContacto: false,
      porteSeleccionado: null,
      mostrarModalPorte: false,
      cargando: true,
    };
  },

  computed: {
    portesActivos() {
      return this.portes.filter((porte) => porte._trip?.status !== "completed");
    },
    portesHistorial() {
      return this.portes.filter((porte) => porte._trip?.status === "completed");
    },
  },

  methods: {

    irARastreo() {
      if(this.porteSeleccionado.estado !== "en_progreso") {
        return;
      }

      this.$router.push({ name: "Rastreo", params: { id: this.porteSeleccionado.id } });
    },

    formatearFecha(fechaISO) {
      const fecha = new Date(fechaISO);
      return fecha.toLocaleString("es-ES", {
        day:"2-digit",
        month:"2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    },

    handleClickOutside(e){
      if (this.mostrarContacto && !this.$el.querySelector('.burbujaDeContacto').contains(e.target)){
        this.mostrarContacto = false;
      }
    },

    cerrarSesion() {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        logout();
        this.$router.push({ name: "Login" });
      }
    },

    cambiarTab(tab) {
      this.tabActiva = tab;

      const posiciones = {
        portes: 0,
        historial: 1,
        cuenta: 2
      };
      this.indicatorIndex = posiciones[tab];
    },

    /**
     * Calcula la distancia entre dos puntos geográficos (Haversine)
     * Retorna distancia en km
     */
    calcularDistancia(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radio de la tierra en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },

    /**
     * Prioriza nombre guardado en BD y cae a coordenadas si no existe.
     */
    resolverNombreUbicacion(nombre, lat, lng) {
      if (nombre && String(nombre).trim()) return nombre;

      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return "N/A";
      }

      return `${latNum.toFixed(3)}, ${lngNum.toFixed(3)}`;
    },

    /**
     * Convierte estado de BD a formato de UI
     */
    mapearEstado(estadoDB) {
      const mapeo = {
        "pending": "pendiente",
        "in_progress": "en_progreso",
        "completed": "completado",
        "cancelled": "cancelado"
      };
      return mapeo[estadoDB] || estadoDB;
    },

    async fetchPortes() {
      this.cargando = true;
      try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (!currentUser?.id) {
          this.portes = [];
          return;
        }

        const datosDB = await obtenerPortesCliente(currentUser.id);
        
        // Convertimos datos de BD al formato que espera la UI
        this.portes = datosDB.map((trip) => {
            const distancia = this.calcularDistancia(
              trip.origin_lat,
              trip.origin_lng,
              trip.destination_lat,
              trip.destination_lng
            );

            return {
              id: trip.id,
              destino: this.resolverNombreUbicacion(trip.destination_name, trip.destination_lat, trip.destination_lng),
              origen: this.resolverNombreUbicacion(trip.origin_name, trip.origin_lat, trip.origin_lng),
              estado: this.mapearEstado(trip.status),
              fecha: trip.created_at,
              kmTotal: distancia.toFixed(1),
              precio: Number(trip.price),
              // Guardamos datos originales para acceso si es necesario
              _trip: trip
            };
          });

        console.log("✅ Portes cargados desde Supabase:", this.portes);
      } catch (error) {
        console.error("❌ Error al obtener los portes:", error);
      } finally {
        this.cargando = false;
      }
    },

    animarYRedirigir() {
      this.animandoCamioneta = true;

      setTimeout(() => {
        this.$router.push({ name: "Presupuesto" });
      }, 800);
    },

    guardarPassword() {
      if (this.nuevaPassword.length < 6) {
        alert("Mínimo 6 caracteres");
        return;
      }

      if (this.nuevaPassword !== this.confirmNuevaPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      alert("Contraseña actualizada correctamente");
      this.mostrarModalPassword = false;
      this.nuevaPassword = "";
      this.confirmNuevaPassword = "";
    },

    abrirPorte(porte) {
      this.porteSeleccionado = porte;
      this.mostrarModalPorte = true;
    },
  },

  created() {
    this.fetchPortes();

    const user = localStorage.getItem("currentUser");
    if (user) {
      this.usuario = JSON.parse(user);
    }
  },

  mounted(){
    document.addEventListener("click", this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.handleClickOutside);
  }
};
</script>

<style scoped>

* {
  -webkit-tap-highlight-color: transparent;
}

button:active {
  transform: scale(0.96);
}

/*Boton de rastreo*/
.rastrear-btn {
  width: 100%;
  margin-top: 15px;
  padding: 14px;
  border: none;
  border-radius: 30px;
  font-weight: 800;
  background: linear-gradient(135deg, #7EDB76, #5ccf63);
  color: white;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 6px 15px rgba(126,219,118,0.4);
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rastrear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(126,219,118,0.6);
}


/* Modal de cambio de contraseña */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;  /* 👈 clave */
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 15px;
  width: 85%;
  max-width: 350px;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Montserrat', sans-serif;
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
}

.header {
  text-align: center;
  padding: 20px 0;
}

.logo {
  max-width: 150px;
}

.title {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #444;
}

.contenido {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
  z-index: 2;
  padding-bottom: 100px; /* para que no choque con navbar */
}

.subtitle {
  margin-bottom: 15px;
  font-weight: 700;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #eee;
  z-index: 100;
  backdrop-filter: blur(8px);
  background: rgba(255,255,255,0.9);
}

.bottom-nav {
  position: fixed;
  overflow: hidden;   /* 👈 evita que el indicador se salga */
}

/* Estilos para los botones de navegación */
.bottom-nav button {
  background: none;
  border: none;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #999;
  cursor: pointer;
  flex: 1;
  transition: color 0.3s ease;
}

.bottom-nav button.activo {
  color: #7EDB76;
}

.nav-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: #7EDB76;
  transition: all 0.3s ease;
}

.no-portes {
  text-align: center;
}

.no-portes-img {
  width: clamp(200px, 80%, 350px);
  margin: 20px auto;
}

.primary-button {
  width: 100%;
  padding: 15px;
  background-color: #7EDB76;
  border: 2px solid black;
  border-radius: 30px;
  font-weight: 800;
  margin-top: 15px;
}

.moverCamioneta {
  animation: moverIzquierda 0.8s ease forwards;
}

@keyframes moverIzquierda {
  0% { transform: translateX(0); }
  100% { transform: translateX(-300px); opacity: 0; }
}

.geometric-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35vh; /* Ocupa el 35% inferior */
  z-index: 1;
  pointer-events: none; /* Para que no interfiera con clicks si hay algo */
}


/* Fade de aparición */
@keyframes fadeInBg {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Triángulo verde central */
.triangle-green-center {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 150px solid transparent;
  border-right: 150px solid transparent;
  border-bottom: 250px solid #7EDB76;
  z-index: 3;
}

/* Triángulos negros decorativos laterales */
.triangle-black-left {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 0;
  border-right: 150px solid transparent;
  border-bottom: 150px solid black;
  z-index: 2;
}

.triangle-black-right {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-left: 150px solid transparent;
  border-bottom: 150px solid black;
  z-index: 2;
}


.triangle-black-right {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;

  border-left: 18vw solid transparent;
  border-bottom: 20vh solid rgba(0, 0, 0, 0.9);
  
}

/* Movimiento sutil */
@keyframes moverSuave {
  from {
    transform: translateY(0px);
  }
  to {
    transform: translateY(-10px);
  }
}

.cuenta-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.perfil-header {
  text-align: center;
  margin-top: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 10px auto;
  border: 3px solid black;
}

.avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.nombre-usuario {
  font-weight: 800;
  margin: 0;
}

.rol-usuario {
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: gray;
  margin: 0;
}

.info-card {
  width: 100%;
  max-width: 350px;
  background: #f5f5f5;
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.info-item {
  text-align: left;
}

.label {
  font-weight: 700;
  margin: 0;
}

.value {
  margin: 5px 0;
  color: #444;
}

.divider {
  height: 1px;
  background: #ddd;
  margin: 15px 0;
}

.logout-button {
  width: 100%;
  max-width: 350px;
  padding: 15px;
  background-color: #ff5e5e;
  border: none;
  border-radius: 30px;
  font-weight: 800;
  color: white;
  cursor: pointer;
  transition: 0.2s ease;
}

.logout-button:hover {
  transform: scale(1.02);
}

.changePass-button {
  width: 100%;
  max-width: 350px;
  padding: 15px;
  background-color: #7EDB76;
  border: none;
  border-radius: 30px;
  font-weight: 800;
  color: white;
  cursor: pointer;
  transition: 0.2s ease;
}

.changePass-button:hover {
  transform: scale(1.02);
}

/* Transiciones para cambio de panel*/
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Burbuja de contacto */
.burbujaDeContacto {
  position: fixed;
  bottom: 90px; /* arriba de la navbar */
  right: 20px;
  z-index: 999;
}

.botonContacto {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background-color: #25D366;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  animation: pulso 2s infinite;
}

.botonContacto:hover {
  transform: scale(1.1);
}

/* Cuando está abierto */
.botonContacto.activo {
  transform: rotate(45deg) scale(1.05);
  animation: none;
}

@keyframes pulso {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(37, 211, 102, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
  }
}

.menuContacto {
  position: absolute;
  bottom: 75px;
  right: 0;
  background: white;
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transform: translateY(20px) scale(0.8);
  pointer-events: none;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.menuContacto.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.menuContacto a {
  text-decoration: none;
  color: black;
  font-weight: 600;
  transition: 0.2s ease;
}

.menuContacto a:hover {
  transform: translateX(5px);
  color: #25D366;
}

/* Estilos para porte activo */
.portes-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.porte-card {
  background: white;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  border-left: 5px solid #7EDB76;
  transition: all 0.25s ease;
}

.porte-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.1);
}

.porte-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.porte-destino {
  font-weight: 700;
}

.porte-estado {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 20px;
  text-transform: capitalize;
  position: relative;
  overflow: hidden;
}

.porte-estado.pendiente {
  background: #fff3cd;
  color: #856404;
  position: relative;
  overflow: hidden;
}

.porte-estado.pendiente::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(130, 98, 2, 0.25) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.porte-estado.en_progreso {
  background: #e6f4ff;
  color: #0077ff;
  position: relative;
  overflow: hidden;
}

.porte-estado.en_progreso::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(0,119,255,0.25) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.porte-estado.completado {
  background: #d4edda;
  color: #155724;
}

.porte-estado.completado::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(27, 109, 34, 0.25) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.porte-estado.cancelado {
  background: #f8d7da;
  color: #721c24;
}

.porte-estado.cancelado::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(109, 18, 18, 0.25) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/*Modal del porte*/


</style>
