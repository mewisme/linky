import { createRemoteJWKSet, jwtVerify } from 'jose'

import { config } from '../../config/index.js';

const PROJECT_JWKS = createRemoteJWKSet(
  new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`)
)

export async function verifySupabaseAuthJWT(jwt: string) {
  return jwtVerify(jwt, PROJECT_JWKS)
}