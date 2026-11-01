<template>
  <main class="rooms-page">
    <header class="rooms-header">
      <div>
        <p class="eyebrow">ADMINISTRACIÓN DEL HOTEL</p>
        <h1>Habitaciones</h1>
        <p class="intro">Consulta y actualiza la disponibilidad de tus habitaciones.</p>
      </div>
      <div class="room-count" aria-live="polite">
        <strong>{{ habitaciones.length }}</strong>
        <span>{{ habitaciones.length === 1 ? 'habitación' : 'habitaciones' }} en la lista</span>
      </div>
    </header>

    <section class="room-panel" aria-label="Listado de habitaciones">
      <div class="toolbar">
        <div class="filters" aria-label="Filtrar habitaciones">
          <button
            v-for="opcion in filtros"
            :key="opcion.valor"
            type="button"
            :class="{ active: filtro === opcion.valor }"
            :aria-pressed="filtro === opcion.valor"
            @click="cambiarFiltro(opcion.valor)"
          >
            {{ opcion.texto }}
          </button>
        </div>
        <button class="refresh-button" type="button" :disabled="cargando" @click="cargarHabitaciones">
          {{ cargando ? 'Actualizando…' : 'Actualizar lista' }}
        </button>
        <router-link class="refresh-button" to="/reservas">Ver reservas</router-link>
      </div>

      <p v-if="mensaje" class="success-message" role="status">{{ mensaje }}</p>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <p v-if="cargando" class="empty-message" role="status">Cargando habitaciones…</p>
      <p v-else-if="!error && habitaciones.length === 0" class="empty-message">
        {{ textoSinHabitaciones }}
      </p>

      <div v-else-if="habitaciones.length > 0" class="rooms-grid">
        <article v-for="room in habitaciones" :key="room.id_habitacion" class="room-card">
          <div class="room-content">
            <div class="room-heading">
              <div>
                <p class="room-label">HABITACIÓN</p>
                <h2>{{ room.numero }}</h2>
              </div>
              <span class="status-badge" :class="estadoClase(room.estado)">{{ room.estado || 'Sin estado' }}</span>
            </div>

            <dl class="room-details">
              <div>
                <dt>Tipo</dt>
                <dd>{{ room.tipo }}</dd>
              </div>
              <div>
                <dt>Capacidad</dt>
                <dd>{{ room.capacidad }} {{ Number(room.capacidad) === 1 ? 'persona' : 'personas' }}</dd>
              </div>
              <div>
                <dt>Piso</dt>
                <dd>{{ room.piso }}</dd>
              </div>
              <div>
                <dt>Vista</dt>
                <dd>{{ room.vista }}</dd>
              </div>
            </dl>

            <div class="room-footer">
              <p class="price"><strong>{{ formatearPrecio(room.precio_noche) }}</strong> <span>/ noche</span></p>
              <button
                v-if="esLibre(room.estado)"
                class="book-button"
                type="button"
                :disabled="habitacionActualizando === room.id_habitacion"
                @click="abrirFormulario(room)"
              >
                Reservar
              </button>
            </div>
            <p v-if="habitacionActualizando === room.id_habitacion" class="updating-message" role="status">
              Guardando cambio…
            </p>
          </div>
        </article>
      </div>
    </section>

    <div v-if="habitacionSeleccionada" class="modal-backdrop" @click.self="cerrarFormulario">
      <section
        class="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <div class="modal-heading">
          <div>
            <p class="eyebrow">NUEVA RESERVA</p>
            <h2 id="booking-title">Habitación {{ habitacionSeleccionada.numero }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Cerrar formulario" @click="cerrarFormulario">×</button>
        </div>

        <form class="booking-form" @submit.prevent="crearReserva">
          <label>
            Nombre del huésped
            <input
              v-model="huesped"
              type="text"
              maxlength="150"
              autocomplete="name"
              required
              placeholder="Nombre completo"
            >
          </label>
          <div class="date-fields">
            <label>
              Fecha de entrada
              <input v-model="fechaInicio" type="date" :min="fechaMinima" required>
            </label>
            <label>
              Fecha de salida
              <input v-model="fechaFin" type="date" :min="fechaFinMinima" required>
            </label>
          </div>

          <p v-if="errorReserva" class="error-message" role="alert">{{ errorReserva }}</p>
          <div class="modal-actions">
            <button class="cancel-button" type="button" :disabled="reservando" @click="cerrarFormulario">
              Cancelar
            </button>
            <button class="book-button" type="submit" :disabled="reservando">
              {{ reservando ? 'Guardando…' : 'Confirmar reserva' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface Habitacion {
  id_habitacion: number | string
  numero: number | string
  tipo: string
  capacidad: number | string
  piso: number | string
  vista: string
  precio_noche: number | string
  estado: string | null
}

type Filtro = 'libres' | 'no-libres' | 'todas'

const filtros: { valor: Filtro; texto: string }[] = [
  { valor: 'libres', texto: 'Disponibles' },
  { valor: 'no-libres', texto: 'No libres' },
  { valor: 'todas', texto: 'Todas' },
]
const habitaciones = ref<Habitacion[]>([])
const filtro = ref<Filtro>('libres')
const cargando = ref(false)
const error = ref('')
const mensaje = ref('')
const habitacionActualizando = ref<number | string | null>(null)
const habitacionSeleccionada = ref<Habitacion | null>(null)
const huesped = ref('')
const fechaInicio = ref('')
const fechaFin = ref('')
const errorReserva = ref('')
const reservando = ref(false)

const fechaMinima = computed(() => fechaLocal(new Date()))
const fechaFinMinima = computed(() => fechaInicio.value ? sumarDia(fechaInicio.value) : fechaMinima.value)
const textoSinHabitaciones = computed(() => {
  if (filtro.value === 'libres') return 'No hay habitaciones disponibles para reservar.'
  if (filtro.value === 'no-libres') return 'No hay habitaciones ocupadas o con otro estado distinto de Libre.'
  return 'No hay habitaciones registradas.'
})

async function cargarHabitaciones() {
  cargando.value = true
  error.value = ''
  mensaje.value = ''

  try {
    const parametro = filtro.value === 'todas' ? '' : `?estado=${filtro.value}`
    const response = await fetch(`/api/habitaciones${parametro}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar las habitaciones.')
    }

    habitaciones.value = data as Habitacion[]
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar las habitaciones.'
    habitaciones.value = []
  } finally {
    cargando.value = false
  }
}

async function cambiarFiltro(nuevoFiltro: Filtro) {
  if (filtro.value === nuevoFiltro) return
  filtro.value = nuevoFiltro
  await cargarHabitaciones()
}

function abrirFormulario(room: Habitacion) {
  habitacionSeleccionada.value = room
  huesped.value = ''
  fechaInicio.value = fechaMinima.value
  fechaFin.value = sumarDia(fechaMinima.value)
  errorReserva.value = ''
}

function cerrarFormulario() {
  if (reservando.value) return
  habitacionSeleccionada.value = null
  errorReserva.value = ''
}

async function crearReserva() {
  const room = habitacionSeleccionada.value
  if (!room || reservando.value) return

  reservando.value = true
  errorReserva.value = ''
  error.value = ''
  mensaje.value = ''

  try {
    const response = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_habitacion: room.id_habitacion,
        huesped: huesped.value,
        fecha_inicio: fechaInicio.value,
        fecha_fin: fechaFin.value,
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar la reserva.')
    }

    habitacionSeleccionada.value = null
    await cargarHabitaciones()
    mensaje.value = `Reserva confirmada para la habitación ${room.numero}. Su estado cambió a Ocupada.`
    if (error.value) {
      error.value = 'La reserva se guardó, pero no se pudo actualizar la lista. Actualízala para ver los cambios.'
    }
  } catch (cause) {
    errorReserva.value = cause instanceof Error ? cause.message : 'No se pudo guardar la reserva.'
  } finally {
    reservando.value = false
  }
}


function estadoClase(estado: string | null) {
  return estado?.toLocaleLowerCase() === 'libre' ? 'status-free' : 'status-busy'
}

function esLibre(estado: string | null) {
  return estado?.trim().toLocaleLowerCase() === 'libre'
}

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function sumarDia(fecha: string) {
  const resultado = new Date(`${fecha}T00:00:00`)
  resultado.setDate(resultado.getDate() + 1)
  return fechaLocal(resultado)
}

function formatearPrecio(precio: number | string) {
  const valor = Number(precio)
  return Number.isFinite(valor)
    ? `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${precio}`
}

onMounted(() => {
  void cargarHabitaciones()
})
</script>

<style scoped src="./Habitaciones.css"></style>
