import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositorio = vi.hoisted(() => ({
    actualizarFechaEntrada: vi.fn(),
    actualizarFechaSalida: vi.fn(),
    eliminarReserva: vi.fn(),
}))

vi.mock('../src/presencia/ReservasRepository.ts', () => repositorio)

import { editarFechaEntrada, editarFechaSalida, eliminarReserva } from '../src/aplicacion/ReservasServ.ts'

describe('ReservasServ', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('actualiza la fecha de entrada', async () => {
        const reserva = { id: 8, fecha_inicio: '2099-05-10', fecha_fin: '2099-05-12' }
        repositorio.actualizarFechaEntrada.mockResolvedValue({ resultado: 'actualizada', reserva })

        await expect(editarFechaEntrada('8', '2099-05-10')).resolves.toEqual(reserva)
        expect(repositorio.actualizarFechaEntrada).toHaveBeenCalledWith(8, '2099-05-10')
    })

    it('actualiza la fecha de salida', async () => {
        const reserva = { id: 8, fecha_inicio: '2099-05-10', fecha_fin: '2099-05-13' }
        repositorio.actualizarFechaSalida.mockResolvedValue({ resultado: 'actualizada', reserva })

        await expect(editarFechaSalida(8, '2099-05-13')).resolves.toEqual(reserva)
        expect(repositorio.actualizarFechaSalida).toHaveBeenCalledWith(8, '2099-05-13')
    })

    it('rechaza fechas inválidas sin consultar el repositorio', async () => {
        await expect(editarFechaEntrada(8, '2026-02-30')).rejects.toMatchObject({
            message: 'La fecha de entrada debe ser válida.',
            status: 400,
        })
        expect(repositorio.actualizarFechaEntrada).not.toHaveBeenCalled()
    })

    it('reporta conflictos de disponibilidad', async () => {
        repositorio.actualizarFechaSalida.mockResolvedValue({ resultado: 'fechas-ocupadas' })

        await expect(editarFechaSalida(8, '2099-05-13')).rejects.toMatchObject({
            message: 'La habitación ya tiene una reserva en esas fechas.',
            status: 409,
        })
    })

    it('elimina una reserva', async () => {
        repositorio.eliminarReserva.mockResolvedValue({ resultado: 'eliminada' })

        await expect(eliminarReserva('8')).resolves.toBeUndefined()
        expect(repositorio.eliminarReserva).toHaveBeenCalledWith(8)
    })

    it('rechaza eliminar una reserva en curso', async () => {
        repositorio.eliminarReserva.mockResolvedValue({ resultado: 'en-curso' })

        await expect(eliminarReserva(8)).rejects.toMatchObject({
            message: 'No se puede eliminar una reserva que ya está en curso.',
            status: 409,
        })
    })

    it('rechaza eliminar una reserva finalizada', async () => {
        repositorio.eliminarReserva.mockResolvedValue({ resultado: 'finalizada' })

        await expect(eliminarReserva(8)).rejects.toMatchObject({
            message: 'No se puede eliminar una reserva finalizada.',
            status: 409,
        })
    })
})
