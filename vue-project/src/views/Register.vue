<template>
  <div class="login-container">
    <div class="logo-container">
      <img class="logo" src="/assets/Portexlogo.JPG" alt="Portex logo" />
    </div>

    <h1 class="title">Registarse</h1>

    <div class="form-wrapper">

      <!-- Nombre -->
      <div class="input-group">
        <label class="input-label">Nombre y Apellido</label>
        <input v-model="nombre" type="text" class="styled-input" placeholder="Introduce tu nombre completo"/>
      </div>

      <!-- Email -->
      <div class="input-group">
        <label class="input-label">Email</label>
        <input v-model="email" type="email" class="styled-input" placeholder="Introduce tu email"/>
      </div>

      <!-- Localización -->
      <div class="input-group">
        <label class="input-label">Localización</label>
        <input ref="inputLocalizacionRef" v-model="localizacion" type="text" class="styled-input" placeholder="Tu ciudad"/>
      </div>

      <!-- Contraseña -->
      <div class="password-wrapper">
        <label for="input-password" class="input-label">Contraseña</label>
        <input :type="mostrarPassword ? 'text' : 'password'" v-model="password" class="styled-input" placeholder="Contraseña"/>
        <button type="button" class="toggle-password" @click="mostrarPassword = !mostrarPassword">👁</button>
    </div>

      <!-- Repetir contraseña -->
      <div class="password-wrapper">
        <input :type="mostrarConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" class="styled-input" placeholder="Confirmar contraseña"/>
        <button type="button" class="toggle-password" @click="mostrarConfirmPassword = !mostrarConfirmPassword">👁</button>
    </div>

     <!-- Boton de confirmacion de registro -->

      <button class="primary-button" @click="handleRegister">
        Registrarse
      </button>

      <!-- Boton para volver al login -->

      <button class="secondary-button" @click="volverALogin">
        Volver al Login
      </button>

    </div>

    <div class="geometric-footer">
      <div class="triangle-black-left"></div>
      <div class="triangle-green-center"></div>
      <div class="triangle-black-right"></div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// 🔹 Variables reactivas
const nombre = ref("");
const email = ref("");
const localizacion = ref("");
const password = ref("");
const confirmPassword = ref("");
const mostrarPassword = ref(false);
const mostrarConfirmPassword = ref(false);

const inputLocalizacionRef = ref(null);

// 🔹 Google Autocomplete
onMounted(() => {
  if (typeof google !== "undefined" && google.maps && google.maps.places) {

    const autocompleteLocalizacion = new google.maps.places.Autocomplete(
      inputLocalizacionRef.value,
      {
        types: ["(cities)"],
        componentRestrictions: { country: "es" }
      }
    );

    autocompleteLocalizacion.addListener("place_changed", () => {
      const place = autocompleteLocalizacion.getPlace();
      if (place.formatted_address) {
        localizacion.value = place.formatted_address;
      }
    });

  } else {
    console.warn("Google Maps API no cargada");
  }
});

    function volverALogin() {
     router.push({ name: "Login" });
    };

// 🔹 Registro
import { registerUser } from "../utilidades/auth.js" // 👈 añade este import

// ...

// 🔹 Registro
async function handleRegister() {
  if (!nombre.value || !email.value || !password.value || !confirmPassword.value) {
    alert("Completa todos los campos")
    return
  }

  if (password.value.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres")
    return
  }

  if (password.value !== confirmPassword.value) {
    alert("Las contraseñas no coinciden")
    return
  }

  // Crear usuario en Supabase Auth
  const user = await registerUser(email.value, password.value, nombre.value)

  if (!user) {
    alert("Error al registrar. Revisa el email o intenta más tarde.")
    return
  }

  console.log("Usuario Supabase creado:", {
    id: user.id,
    email: user.email,
    nombre: nombre.value,
    localizacion: localizacion.value,
  })

  alert("Registro exitoso. Ahora puedes iniciar sesión.")
  router.push({ name: "Login" })
}

// 🔹 Reset
function resetForm() {
  nombre.value = ""
  email.value = ""
  localizacion.value = ""
  password.value = ""
  confirmPassword.value = ""
}

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');

:root {
  --portex-green: #7EDB76; /* Verde lima aproximado */
  --portex-black: #000000;
  --portex-white: #ffffff;
}

.login-container {
  font-family: 'Montserrat', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Empieza arriba */
  min-height: 100vh;
  background-color: white;
  padding-top: 40px;
  position: relative;
  overflow: hidden; /* Para que la decoraci贸n de abajo no rompa el scroll */
}

.logo-container {
  margin-bottom: 20px;
}

.logo {
  max-width: 200px;
  height: auto;
}

.title {
  font-weight: 800; /* Extra bold */
  text-transform: uppercase;
  font-size: 1.2rem;
  letter-spacing: 2px;
  margin-bottom: 30px;
  color: black;
  text-align: center;
}

.form-wrapper {
  width: 85%;
  max-width: 350px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 15px; /* 馃憟 controla TODO el espacio vertical */
}

/* Estilo para inputs y selects */
.input-group {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 5px;
  text-align: center;
}

.styled-input {
  width: 100%;
  padding: 15px;
  border: 2px solid black;
  border-radius: 30px;
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  background-color: white;
  outline: none;
  text-align: center;
  box-sizing: border-box; /* ESTO ES CLAVE */
}


/*Contrase帽a y boton de mostrar/ocultar*/
.password-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

/* Bot贸n Principal */
.primary-button {
  width: 100%;
  padding: 15px;
  background-color: #7EDB76; /* El color verde de la imagen */
  border: 2px solid black;
  border-radius: 30px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  color: black;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0,0,0,0.1); /* Sutil sombra */
  transition: transform 0.1s ease;
  margin-bottom: 10px;
  margin-top: 25px;
}

.primary-button:active {
  transform: translateY(2px);
  box-shadow: none;
}

/* Secci贸n de Contacto */
.contact-section {
  text-align: center;
  margin-top: 10px;
}

.contact-section p {
  margin: 0;
  font-weight: 600;
}

.phone-number {
  display: block;
  font-size: 1.2rem;
  font-weight: 800;
  color: black;
  text-decoration: none;
  margin-top: 5px;
}

/* --- DECORACI脫N GEOMÉTRICA (FOOTER) --- */
/* Esto imita los tri谩ngulos de la parte inferior de la imagen */
.geometric-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35vh; /* Ocupa el 35% inferior */
  z-index: 1;
  pointer-events: none; /* Para que no interfiera con clicks si hay algo */
}

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

/* Tri谩ngulos negros decorativos laterales */
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

.secondary-button {
  width: 100%;
  padding: 15px;
  background-color: white; /* Fondo blanco */
  border: 2px solid black;
  border-radius: 30px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  color: black;
  cursor: pointer;
  margin-top: 8px; /* Separaci贸n del otro bot贸n */
}

</style>