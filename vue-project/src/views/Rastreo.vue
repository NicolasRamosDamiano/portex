<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCurrentUser } from "../utilidades/auth";
import { supabase, obtenerPortePorId, actualizarUbicacionChofer } from "../utilidades/supabase";

const route = useRoute();
const router = useRouter();

const mapContainer = ref(null);
const cargando = ref(true);
const error = ref("");
const porte = ref(null);
const estado = ref("");
const choferLatLng = ref(null);
const faseViaje = ref("hacia_origen");
const puedeFinalizar = ref(false);
const finalizando = ref(false);
const esModoChofer = ref(false);
const mostrarTrafico = ref(false);
const mostrarTransito = ref(false);
const seguimientoActivo = ref(true);
const objetivoLabel = ref("Origen");

let map = null;
let directionsRenderer = null;
let directionsRendererHaciaOrigen = null;
let directionsRendererNavegacion = null;
let markerOrigen = null;
let markerDestino = null;
let markerChofer = null;
let markerObjetivo = null;
let polylineChofer = null;
let channelUbicacion = null;
let channelPorte = null;
let geoWatchId = null;
let rutaHaciaOrigenTimer = null;
let rutaHaciaDestinoTimer = null;
let refrescoMapaInterval = null;
let trafficLayer = null;
let transitLayer = null;
let ultimaPosChofer = null;
let rutaNavegacionTimer = null;

const tripId = route.params.id || route.query.tripId || route.query.id;

function obtenerEstadoTrip(trip) {
  return trip?.status ?? "";
}

async function actualizarEstadoViaje(porteId, nuevoEstado, driverId = null) {
  const payload = { status: nuevoEstado };
  if (driverId) payload.driver_id = driverId;

  const { error } = await supabase
    .from("trips")
    .update(payload)
    .eq("id", porteId);

  if (error) throw error;

  const { data: verificado, error: readError } = await supabase
    .from("trips")
    .select("id, driver_id, status")
    .eq("id", porteId)
    .maybeSingle();

  if (readError) throw readError;
  return verificado;
}

function fmtCoord(lat, lng) {
  if (lat == null || lng == null) return "-";
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

function formatTripCode(id) {
  const raw = String(id || "").trim();
  if (!raw) return "PX-000000";
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `PX-${compact.slice(-6).padStart(6, "0")}`;
}

function inicializarMapa(centro = { lat: -34.6037, lng: -58.3816 }, opts = {}) {
  if (!mapContainer.value) return;
  if (typeof google === "undefined" || !google.maps) {
    error.value = "Google Maps no esta disponible.";
    return;
  }

  const modoChofer = Boolean(opts?.modoChofer);

  map = new google.maps.Map(mapContainer.value, {
    center: centro,
    zoom: modoChofer ? 18 : 13,
    disableDefaultUI: modoChofer,
    clickableIcons: !modoChofer,
    mapTypeControl: !modoChofer ? false : false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: !modoChofer,
    gestureHandling: modoChofer ? "greedy" : "auto",
  });

  if (modoChofer) {
    // Si el chofer/admin arrastra el mapa, dejamos de auto-centrar hasta que presione "Recentrar".
    google.maps.event.addListener(map, "dragstart", () => {
      seguimientoActivo.value = false;
    });

    directionsRendererNavegacion = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: "#111111",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });
  }

  // En modo chofer no dibujamos ruta completa ni UI extra del mapa.
  if (!modoChofer) {
    directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
    });

    directionsRendererHaciaOrigen = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: "#ff7a00",
        strokeOpacity: 0.95,
        strokeWeight: 4,
      },
    });

    polylineChofer = new google.maps.Polyline({
      map,
      geodesic: true,
      strokeColor: "#1f78ff",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
  } else {
    directionsRenderer = null;
    directionsRendererHaciaOrigen = null;
    polylineChofer = null;
  }

}

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function esperarGoogleMaps(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof google !== "undefined" && google.maps) return true;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
}

