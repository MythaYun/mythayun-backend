/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import FootballApiClient from '#services/football_api_client'

router.get('/', async () => {
  return {
    hello: 'world',
    app: 'Mythayun Live Score API',
    version: '1.0.0'
  }
})

// Health check endpoint
router.get('/health', async ({ response }) => {
  const footballApi = new FootballApiClient()
  const apiHealthy = await footballApi.healthCheck()
  
  return response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      footballApi: apiHealthy ? 'healthy' : 'unhealthy'
    }
  })
})

// Authentication routes
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
  router.post('/login', '#controllers/auth_controller.login')
  router.post('/social-auth', '#controllers/auth_controller.socialAuth')
  router.post('/refresh-token', '#controllers/auth_controller.refreshToken')
  router.post('/logout', '#controllers/auth_controller.logout')
}).prefix('/auth')

// API v1 routes
router.group(() => {
  // Health check
  router.get('/health', '#controllers/health_controller.index')
  
  // Fixtures endpoints
  router.get('/fixtures', '#controllers/fixtures_controller.index')
  router.get('/fixtures/live', '#controllers/fixtures_controller.live')
  
  // Matches endpoints
  router.get('/matches/:id', '#controllers/matches_controller.show')
  
  // User profile endpoints (protected)
  router.get('/profile', '#controllers/auth_controller.profile').use(middleware.jwtAuth())
  router.put('/profile', '#controllers/auth_controller.updateProfile').use(middleware.jwtAuth())
  router.post('/change-password', '#controllers/auth_controller.changePassword').use(middleware.jwtAuth())
  router.delete('/account', '#controllers/auth_controller.deleteAccount').use(middleware.jwtAuth())
  
  // Follows endpoints (protected)
  router.post('/follows', '#controllers/follows_controller.follow').use(middleware.jwtAuth())
  router.delete('/follows', '#controllers/follows_controller.unfollow').use(middleware.jwtAuth())
  router.get('/follows', '#controllers/follows_controller.getUserFollows').use(middleware.jwtAuth())
  router.get('/follows/stats', '#controllers/follows_controller.getFollowStats').use(middleware.jwtAuth())
  router.get('/follows/recommendations', '#controllers/follows_controller.getRecommendations').use(middleware.jwtAuth())
  router.put('/follows/notifications', '#controllers/follows_controller.updateNotificationPreferences').use(middleware.jwtAuth())
  router.post('/follows/bulk', '#controllers/follows_controller.bulkFollow').use(middleware.jwtAuth())
  router.get('/follows/check/:entityType/:entityId', '#controllers/follows_controller.checkFollow').use(middleware.jwtAuth())
  
  // Public follows endpoints
  router.get('/entities/:entityType/:entityId/followers', '#controllers/follows_controller.getEntityFollowers')
  
  // Stadium guides endpoints
  router.get('/stadiums/:venueId/guide', '#controllers/stadium_guides_controller.show')
  
  // Push notification endpoints (protected)
  router.post('/notifications/devices', '#controllers/notifications_controller.registerDevice').use(middleware.jwtAuth())
  router.delete('/notifications/devices', '#controllers/notifications_controller.unregisterDevice').use(middleware.jwtAuth())
  router.get('/notifications/devices', '#controllers/notifications_controller.listDevices').use(middleware.jwtAuth())
  router.post('/notifications/test', '#controllers/notifications_controller.sendTestNotification').use(middleware.jwtAuth())
}).prefix('/api/v1')

// Admin routes (protected with JWT auth and admin middleware)
router.group(() => {
  router.get('/health', '#controllers/admin_controller.health').use(middleware.jwtAuth()).use(middleware.admin())
  router.get('/jobs', '#controllers/admin_controller.jobsStatus').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/jobs/:jobName/trigger', '#controllers/admin_controller.triggerJob').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/jobs/:jobName/start', '#controllers/admin_controller.startJob').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/jobs/:jobName/stop', '#controllers/admin_controller.stopJob').use(middleware.jwtAuth()).use(middleware.admin())
  router.get('/websocket/stats', '#controllers/admin_controller.websocketStats').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/ingestion/trigger', '#controllers/admin_controller.triggerIngestion').use(middleware.jwtAuth()).use(middleware.admin())
  router.get('/metrics', '#controllers/admin_controller.systemMetrics').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/websocket/test', '#controllers/admin_controller.testWebSocket').use(middleware.jwtAuth()).use(middleware.admin())
  
  // Admin notification endpoints
  router.post('/notifications/team', '#controllers/notifications_controller.sendTeamNotification').use(middleware.jwtAuth()).use(middleware.admin())
  router.post('/notifications/stadium-guide', '#controllers/notifications_controller.sendStadiumGuideNotification')
}).prefix('/admin/v1')
