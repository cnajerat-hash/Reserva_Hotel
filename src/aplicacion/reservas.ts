import { getReservas } from '../presencia/HabitacionRepositiry'

async function listarReservas() {
    return getReservas()
}

export { listarReservas }

