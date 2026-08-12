<template>
  <div v-if="isAdmin" class="admin-bubble">
    <button class="bubble-button" @click="toggleMenu">
      ⚙️
    </button>

    <div v-if="menuAbierto" class="bubble-menu">
      <button @click="irA('Inicio')">Inicio (usuario)</button>
      <button @click="irA('Choferes')">Choferes</button>
      <button @click="irA('Admin')">Admin</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCurrentUser } from '../utilidades/auth.js'

const router = useRouter()
const route = useRoute()
const menuAbierto = ref(false)
const usuario = ref(null)

watch(() => route.fullPath, () => {
  // refrescar usuario al navegar (ej: login -> admin/inicio)
  usuario.value = getCurrentUser()
}, { immediate: true })

const isAdmin = computed(() => {
  const role = usuario.value?.profiles?.role ?? usuario.value?.role
  return role === 'admin'
})

function toggleMenu() {
  menuAbierto.value = !menuAbierto.value
}

function irA(nombreRuta) {
  menuAbierto.value = false
  router.push({ name: nombreRuta })
}
</script>


<style scoped>
.admin-bubble {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.bubble-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-color: #7EDB76;
  color: black;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.bubble-menu {
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.bubble-menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
}

.bubble-menu button:hover {
  background: #f0f0f0;
}
</style>
