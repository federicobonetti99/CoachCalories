import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/HomePage.vue';
import Catalog from '../pages/Catalog.vue';
import NotFound from '../pages/NotFound.vue';

const routes = [
    { path: '/', name: "Home", component: Home },
    { path: '/', name: "Catalog", component: Catalog },
    { path: '/:pathMatch(.*)*', component: NotFound }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