function dibujarMarcadoresOrigenDestino() {
  if (!map || !porte.value) return;

  const origen = { lat: Number(porte.value.origin_lat), lng: Number(porte.value.origin_lng) };
  const destino = { lat: Number(porte.value.destination_lat), lng: Number(porte.value.destination_lng) };

  markerOrigen = new google.maps.Marker({
    map,
    position: origen,
    title: "Origen",
    label: "O",
  });

  markerDestino = new google.maps.Marker({
    map,
    position: destino,
    title: "Destino",
    label: "D",
  });
}

function dibujarRutaPorte() {
  if (!map || !porte.value || !directionsRenderer) return;

  const origen = { lat: Number(porte.value.origin_lat), lng: Number(porte.value.origin_lng) };
  const destino = { lat: Number(porte.value.destination_lat), lng: Number(porte.value.destination_lng) };

  const service = new google.maps.DirectionsService();
  service.route(
    {
      origin: origen,
      destination: destino,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK" && result) {
        directionsRenderer.setDirections(result);
        return;
      }

      // Fallback si Directions no responde.
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origen);
      bounds.extend(destino);
      map.fitBounds(bounds);

      new google.maps.Polyline({
        map,
        path: [origen, destino],
        geodesic: true,
        strokeColor: "#7edb76",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
    }
  );
}

function actualizarMarcadorChofer(lat, lng) {
  if (!map) return;
  if (!polylineChofer) return;

  const pos = { lat: Number(lat), lng: Number(lng) };
  const posLatLng = new google.maps.LatLng(pos.lat, pos.lng);
  choferLatLng.value = pos;

  if (!markerChofer) {
    markerChofer = new google.maps.Marker({
      map,
      position: posLatLng,
      title: "Chofer",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#1f78ff",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
  } else {
    markerChofer.setPosition(posLatLng);
  }

  const path = polylineChofer.getPath();
  path.push(posLatLng);

  actualizarFaseViajeSiCorresponde(pos);

  if (faseViaje.value === "hacia_origen") {
    actualizarRutaChoferAPuntoA(posLatLng);
  } else {
    actualizarRutaChoferAPuntoB(posLatLng);
  }
}

function actualizarFaseViajeSiCorresponde(pos) {
  if (!porte.value) return;
  if (faseViaje.value !== "hacia_origen") return;

  const d = distanciaMetros(
    pos.lat,
    pos.lng,
    Number(porte.value.origin_lat),
    Number(porte.value.origin_lng)
  );

  // Umbral de llegada al Punto A.
  if (d <= 80) {
    faseViaje.value = "hacia_destino";
    if (directionsRendererHaciaOrigen) {
      directionsRendererHaciaOrigen.setDirections({ routes: [] });
    }
    if (directionsRendererNavegacion) {
      directionsRendererNavegacion.setDirections({ routes: [] });
    }
  }
}

function obtenerObjetivoLatLng() {
  if (!porte.value) return null;
  if (faseViaje.value === "hacia_origen") {
    objetivoLabel.value = "Origen";
    return { lat: Number(porte.value.origin_lat), lng: Number(porte.value.origin_lng) };
  }
  objetivoLabel.value = "Destino";
  return { lat: Number(porte.value.destination_lat), lng: Number(porte.value.destination_lng) };
}

function actualizarMarcadorObjetivo() {
  if (!map || !google?.maps) return;
  const objetivo = obtenerObjetivoLatLng();
  if (!objetivo) return;

  const pos = new google.maps.LatLng(objetivo.lat, objetivo.lng);
  const label = faseViaje.value === "hacia_origen" ? "A" : "B";

  if (!markerObjetivo) {
    markerObjetivo = new google.maps.Marker({
      map,
      position: pos,
      title: objetivoLabel.value,
      label,
    });
  } else {
    markerObjetivo.setPosition(pos);
    markerObjetivo.setLabel(label);
    markerObjetivo.setTitle(objetivoLabel.value);
  }
}

function actualizarRutaNavegacionChofer(choferPosLatLng) {
  if (!directionsRendererNavegacion || !porte.value || !google?.maps) return;
  const objetivo = obtenerObjetivoLatLng();
  if (!objetivo) return;

  if (rutaNavegacionTimer) clearTimeout(rutaNavegacionTimer);
  rutaNavegacionTimer = setTimeout(() => {
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: choferPosLatLng,
        destination: objetivo,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererNavegacion.setDirections(result);
        }
      }
    );
  }, 900);
}

