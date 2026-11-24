import { ErrorReserva } from './Errores.ts'
import {
    actualizarFechaEntrada as persistirFechaEntrada,
    actualizarFechaSalida as persistirFechaSalida,
    eliminarReserva as persistirEliminacion,
} from '../presencia/ReservasRepository.ts'

function validarIdReserva(id: unknown) {
    const idReserva = Number(id)
    if (!Number.isSafeInteger(idReserva) || idReserva <= 0) {
        throw new ErrorReserva('El identificador de la reserva no es válido.', 400)
    }
    return idReserva
}

function validarFecha(fecha: unknown, etiqueta: string): asserts fecha is string {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        throw new ErrorReserva(`La fecha de ${etiqueta} debe ser válida.`, 400)
    }

    const [anio, mes, dia] = fecha.split('-').map(Number)
    const valor = new Date(Date.UTC(anio, mes - 1, dia))
    if (valor.getUTCFullYear() !== anio
        || valor.getUTCMonth() !== mes - 1
        || valor.getUTCDate() !== dia) {
        throw new ErrorReserva(`La fecha de ${etiqueta} debe ser válida.`, 400)
    }
}

function validarResultado(
    resultado: Awaited<ReturnType<typeof persistirFechaEntrada>>,
) {
    if (resultado.resultado === 'no-encontrada') {
        throw new ErrorReserva('No se encontró la reserva.', 404)
    }
    if (resultado.resultado === 'fechas-invalidas') {
        throw new ErrorReserva('La fecha de salida debe ser posterior a la fecha de entrada.', 400)
    }
    if (resultado.resultado === 'fechas-ocupadas') {
        throw new ErrorReserva('La habitación ya tiene una reserva en esas fechas.', 409)
    }
    return resultado.reserva
}

async function editarFechaEntrada(id: unknown, fecha: unknown) {
    const idReserva = validarIdReserva(id)
    validarFecha(fecha, 'entrada')

    const hoy = new Date()
    const fechaActual = [
        hoy.getFullYear(),
        String(hoy.getMonth() + 1).padStart(2, '0'),
        String(hoy.getDate()).padStart(2, '0'),
    ].join('-')

    if (fecha < fechaActual) {
        throw new ErrorReserva('La fecha de entrada no puede ser anterior a hoy.', 400)
    }

    return validarResultado(await persistirFechaEntrada(idReserva, fecha))
}

async function editarFechaSalida(id: unknown, fecha: unknown) {
    const idReserva = validarIdReserva(id)
    validarFecha(fecha, 'salida')
    return validarResultado(await persistirFechaSalida(idReserva, fecha))
}

async function eliminarReserva(id: unknown) {
    const resultado = await persistirEliminacion(validarIdReserva(id))
    if (resultado.resultado === 'no-encontrada') {
        throw new ErrorReserva('No se encontró la reserva.', 404)
    }
    if (resultado.resultado === 'en-curso') {
        throw new ErrorReserva('No se puede eliminar una reserva que ya está en curso.', 409)
    }
    if (resultado.resultado === 'finalizada') {
        throw new ErrorReserva('No se puede eliminar una reserva finalizada.', 409)
    }
}

export { editarFechaEntrada, editarFechaSalida, eliminarReserva }