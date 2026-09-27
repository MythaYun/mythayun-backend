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
import { getFootballProvider } from '#services/football_provider'

router.get('/', async () => {
  return {
    hello: 'world',
    app: 'Mythayun Live Score API',
    version: '1.0.0'
  }
})

// Health check endpoint. The football API check is cached so that public
// traffic to /health can't burn through the provider's request quota.
const FOOTBALL_HEALTH_TTL_MS = 60_000
let footballHealthCache: { healthy: boolean; checkedAt: number } | null = null

router.get('/health', async ({ response }) => {
  const provider = await getFootballProvider()
  if (!footballHealthCache || Date.now() - footballHealthCache.checkedAt > FOOTBALL_HEALTH_TTL_MS) {
    footballHealthCache = { healthy: await provider.healthCheck(), checkedAt: Date.now() }
  }
  const apiHealthy = footballHealthCache.healthy

  return response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      footballApi: apiHealthy ? 'healthy' : 'unhealthy',
      footballProvider: provider.name
    }
  })
})

// Authentication routes
router.group(() => {
  router.post('/register', '#controllers/auth_controller.register')
    .use(middleware.throttle({ max: 10, windowSeconds: 600 }))
  router.post('/login', '#controllers/auth_controller.login')
    .use(middleware.throttle({ max: 20, windowSeconds: 60 }))
  router.post('/social-auth', '#controllers/auth_controller.socialAuth')
    .use(middleware.throttle({ max: 20, windowSeconds: 60 }))
  router.post('/refresh-token', '#controllers/auth_controller.refreshToken')
    .use(middleware.throttle({ max: 60, windowSeconds: 60 }))
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
  
  // Notification endpoints removed - not needed for core functionality
}).prefix('/api/v1')

// Admin routes removed - not needed for core functionality
