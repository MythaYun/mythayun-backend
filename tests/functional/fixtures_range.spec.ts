import { test } from '@japa/runner'
import env from '#start/env'

/**
 * Validation of GET /api/v1/fixtures?from=&to=. These requests are refused
 * before any football provider is called, so they need no API key.
 */
test.group('GET /api/v1/fixtures (range validation)', (group) => {
  let previousMock: string | undefined

  group.setup(() => {
    // The local .env serves mock fixtures, which skips validation
    previousMock = env.get('MOCK_API')
    env.set('MOCK_API', 'false')
    return () => env.set('MOCK_API', previousMock ?? 'false')
  })

  const rejected = [
    ['only from', '?from=2026-10-01'],
    ['only to', '?to=2026-10-01'],
    ['not a date', '?from=abc&to=2026-10-01'],
    ['a day that does not exist', '?from=2026-02-31&to=2026-03-02'],
    ['from after to', '?from=2026-10-05&to=2026-10-01'],
    ['more than 14 days', '?from=2026-10-01&to=2026-10-15'],
    ['an empty value', '?from=&to='],
  ] as const

  for (const [name, query] of rejected) {
    test(`refuses ${name}`, async ({ client, assert }) => {
      const response = await client.get(`/api/v1/fixtures${query}`)

      response.assertStatus(400)
      assert.equal(response.body().error.code, 'INVALID_RANGE')
    })
  }

  test('still refuses a malformed single date', async ({ client, assert }) => {
    const response = await client.get('/api/v1/fixtures?date=tomorrow')

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'INVALID_DATE')
  })

  test('refuses a bad league id with a valid range', async ({ client, assert }) => {
    const response = await client.get(
      '/api/v1/fixtures?from=2026-10-01&to=2026-10-03&leagueId=bad%20id'
    )

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'INVALID_LEAGUE')
  })
})
