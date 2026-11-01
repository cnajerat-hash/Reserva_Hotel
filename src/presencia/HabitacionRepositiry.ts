import pool from './db.ts'
import { ErrorDeNegocio, validarDisponibilidad } from '../dominio/ReglasAgenda.ts'

type FiltroHabitaciones = 'libres' | 'no-libres' | 'todas'

async function getHabitaciones(filtroEstado: FiltroHabitaciones = 'todas') {
    const filtro = filtroEstado === 'libres'
        ? "WHERE lower(btrim(COALESCE(estado, ''))) = 'libre'"
        : filtroEstado === 'no-libres'
            ? "WHERE lower(btrim(COALESCE(estado, ''))) <> 'libre'"
            : ''
    const query = `
        SELECT id_habitacion, numero, tipo, capacidad, piso, vista, precio_noche, estado
        FROM "Habitaciones"
        ${filtro}
        ORDER BY numero
    `
    const result = await pool.query(query)
    return result.rows
}

async function getReservas() {
    const query = `
        SELECT
            r.id,
            r."id_Habitacion" AS id_habitacion,
            r."Huesped" AS huesped,
            r.fecha_inicio,
            r.fecha_fin,
            r.created_at,
            h.numero AS numero_habitacion
        FROM "Reservas" r
        LEFT JOIN "Habitaciones" h ON h.id_habitacion = r."id_Habitacion"
        ORDER BY r.fecha_inicio DESC, r.id DESC
    `
    const result = await pool.query(query)
    return result.rows
}

async function cambiarEstadoHabitacion(id_habitacion: number, estado: string) {
    const query = `
        UPDATE "Habitaciones"
        SET estado = $2
        WHERE id_habitacion = $1
        RETURNING id_habitacion, numero, tipo, capacidad, piso, vista, precio_noche, estado
    `
    const result = await pool.query(query, [id_habitacion, estado])
    return result.rows[0] ?? null
}

interface DatosReserva {
    id_habitacion: number
    huesped: string
    fecha_inicio: string
    fecha_fin: string
}

async function crearReserva(datos: DatosReserva) {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const habitacion = await client.query(
            'SELECT id_habitacion, estado FROM "Habitaciones" WHERE id_habitacion = $1 FOR UPDATE',
            [datos.id_habitacion],
        )

        if (habitacion.rowCount === 0) {
            await client.query('ROLLBACK')
            return { resultado: 'no-encontrada' as const }
        }

        if (habitacion.rows[0].estado?.trim().toLocaleLowerCase() !== 'libre') {
            await client.query('ROLLBACK')
            return { resultado: 'no-libre' as const }
        }

        const reservasEnFechas = await client.query(
            `SELECT fecha_inicio, fecha_fin
             FROM "Reservas"
             WHERE "id_Habitacion" = $1
               AND fecha_inicio < $3::date
               AND COALESCE(fecha_fin, 'infinity'::date) > $2::date
             LIMIT 1`,
            [datos.id_habitacion, datos.fecha_inicio, datos.fecha_fin],
        )

        try {
            validarDisponibilidad(datos.fecha_inicio, datos.fecha_fin, reservasEnFechas.rows)
        } catch (error) {
            if (!(error instanceof ErrorDeNegocio) || error.codigo !== 'HABITACION_NO_DISPONIBLE') {
                throw error
            }

            await client.query('ROLLBACK')
            return { resultado: 'fechas-ocupadas' as const }
        }

        const reserva = await client.query(
            `INSERT INTO "Reservas" ("id_Habitacion", "Huesped", fecha_inicio, fecha_fin)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [datos.id_habitacion, datos.huesped, datos.fecha_inicio, datos.fecha_fin],
        )

        const habitacionActualizada = await client.query(
            `UPDATE "Habitaciones"
             SET estado = 'Ocupada'
             WHERE id_habitacion = $1
             RETURNING id_habitacion, numero, estado`,
            [datos.id_habitacion],
        )

        await client.query('COMMIT')

        return {
            resultado: 'creada' as const,
            reserva: {
                id: reserva.rows[0].id,
                habitacion: habitacionActualizada.rows[0],
                huesped: datos.huesped,
                fecha_inicio: datos.fecha_inicio,
                fecha_fin: datos.fecha_fin,
            },
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export { getHabitaciones, getReservas, cambiarEstadoHabitacion, crearReserva }