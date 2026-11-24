import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
    client: {
        query: vi.fn(),
        release: vi.fn(),
    },
    pool: {
        connect: vi.fn(),
    },
}))

vi.mock('../src/presencia/db.ts', () => ({ default: db.pool }))

import {
    actualizarFechaEntrada,
    actualizarFechaSalida,
} from '../src/presencia/ReservasRepository.ts'

function prepararConsultas() {
    db.pool.connect.mockResolvedValue(db.client)
    db.client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
            rowCount: 1,
            rows: [{
                id: 5,
                id_habitacion: 2,
                fecha_inicio: new Date('2026-11-23T00:00:00.000Z'),
                fecha_fin: new Date('2026-11-26T00:00:00.000Z'),
            }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id_habitacion: 2 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 5, fecha_inicio: '2026-11-24', fecha_fin: '2026-11-27' }],
        })
        .mockResolvedValueOnce({})
}

describe('ReservasRepository', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('actualiza la entrada cuando PostgreSQL devuelve fechas como Date', async () => {
        prepararConsultas()

        await expect(actualizarFechaEntrada(5, '2026-11-24')).resolves.toMatchObject({
            resultado: 'actualizada',
        })
        expect(db.client.query).toHaveBeenCalledTimes(6)
        expect(db.client.release).toHaveBeenCalledOnce()
    })

    it('actualiza la salida cuando PostgreSQL devuelve fechas como Date', async () => {
        prepararConsultas()

        await expect(actualizarFechaSalida(5, '2026-11-27')).resolves.toMatchObject({
            resultado: 'actualizada',
        })
        expect(db.client.query).toHaveBeenCalledTimes(6)
        expect(db.client.release).toHaveBeenCalledOnce()
    })
})
