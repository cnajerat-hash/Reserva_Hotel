import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
		path: "/",
		name: "home",
		component: () => import("../components/Bienbenida.vue"),
		meta: {
			title: "Página principal",
		},
	},
    {
		path: "/habitaciones",
		name: "habitaciones",
		component: () => import("../components/Habitaciones.vue"),
		meta: {
			title: "Habitaciones",
		},
	},
	{
		path: "/reservas",
		name: "reservas",
		component: () => import("../components/ListarReservas.vue"),
		meta: {
			title: "Reservas",
		},
	},
]

const router = createRouter({
	history: createWebHistory(),
	routes,
})

export default router