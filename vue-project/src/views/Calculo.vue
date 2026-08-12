<script setup>
import { useRoute, useRouter } from "vue-router";
import { ref, onMounted } from "vue";
import { crearPorte } from "../utilidades/supabase";
import { getCurrentUser } from "../utilidades/auth";


const route = useRoute();
const router = useRouter();


const origen = route.query.origen || "";
const destino = route.query.destino || "";

// 🔹 Datos desde Home
const kmTrayecto = parseFloat(route.query.km) || 0;
const tipoVehiculo = route.query.tipo || "M"; // M por defecto

// 🔹 Simulación KM desde el camión al origen (editable)
const kmCamionAOrigen = ref(12); 
// 🚨 Cambialo con el radar cuando lo tengas: ej. kmCamionAOrigen.value = distanciaGPS;

// 🔹 Distancia total
const kmTotal = ref(0);

// 🔹 Precio final
const precio = ref(0);

// 🔹 Estado de pantalla de carga
const cargando = ref(true);

//🔹 Coordenadas obtenidas de Geocoding
const coordenadasOrigen = ref({ lat: 0, lng: 0 });
const coordenadasDestino = ref({ lat: 0, lng: 0 });


// 🔹 Tarifas según vehículo
const tarifas = {
  P: 4,   // Pequeño
  M: 5.5, // Mediano
  G: 8    // Grande
};



/**
 * Convierte una dirección a coordenadas usando Google Geocoding API
 */
async function obtenerCoordenadas(direccion) {
  try {
    if (typeof google === "undefined" || !google.maps) {
      console.warn("Google Maps API no disponible");
      return { lat: 0, lng: 0 };
    }

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: direccion }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          });
        } else {
          reject(`Geocoding error: ${status}`);
        }
      });
    });
  } catch (error) {
    console.error("Error en Geocoding:", error);
    return { lat: 0, lng: 0 };
  }
}

// --- CALCULAR PRESUPUESTO ---
onMounted(async () => {
  const tarifa = tarifas[tipoVehiculo] || tarifas.M;

  // Obtener coordenadas reales
  coordenadasOrigen.value = await obtenerCoordenadas(origen);
  coordenadasDestino.value = await obtenerCoordenadas(destino);

  kmTotal.value = (kmCamionAOrigen.value + kmTrayecto).toFixed(2);
  precio.value = Number(kmTotal.value * tarifa).toFixed(0);

  setTimeout(() => {
    cargando.value = false;
  }, 2000);
});

// --- Guardar porte ---
async function aceptarPorte() {
  const usuario = getCurrentUser();

  if (!usuario) {
    alert("Debes iniciar sesión para crear un porte.");
    return;
  }

  const nuevoPorte = {
    client_id: usuario.id,
    origin_name: origen || null,
    destination_name: destino || null,
    origin_lat: coordenadasOrigen.value.lat,
    origin_lng: coordenadasOrigen.value.lng,
    destination_lat: coordenadasDestino.value.lat,
    destination_lng: coordenadasDestino.value.lng,
    status: "pending",
    price: Number(precio.value)
  };

  const porteCreado = await crearPorte(nuevoPorte);

  if (porteCreado) {
    alert("¡Su porte fue creado correctamente! 🚚");
    router.push({ name: "Inicio" });
  } else {
    alert("Error al crear el porte.");
  }
}

function volverInicio() {
  router.push({ name: "Inicio" });
}
</script>


<template>
  <div class="calculo">

    <!-- PANTALLA COMPLETA DE CARGA -->
    <div v-if="cargando" class="cargandoPantalla">
      <h1>Calculando tu presupuesto...</h1>
      <p>Por favor espera unos segundos</p>
    </div>

    <!-- RESULTADO FINAL -->
    <div v-else>
      <h1>Ya calculamos su porte!</h1>

      <p><strong>Distancia desde el camión al origen:</strong></p>
      <h2>{{ kmCamionAOrigen }} km</h2>

      <p><strong>Distancia del porte (origen → destino):</strong></p>
      <h2>{{ kmTrayecto }} km</h2>

      <p><strong>Distancia total:</strong></p>
      <h2>{{ kmTotal }} km</h2>

      <p><strong>Precio total:</strong></p>
      <h2>€{{ precio }}</h2>

      <button class="aceptarPorte" @click="aceptarPorte">Aceptar Porte</button>
      <button class="volverAlInicio" @click="volverInicio">Volver al Inicio</button>
    </div>
  </div>
