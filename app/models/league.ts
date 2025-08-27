import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Team from './team.js'
import Match from './match.js'
import Follow from './follow.js'

export default class League extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare country: string

  @column()
  declare season: number

  @column()
  declare logoUrl: string | null

  // Add logo property as column for test compatibility
  @column({
    columnName: 'logo_url' // Maps to the same DB column as logoUrl
  })
  declare logo: string | null

  @column({
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value)
  })
  declare providerIds: Record<string, any>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Team)
  declare teams: HasMany<typeof Team>

  @hasMany(() => Match)
  declare matches: HasMany<typeof Match>

  @hasMany(() => Follow)
  declare follows: HasMany<typeof Follow>
}
