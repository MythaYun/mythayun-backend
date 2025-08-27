import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web'
}

/**
 * DeviceToken model - stores user device tokens for push notifications
 */
export default class DeviceToken extends BaseModel {
  public static table = 'device_tokens'
  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @column()
  declare token: string

  @column()
  declare platform: DevicePlatform

  @column({ columnName: 'device_model' })
  declare deviceModel: string | null
  
  @column({ columnName: 'app_version' })
  declare appVersion: string | null

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ columnName: 'last_used' })
  declare lastUsed: DateTime

  @column.dateTime({ columnName: 'created_at', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
