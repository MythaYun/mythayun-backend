import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Match from './match.js'
import StadiumGuide from './stadium_guide.js'

export default class Venue extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare city: string

  @column()
  declare capacity: number | null

  @column()
  declare providerIds: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Match)
  declare matches: HasMany<typeof Match>

  @hasMany(() => StadiumGuide)
  declare stadiumGuides: HasMany<typeof StadiumGuide>
}
