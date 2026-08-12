export async function calcularDistancia(origen, destino) {
  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [origen],
        destinations: [destino],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK") {
          reject("Error al calcular distancia");
          return;
        }

        const distancia = response.rows[0].elements[0].distance.value; // metros
        resolve(distancia / 1000); // km
      }
    );
  });
}

export async function getPortes() {
  // Simulación de datos de portes
  return [
    { id: 1, destino: "Madrid", fecha: "2026-02-20", estado: "En curso" },
    { id: 2, destino: "Barcelona", fecha: "2026-02-22", estado: "Pendiente" },
    { id: 3, destino: "Valencia", fecha: "2026-02-25", estado: "Completado" },
  ];
}

export async function cargarPortes() {
  const data = JSON.parse(localStorage.getItem("portes") || "[]");
  return data;
}