function actualizarRutaChoferAPuntoA(choferPos) {
  if (!directionsRendererHaciaOrigen || !porte.value || !google?.maps) return;
  const origen = {
    lat: Number(porte.value.origin_lat),
    lng: Number(porte.value.origin_lng),
  };

  if (rutaHaciaOrigenTimer) clearTimeout(rutaHaciaOrigenTimer);
  rutaHaciaOrigenTimer = setTimeout(() => {
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: choferPos,
        destination: origen,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererHaciaOrigen.setDirections(result);
        }
      }
    );
  }, 1200);
}

function actualizarRutaChoferAPuntoB(choferPos) {
  if (!directionsRenderer || !porte.value || !google?.maps) return;
  const destino = {
    lat: Number(porte.value.destination_lat),
    lng: Number(porte.value.destination_lng),
  };

  if (rutaHaciaDestinoTimer) clearTimeout(rutaHaciaDestinoTimer);
  rutaHaciaDestinoTimer = setTimeout(() => {
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: choferPos,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRenderer.setDirections(result);
        }
      }
    );
  }, 1200);
}

function calcularRumboGrados(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function aplicarCapasChofer() {
  if (!map || typeof google === "undefined" || !google.maps) return;
  if (!trafficLayer) trafficLayer = new google.maps.TrafficLayer();
  if (!transitLayer) transitLayer = new google.maps.TransitLayer();

  trafficLayer.setMap(mostrarTrafico.value ? map : null);
  transitLayer.setMap(mostrarTransito.value ? map : null);
}

function toggleTrafico() {
  mostrarTrafico.value = !mostrarTrafico.value;
  aplicarCapasChofer();
}

function toggleTransito() {
  mostrarTransito.value = !mostrarTransito.value;
  aplicarCapasChofer();
}

function recentrarMapaChofer() {
  if (!map || typeof google === "undefined" || !google.maps) return;
  seguimientoActivo.value = true;
  if (ultimaPosChofer?.lat != null && ultimaPosChofer?.lng != null) {
    map.panTo(new google.maps.LatLng(Number(ultimaPosChofer.lat), Number(ultimaPosChofer.lng)));
    map.setZoom(18);
    return;
  }
  const pos = markerChofer?.getPosition?.();
  if (pos) {
    map.panTo(pos);
    map.setZoom(18);
  }
}

function actualizarMarcadorChoferModoChofer(lat, lng, headingDeg = null) {
  if (!map || typeof google === "undefined" || !google.maps) return;

  const pos = { lat: Number(lat), lng: Number(lng) };
  choferLatLng.value = pos;

  const heading =
    typeof headingDeg === "number" && !Number.isNaN(headingDeg)
      ? headingDeg
      : calcularRumboGrados(ultimaPosChofer, pos);

  ultimaPosChofer = pos;

  const posLatLng = new google.maps.LatLng(pos.lat, pos.lng);
  if (seguimientoActivo.value) {
    map.setCenter(posLatLng);
    if (map.getZoom() < 18) map.setZoom(18);
  }

  const icon = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    rotation: heading,
    fillColor: "#111111",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };

  if (!markerChofer) {
    markerChofer = new google.maps.Marker({
      map,
      position: posLatLng,
      title: "Tu vehículo",
      icon,
      optimized: true,
      zIndex: 999,
    });
  } else {
    markerChofer.setPosition(posLatLng);
    markerChofer.setIcon(icon);
  }

  // Navegación mínima: chofer -> objetivo (A/B)
  actualizarFaseViajeSiCorresponde(pos);
  actualizarMarcadorObjetivo();
  actualizarRutaNavegacionChofer(posLatLng);
}