</template>


<style>
.cargandoPantalla {
  position: fixed;
  inset: 0;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  z-index: 9999;
  text-align: center;
}
</style>

<style scoped>
/* Importamos una fuente similar a la de la imagen (Montserrat o similar sans-serif) */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');

/* Variables de color basadas en tu imagen */
:root {
  --portex-green: #7EDB76; /* Verde lima */
  --portex-black: #000000;
  --portex-white: #ffffff;
  --portex-light-gray: #f5f5f5;
}

/* Contenedor principal para el diseño y tipografía */
.calculo {
  font-family: 'Montserrat', sans-serif;
  padding: 30px 20px;
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
}

/* -------------------------------------- */
/* ## ESTILO PANTALLA DE CARGA (Loading) */
/* -------------------------------------- */
.cargandoPantalla {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh; /* Altura mínima para centrar en la pantalla */
}

.cargandoPantalla h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--portex-black);
  text-transform: uppercase;
  margin-bottom: 15px;
}

.cargandoPantalla p {
  font-size: 1.1rem;
  color: #555;
  animation: pulse 1.5s infinite; /* Animación simple para dar vida */
}

@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

/* -------------------------------------- */
/* ## ESTILO RESULTADO FINAL */
/* -------------------------------------- */

/* Título principal de resultado */
.calculo h1 {
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 40px;
  color: var(--portex-green);
  border-bottom: 3px solid var(--portex-black);
  padding-bottom: 10px;
}

/* Estilo para las etiquetas de distancia/precio */
.calculo p {
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
  margin-top: 20px;
  margin-bottom: 5px;
  padding-left: 10px; /* Separación visual de los bordes */
  color: var(--portex-black);
}

/* Estilo para los valores (km y precio) */
.calculo h2 {
  font-size: 1.8rem;
  font-weight: 700;
  background-color: var(--portex-light-gray);
  border: 2px solid var(--portex-black);
  border-radius: 15px;
  padding: 15px 10px;
  margin-bottom: 10px;
  text-align: center;
  color: var(--portex-black);
  box-shadow: 0 4px 0 rgba(0,0,0,0.1);
}

/* Estilo específico para el Precio (más resaltado) */
.calculo h2:last-of-type {
  font-size: 2.2rem;
  font-weight: 900;
  background-color: var(--portex-green);
  color: var(--portex-black);
  border: 3px solid var(--portex-black);
  margin-top: 30px;
}

/* -------------------------------------- */
/* ## BOTONES */
/* -------------------------------------- */
.aceptarPorte,
.volverAlInicio {
  width: 100%;
  padding: 15px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  border-radius: 30px;
  border: 2px solid var(--portex-black);
  cursor: pointer;
  transition: transform 0.1s ease, background-color 0.2s;
  margin-top: 15px;
}

/* Botón Aceptar Porte (Primario: Verde) */
.aceptarPorte {
  background-color: var(--portex-green);
  color: var(--portex-black);
  box-shadow: 0 4px 0 rgba(0,0,0,0.5);
  margin-top: 40px; /* Separación extra */
}

.aceptarPorte:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0,0,0,0.5);
}

/* Botón Volver al Inicio (Secundario: Blanco/Esquema) */
.volverAlInicio {
  background-color: var(--portex-white);
  color: var(--portex-black);
  box-shadow: 0 4px 0 rgba(0,0,0,0.1);
}

.volverAlInicio:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0,0,0,0.1);
}
</style>
