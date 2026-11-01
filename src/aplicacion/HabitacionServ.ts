import { cambiarEstadoHabitacion, crearReserva as persistirReserva, getHabitaciones, getReservas } from '../presencia/HabitacionRepositiry.ts'
import { ErrorDeNegocio, validarDatosReserva } from '../dominio/ReglasAgenda.ts'

class ErrorValidacionHabitacion extends Error {}
class ErrorReserva extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

type FiltroHabitaciones = 'libres' | 'no-libres' | 'todas'

async function listarHabitaciones(filtro: FiltroHabitaciones = 'todas') {
    return getHabitaciones(filtro)
}

async function listarReservas() {
    return getReservas()
}

async function actualizarEstadoHabitacion(id: number, estado: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new ErrorValidacionHabitacion('El identificador de habitación no es válido.')
    }

    if (typeof estado !== 'string' || !estado.trim() || estado.trim().length > 50) {
        throw new ErrorValidacionHabitacion('El estado debe contener entre 1 y 50 caracteres.')
    }

    return cambiarEstadoHabitacion(id, estado.trim())
}

interface DatosReservaEntrada {
    id_habitacion: unknown
    huesped: unknown
    fecha_inicio: unknown
    fecha_fin: unknown
}

function esFechaValida(fecha: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false

    const [anio, mes, dia] = fecha.split('-').map(Number)
    const valor = new Date(Date.UTC(anio, mes - 1, dia))

    return valor.getUTCFullYear() === anio
        && valor.getUTCMonth() === mes - 1
        && valor.getUTCDate() === dia
}

async function reservarHabitacion(datos: DatosReservaEntrada) {
    const id = Number(datos.id_habitacion)
    if (typeof datos.huesped !== 'string' || !datos.huesped.trim() || datos.huesped.trim().length > 150) {
        throw new ErrorReserva('Escribe el nombre del huésped (máximo 150 caracteres).', 400)
    }

    if (typeof datos.fecha_inicio !== 'string' || typeof datos.fecha_fin !== 'string') {
        throw new ErrorReserva('Las fechas de entrada y salida deben ser válidas.', 400)
    }

    try {
        validarDatosReserva(id, datos.huesped, datos.fecha_inicio, datos.fecha_fin)
    } catch (error) {
        if (error instanceof ErrorDeNegocio) {
            throw new ErrorReserva(error.message, 400)
        }
        throw error
    }

    if (!esFechaValida(datos.fecha_inicio) || !esFechaValida(datos.fecha_fin)) {
        throw new ErrorReserva('Las fechas de entrada y salida deben ser válidas.', 400)
    }

    const hoy = new Date()
    const fechaActual = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, '0'),
        String(hoy.getDate()).padStart(2, '0'),
    ].join('-')

    if (datos.fecha_inicio < fechaActual) {
        throw new ErrorReserva('La fecha de entrada no puede ser anterior a hoy.', 400)
    }

    if (datos.fecha_fin <= datos.fecha_inicio) {
        throw new ErrorReserva('La fecha de salida debe ser posterior a la fecha de entrada.', 400)
    }

    const resultado = await persistirReserva({
        id_habitacion: id,
        huesped: datos.huesped.trim(),
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
    })

    if (resultado.resultado === 'no-encontrada') {
        throw new ErrorReserva('No se encontró la habitación seleccionada.', 404)
    }
    if (resultado.resultado === 'no-libre') {
        throw new ErrorReserva('La habitación ya no está disponible para reservar.', 409)
    }
    if (resultado.resultado === 'fechas-ocupadas') {
        throw new ErrorReserva('La habitación ya tiene una reserva en esas fechas.', 409)
    }

    return resultado.reserva
}

export { listarHabitaciones, listarReservas, actualizarEstadoHabitacion, reservarHabitacion, ErrorValidacionHabitacion, ErrorReserva }