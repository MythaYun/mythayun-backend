import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Match from './match.js'

export default class MatchState extends BaseModel {
  @column({ isPrimary: true })
  declare matchId: string

  @column()
  declare minute: number | null

  @column()
  declare phase: string

  @column()
  declare homeScore: number

  @column()
  declare awayScore: number

  @column()
  declare lastEventId: string | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Match, {
    foreignKey: 'matchId',
  })
  declare match: BelongsTo<typeof Match>
}
