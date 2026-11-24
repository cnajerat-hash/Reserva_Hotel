import pool from './db.ts'
import {
    ErrorDeNegocio,
    validarNoEliminarReservaEnCurso,
    validarNoEliminarReservaFinalizada,
} from '../dominio/ReglasAgenda.ts'

type CampoFechaReserva = 'fecha_inicio' | 'fecha_fin'

function normalizarFecha(fecha: unknown): string | null | undefined {
    if (fecha === null) return null
    if (fecha instanceof Date) {
        return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString().slice(0, 10)
    }
    if (typeof fecha === 'string') {
        const valor = fecha.slice(0, 10)
        return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined
    }
    return undefined
}

async function actualizarFechaReserva(
    id: number,
    fecha: string,
    campo: CampoFechaReserva,
) {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const reservaResult = await client.query(
            `SELECT id, "id_Habitacion" AS id_habitacion, fecha_inicio, fecha_fin
             FROM "Reservas"
             WHERE id = $1
             FOR UPDATE`,
            [id],
        )

        if (reservaResult.rowCount === 0) {
            await client.query('ROLLBACK')
            return { resultado: 'no-encontrada' as const }
        }

        const reserva = reservaResult.rows[0]
        const habitacion = await client.query(
            'SELECT id_habitacion FROM "Habitaciones" WHERE id_habitacion = $1 FOR UPDATE',
            [reserva.id_habitacion],
        )

        if (habitacion.rowCount === 0) {
            await client.query('ROLLBACK')
            return { resultado: 'no-encontrada' as const }
        }

        const fechaInicioActual = normalizarFecha(reserva.fecha_inicio)
        const fechaFinActual = normalizarFecha(reserva.fecha_fin)
        const fechaInicio = campo === 'fecha_inicio' ? fecha : fechaInicioActual
        const fechaFin = campo === 'fecha_fin' ? fecha : fechaFinActual

        if (typeof fechaInicio !== 'string'
            || fechaFin === undefined
            || (fechaFin !== null && fechaFin <= fechaInicio)) {
            await client.query('ROLLBACK')
            return { resultado: 'fechas-invalidas' as const }
        }

        const conflicto = await client.query(
            `SELECT id
             FROM "Reservas"
             WHERE "id_Habitacion" = $1
               AND id <> $2
               AND fecha_inicio < COALESCE($3::date, 'infinity'::date)
               AND COALESCE(fecha_fin, 'infinity'::date) > $4::date
             LIMIT 1`,
            [reserva.id_habitacion, id, fechaFin, fechaInicio],
        )

        if (conflicto.rowCount !== 0) {
            await client.query('ROLLBACK')
            return { resultado: 'fechas-ocupadas' as const }
        }

        const actualizada = await client.query(
            `UPDATE "Reservas"
             SET ${campo} = $2
             WHERE id = $1
             RETURNING id, "id_Habitacion" AS id_habitacion, fecha_inicio, fecha_fin`,
            [id, fecha],
        )

        await client.query('COMMIT')
        return { resultado: 'actualizada' as const, reserva: actualizada.rows[0] }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

function actualizarFechaEntrada(id: number, fecha: string) {
    return actualizarFechaReserva(id, fecha, 'fecha_inicio')
}

function actualizarFechaSalida(id: number, fecha: string) {
    return actualizarFechaReserva(id, fecha, 'fecha_fin')
}

async function eliminarReserva(id: number) {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const reservaResult = await client.query(
            `SELECT id, "id_Habitacion" AS id_habitacion, fecha_inicio, fecha_fin
             FROM "Reservas"
             WHERE id = $1
             FOR UPDATE`,
            [id],
        )

        if (reservaResult.rowCount === 0) {
            await client.query('ROLLBACK')
            return { resultado: 'no-encontrada' as const }
        }

        const reserva = reservaResult.rows[0]
        const habitacion = await client.query(
            'SELECT id_habitacion FROM "Habitaciones" WHERE id_habitacion = $1 FOR UPDATE',
            [reserva.id_habitacion],
        )

        if (habitacion.rowCount === 0) {
            await client.query('ROLLBACK')
            return { resultado: 'no-encontrada' as const }
        }

        try {
            validarNoEliminarReservaEnCurso(reserva.fecha_inicio, reserva.fecha_fin)
            validarNoEliminarReservaFinalizada(reserva.fecha_inicio, reserva.fecha_fin)
        } catch (error) {
            if (!(error instanceof ErrorDeNegocio)
                || (error.codigo !== 'RESERVA_EN_CURSO' && error.codigo !== 'RESERVA_FINALIZADA')) {
                throw error
            }

            await client.query('ROLLBACK')
            return error.codigo === 'RESERVA_EN_CURSO'
                ? { resultado: 'en-curso' as const }
                : { resultado: 'finalizada' as const }
        }

        await client.query('DELETE FROM "Reservas" WHERE id = $1', [id])
        await client.query(
            `UPDATE "Habitaciones"
             SET estado = 'Libre'
             WHERE id_habitacion = $1`,
            [reserva.id_habitacion],
        )

        await client.query('COMMIT')
        return { resultado: 'eliminada' as const }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export { actualizarFechaEntrada, actualizarFechaSalida, eliminarReserva }