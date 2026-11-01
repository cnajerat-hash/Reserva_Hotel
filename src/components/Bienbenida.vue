<script setup lang="ts">

import { useRouter } from "vue-router"


const router = useRouter()

function toHabtacion() {
  router.push('/habitaciones')
}
</script>

<template>
  <main class="welcome">
    <div class="welcome-content">
      <h1>Bienvenido a la aplicación de reservas de hotel</h1>
      <p>Esta aplicación permite gestionar las reservas de habitaciones de un hotel.</p>
      <button @click="toHabtacion">Ir a habitaciones</button>
    </div>
  </main>
</template>
