import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositorio = vi.hoisted(() => ({
    getHabitaciones: vi.fn(),
    getReservas: vi.fn(),
    cambiarEstadoHabitacion: vi.fn(),
    crearReserva: vi.fn(),
}))

const reglas = vi.hoisted(() => ({
    validarDatosReserva: vi.fn(),
}))

vi.mock('../src/presencia/HabitacionRepositiry.ts', () => repositorio)

vi.mock('../src/dominio/ReglasAgenda.ts', () => {
    class ErrorDeNegocio extends Error {
        codigo: string

        constructor(codigo: string, mensaje: string) {
            super(mensaje)
            this.codigo = codigo
        }
    }

    return {
        ErrorDeNegocio,
        validarDatosReserva: reglas.validarDatosReserva,
    }
})

import {
    actualizarEstadoHabitacion,
    ErrorReserva,
    ErrorValidacionHabitacion,
    listarHabitaciones,
    listarReservas,
    reservarHabitacion,
} from '../src/aplicacion/HabitacionServ.ts'
import { ErrorDeNegocio } from '../src/dominio/ReglasAgenda.ts'

describe('HabitacionServ', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it('lista habitaciones con el filtro solicitado', async () => {
        const habitaciones = [{ id_habitacion: 1, numero: '101' }]
        repositorio.getHabitaciones.mockResolvedValue(habitaciones)

        await expect(listarHabitaciones('libres')).resolves.toEqual(habitaciones)
        expect(repositorio.getHabitaciones).toHaveBeenCalledWith('libres')
    })

    it('lista todas las habitaciones por defecto', async () => {
        repositorio.getHabitaciones.mockResolvedValue([])

        await listarHabitaciones()

        expect(repositorio.getHabitaciones).toHaveBeenCalledWith('todas')
    })

    it('lista las reservas', async () => {
        const reservas = [{ id: 7, huesped: 'Ana' }]
        repositorio.getReservas.mockResolvedValue(reservas)

        await expect(listarReservas()).resolves.toEqual(reservas)
    })

    it('actualiza el estado después de normalizarlo', async () => {
        const habitacion = { id_habitacion: 3, estado: 'Libre' }
        repositorio.cambiarEstadoHabitacion.mockResolvedValue(habitacion)

        await expect(actualizarEstadoHabitacion(3, '  Libre  ')).resolves.toEqual(habitacion)
        expect(repositorio.cambiarEstadoHabitacion).toHaveBeenCalledWith(3, 'Libre')
    })

    it('rechaza identificadores inválidos al actualizar', async () => {
        await expect(actualizarEstadoHabitacion(0, 'Libre')).rejects.toBeInstanceOf(ErrorValidacionHabitacion)
        await expect(actualizarEstadoHabitacion(1.5, 'Libre')).rejects.toThrow(
            'El identificador de habitación no es válido.',
        )
        expect(repositorio.cambiarEstadoHabitacion).not.toHaveBeenCalled()
    })

    it('rechaza estados vacíos o demasiado largos', async () => {
        await expect(actualizarEstadoHabitacion(1, '   ')).rejects.toThrow(
            'El estado debe contener entre 1 y 50 caracteres.',
        )
        await expect(actualizarEstadoHabitacion(1, 'x'.repeat(51))).rejects.toBeInstanceOf(
            ErrorValidacionHabitacion,
        )
    })

    it('crea una reserva válida', async () => {
        const reserva = {
            id: 12,
            habitacion: { id_habitacion: 2, numero: 202, estado: 'Ocupada' },
            huesped: 'Ana',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        }
        repositorio.crearReserva.mockResolvedValue({ resultado: 'creada', reserva })

        await expect(reservarHabitacion({
            id_habitacion: '2',
            huesped: '  Ana  ',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        })).resolves.toEqual(reserva)

        expect(reglas.validarDatosReserva).toHaveBeenCalledWith(
            2,
            '  Ana  ',
            '2099-05-10',
            '2099-05-12',
        )
        expect(repositorio.crearReserva).toHaveBeenCalledWith({
            id_habitacion: 2,
            huesped: 'Ana',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        })
    })

    it('rechaza huéspedes vacíos', async () => {
        await expect(reservarHabitacion({
            id_habitacion: 2,
            huesped: ' ',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        })).rejects.toMatchObject({
            message: 'Escribe el nombre del huésped (máximo 150 caracteres).',
            status: 400,
        })
    })

    it('convierte errores de negocio en ErrorReserva con estado 400', async () => {
        reglas.validarDatosReserva.mockImplementation(() => {
            throw new ErrorDeNegocio('DATOS_INCOMPLETOS', 'Todos los campos de la reserva son obligatorios.')
        })

        await expect(reservarHabitacion({
            id_habitacion: 0,
            huesped: 'Ana',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        })).rejects.toMatchObject({
            message: 'Todos los campos de la reserva son obligatorios.',
            status: 400,
        } satisfies Partial<ErrorReserva>)
    })

    it('rechaza fechas reales inválidas', async () => {
        await expect(reservarHabitacion({
            id_habitacion: 2,
            huesped: 'Ana',
            fecha_inicio: '2026-02-30',
            fecha_fin: '2099-05-12',
        })).rejects.toMatchObject({
            message: 'Las fechas de entrada y salida deben ser válidas.',
            status: 400,
        })
    })

    it('rechaza una salida que no es posterior a la entrada', async () => {
        await expect(reservarHabitacion({
            id_habitacion: 2,
            huesped: 'Ana',
            fecha_inicio: '2099-05-12',
            fecha_fin: '2099-05-12',
        })).rejects.toMatchObject({
            message: 'La fecha de salida debe ser posterior a la fecha de entrada.',
            status: 400,
        })
    })

    it.each([
        ['no-encontrada', 'No se encontró la habitación seleccionada.', 404],
        ['no-libre', 'La habitación ya no está disponible para reservar.', 409],
        ['fechas-ocupadas', 'La habitación ya tiene una reserva en esas fechas.', 409],
    ] as const)('maneja el resultado %s del repositorio', async (resultado, mensaje, status) => {
        repositorio.crearReserva.mockResolvedValue({ resultado })

        await expect(reservarHabitacion({
            id_habitacion: 2,
            huesped: 'Ana',
            fecha_inicio: '2099-05-10',
            fecha_fin: '2099-05-12',
        })).rejects.toMatchObject({ message: mensaje, status })
    })
})