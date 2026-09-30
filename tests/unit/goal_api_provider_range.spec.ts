import { test } from '@japa/runner'
import GoalApiProvider from '#services/goal_api_provider'
import type { GoalApiFixture } from '#services/goal_api_client'
import { goalApiLeagueIds } from '#services/football_leagues'
import { isoDate, shiftDays } from '#services/date_range'

/**
 * Stand-in for the goal-api client: serves fixtures from memory like the real
 * one (a league and an inclusive day range) and records every request, since
 * requests are what the free plan limits.
 */
class FakeClient {
  calls: Array<{ leagueId: string; from: string; to: string }> = []
  failing = new Set<string>()

  constructor(private store: GoalApiFixture[]) {}

  async getLeagueFixtures(leagueId: string, from: string, to: string): Promise<GoalApiFixture[]> {
    this.calls.push({ leagueId, from, to })
    if (this.failing.has(leagueId)) throw new Error(`boom ${leagueId}`)
    return this.store.filter((f) => {
      const day = f.kickoffUtc.slice(0, 10)
      return f.leagueId === leagueId && day >= from && day <= to
    })
  }
}

const today = isoDate(new Date())
const day = (offset: number) => shiftDays(today, offset)

function match(id: string, leagueId: string, dayOffset: number, hour: number): GoalApiFixture {
  // Far enough from "now" that no test depends on the current time of day
  const kickoffUtc = `${day(dayOffset)}T${String(hour).padStart(2, '0')}:00:00.000Z`
  return {
    id,
    leagueId,
    leagueName: `League ${leagueId}`,
    countryName: null,
    kickoffUtc,
    matchStatus: dayOffset < 0 ? 'FINISHED' : 'SCHEDULED',
    matchPeriod: null,
    matchElapsed: null,
    homeTeamId: 'h',
    homeTeamName: 'Home',
    homeTeamScore: dayOffset < 0 ? '1' : null,
    awayTeamId: 'a',
    awayTeamName: 'Away',
    awayTeamScore: dayOffset < 0 ? '0' : null,
    matchStadium: null,
    matchReferee: null,
    teamHomeBadge: null,
    teamAwayBadge: null,
  }
}

function providerWith(store: GoalApiFixture[]) {
  const provider = new GoalApiProvider()
  const client = new FakeClient(store)
  ;(provider as unknown as { client: FakeClient }).client = client
  return { provider, client }
}

const [leagueA, leagueB] = goalApiLeagueIds()

test.group('GoalApiProvider.getFixturesRange', () => {
  test('a range beyond the window costs one request per league, however many days', async ({
    assert,
  }) => {
    const { provider, client } = providerWith([
      match('f1', leagueA, 3, 18),
      match('f2', leagueA, 8, 18),
    ])

    const result = await provider.getFixturesRange(day(3), day(9), leagueA)

    assert.deepEqual(client.calls, [{ leagueId: leagueA, from: day(3), to: day(9) }])
    assert.deepEqual(
      result.map((f) => f.id),
      ['f1', 'f2']
    )
  })

  test('a range inside the window reuses the shared window request', async ({ assert }) => {
    const { provider, client } = providerWith([
      match('y', leagueA, -1, 20),
      match('t', leagueA, 0, 20),
      match('m', leagueA, 1, 20),
    ])

    const result = await provider.getFixturesRange(day(-1), day(1), leagueA)

    assert.deepEqual(client.calls, [{ leagueId: leagueA, from: day(-1), to: day(1) }])
    assert.deepEqual(
      result.map((f) => f.id),
      ['y', 't', 'm']
    )
  })

  test('a range over past, window and future costs three requests per league', async ({
    assert,
  }) => {
    const { provider, client } = providerWith([
      match('p', leagueA, -4, 15),
      match('t', leagueA, 0, 20),
      match('n', leagueA, 4, 15),
    ])

    const result = await provider.getFixturesRange(day(-5), day(6), leagueA)

    assert.sameDeepMembers(client.calls, [
      { leagueId: leagueA, from: day(-5), to: day(-2) }, // before the window
      { leagueId: leagueA, from: day(-1), to: day(1) }, // the shared window
      { leagueId: leagueA, from: day(2), to: day(6) }, // after the window
    ])
    assert.deepEqual(
      result.map((f) => f.id),
      ['p', 't', 'n']
    )
  })

  test('the week of the matches page costs at most two requests per league', async ({ assert }) => {
    const { provider, client } = providerWith([])

    // What the page asks for: the visitor's "this week" as UTC days
    await provider.getFixturesRange(day(-1), day(6))

    const leagues = goalApiLeagueIds().length
    assert.isAtMost(client.calls.length, leagues * 2)
  })

  test('keeps only the fixtures inside the range', async ({ assert }) => {
    const { provider } = providerWith([
      match('old', leagueA, -1, 20),
      match('in', leagueA, 0, 20),
      match('late', leagueA, 1, 20),
    ])

    const result = await provider.getFixturesRange(day(0), day(0), leagueA)

    assert.deepEqual(
      result.map((f) => f.id),
      ['in']
    )
  })

  test('sorts all leagues by kick-off', async ({ assert }) => {
    const { provider } = providerWith([
      match('late', leagueA, 3, 20),
      match('early', leagueB, 3, 14),
      match('mid', leagueA, 4, 10),
    ])

    const result = await provider.getFixturesRange(day(3), day(4))

    assert.deepEqual(
      result.map((f) => f.id),
      ['early', 'late', 'mid']
    )
  })

  test('answers a second identical request from the cache', async ({ assert }) => {
    const { provider, client } = providerWith([match('f1', leagueA, 3, 18)])

    await provider.getFixturesRange(day(3), day(9), leagueA)
    const before = client.calls.length
    await provider.getFixturesRange(day(3), day(9), leagueA)

    assert.equal(client.calls.length, before)
  })

  test('shares the window cache with the single-date endpoint', async ({ assert }) => {
    const { provider, client } = providerWith([match('t', leagueA, 0, 20)])

    await provider.getFixtures(day(0), leagueA) // loads the window
    const before = client.calls.length
    await provider.getFixturesRange(day(-1), day(1), leagueA)

    assert.equal(client.calls.length, before)
  })

  test('skips a league that fails and keeps the others', async ({ assert }) => {
    const { provider, client } = providerWith([
      match('a', leagueA, 3, 18),
      match('b', leagueB, 3, 19),
    ])
    client.failing.add(leagueA)

    const result = await provider.getFixturesRange(day(3), day(4))

    assert.deepEqual(
      result.map((f) => f.id),
      ['b']
    )
  })

  test('raises the error when every league fails', async ({ assert }) => {
    const { provider, client } = providerWith([])
    goalApiLeagueIds().forEach((id) => client.failing.add(id))

    await assert.rejects(() => provider.getFixturesRange(day(3), day(4)))
  })

  test('a failed request is not cached: the next call asks again', async ({ assert }) => {
    const { provider, client } = providerWith([match('a', leagueA, 3, 18)])
    client.failing.add(leagueA)
    await assert.rejects(() => provider.getFixturesRange(day(3), day(4), leagueA))

    client.failing.delete(leagueA)
    const result = await provider.getFixturesRange(day(3), day(4), leagueA)

    assert.deepEqual(
      result.map((f) => f.id),
      ['a']
    )
  })
})
