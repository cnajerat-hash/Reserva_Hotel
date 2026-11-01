<template>
  <main class="rooms-page">
    <header class="rooms-header">
      <div>
        <p class="eyebrow">ADMINISTRACIÓN DEL HOTEL</p>
        <h1>Reservas</h1>
        <p class="intro">Consulta las reservas registradas y sus fechas de estancia.</p>
      </div>
      <div class="room-count" aria-live="polite">
        <strong>{{ reservas.length }}</strong>
        <span>{{ reservas.length === 1 ? 'reserva' : 'reservas' }} registradas</span>
      </div>
    </header>

    <section class="room-panel" aria-label="Listado de reservas">
      <div class="toolbar">
        <router-link class="refresh-button" to="/habitaciones">Volver a habitaciones</router-link>
        <button class="refresh-button" type="button" :disabled="cargando" @click="cargarReservas">
          {{ cargando ? 'Actualizando…' : 'Actualizar lista' }}
        </button>
      </div>

      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <p v-if="cargando" class="empty-message" role="status">Cargando reservas…</p>
      <p v-else-if="!error && reservas.length === 0" class="empty-message">
        Todavía no hay reservas registradas.
      </p>

      <div v-else-if="reservas.length > 0" class="rooms-grid">
        <article v-for="reserva in reservas" :key="reserva.id" class="room-card">
          <div class="room-content">
            <div class="room-heading">
              <div>
                <p class="room-label">RESERVA #{{ reserva.id }}</p>
                <h2>Habitación {{ reserva.numero_habitacion ?? reserva.id_habitacion }}</h2>
              </div>
              <span class="status-badge status-free">Registrada</span>
            </div>

            <dl class="room-details">
              <div>
                <dt>Huésped</dt>
                <dd>{{ reserva.huesped }}</dd>
              </div>
              <div>
                <dt>Entrada</dt>
                <dd>{{ formatearFecha(reserva.fecha_inicio) }}</dd>
              </div>
              <div>
                <dt>Salida</dt>
                <dd>{{ formatearFecha(reserva.fecha_fin) }}</dd>
              </div>
              <div>
                <dt>Creada</dt>
                <dd>{{ formatearFecha(reserva.created_at, true) }}</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Reserva {
  id: number | string
  id_habitacion: number | string
  numero_habitacion: number | string | null
  huesped: string
  fecha_inicio: string
  fecha_fin: string | null
  created_at: string
}

const reservas = ref<Reserva[]>([])
const cargando = ref(false)
const error = ref('')

async function cargarReservas() {
  cargando.value = true
  error.value = ''

  try {
    const response = await fetch('/api/reservas')
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar las reservas.')
    }

    reservas.value = data as Reserva[]
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar las reservas.'
    reservas.value = []
  } finally {
    cargando.value = false
  }
}

function formatearFecha(valor: string | null, incluirHora = false) {
  if (!valor) return 'Sin fecha'

  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const fecha = soloFecha ? new Date(`${valor}T00:00:00`) : new Date(valor)

  if (Number.isNaN(fecha.getTime())) return 'Fecha no válida'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    ...(incluirHora ? { timeStyle: 'short' as const } : {}),
  }).format(fecha)
}

onMounted(() => {
  void cargarReservas()
})
</script>

<style scoped src="./Habitaciones.css"></style>
