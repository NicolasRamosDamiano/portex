<template>
  <div class="login-container">
    <div class="logo-container">
      <img class="logo" src="/assets/Portexlogo.JPG" alt="Portex logo" />
    </div>

    <h1 class="title">Inicio de Sesión</h1>

    <div class="form-wrapper">
      <div class="input-group">
        <label class="input-label">Email</label>
        <input v-model="email" type="email" class="styled-input" placeholder="Introduce tu email" @keyup.enter="login" />
      </div>

      <div class="input-group">
        <label class="input-label">Contraseña</label>
        <div class="password-wrapper">
          <input :type="mostrarPassword ? 'text' : 'password'" v-model="password" class="styled-input" placeholder="Introduce tu contraseña" @keyup.enter="login" />
          <button type="button" class="toggle-password" @click="mostrarPassword = !mostrarPassword">👁</button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <button class="primary-button" @click="login">
        Iniciar Sesión
      </button>

      <button class="secondary-button" @click="irARegistrarse">
        Registrarse
      </button>

      <div class="contact-section">
        <p>Contáctanos:</p>
        <a href="tel:+34912345678" class="phone-number">+34 912 345 678</a>
      </div>
    </div>

    <div class="geometric-footer">
      <div class="triangle-black-left"></div>
      <div class="triangle-green-center"></div>
      <div class="triangle-black-right"></div>
    </div>
  </div>
</template>

<script>
import { loginUser } from '../utilidades/auth.js'

export default {
  name: 'PortexHome',

  data() {
    return {
      email: '',
      password: '',
      mostrarPassword: false,
      error: '',
      cargando: false,
    }
  },

  methods: {
    async login() {
      this.error = ''
      this.cargando = true

      if (!this.email.trim()) {
        this.error = 'Por favor ingresa tu email'
        this.cargando = false
        return
      }

      if (!this.password.trim()) {
        this.error = 'Por favor ingresa tu contraseña'
        this.cargando = false
        return
      }

      // 👇 ahora loginUser es async (Supabase)
      const currentUser = await loginUser(this.email, this.password)

      this.cargando = false

      if (currentUser) {
        if (currentUser.role === 'admin') {
          this.$router.push({ name: 'Admin' })
        } else if (currentUser.role === 'driver') {
          this.$router.push({ name: 'Choferes' })
        } else if (currentUser.role === 'user' || currentUser.role === 'client') {
          this.$router.push({ name: 'Inicio' })
        } else {
          // rol desconocido
          this.$router.push({ name: 'Inicio' })
        }
      } else {
        this.error = 'Email o contraseña incorrectos'
      }
    },

    irARegistrarse() {
      this.$router.push({ name: 'Register' })
    },
  },
}
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');

:root {
  --portex-green: #7EDB76;
  --portex-black: #000000;
  --portex-white: #ffffff;
}

.login-container {
  font-family: 'Montserrat', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  background-color: white;
  padding-top: 40px;
  position: relative;
  overflow: hidden;
}

.logo-container {
  margin-bottom: 20px;
}

.logo {
  max-width: 200px;
  height: auto;
}

.title {
  font-weight: 800;
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
  gap: 15px;
}

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
  box-sizing: border-box;
}

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

.error-message {
  background-color: #ff6b6b;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  margin-bottom: 15px;
  text-align: center;
  font-weight: 600;
}

.primary-button {
  width: 100%;
  padding: 15px;
  background-color: #7EDB76;
  border: 2px solid black;
  border-radius: 30px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  color: black;
  cursor: pointer;
  box-shadow: 0 4px 0 rgba(0,0,0,0.1);
  transition: transform 0.1s ease;
  margin-bottom: 10px;
  margin-top: 25px;
}

.primary-button:active {
  transform: translateY(2px);
  box-shadow: none;
}

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

.geometric-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35vh;
  z-index: 1;
  pointer-events: none;
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
  background-color: white;
  border: 2px solid black;
  border-radius: 30px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  color: black;
  cursor: pointer;
  margin-top: 8px;
}
</style>
