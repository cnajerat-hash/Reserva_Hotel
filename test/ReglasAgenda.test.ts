import { describe, expect, it } from 'vitest'
import {
    ErrorDeNegocio,
    validarNoEliminarReservaEnCurso,
    validarNoEliminarReservaFinalizada,
} from '../src/dominio/ReglasAgenda.ts'

describe('validarNoEliminarReservaEnCurso', () => {
    it('impide eliminar una reserva que incluye la fecha actual', () => {
        expect(() => validarNoEliminarReservaEnCurso(
            '2026-11-20',
            '2026-11-25',
            '2026-11-23',
        )).toThrowError(expect.objectContaining({
            codigo: 'RESERVA_EN_CURSO',
        } satisfies Partial<ErrorDeNegocio>))
    })

    it.each(['2026-11-19'])(
        'permite eliminar una reserva si la fecha actual es %s',
        (fechaActual) => {
            expect(() => validarNoEliminarReservaEnCurso(
                '2026-11-20',
                '2026-11-25',
                fechaActual,
            )).not.toThrow()
        },
    )

    it('impide eliminar una reserva finalizada', () => {
        expect(() => validarNoEliminarReservaFinalizada(
            '2026-11-05',
            '2026-11-10',
            '2026-11-23',
        )).toThrowError(expect.objectContaining({
            codigo: 'RESERVA_FINALIZADA',
        } satisfies Partial<ErrorDeNegocio>))
    })

    it('permite eliminar una reserva cuya salida es hoy', () => {
        expect(() => validarNoEliminarReservaFinalizada(
            '2026-11-05',
            '2026-11-23',
            '2026-11-23',
        )).not.toThrow()
    })
})
