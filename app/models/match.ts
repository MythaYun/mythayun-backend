import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import League from './league.js'
import Team from './team.js'
import Venue from './venue.js'
import MatchState from './match_state.js'
import MatchEvent from './match_event.js'
import Follow from './follow.js'

export default class Match extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare leagueId: string

  @column()
  declare season: number

  @column()
  declare homeTeamId: string

  @column()
  declare awayTeamId: string

  @column()
  declare venueId: string | null

  @column.dateTime({ columnName: 'start_time' })
  declare startTime: DateTime

  @column.dateTime({ columnName: 'start_time' })
  declare kickoffTime: DateTime

  @column()
  declare status: string

  @column()
  declare providerIds: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => League)
  declare league: BelongsTo<typeof League>

  @belongsTo(() => Team, {
    foreignKey: 'homeTeamId',
  })
  declare homeTeam: BelongsTo<typeof Team>

  @belongsTo(() => Team, {
    foreignKey: 'awayTeamId',
  })
  declare awayTeam: BelongsTo<typeof Team>

  @belongsTo(() => Venue)
  declare venue: BelongsTo<typeof Venue>

  @hasOne(() => MatchState)
  declare matchState: HasOne<typeof MatchState>

  @hasMany(() => MatchEvent)
  declare matchEvents: HasMany<typeof MatchEvent>

  @hasMany(() => Follow)
  declare follows: HasMany<typeof Follow>
}
