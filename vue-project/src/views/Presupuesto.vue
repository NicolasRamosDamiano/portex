<script setup>
// 1. IMPORTACIONES SIEMPRE ARRIBA DEL TODO
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// --- VARIABLES ---
const selected = ref("M");
const origen = ref("");
const destino = ref("");
const queEnvia = ref("");
const camionCompleto = ref(false);
const cargando = ref(false);

// Referencias a los elementos HTML (inputs) para el autocompletado
const inputOrigenRef = ref(null);
const inputDestinoRef = ref(null);

// --- FUNCIONES ---
function select(tipo) {
  selected.value = tipo;
}

function toggleCamionCompleto() {
  camionCompleto.value = !camionCompleto.value;
  if (camionCompleto.value) {
    queEnvia.value = ""; 
  }
}

const puedeCalcular = computed(() => {
  if (cargando.value) return false;
  if (!origen.value || !destino.value) return false;
  if (!camionCompleto.value && !queEnvia.value) return false;
  return true;
});

// --- INICIALIZAR GOOGLE AUTOCOMPLETE ---
onMounted(() => {
  // Verificamos si Google Maps cargó
  if (typeof google !== "undefined" && google.maps && google.maps.places) {
    
    // 1. Configurar Autocompletado para ORIGEN
    const autocompleteOrigen = new google.maps.places.Autocomplete(inputOrigenRef.value, {
      types: ['geocode'], 
      componentRestrictions: { country: "es" } 
    });

    // Escuchar cuando el usuario selecciona una dirección
    autocompleteOrigen.addListener("place_changed", () => {
      const place = autocompleteOrigen.getPlace();
      if (place.formatted_address) {
        origen.value = place.formatted_address;
      }
    });

    // 2. Configurar Autocompletado para DESTINO
    const autocompleteDestino = new google.maps.places.Autocomplete(inputDestinoRef.value, {
      types: ['geocode'],
      componentRestrictions: { country: "es" }
    });

    autocompleteDestino.addListener("place_changed", () => {
      const place = autocompleteDestino.getPlace();
      if (place.formatted_address) {
        destino.value = place.formatted_address;
      }
    });

  } else {
    console.warn("Google Maps API no está cargada o falta la librería 'places'.");
  }
});

// --- CALCULAR PRESUPUESTO ---
function calcularPresupuesto() {
  if (!puedeCalcular.value) return;

  if (typeof google === "undefined" || !google.maps) {
    alert("Error: La API de Google Maps no está lista.");
    return;
  }

  cargando.value = true;
  const service = new google.maps.DirectionsService();

  service.route(
    {
      origin: origen.value,
      destination: destino.value,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      cargando.value = false;
      if (status === google.maps.DirectionsStatus.OK) {
        const metros = result.routes[0].legs[0].distance.value;
        const km = (metros / 1000).toFixed(2);

        router.push({
          name: "Calculo",
          query: {
            km,
            tipo: selected.value,
            origen: origen.value,
            destino: destino.value
          },
        });
      } else {
        alert("No se pudo calcular la ruta. Verifica las direcciones.");
      }
    }
  );
}
</script>

<template>
  
    <img class="logo" src="/assets/Portexlogo.JPG" alt="Portex logo" />
    <h1 class="Titulo">Calcula tu presupuesto</h1>

    <div class="container">
      <div class="cocheP" @click="select('P')" data-size="P">
        <img src="/assets/PortexCoche.png" alt="">
        <h3 class="descripcion">Pequeño</h3>
      </div>

      <div class="cocheM" @click="select('M')" data-size="M">
        <img src="/assets/PortexCoche.png" alt="">
        <h3 class="descripcion">Mediano</h3>
      </div>

      <div class="cocheG" @click="select('G')" data-size="G">
        <img src="/assets/PortexCoche.png" alt="">
        <h3 class="descripcion">Grande</h3>
      </div>

      <!-- MARCO VERDE ANIMADO -->
      <div class="selector" :class="'pos-' + selected"></div>
    </div>


<div class="zonaEnvio">
  <div>
    <label class="labelOrigen">Origen</label>
    <input 
      ref="inputOrigenRef" 
      v-model="origen" 
      type="text" 
      placeholder="Indica el origen" 
    />
  </div>

  <div>
    <label class="labelDestino">Destino</label>
    <input 
      ref="inputDestinoRef" 
      v-model="destino" 
      type="text" 
      placeholder="Indica el destino" 
    />
  </div>
</div>
<div class="porte">
  <h2 class="quePorta">¿Qué vas a enviar?</h2>

  <input
    type="text"
    v-model="queEnvia"
    :disabled="camionCompleto"
    :class="{ deshabilitadoPorCamionCompleto: camionCompleto }"
    placeholder="Indica el contenido"
  />

  <button
    class="camionCompletoBtn"
    @click="toggleCamionCompleto"
    :class="{ activo: camionCompleto }"
  >
    Camión completo
  </button>
</div>

<div class="calcularPresupuestoDiv">
  <button
    class="calcularPresupuestoBtn"
    @click="calcularPresupuesto"
    :disabled="!puedeCalcular"
  >
    Calcular Presupuesto
  </button>
</div>



</template>


<style scoped>

/* ------- RESET GENERAL ------- */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Inter", Arial, sans-serif;
}

body {
  background: #ffffff;
}

/* ------- LOGO ------- */
.logo {
  display: block;
  width: 160px;
  margin: 25px auto 15px auto;
}

