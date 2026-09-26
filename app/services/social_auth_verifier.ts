import { createHmac } from 'node:crypto'
import { request } from 'undici'
import env from '#start/env'
import type { SocialAuthData } from '#services/auth_service'

export type SocialProvider = 'google' | 'facebook'

export interface SocialCodeExchange {
  provider: SocialProvider
  code: string
  redirectUri: string
  codeVerifier?: string
}

export class SocialAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message)
  }
}

/**
 * Exchanges an OAuth authorization code with the provider and returns the
 * identity the provider vouches for.
 *
 * The client never tells us who the user is: providerId and email come from
 * the provider's own API, fetched with a token only our client secret can
 * obtain. This is what makes it safe to link a social login to an existing
 * account by email.
 */
export default class SocialAuthVerifier {
  async verify(input: SocialCodeExchange): Promise<SocialAuthData> {
    switch (input.provider) {
      case 'google':
        return this.verifyGoogle(input)
      case 'facebook':
        return this.verifyFacebook(input)
    }
  }

  private async verifyGoogle(input: SocialCodeExchange): Promise<SocialAuthData> {
    const clientId = env.get('GOOGLE_CLIENT_ID')
    const clientSecret = env.get('GOOGLE_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      throw new SocialAuthError('Google login is not configured', 503)
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    })
    if (input.codeVerifier) params.set('code_verifier', input.codeVerifier)

    const token = await this.postForm('https://oauth2.googleapis.com/token', params)
    if (!token.access_token) {
      throw new SocialAuthError('Google code exchange failed')
    }

    const profile = await this.getJson('https://openidconnect.googleapis.com/v1/userinfo', {
      authorization: `Bearer ${token.access_token}`,
    })

    // An unverified Google email must never be used to match an existing account.
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new SocialAuthError('Google account has no verified email')
    }

    return {
      provider: 'google',
      providerId: String(profile.sub),
      email: String(profile.email).toLowerCase(),
      name: profile.name || String(profile.email).split('@')[0],
      avatar: profile.picture || undefined,
    }
  }

  private async verifyFacebook(input: SocialCodeExchange): Promise<SocialAuthData> {
    const appId = env.get('FACEBOOK_APP_ID')
    const appSecret = env.get('FACEBOOK_APP_SECRET')
    if (!appId || !appSecret) {
      throw new SocialAuthError('Facebook login is not configured', 503)
    }

    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.search = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
    }).toString()

    const token = await this.getJson(tokenUrl.toString())
    if (!token.access_token) {
      throw new SocialAuthError('Facebook code exchange failed')
    }

    // appsecret_proof proves the call comes from a server holding the app secret
    const proof = createHmac('sha256', appSecret).update(token.access_token).digest('hex')
    const meUrl = new URL('https://graph.facebook.com/v19.0/me')
    meUrl.search = new URLSearchParams({
      fields: 'id,name,email,picture',
      access_token: token.access_token,
      appsecret_proof: proof,
    }).toString()

    const profile = await this.getJson(meUrl.toString())

    // Facebook only returns an email once the user has confirmed it
    if (!profile.id || !profile.email) {
      throw new SocialAuthError('Facebook account has no email address')
    }

    return {
      provider: 'facebook',
      providerId: String(profile.id),
      email: String(profile.email).toLowerCase(),
      name: profile.name || String(profile.email).split('@')[0],
      avatar: profile.picture?.data?.url || undefined,
    }
  }

  private async postForm(url: string, body: URLSearchParams): Promise<any> {
    const response = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    return this.readJson(response)
  }

  private async getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    const response = await request(url, { method: 'GET', headers })
    return this.readJson(response)
  }

  private async readJson(response: Awaited<ReturnType<typeof request>>): Promise<any> {
    const data = (await response.body.json().catch(() => ({}))) as any
    if (response.statusCode !== 200) {
      throw new SocialAuthError('Social provider rejected the request')
    }
    return data
  }
}
