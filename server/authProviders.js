import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Cache en memoria para las claves públicas de Apple (JWKS)
 */
let appleJwksCache = {
  keys: [],
  expiresAt: 0,
};

/**
 * Obtiene y cachea las claves públicas JWKS de Apple
 */
async function getApplePublicKeys() {
  const now = Date.now();
  if (appleJwksCache.keys.length > 0 && appleJwksCache.expiresAt > now) {
    return appleJwksCache.keys;
  }

  try {
    const res = await fetch('https://appleid.apple.com/auth/keys');
    if (!res.ok) {
      throw new Error(`Error HTTP obteniendo JWKS de Apple: ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data.keys)) {
      appleJwksCache = {
        keys: data.keys,
        expiresAt: now + 3600 * 1000 * 12, // Cache por 12 horas
      };
      return data.keys;
    }
  } catch (err) {
    console.error('[AuthProviders] Error fetching Apple JWKS:', err.message);
  }
  return appleJwksCache.keys;
}

/**
 * Valida un token real de Google.
 * Soporta tanto `id_token` (JWT de Google Identity Services / OpenID Connect)
 * como `access_token` (Google OAuth 2.0).
 *
 * @param {string} token - ID Token o Access Token emitido por Google
 * @returns {Promise<{ sub: string, email: string, email_verified: boolean, name: string, picture: string }>}
 */
export async function verifyGoogleCredential(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token de Google no proporcionado o inválido');
  }

  // 1. Intentar validar como id_token a través del endpoint oficial de Google tokeninfo
  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );
    if (tokenInfoRes.ok) {
      const data = await tokenInfoRes.json();
      if (data.sub && data.email) {
        return {
          sub: data.sub,
          email: data.email.toLowerCase(),
          email_verified: data.email_verified === 'true' || data.email_verified === true,
          name: data.name || data.given_name || 'Usuario Google',
          picture: data.picture || null,
        };
      }
    }
  } catch (err) {
    // Si falla tokeninfo, intentaremos con userinfo
  }

  // 2. Intentar validar como access_token con el endpoint userinfo de Google
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (userInfoRes.ok) {
      const data = await userInfoRes.json();
      if (data.sub && data.email) {
        return {
          sub: data.sub,
          email: data.email.toLowerCase(),
          email_verified: data.email_verified === true || data.email_verified === 'true',
          name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim() || 'Usuario Google',
          picture: data.picture || null,
        };
      }
    }
  } catch (err) {
    console.error('[AuthProviders] Error verificando userinfo de Google:', err.message);
  }

  throw new Error('La credencial de Google no pudo ser validada por los servidores de Google.');
}

/**
 * Valida un token real de Apple (identityToken emitido por Sign in with Apple).
 * Verifica la firma criptográfica RS256 contra las claves públicas oficiales de Apple.
 *
 * @param {string} identityToken - JWT emitido por Apple
 * @returns {Promise<{ sub: string, email: string|null, email_verified: boolean }>}
 */
export async function verifyAppleCredential(identityToken) {
  if (!identityToken || typeof identityToken !== 'string') {
    throw new Error('Identity token de Apple no proporcionado');
  }

  // Decodificar el encabezado del JWT para obtener el 'kid' (Key ID)
  const decodedComplete = jwt.decode(identityToken, { complete: true });
  if (!decodedComplete || !decodedComplete.header || !decodedComplete.header.kid) {
    throw new Error('El token de Apple tiene un formato inválido o no contiene un Key ID');
  }

  const { kid, alg } = decodedComplete.header;
  if (alg !== 'RS256') {
    throw new Error(`Algoritmo no soportado en token de Apple: ${alg}`);
  }

  // Obtener JWKS de Apple
  const appleKeys = await getApplePublicKeys();
  const jwk = appleKeys.find((k) => k.kid === kid);

  if (!jwk) {
    throw new Error(`No se encontró la clave pública de Apple para kid: ${kid}`);
  }

  // Convertir JWK a clave pública PEM usando el crypto nativo de Node.js
  let publicKeyPem;
  try {
    const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    publicKeyPem = keyObject.export({ type: 'spki', format: 'pem' });
  } catch (err) {
    throw new Error(`Error convirtiendo JWK de Apple a PEM: ${err.message}`);
  }

  // Verificar la firma del JWT con las claves públicas de Apple
  try {
    const payload = jwt.verify(identityToken, publicKeyPem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    });

    if (!payload.sub) {
      throw new Error('El token de Apple no contiene un identificador único (sub)');
    }

    return {
      sub: payload.sub,
      email: payload.email ? payload.email.toLowerCase() : null,
      email_verified: payload.email_verified === 'true' || payload.email_verified === true,
    };
  } catch (err) {
    throw new Error(`Firma de Apple inválida o token expirado: ${err.message}`);
  }
}
