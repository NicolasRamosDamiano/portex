import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



// ============================================
// FUNCIONES PARA PORTES (TRIPS)
// ============================================

/**
 * Obtener todos los portes (trips) de la base de datos
 */
export async function obtenerPortes() {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        client_id,
        driver_id,
        origin_name,
        destination_name,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        status,
        created_at,
        client:profiles!fk_client(name, phone),
        driver:profiles!fk_driver(name, phone)
      `);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener portes:", error);
    return [];
  }
}

/**
 * Obtener un porte específico por ID
 */
export async function obtenerPortePorId(porteId) {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        client_id,
        driver_id,
        origin_name,
        destination_name,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        status,
        created_at,
        client:profiles!fk_client(name, phone),
        driver:profiles!fk_driver(name, phone),
        items:trip_items(
          id,
          quantity,
          item:items_catalog(name, category)
        )
      `)
      .eq("id", porteId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al obtener porte:", error);
    return null;
  }
}

/**
 * Obtener portes de un cliente específico
 */
export async function obtenerPortesCliente(clientId) {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("client_id", clientId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener portes del cliente:", error);
    return [];
  }
}

/**
 * Crear un nuevo porte
 */
export async function crearPorte(porteData) {
  try {
    const { data, error } = await supabase
      .from("trips")
      .insert([
        {
          client_id: porteData.client_id,
          origin_name: porteData.origin_name || null,
          destination_name: porteData.destination_name || null,
          origin_lat: porteData.origin_lat,
          origin_lng: porteData.origin_lng,
          destination_lat: porteData.destination_lat,
          destination_lng: porteData.destination_lng,
          status: porteData.status || "pending",
          price: porteData.price
        }
      ])
      .select();

    if (error) throw error;
    console.log("✅ Porte creado:", data);
    return data[0] || null;
  } catch (error) {
    console.error("❌ Error al crear porte:", error);
    return null;
  }
}

// ============================================
// FUNCIONES PARA CHOFERES (DRIVERS)
// ============================================

/**
 * Obtener todos los choferes
 */
export async function obtenerChoferes() {
  try {
    const { data: drivers, error: driversError } = await supabase
      .from("profiles")
      .select("id, name, phone, role, created_at")
      .eq("role", "driver");

    if (driversError) throw driversError;
    if (!drivers || drivers.length === 0) return [];

    const driverIds = drivers.map((driver) => driver.id);
    const { data: locations, error: locationsError } = await supabase
      .from("driver_locations")
      .select("driver_id, lat, lng, updated_at")
      .in("driver_id", driverIds);

    if (locationsError) throw locationsError;

    const locationByDriverId = new Map(
      (locations || []).map((location) => [location.driver_id, location])
    );

    return drivers.map((driver) => ({
      ...driver,
      location: locationByDriverId.get(driver.id) || null
    }));
  } catch (error) {
    console.error("Error al obtener choferes:", error);
    return [];
  }
}

/**
 * Obtener un chofer específico
 */
export async function obtenerChofer(driverId) {
  try {
    const { data: driver, error: driverError } = await supabase
      .from("profiles")
      .select("id, name, phone, role, created_at")
      .eq("id", driverId)
      .single();

    if (driverError) throw driverError;

    const { data: location, error: locationError } = await supabase
      .from("driver_locations")
      .select("driver_id, lat, lng, updated_at")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (locationError) throw locationError;

    return {
      ...driver,
      location: location || null
    };
  } catch (error) {
    console.error("Error al obtener chofer:", error);
    return null;
  }
}

/**
 * Actualizar ubicación del chofer
 */
export async function actualizarUbicacionChofer(driverId, lat, lng) {
  try {
    const { data, error } = await supabase
      .from("driver_locations")
      .upsert(
        { driver_id: driverId, lat, lng, updated_at: new Date() },
        { onConflict: "driver_id" }
      );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al actualizar ubicación:", error);
    return null;
  }
}

// ============================================
// FUNCIONES PARA PERFILES
// ============================================

/**
 * Obtener perfil del usuario actual (por ID)
 */
export async function obtenerPerfil(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return null;
  }
}

/**
 * Actualizar perfil del usuario
 */
export async function actualizarPerfil(userId, perfil) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update(perfil)
      .eq("id", userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return null;
  }
}

// ============================================
// SUSCRIPTORES EN TIEMPO REAL (Real-time)
// ============================================

/**
 * Escuchar cambios en tiempo real de portes
 */
export function escucharPortes(callback) {
  const subscription = supabase
    .from("trips")
    .on("*", (payload) => {
      callback(payload);
    })
    .subscribe();

  return subscription;
}

/**
 * Escuchar cambios en ubicación de choferes
 */
export function escucharUbicacionesChoferes(callback) {
  const subscription = supabase
    .from("driver_locations")
    .on("UPDATE", (payload) => {
      callback(payload);
    })
    .subscribe();

  return subscription;
}

/**
 * Eliminar un porte por ID
 */
export async function eliminarPortePorId(porteId) {
  try {
    const { data, error } = await supabase
      .from("trips")
      .delete()
      .eq("id", porteId)
      .select("id");

    if (error) throw error;

    // Con RLS puede devolver 0 filas borradas sin error.
    if (!data || data.length === 0) {
      console.warn("No se eliminó ningún porte. Revisar permisos RLS o ID:", porteId);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error al eliminar porte:", error);
    return false;
  }
}

/**
 * Actualizar estado de un porte (opcionalmente asignar chofer)
 */
export async function actualizarEstadoPorte(porteId, nuevoEstado, driverId = null) {
  try {
    const payload = { status: nuevoEstado };
    if (driverId) payload.driver_id = driverId;

    const { error } = await supabase
      .from("trips")
      .update(payload)
      .eq("id", porteId);

    if (error) throw error;

    // Verificamos el estado final con una lectura explícita.
    const { data: verificado, error: readError } = await supabase
      .from("trips")
      .select("id, status, driver_id")
      .eq("id", porteId)
      .maybeSingle();

    if (readError) throw readError;
    if (!verificado) return null;
    if (verificado.status !== nuevoEstado) return null;

    return verificado;
  } catch (error) {
    console.error("Error al actualizar estado del porte:", error);
    return null;
  }
}

/**
 * Obtener todos los portes visibles para choferes (sin filtro por cliente)
 */
export async function obtenerPortesParaChofer() {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        id,
        client_id,
        driver_id,
        origin_name,
        destination_name,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        status,
        created_at,
        price,
        client:profiles!fk_client(name, phone),
        driver:profiles!fk_driver(name, phone)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener portes para chofer:", error);
    return [];
  }
}
