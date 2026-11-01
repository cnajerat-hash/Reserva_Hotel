class ErrorDeNegocio extends Error {
    codigo: string

    constructor(codigo: string, mensaje: string) {
        super(mensaje)
        this.codigo = codigo
    }
}

interface PeriodoReserva {
    fecha_inicio: string | Date
    fecha_fin: string | Date | null
}

function convertirFecha(fecha: string | Date) {
    if (fecha instanceof Date) return fecha.getTime()

    const valor = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ? `${fecha}T00:00:00.000Z`
        : fecha
    return Date.parse(valor)
}

function validarDatosReserva(
    id_habitacion: number,
    nombre_cliente: string,
    fecha_inicio: string,
    fecha_fin: string,
) {
    if (!Number.isSafeInteger(id_habitacion) || id_habitacion <= 0
        || !nombre_cliente.trim() || !fecha_inicio || !fecha_fin) {
        throw new ErrorDeNegocio('DATOS_INCOMPLETOS', 'Todos los campos de la reserva son obligatorios.')
    }
}

function validarDisponibilidad(
    fecha_inicio: string,
    fecha_fin: string,
    reservas: readonly PeriodoReserva[],
) {
    const fechaInicio = convertirFecha(fecha_inicio)
    const fechaFin = convertirFecha(fecha_fin)

    if (!Number.isFinite(fechaInicio) || !Number.isFinite(fechaFin) || fechaFin <= fechaInicio) {
        throw new ErrorDeNegocio('FECHAS_INVALIDAS', 'La fecha de salida debe ser posterior a la fecha de entrada.')
    }

    for (const reserva of reservas) {
        const reservaInicio = convertirFecha(reserva.fecha_inicio)
        const reservaFin = reserva.fecha_fin === null
            ? Number.POSITIVE_INFINITY
            : convertirFecha(reserva.fecha_fin)

        if (fechaInicio < reservaFin && fechaFin > reservaInicio) {
            throw new ErrorDeNegocio(
                'HABITACION_NO_DISPONIBLE',
                'La habitación ya tiene una reserva en esas fechas.',
            )
        }
    }
}

export { ErrorDeNegocio, validarDatosReserva, validarDisponibilidad }
