import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Venue from './venue.js'

export default class StadiumGuide extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare venueId: string

  @column()
  declare title: string

  @column()
  declare sections: Record<string, any>

  @column()
  declare facilities: Record<string, any>

  @column()
  declare images: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Venue)
  declare venue: BelongsTo<typeof Venue>
}