async function cargarPorte() {
  if (!tripId) {
    error.value = "Falta el ID del porte para rastrear.";
    cargando.value = false;
    return;
  }

  const data = await obtenerPortePorId(tripId);
  if (!data) {
    error.value = "No se pudo cargar el porte.";
    cargando.value = false;
    return;
  }

  porte.value = data;
  estado.value = obtenerEstadoTrip(data);

  // Renderiza el contenedor antes de inicializar el mapa.
  cargando.value = false;
  await nextTick();

  const mapsReady = await esperarGoogleMaps();
  if (!mapsReady) {
    error.value = "Google Maps no termino de cargar. Revisa API key/restricciones.";
    return;
  }

  const centro = {
    lat: Number(data.origin_lat || -34.6037),
    lng: Number(data.origin_lng || -58.3816),
  };

  inicializarMapa(centro, { modoChofer: esModoChofer.value });
  if (!esModoChofer.value) {
    dibujarMarcadoresOrigenDestino();
    dibujarRutaPorte();
  } else {
    aplicarCapasChofer();
    actualizarMarcadorObjetivo();
  }

  if (data.driver_id) {
    const { data: ubicacion } = await supabase
      .from("driver_locations")
      .select("lat, lng, updated_at")
      .eq("driver_id", data.driver_id)
      .maybeSingle();

    if (ubicacion?.lat != null && ubicacion?.lng != null) {
      if (esModoChofer.value) {
        actualizarMarcadorChoferModoChofer(ubicacion.lat, ubicacion.lng, null);
      } else {
        actualizarMarcadorChofer(ubicacion.lat, ubicacion.lng);
      }
    }
  }

}

function suscribirUbicacionChofer() {
  if (!porte.value?.driver_id) return;
  if (channelUbicacion) return;

  channelUbicacion = supabase
    .channel(`rastreo-driver-${porte.value.driver_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
        filter: `driver_id=eq.${porte.value.driver_id}`,
      },
      (payload) => {
        const row = payload.new;
        if (row?.lat != null && row?.lng != null) {
          if (esModoChofer.value) {
            actualizarMarcadorChoferModoChofer(row.lat, row.lng, null);
          } else {
            actualizarMarcadorChofer(row.lat, row.lng);
          }
        }
      }
    )
    .subscribe();
}

function suscribirEstadoPorte() {
  if (!tripId) return;

  channelPorte = supabase
    .channel(`rastreo-trip-${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trips",
        filter: `id=eq.${tripId}`,
      },
      (payload) => {
        const estadoNuevo = obtenerEstadoTrip(payload.new);
        if (estadoNuevo) estado.value = estadoNuevo;
      }
    )
    .subscribe();
}

async function refrescarMapa() {
  if (!tripId) return;

  const viajeActual = await obtenerPortePorId(tripId);
  if (viajeActual) {
    porte.value = viajeActual;
    const estadoNuevo = obtenerEstadoTrip(viajeActual);
    if (estadoNuevo) estado.value = estadoNuevo;
  }

  const driverId = porte.value?.driver_id;
  if (!driverId) return;

  // Si el driver_id apareció más tarde, enganchamos realtime en ese momento.
  suscribirUbicacionChofer();

  const { data: ubicacion, error: ubicacionError } = await supabase
    .from("driver_locations")
    .select("lat, lng")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (ubicacionError) {
    console.error("Error refrescando ubicación del chofer:", ubicacionError);
    return;
  }

  if (ubicacion?.lat != null && ubicacion?.lng != null) {
    if (esModoChofer.value) {
      actualizarMarcadorChoferModoChofer(ubicacion.lat, ubicacion.lng, null);
    } else {
      actualizarMarcadorChofer(ubicacion.lat, ubicacion.lng);
    }
  }
}

