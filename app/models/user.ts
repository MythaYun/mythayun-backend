import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Follow from './follow.js'
import DeviceToken from './device_token.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare externalAuthId: string | null

  @column()
  declare fullName: string | null

  // Add name column property for test compatibility
  @column({
    columnName: 'full_name' // Maps to the same DB column as fullName
  })
  declare name: string | null

  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare password: string | null

  // Authentication and security fields
  @column()
  declare authProvider: 'email' | 'google' | 'apple' | 'facebook'

  @column()
  declare emailVerified: boolean

  @column()
  declare accountStatus: 'active' | 'suspended' | 'locked' | 'pending'

  @column()
  declare failedLoginAttempts: number | null

  @column.dateTime()
  declare lastLoginAt: DateTime | null

  @column.dateTime()
  declare lastFailedLoginAt: DateTime | null

  // Profile fields
  @column()
  declare profilePicture: string | null

  @column()
  declare timezone: string | null

  @column()
  declare language: string | null

  @column()
  declare notificationPreferences: Record<string, any> | null

  // Privacy settings
  @column()
  declare isPrivate: boolean

  @column()
  declare allowFollowRequests: boolean

  // Admin status
  @column()
  declare isAdmin: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  // Relationships
  @hasMany(() => Follow)
  declare follows: HasMany<typeof Follow>

  @hasMany(() => DeviceToken)
  declare deviceTokens: HasMany<typeof DeviceToken>

  // Computed properties
  get isActive(): boolean {
    return this.accountStatus === 'active'
  }

  get isEmailAuth(): boolean {
    return this.authProvider === 'email'
  }

  get isSocialAuth(): boolean {
    return ['google', 'apple', 'facebook'].includes(this.authProvider)
  }

  // Serialization - hide sensitive fields
  serialize() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      authProvider: this.authProvider,
      emailVerified: this.emailVerified,
      profilePicture: this.profilePicture,
      timezone: this.timezone,
      language: this.language,
      isPrivate: this.isPrivate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}