/* ------- TÍTULO ------- */
.Titulo {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 3px;
  margin-bottom: 25px;
}

/* ------- CONTENEDOR VEHÍCULOS ------- */
.container {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #e6e6e6;
  padding: 20px 10px;
  border-radius: 20px;
  width: 90%;
  margin: 0 auto 25px auto;
}

/* Caja con vehículos */
.container > div {
  z-index: 10;
  text-align: center;
  padding: 10px;
  border-radius: 18px;
  transition: 0.2s;
  cursor: pointer;
}

.container img {
  width: 90px;
}

/* ------- ANIMACIÓN DEL MARCO VERDE ------- */
.selector {
  position: absolute;
  top: 10px;
  left: 0;
  width: calc(100% / 3);
  height: calc(100% - 20px);
  border: 4px solid #7ddf79;
  border-radius: 20px;
  pointer-events: none;
  transition: transform 0.35s ease;
}

/* POSICIONES PERFECTAS */
.pos-P {
  transform: translateX(0%);
}

.pos-M {
  transform: translateX(100%);
}

.pos-G {
  transform: translateX(200%);
}


/* ------- DESCRIPCIÓN ------- */
.descripcion {
  margin-top: 5px;
  font-weight: 600;
}

/* ------- RESPONSIVE ------- */
@media (max-width: 480px) {
  .Titulo {
    font-size: 22px;
  }

  .container img {
    width: 70px;
  }

  .selector {
    border-width: 3px;
  }
}

/* ------- ZONA ORIGEN / DESTINO ------- */
.zonaEnvio {
  width: 90%;
  margin: auto;
}

.ubicacionOrigen,
.ubicacionDestino {
  background: #ffffff;
  border: 3px solid #000;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ubicacionOrigen::before {
  content: "📍";
  font-size: 26px;
}

.ubicacionDestino::before {
  content: "⚪";
  font-size: 26px;
}

/* ------- BOTÓN ------- */
.calcularPresupuestoDiv {
  width: 90%;
  margin: 15px auto;
}

.calcularPresupuesto {
  width: 100%;
  border: none;
  background: #7ddf79;
  padding: 16px;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  cursor: pointer;
}

/* ------- MÁS RESPONSIVE ------- */
@media (max-width: 380px) {
  .calcularPresupuesto {
    font-size: 16px;
  }
}
.porte {
  display: flex;
  flex-direction: column;
  align-items: center;   /* centra horizontal */
  justify-content: center;
  margin-top: 30px;
  text-align: center;
}

.porte .quePorta {
  margin-bottom: 10px;
}

.porte input {
  width: 80%;
  max-width: 350px;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
}


/* CONTENEDOR ORIGEN / DESTINO */
.zonaEnvio {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 90%;
  max-width: 500px;
  margin: 0 auto;
  margin-top: 25px;
}

/* Labels */
.labelOrigen,
.labelDestino {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  display: block;
}

/* Inputs */
.zonaEnvio input {
  width: 100%;
  padding: 12px 15px;
  font-size: 15px;
  border: 2px solid #cfcfcf;
  border-radius: 10px;
  outline: none;
  transition: border 0.2s ease-in-out;
}

.zonaEnvio input:focus {
  border-color: #4caf50; /* verde */
}

/* SECCIÓN ¿QUÉ VAS A ENVIAR? */
.porte {
  margin-top: 30px;
  width: 90%;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.porte .quePorta {
  font-size: 20px;
  margin-bottom: 10px;
}

.porte input {
  width: 100%;
  padding: 12px 15px;
  font-size: 15px;
  border: 2px solid #cfcfcf;
  border-radius: 10px;
  outline: none;
  transition: border 0.2s;
}

.porte input:focus {
  border-color: #4caf50;
}

.porte input.deshabilitadoPorCamionCompleto {
  opacity: 0.28;
  background: rgba(180, 180, 180, 0.22);
  border-color: rgba(140, 140, 140, 0.5);
  color: rgba(40, 40, 40, 0.5);
}

.camionCompletoBtn {
  margin-top: 12px;
  background: #111111;
  color: #ffffff;
  border: 2px solid #111111;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.22s ease;
}

.camionCompletoBtn:hover {
  transform: translateY(-1px);
}

.camionCompletoBtn.activo {
  background: #d00000;
  border-color: #ff4d4d;
  color: #ffffff;
  box-shadow: 0 0 8px rgba(255, 0, 0, 0.6), 0 0 22px rgba(255, 0, 0, 0.55);
}

/* BOTÓN CALCULAR */
.calcularPresupuestoDiv {
  margin-top: 30px;
  text-align: center;
}

.calcularPresupuestoBtn {
  background-color: #4caf50;
  color: white;
  border: none;
  font-size: 18px;
  padding: 12px 25px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  box-shadow: 0px 3px 8px rgba(0,0,0,0.15);
}

.calcularPresupuestoBtn:hover {
  background-color: #45a049;
}

.calcularPresupuestoBtn:active {
  transform: scale(0.97);
}

@media (max-width: 480px) {
  .labelOrigen,
  .labelDestino {
    font-size: 14px;
  }

  .zonaEnvio input,
  .porte input {
    font-size: 14px;
    padding: 10px 12px;
  }

  .calcularPresupuestoBtn {
    font-size: 16px;
    padding: 10px 20px;
  }
}


</style>
