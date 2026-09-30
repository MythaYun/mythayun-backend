import { test } from '@japa/runner'
import {
  MAX_RANGE_DAYS,
  checkRange,
  countDays,
  getFixturesRangeDayByDay,
  isValidDay,
  listDays,
  shiftDays,
} from '#services/date_range'
import type { MappedFixture } from '#services/football_data_mapper'

test.group('date_range helpers', () => {
  test('shiftDays crosses month and year boundaries', ({ assert }) => {
    assert.equal(shiftDays('2026-12-31', 1), '2027-01-01')
    assert.equal(shiftDays('2026-03-01', -1), '2026-02-28')
    assert.equal(shiftDays('2024-03-01', -1), '2024-02-29')
  })

  test('isValidDay accepts real days only', ({ assert }) => {
    assert.isTrue(isValidDay('2026-09-30'))
    assert.isFalse(isValidDay('2026-02-31'))
    assert.isFalse(isValidDay('2026-13-01'))
    assert.isFalse(isValidDay('2026-9-3'))
    assert.isFalse(isValidDay('not-a-date'))
    assert.isFalse(isValidDay(''))
  })

  test('countDays includes both ends', ({ assert }) => {
    assert.equal(countDays('2026-09-30', '2026-09-30'), 1)
    assert.equal(countDays('2026-09-30', '2026-10-06'), 7)
  })

  test('listDays lists every day in order', ({ assert }) => {
    assert.deepEqual(listDays('2026-09-29', '2026-10-02'), [
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
    assert.deepEqual(listDays('2026-09-30', '2026-09-30'), ['2026-09-30'])
  })

  test('checkRange accepts a valid range up to the limit', ({ assert }) => {
    assert.isTrue(checkRange('2026-09-30', '2026-09-30').ok)
    assert.isTrue(checkRange('2026-09-30', shiftDays('2026-09-30', MAX_RANGE_DAYS - 1)).ok)
  })

  test('checkRange rejects bad ranges with a reason', ({ assert }) => {
    const tooLong = checkRange('2026-09-30', shiftDays('2026-09-30', MAX_RANGE_DAYS))
    assert.isFalse(tooLong.ok)
    assert.include(tooLong.ok ? '' : tooLong.message, String(MAX_RANGE_DAYS))

    const reversed = checkRange('2026-10-02', '2026-10-01')
    assert.isFalse(reversed.ok)

    assert.isFalse(checkRange('2026-02-31', '2026-03-02').ok)
    assert.isFalse(checkRange('oops', '2026-03-02').ok)
  })
})

test.group('getFixturesRangeDayByDay', () => {
  const fixture = (id: string, startTime: string) => ({ id, startTime }) as unknown as MappedFixture

  test('asks one day after the other and sorts by kick-off', async ({ assert }) => {
    const asked: string[] = []
    const provider = {
      async getFixtures(day: string) {
        asked.push(day)
        return day === '2026-10-01'
          ? [fixture('b', '2026-10-01T18:00:00.000Z')]
          : [fixture('a', `${day}T20:00:00.000Z`)]
      },
    }

    const result = await getFixturesRangeDayByDay(provider, '2026-09-30', '2026-10-01')

    assert.deepEqual(asked, ['2026-09-30', '2026-10-01'])
    assert.deepEqual(
      result.map((f) => f.id),
      ['a', 'b']
    )
  })

  test('passes the league to every day', async ({ assert }) => {
    const leagues: Array<string | undefined> = []
    const provider = {
      async getFixtures(_day: string, leagueId?: string) {
        leagues.push(leagueId)
        return []
      },
    }

    await getFixturesRangeDayByDay(provider, '2026-09-30', '2026-10-02', 'abc123')

    assert.deepEqual(leagues, ['abc123', 'abc123', 'abc123'])
  })
})
