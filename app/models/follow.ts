import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Team from './team.js'
import League from './league.js'
import Match from './match.js'

export default class Follow extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare entityType: 'team' | 'league' | 'match'

  @column()
  declare entityId: string

  @column({ prepare: (value: any) => JSON.stringify(value), consume: (value: string) => JSON.parse(value) })
  declare notificationPreferences: {
    goals: boolean
    cards: boolean
    substitutions: boolean
    matchStart: boolean
    matchEnd: boolean
    lineups: boolean
  }

  @column()
  declare status: 'active' | 'muted' | 'paused'

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Team, {
    foreignKey: 'entityId',
  })
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => League, {
    foreignKey: 'entityId',
  })
  declare league: BelongsTo<typeof League>

  @belongsTo(() => Match, {
    foreignKey: 'entityId',
  })
  declare match: BelongsTo<typeof Match>
}
