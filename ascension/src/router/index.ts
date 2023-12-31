import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import HomePage from '../layouts/HomePage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/AccountCreation',
    name: 'AccountCreation',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../layouts/AccountCreation.vue')
  },
  {
    path: '/AdminPage',
    name: 'AdminPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/AdminPage.vue')
  },
  {
    path: '/TeacherTest',
    name: 'TeacherTest',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/TeacherTest.vue')
  },
  {
    path: '/StudentTest',
    name: 'StudentTest',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentTest.vue')
  },
  {
    path: '/RedirectPage',
    name: 'RedirectPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/RedirectPage.vue')
  },
  {
    path: '/StudentHomePage',
    name: 'StudentHomePage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentHomePage.vue')
  },
  {
    path: '/AccountSettings',
    name: 'AccountSettings',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/AccountSettings.vue')
  },
  {
    path: '/StudentProfilePage',
    name: 'StudentProfilePage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentProfilePage.vue')
  },
  {
    path: '/StudentQuestPage',
    name: 'StudentQuestPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentQuestPage.vue')
  },
  {
    path: '/StudentLeaderboardPage',
    name: 'StudentLeaderboardPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentLeaderboardPage.vue')
  },
  {
    path: '/StudentRequestPage',
    name: 'StudentRequestPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/StudentRequestPage.vue')
  },
  {
    path: '/AdminTest',
    name: 'AdminTest',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/AdminTest.vue')
  },
  {
    path: '/HomeTest',
    name: 'HomeTest',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/HomeTest.vue')
  },
  {
    path: '/SignUpPage',
    name: 'SignUpPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/SignUpPage.vue')
  },
  {
    path: '/GiverStudentPage',
    name: 'GiverStudentPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/GiverStudentPage.vue')
  },
  {
    path: '/GiverHousePage',
    name: 'GiverHousePage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/GiverHousePage.vue')
  },
  {
    path: '/GiverLeaderboardPage',
    name: 'GiverLeaderboardPage',
    component: () => import(/* webpackChunkName: "about" */ '../layouts/GiverLeaderboardPage.vue')
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
