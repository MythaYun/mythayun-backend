import type { MappedFixture } from '#services/football_data_mapper'

/**
 * Calendar-day helpers for the fixtures endpoints. Days are UTC days written
 * YYYY-MM-DD, which is how the football providers group fixtures.
 */

/** Longest range a single request may ask for, in days (both ends included) */
export const MAX_RANGE_DAYS = 14

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function shiftDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return isoDate(shifted)
}

/** True for a real calendar day such as 2026-09-30 (rejects 2026-02-31) */
export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && isoDate(parsed) === value
}

/** Number of days from `from` to `to`, both included */
export function countDays(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000) + 1
}

export type RangeCheck = { ok: true } | { ok: false; message: string }

/** Checks a from/to pair: real days, in order, and not longer than MAX_RANGE_DAYS */
export function checkRange(from: string, to: string): RangeCheck {
  if (!isValidDay(from) || !isValidDay(to)) {
    return { ok: false, message: 'from and to must be valid days written YYYY-MM-DD' }
  }
  if (from > to) {
    return { ok: false, message: 'from must not be after to' }
  }
  if (countDays(from, to) > MAX_RANGE_DAYS) {
    return { ok: false, message: `the range must not exceed ${MAX_RANGE_DAYS} days` }
  }
  return { ok: true }
}

/** Every day from `from` to `to`, both included */
export function listDays(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = shiftDays(day, 1)) days.push(day)
  return days
}

/**
 * Range query for providers that can only be asked one day at a time: one
 * request per day, one after the other so a long range is not sent as a burst.
 */
export async function getFixturesRangeDayByDay(
  provider: { getFixtures(date: string, leagueId?: string): Promise<MappedFixture[]> },
  from: string,
  to: string,
  leagueId?: string
): Promise<MappedFixture[]> {
  const fixtures: MappedFixture[] = []
  for (const day of listDays(from, to)) {
    fixtures.push(...(await provider.getFixtures(day, leagueId)))
  }
  return fixtures.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
}