async function iniciarTrackingSiEsChoferDelPorte() {
  const user = getCurrentUser();
  if (!user?.id || user.role !== "driver") return;
  if (!porte.value) return;

  // Si ya está asignado a otro chofer, no habilitamos modo chofer ni tracking.
  if (porte.value.driver_id && porte.value.driver_id !== user.id) return;

  // Si el viaje aún no quedó asignado, lo reclamamos acá.
  if (!porte.value.driver_id) {
    const actualizado = await actualizarEstadoViaje(
      porte.value.id,
      obtenerEstadoTrip(porte.value) === "pending" ? "in_progress" : obtenerEstadoTrip(porte.value),
      user.id
    );
    if (actualizado?.driver_id) {
      porte.value.driver_id = actualizado.driver_id;
      estado.value = obtenerEstadoTrip(actualizado);
    }
  }

  if (!porte.value.driver_id || porte.value.driver_id !== user.id) return;
  if (!navigator.geolocation) return;

  geoWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude, heading } = pos.coords;
      await actualizarUbicacionChofer(user.id, latitude, longitude);
      actualizarMarcadorChoferModoChofer(latitude, longitude, heading ?? null);
    },
    (err) => {
      console.error("No se pudo obtener geolocalizacion del chofer:", err);
      alert("No se pudo obtener tu ubicacion. Revisa permisos de geolocalizacion del navegador.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );
}

async function finalizarViaje() {
  if (!porte.value?.id) return;
  if (estado.value !== "in_progress") {
    alert("Solo se puede finalizar un viaje en progreso.");
    return;
  }

  const confirmar = window.confirm("¿Seguro que quieres finalizar el viaje?");
  if (!confirmar) return;

  finalizando.value = true;
  try {
    const actualizado = await actualizarEstadoViaje(porte.value.id, "completed");
    if (!actualizado) {
      alert("No se pudo finalizar el viaje.");
      return;
    }
    estado.value = obtenerEstadoTrip(actualizado) || "completed";
  } catch (e) {
    console.error("Error al finalizar viaje:", e);
    alert("Error al finalizar el viaje.");
  } finally {
    finalizando.value = false;
  }
}

onMounted(async () => {
  const user = getCurrentUser();
  esModoChofer.value = ["driver", "admin"].includes(user?.role);
  puedeFinalizar.value = false;

  await cargarPorte();
  if (porte.value) {
    suscribirEstadoPorte();
    if (esModoChofer.value) {
      // Driver reporta ubicación; admin solo observa con la misma vista.
      if (user?.role === "driver") {
        await iniciarTrackingSiEsChoferDelPorte();
      } else {
        suscribirUbicacionChofer();
        refrescoMapaInterval = setInterval(refrescarMapa, 5000);
      }

      puedeFinalizar.value =
        user?.role === "driver" &&
        porte.value?.driver_id === user?.id &&
        estado.value === "in_progress";
    } else {
      // Cliente: mantiene la UI actual (ruta completa + movimiento realtime).
      suscribirUbicacionChofer();
      refrescoMapaInterval = setInterval(refrescarMapa, 5000);
    }
  }
});

onUnmounted(() => {
  if (rutaHaciaOrigenTimer) clearTimeout(rutaHaciaOrigenTimer);
  if (rutaHaciaDestinoTimer) clearTimeout(rutaHaciaDestinoTimer);
  if (rutaNavegacionTimer) clearTimeout(rutaNavegacionTimer);
  if (channelUbicacion) supabase.removeChannel(channelUbicacion);
  if (channelPorte) supabase.removeChannel(channelPorte);
  if (geoWatchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(geoWatchId);
  }
  if (refrescoMapaInterval) clearInterval(refrescoMapaInterval);
  if (trafficLayer) trafficLayer.setMap(null);
  if (transitLayer) transitLayer.setMap(null);
});
</script>

<template>
  <div class="rastreo-page">
    <header class="rastreo-header">
      <button class="volver-btn" @click="router.back()">Volver</button>
      <h1>Rastreo del Porte</h1>
      <button
        v-if="puedeFinalizar"
        class="finalizar-btn"
        :disabled="estado !== 'in_progress' || finalizando"
        @click="finalizarViaje"
      >
        {{ finalizando ? "Finalizando..." : "Finalizar viaje" }}
      </button>
    </header>

    <div v-if="cargando" class="estado-box">Cargando rastreo...</div>
    <div v-else-if="error" class="estado-box error">{{ error }}</div>

    <template v-else>
      <div class="info-panel">
        <p :title="`ID real: ${porte?.id || ''}`"><strong>Porte:</strong> {{ formatTripCode(porte?.id) }}</p>
        <p><strong>Estado:</strong> <span :class="['badge', estado]">{{ estado }}</span> </p>
        <p><strong>Origen:</strong> {{ fmtCoord(porte?.origin_lat, porte?.origin_lng) }}</p>
        <p><strong>Destino:</strong> {{ fmtCoord(porte?.destination_lat, porte?.destination_lng) }}</p>
        <p><strong>Chofer:</strong> {{ choferLatLng ? fmtCoord(choferLatLng.lat, choferLatLng.lng) : "Sin posicion" }}</p>
      </div>

      <div v-if="esModoChofer" class="capas-chofer">
        <button class="capa-btn" :class="{ on: mostrarTrafico }" @click="toggleTrafico">
          Tráfico
        </button>
        <button class="capa-btn" :class="{ on: mostrarTransito }" @click="toggleTransito">
          Señalizaciones
        </button>
        <button
          class="capa-btn"
          :class="{ on: seguimientoActivo }"
          :title="seguimientoActivo ? 'Siguiendo el vehículo' : 'Mapa libre. Presiona para volver a centrar.'"
          @click="recentrarMapaChofer"
        >
          Recentrar
        </button>
      </div>

      <div ref="mapContainer" class="mapa"></div>
    </template>
  </div>
</template>

<style scoped>

.rastreo-page {
  position: relative;
  height: 100vh;
  background: #f4f6f9;
  font-family: "Montserrat", sans-serif;
  overflow: hidden;
}

/* HEADER */
.rastreo-header {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
}

.rastreo-header h1 {
  font-size: 1rem;
  margin: 0;
  background: white;
  padding: 10px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.volver-btn {
  background: white;
  border: none;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: 0.2s ease;
}

.volver-btn:active {
  transform: scale(0.9);
}

.finalizar-btn {
  margin-left: auto;
  background: #111111;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.finalizar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* MAPA FULLSCREEN*/ 
.mapa {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* PANEL INFERIOR FLOTANTE*/ 
.info-panel {
  position: absolute;
  bottom: 20px;
  left: 16px;
  right: 16px;
  background: white;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  z-index: 15;
  backdrop-filter: blur(6px);
  animation: slideUp 0.4s ease;
}

.capas-chofer {
  position: absolute;
  top: 68px;
  left: 16px;
  z-index: 18;
  display: flex;
  gap: 10px;
}

.capa-btn {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.capa-btn.on {
  background: #111111;
  color: #ffffff;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.info-panel p {
  margin: 6px 0;
  font-size: 0.85rem;
}

/* ESTADO DESTACADO */
.info-panel p:nth-child(2) {
  font-weight: 700;
  color: #1f78ff;
}

/* BOXES */
.estado-box {
  margin-top: 80px;
  background: white;
  border-radius: 14px;
  padding: 16px;
  text-align: center;
}

.estado-box.error {
  color: #b00020;
} 

</style>
