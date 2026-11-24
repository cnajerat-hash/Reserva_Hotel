# Pruebas

Las pruebas usan Vitest y se ejecutan desde la raiz del proyecto con:

```bash
npm test
```

## Casos cubiertos

### `HabitacionServ.test.ts`

Prueba el servicio de habitaciones y reservas:

- Lista habitaciones usando el filtro solicitado o el filtro predeterminado.
- Lista las reservas.
- Normaliza y valida los cambios de estado de una habitacion.
- Crea reservas validas, normaliza el nombre del huesped y valida los datos.
- Rechaza huespedes vacios, fechas invalidas y salidas que no sean posteriores a la entrada.
- Convierte los resultados de habitacion inexistente, no disponible o fechas ocupadas en errores con el estado HTTP correspondiente.

El repositorio y la regla de validacion se simulan para probar el comportamiento del servicio sin conectarse a PostgreSQL.

### `ReservasServ.test.ts`

Prueba las operaciones de fechas y eliminacion:

- Actualiza las fechas de entrada y salida.
- Rechaza fechas invalidas antes de llamar al repositorio.
- Informa conflictos de disponibilidad.
- Elimina reservas permitidas.
- Rechaza la eliminacion de reservas en curso o finalizadas.

El repositorio se simula; estos casos verifican las respuestas del servicio.

### `ReglasAgenda.test.ts`

Prueba las reglas de dominio para eliminar reservas:

- Impide eliminar una reserva que incluye la fecha actual.
- Permite eliminarla antes de la fecha de entrada.
- Impide eliminar una reserva finalizada.
- Verifica que la fecha de salida actual no se considere finalizada por esa regla.

### `ReservasRepository.test.ts`

Prueba la actualizacion de ambas fechas con consultas y conexiones de base de datos simuladas:

- Normaliza valores `Date` como los que puede devolver PostgreSQL.
- Comprueba las rutas de actualizacion de entrada y salida.
- Comprueba que se libera el cliente de la conexion despues de cada operacion.

## Alcance

Las pruebas del repositorio usan un cliente simulado; no verifican consultas contra una base de datos real. La interfaz tampoco tiene pruebas automatizadas de navegador en esta suite.

La suite contiene 27 casos. Para comprobar ademas el tipado y la compilacion de la aplicacion, se puede ejecutar:

```bash
npm run build
```
