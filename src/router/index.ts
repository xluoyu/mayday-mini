import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHashHistory } from 'vue-router'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/',
    component: () => import('../pages/main/index.vue'),
  },
  {
    path: '/preference',
    component: () => import('../pages/preference/index.vue'),
  },
  {
    path: '/chat-trigger',
    component: () => import('../pages/chat/trigger.vue'),
  },
  {
    path: '/chat',
    component: () => import('../pages/chat/index.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
