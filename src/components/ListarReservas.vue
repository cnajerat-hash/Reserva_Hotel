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

      <p v-if="error && !reservaEnEdicion" class="error-message" role="alert">{{ error }}</p>
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
            <div class="reservation-actions">
              <button
                class="cancel-button"
                type="button"
                :disabled="cargando || eliminandoId !== null || guardandoCampo !== null"
                @click="abrirEdicion(reserva)"
              >
                Editar fechas
              </button>
              <button
                class="cancel-button"
                type="button"
                :disabled="cargando || eliminandoId !== null || guardandoCampo !== null"
                @click="eliminarReserva(reserva)"
              >
                {{ eliminandoId === String(reserva.id) ? 'Eliminando…' : 'Eliminar reserva' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div
      v-if="reservaEnEdicion && fechasEditadas"
      class="modal-backdrop"
      @click.self="cerrarEdicion"
    >
      <section
        class="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-reservation-title"
      >
        <header class="modal-heading">
          <div>
            <p class="eyebrow">RESERVA #{{ reservaEnEdicion.id }}</p>
            <h2 id="edit-reservation-title">Editar fechas</h2>
          </div>
          <button
            class="close-button"
            type="button"
            aria-label="Cerrar"
            :disabled="guardandoCampo !== null"
            @click="cerrarEdicion"
          >
            ×
          </button>
        </header>

        <div class="booking-form">
          <div class="date-fields">
            <label>
              Fecha de entrada
              <input v-model="fechasEditadas.fecha_inicio" type="date" required>
            </label>
            <label>
              Fecha de salida
              <input v-model="fechasEditadas.fecha_fin" type="date" required>
            </label>
          </div>
        </div>

        <p v-if="error" class="error-message" role="alert">{{ error }}</p>

        <div class="modal-actions">
          <button
            class="book-button"
            type="button"
            :disabled="guardandoCampo !== null"
            @click="guardarFecha(reservaEnEdicion, 'fecha_inicio')"
          >
            {{ guardandoCampo === 'fecha_inicio' ? 'Guardando…' : 'Guardar entrada' }}
          </button>
          <button
            class="book-button"
            type="button"
            :disabled="guardandoCampo !== null || !fechasEditadas.fecha_fin"
            @click="guardarFecha(reservaEnEdicion, 'fecha_fin')"
          >
            {{ guardandoCampo === 'fecha_fin' ? 'Guardando…' : 'Guardar salida' }}
          </button>
          <button
            class="cancel-button"
            type="button"
            :disabled="guardandoCampo !== null"
            @click="cerrarEdicion"
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
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
const eliminandoId = ref<string | null>(null)
const reservaEnEdicion = ref<Reserva | null>(null)
const fechasEditadas = ref<{ fecha_inicio: string; fecha_fin: string } | null>(null)
const guardandoCampo = ref<'fecha_inicio' | 'fecha_fin' | null>(null)

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

async function eliminarReserva(reserva: Reserva) {
  if (eliminandoId.value !== null) return
  if (!window.confirm(`¿Eliminar la reserva #${reserva.id}?`)) return

  eliminandoId.value = String(reserva.id)
  error.value = ''

  try {
    const response = await fetch(`/api/reservas/${encodeURIComponent(reserva.id)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'No se pudo eliminar la reserva.')
    }

    reservas.value = reservas.value.filter((item) => item.id !== reserva.id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo eliminar la reserva.'
  } finally {
    eliminandoId.value = null
  }
}

function abrirEdicion(reserva: Reserva) {
  reservaEnEdicion.value = reserva
  fechasEditadas.value = {
    fecha_inicio: fechaParaInput(reserva.fecha_inicio),
    fecha_fin: fechaParaInput(reserva.fecha_fin),
  }
  error.value = ''
}

function cerrarEdicion() {
  if (guardandoCampo.value !== null) return
  reservaEnEdicion.value = null
  fechasEditadas.value = null
  error.value = ''
}

async function guardarFecha(reserva: Reserva, campo: 'fecha_inicio' | 'fecha_fin') {
  const fechas = fechasEditadas.value
  if (!fechas || reservaEnEdicion.value?.id !== reserva.id) return

  const fecha = fechas[campo]
  if (!fecha) {
    error.value = campo === 'fecha_inicio'
      ? 'Selecciona una fecha de entrada.'
      : 'Selecciona una fecha de salida.'
    return
  }

  guardandoCampo.value = campo
  error.value = ''

  try {
    const nombreCampo = campo === 'fecha_inicio' ? 'fecha-entrada' : 'fecha-salida'
    const response = await fetch(`/api/reservas/${encodeURIComponent(reserva.id)}/${nombreCampo}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'No se pudo actualizar la fecha.')
    }

    reserva[campo] = fecha
    fechas[campo] = fecha
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo actualizar la fecha.'
  } finally {
    guardandoCampo.value = null
  }
}

function fechaParaInput(valor: string | null) {
  return valor ? valor.slice(0, 10) : ''
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
