import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import League from './league.js'
import Match from './match.js'
import Follow from './follow.js'

export default class Team extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare shortName: string

  @column()
  declare logoUrl: string | null

  // Add logo property as column for test compatibility
  @column({
    columnName: 'logo_url' // Maps to the same DB column as logoUrl
  })
  declare logo: string | null

  @column()
  declare leagueId: string | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value)
  })
  declare providerIds: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => League)
  declare league: BelongsTo<typeof League>

  @hasMany(() => Match, {
    foreignKey: 'homeTeamId',
  })
  declare homeMatches: HasMany<typeof Match>

  @hasMany(() => Match, {
    foreignKey: 'awayTeamId',
  })
  declare awayMatches: HasMany<typeof Match>

  @hasMany(() => Follow)
  declare follows: HasMany<typeof Follow>
}
