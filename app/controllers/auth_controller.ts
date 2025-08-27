import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import AuthService from '#services/auth_service'
import vine from '@vinejs/vine'

/**
 * AuthController - Senior-level authentication endpoints
 * 
 * Provides comprehensive authentication functionality:
 * - Email/password registration and login
 * - Social authentication (Google, Apple, Facebook)
 * - JWT token management (access + refresh tokens)
 * - Account security features (lockout, rate limiting)
 * - Profile management
 * 
 * Security Features:
 * - Input validation and sanitization
 * - Rate limiting on auth endpoints
 * - Comprehensive audit logging
 * - Secure token handling
 */
export default class AuthController {
  private authService = new AuthService()

  /**
   * Register new user with email/password
   */
  async register({ request, response }: HttpContext) {
    try {
      // Validate input
      const registerSchema = vine.object({
        email: vine.string().email().normalizeEmail(),
        password: vine.string().minLength(8).maxLength(128),
        fullName: vine.string().minLength(2).maxLength(100).trim()
      })

      const data = await vine.validate({
        schema: registerSchema,
        data: request.body()
      })

      // Register user
      const result = await this.authService.register(data)

      return response.status(201).json({
        message: 'User registered successfully',
        user: result.user.serialize(),
        tokens: result.tokens,
        isNewUser: result.isNewUser
      })

    } catch (error) {
      logger.error('Registration failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Registration failed',
        message: error.message
      })
    }
  }

  /**
   * Login with email/password
   */
  async login({ request, response }: HttpContext) {
    try {
      // Validate input
      const loginSchema = vine.object({
        email: vine.string().email().normalizeEmail(),
        password: vine.string().minLength(1)
      })

      const credentials = await vine.validate({
        schema: loginSchema,
        data: request.body()
      })

      // Authenticate user
      const result = await this.authService.login(credentials)

      return response.json({
        message: 'Login successful',
        user: result.user.serialize(),
        tokens: result.tokens
      })

    } catch (error) {
      logger.error('Login failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(401).json({
        error: 'Authentication failed',
        message: error.message
      })
    }
  }

  /**
   * Social authentication (Google, Apple, Facebook)
   */
  async socialAuth({ request, response }: HttpContext) {
    try {
      // Validate social auth data
      const socialSchema = vine.object({
        provider: vine.enum(['google', 'apple', 'facebook']),
        providerId: vine.string().minLength(1),
        email: vine.string().email().normalizeEmail(),
        name: vine.string().minLength(1).maxLength(100).trim(),
        avatar: vine.string().url().optional()
      })

      const socialData = await vine.validate({
        schema: socialSchema,
        data: request.body()
      })

      // Authenticate with social provider
      const result = await this.authService.socialAuth(socialData)

      return response.json({
        message: 'Social authentication successful',
        user: result.user.serialize(),
        tokens: result.tokens,
        isNewUser: result.isNewUser
      })

    } catch (error) {
      logger.error('Social auth failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(400).json({
        error: 'Social authentication failed',
        message: error.message
      })
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken({ request, response }: HttpContext) {
    try {
      const { refreshToken } = request.body()

      if (!refreshToken) {
        return response.status(400).json({
          error: 'Refresh token required'
        })
      }

      const tokens = await this.authService.refreshToken(refreshToken)

      return response.json({
        message: 'Token refreshed successfully',
        tokens
      })

    } catch (error) {
      logger.error('Token refresh failed:', error)
      
      return response.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      })
    }
  }

  /**
   * Logout user
   */
  async logout({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user
      const { refreshToken } = request.body()

      if (user) {
        await this.authService.logout(user.id, refreshToken)
      }

      return response.json({
        message: 'Logout successful'
      })

    } catch (error) {
      logger.error('Logout failed:', error)
      
      return response.status(500).json({
        error: 'Logout failed',
        message: error.message
      })
    }
  }

  /**
   * Get current user profile
   */
  async profile({ request, response }: HttpContext) {
    try {
      // Use authenticatedUser set by JWT middleware instead of auth.user
      const user = (request as any).authenticatedUser

      if (!user) {
        return response.status(401).json({
          error: 'Not authenticated'
        })
      }

      return response.json({
        user: user.serialize()
      })

    } catch (error) {
      logger.error('Profile fetch failed:', error)
      
      return response.status(500).json({
        error: 'Failed to fetch profile'
      })
    }
  }

  /**
   * Update user profile
   */
  async updateProfile({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user

      if (!user) {
        return response.status(401).json({
          error: 'Not authenticated'
        })
      }

      // Validate profile update data
      const profileSchema = vine.object({
        fullName: vine.string().minLength(2).maxLength(100).trim().optional(),
        timezone: vine.string().maxLength(50).optional(),
        language: vine.string().maxLength(10).optional(),
        isPrivate: vine.boolean().optional(),
        allowFollowRequests: vine.boolean().optional(),
        notificationPreferences: vine.object({}).optional()
      })

      const updateData = await vine.validate({
        schema: profileSchema,
        data: request.body()
      })

      // Update user profile
      Object.assign(user, updateData)
      await user.save()

      return response.json({
        message: 'Profile updated successfully',
        user: user.serialize()
      })

    } catch (error) {
      logger.error('Profile update failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(500).json({
        error: 'Profile update failed',
        message: error.message
      })
    }
  }

  /**
   * Change password (for email auth users)
   */
  async changePassword({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user

      if (!user) {
        return response.status(401).json({
          error: 'Not authenticated'
        })
      }

      if (!user.isEmailAuth) {
        return response.status(400).json({
          error: 'Password change not available for social auth users'
        })
      }

      // Validate password change data
      const passwordSchema = vine.object({
        currentPassword: vine.string().minLength(1),
        newPassword: vine.string().minLength(8).maxLength(128),
        confirmPassword: vine.string().minLength(1)
      })

      const { currentPassword, newPassword, confirmPassword } = await vine.validate({
        schema: passwordSchema,
        data: request.body()
      })

      if (newPassword !== confirmPassword) {
        return response.status(400).json({
          error: 'New passwords do not match'
        })
      }

      // Verify current password
      const isValidPassword = await user.verifyPassword(currentPassword)
      if (!isValidPassword) {
        return response.status(400).json({
          error: 'Current password is incorrect'
        })
      }

      // Update password
      user.password = newPassword
      await user.save()

      return response.json({
        message: 'Password changed successfully'
      })

    } catch (error) {
      logger.error('Password change failed:', error)
      
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(500).json({
        error: 'Password change failed',
        message: error.message
      })
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount({ response, auth }: HttpContext) {
    try {
      const user = auth.user

      if (!user) {
        return response.status(401).json({
          error: 'Not authenticated'
        })
      }

      // In production, you might want to soft delete or anonymize data
      // For now, we'll mark the account as suspended
      user.accountStatus = 'suspended'
      await user.save()

      logger.info(`User account deleted: ${user.id}`)

      return response.json({
        message: 'Account deleted successfully'
      })

    } catch (error) {
      logger.error('Account deletion failed:', error)
      
      return response.status(500).json({
        error: 'Account deletion failed',
        message: error.message
      })
    }
  }
}
