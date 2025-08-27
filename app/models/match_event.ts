import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Match from './match.js'
import Team from './team.js'

export default class MatchEvent extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare matchId: string

  @column.dateTime()
  declare ts: DateTime

  @column()
  declare type: string

  @column()
  declare teamId: string | null

  @column()
  declare playerId: string | null

  @column()
  declare playerName: string | null

  @column()
  declare detailJson: Record<string, any>

  @column()
  declare providerEventId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Match)
  declare match: BelongsTo<typeof Match>

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>
}
