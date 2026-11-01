import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { actualizarEstadoHabitacion, ErrorReserva, ErrorValidacionHabitacion, listarHabitaciones, listarReservas, reservarHabitacion } from '../src/aplicacion/HabitacionServ.ts'
import pool from '../src/presencia/db.ts'

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(express.json({ limit: '16kb' }))

app.get('/api/habitaciones', async (request, response, next) => {
    try {
        const estado = request.query.estado
        if (estado !== undefined && estado !== 'libres' && estado !== 'no-libres') {
            response.status(400).json({ error: 'El filtro de estado no es válido.' })
            return
        }

        const habitaciones = await listarHabitaciones(estado ?? 'todas')
        response.json(habitaciones)
    } catch (error) {
        next(error)
    }
})

app.get('/api/reservas', async (_request, response, next) => {
    try {
        response.json(await listarReservas())
    } catch (error) {
        next(error)
    }
})

app.post('/api/reservas', async (request, response, next) => {
    try {
        const reserva = await reservarHabitacion(request.body ?? {})
        response.status(201).json(reserva)
    } catch (error) {
        next(error)
    }
})

app.patch('/api/habitaciones/:id/estado', async (request, response, next) => {
    try {
        const id = Number(request.params.id)
        const habitacion = await actualizarEstadoHabitacion(id, request.body?.estado)

        if (!habitacion) {
            response.status(404).json({ error: 'No se encontró la habitación.' })
            return
        }

        response.json(habitacion)
    } catch (error) {
        next(error)
    }
})

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ErrorReserva) {
        response.status(error.status).json({ error: error.message })
        return
    }

    if (error instanceof ErrorValidacionHabitacion) {
        response.status(400).json({ error: error.message })
        return
    }

    console.error('Error al procesar la solicitud:', error)
    response.status(500).json({ error: 'No se pudo completar la operación. Inténtalo de nuevo.' })
})

const distPath = resolve(process.cwd(), 'dist')
app.use(express.static(distPath))
app.use((request, response) => {
    const indexPath = resolve(distPath, 'index.html')
    if (!request.path.startsWith('/api/') && existsSync(indexPath)) {
        response.sendFile(indexPath)
        return
    }

    response.status(404).json({ error: 'No se encontró el recurso solicitado.' })
})

const server = app.listen(port, () => {
    console.log(`API disponible en http://localhost:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        server.close(() => {
            void pool.end().then(() => process.exit(0))
        })
    })
}
