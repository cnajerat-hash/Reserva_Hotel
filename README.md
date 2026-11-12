# Reserva de habitaciones de hotel

## Acerca del proyecto

Esta es una **aplicación de prueba** para explorar un flujo básico de administración y reserva de habitaciones de hotel. Permite consultar la disponibilidad, registrar una reserva y revisar las reservas guardadas en PostgreSQL.

No es un sistema listo para producción: todavía no incluye inicio de sesión ni control de permisos, pagos, cancelaciones o notificaciones. La reserva marca la habitación como `Ocupada`; la aplicación no la libera automáticamente al llegar la fecha de salida.

## Qué hace

- Muestra las habitaciones registradas y permite filtrar las disponibles, las no libres o todas.
- Presenta datos de cada habitación como número, tipo, capacidad, piso, vista y precio por noche.
- Permite reservar una habitación libre indicando el nombre del huésped y las fechas de entrada y salida.
- Guarda la reserva y cambia el estado de la habitación a `Ocupada` en una única transacción de base de datos.
- Valida los datos, las fechas y la disponibilidad para evitar reservas de habitaciones ocupadas o fechas que se crucen con otra reserva.
- Muestra las reservas registradas, incluyendo huésped, habitación y fechas.
- Permite consultar y modificar manualmente el estado de una habitación.

## Arquitectura

La aplicación está organizada en una interfaz web, una API y capas de aplicación, dominio y persistencia:

```text
Navegador (Vue 3)
       │ HTTP / JSON
       ▼
API (Express, Node.js y TypeScript)
       │
       ▼
Aplicación ── Dominio (validaciones de negocio)
       │
       ▼
Persistencia (node-postgres)
       │
       ▼
PostgreSQL / Supabase
```

- **Presentación:** Vue 3 y Vue Router muestran las páginas y envían solicitudes a la API. Vite sirve la interfaz durante el desarrollo y reenvía `/api` al servidor Express.
- **Servidor y API:** `server/index.ts` expone los endpoints HTTP y sirve los archivos compilados en producción.
- **Aplicación:** `src/aplicacion/HabitacionServ.ts` valida solicitudes y coordina las operaciones.
- **Dominio:** `src/dominio/ReglasAgenda.ts` contiene reglas de validación de datos y fechas.
- **Persistencia:** `src/presencia/HabitacionRepositiry.ts` consulta PostgreSQL mediante `pg`; la conexión se configura en `src/presencia/db.ts`.

### Rutas de la interfaz

- `/`: página de bienvenida.
- `/habitaciones`: listado, filtros, cambio de estado y formulario de reserva.
- `/reservas`: listado de reservas guardadas.

### Endpoints principales

- `GET /api/habitaciones`: lista todas las habitaciones.
- `GET /api/habitaciones?estado=libres`: lista las habitaciones con estado `Libre`.
- `GET /api/habitaciones?estado=no-libres`: lista las habitaciones cuyo estado no es `Libre`.
- `PATCH /api/habitaciones/:id/estado`: actualiza el estado de una habitación.
- `POST /api/reservas`: registra una reserva y marca la habitación como `Ocupada`.
- `GET /api/reservas`: lista las reservas junto con el número de habitación.

## Base de datos

La aplicación espera que las tablas ya existan en PostgreSQL con estos nombres y columnas. Se usan comillas dobles en las consultas porque los nombres de las tablas y algunas columnas tienen mayúsculas.

### `"Habitaciones"`

`id_habitacion`, `numero`, `tipo`, `capacidad`, `piso`, `vista`, `precio_noche`, `estado`

### `"Reservas"`

`id`, `created_at`, `"id_Habitacion"`, `"Huesped"`, `fecha_inicio`, `fecha_fin`

La conexión se lee de `DATABASE_URL` en el servidor. No se debe colocar la cadena de conexión en el código del navegador ni publicar credenciales.

## Requisitos

- Node.js compatible con Vite 8 (Node.js 20.19+ o 22.12+).
- npm.
- Una base de datos PostgreSQL accesible con las tablas descritas arriba.

## Configuración y ejecución

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto con la URL de conexión de tu base de datos:

   ```env
   DATABASE_URL=postgresql://USUARIO:CONTRASENA@HOST:1234/BASE_DE_DATOS
   ```

   Sustituye los valores de ejemplo por los datos de tu proveedor. No compartas ni subas el archivo `.env`.

3. Inicia la API y la interfaz en modo desarrollo:

   ```bash
   npm run dev
   ```

   Vite mostrará en la terminal la dirección local de la interfaz, normalmente `http://localhost:5173`. La API escucha en el puerto `3001`.

4. Abre `/habitaciones` para ver la disponibilidad y `/reservas` para consultar las reservas.

## Compilación y ejecución de producción

```bash
npm run build
npm start
```

El comando `build` valida TypeScript y genera la interfaz en `dist/`. Después, `npm start` inicia Express, que sirve tanto la API como los archivos compilados. Configura `DATABASE_URL` y, si hace falta, `PORT` en el entorno del servidor.

## Ejecutar con Docker

La imagen contiene la interfaz compilada y la API Express. PostgreSQL debe seguir siendo accesible desde el contenedor (por ejemplo, la instancia de Supabase configurada en `DATABASE_URL`).

1. Verifica que el archivo `.env` de la raíz tenga `DATABASE_URL` configurada. Docker Compose pasa esa variable al contenedor; el archivo `.env` no se copia dentro de la imagen.
2. Desde la raíz del proyecto, construye la imagen e inicia el servicio:

   ```bash
   docker compose up --build
   ```

3. Abre `http://localhost:3001`. Para detener el servicio, usa `Ctrl+C`; si lo iniciaste en segundo plano, ejecuta `docker compose down`.

La API y la interfaz se sirven desde el mismo puerto (`3001`), por lo que las solicitudes `/api` funcionan sin configurar un proxy adicional.

## Comandos disponibles

- `npm run dev`: inicia API e interfaz en modo desarrollo.
- `npm run dev:api`: inicia solo la API con recarga automática.
- `npm run dev:web`: inicia solo Vite.
- `npm run build`: valida y compila la aplicación.
- `npm start`: inicia el servidor Express.
- `npm run preview`: previsualiza la compilación de Vite; no inicia la API.
