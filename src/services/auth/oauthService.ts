import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { apiClient } from '@/api/apiClient';

// Asegurar que WebBrowser complete correctamente cualquier sesión residual
WebBrowser.maybeCompleteAuthSession();

// Client IDs configurables mediante variables de entorno
export const GOOGLE_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

export const APPLE_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || 'com.finanzasai.app',
};

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
  canceled?: boolean;
}

/**
 * Inicia el flujo oficial de Google Sign-In en Web, iOS o Android.
 * Abre la pantalla de autenticación de cuentas de Google, recibe el token y lo valida en el backend.
 */
export async function startGoogleSignIn(): Promise<AuthResult> {
  try {
    const clientId =
      Platform.select({
        ios: GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.webClientId,
        android: GOOGLE_CONFIG.androidClientId || GOOGLE_CONFIG.webClientId,
        default: GOOGLE_CONFIG.webClientId,
      }) || GOOGLE_CONFIG.webClientId;

    if (!clientId) {
      return {
        success: false,
        error:
          'Falta configurar GOOGLE_CLIENT_ID en tus variables de entorno (.env.local). Registra tu aplicación en Google Cloud Console.',
      };
    }

    const redirectUri = Platform.select({
      web: typeof window !== 'undefined' ? `${window.location.origin}/oauth-callback` : 'http://localhost:8081/oauth-callback',
      default: 'https://auth.expo.io/@finanzas-ai/finanzas-ai',
    });

    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=${scope}&nonce=${Date.now()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, canceled: true };
    }

    if (result.type === 'success' && result.url) {
      // Extraer id_token o access_token de la URL de redirección
      const url = result.url;
      const hashParams = new URLSearchParams(url.includes('#') ? url.split('#')[1] : url.split('?')[1]);
      const idToken = hashParams.get('id_token') || hashParams.get('access_token');

      if (!idToken) {
        return {
          success: false,
          error: 'No se recibió la credencial de autenticación desde Google.',
        };
      }

      // Enviar la credencial real al backend para validación oficial
      const backendRes = await apiClient.authGoogle(idToken);
      if (backendRes.success && backendRes.data) {
        return {
          success: true,
          user: backendRes.data.user,
          token: backendRes.data.token,
        };
      } else {
        return {
          success: false,
          error: backendRes.error || 'Error al validar la credencial con el servidor.',
        };
      }
    }

    return {
      success: false,
      error: 'No se completó la autenticación con Google.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error inesperado durante el inicio de sesión con Google.',
    };
  }
}

/**
 * Inicia el flujo oficial de Sign in with Apple.
 * En iOS utiliza la API nativa de Apple. En Web/Android utiliza Apple Web OAuth.
 */
export async function startAppleSignIn(): Promise<AuthResult> {
  try {
    // Si estamos en iOS y la autenticación nativa está disponible
    const isAvailable = await AppleAuthentication.isAvailableAsync().catch(() => false);

    if (Platform.OS === 'ios' && isAvailable) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return {
          success: false,
          error: 'Apple no suministró un token de identidad válido.',
        };
      }

      const backendRes = await apiClient.authApple({
        identityToken: credential.identityToken,
        fullName: credential.fullName,
        user: credential.user,
        email: credential.email || undefined,
      });

      if (backendRes.success && backendRes.data) {
        return {
          success: true,
          user: backendRes.data.user,
          token: backendRes.data.token,
        };
      } else {
        return {
          success: false,
          error: backendRes.error || 'Error al validar la identidad con Apple.',
        };
      }
    } else {
      // Flujo Web / Android con Apple Web OAuth
      const clientId = APPLE_CONFIG.clientId;
      if (!clientId) {
        return {
          success: false,
          error:
            'Falta configurar APPLE_CLIENT_ID en tus variables de entorno (.env.local). Registra tu Service ID en Apple Developer.',
        };
      }

      const redirectUri = Platform.select({
        web: typeof window !== 'undefined' ? `${window.location.origin}/apple-callback` : 'http://localhost:8081/apple-callback',
        default: 'https://auth.expo.io/@finanzas-ai/finanzas-ai',
      });

      const scope = encodeURIComponent('name email');
      const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code%20id_token&scope=${scope}&response_mode=form_post`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, canceled: true };
      }

      if (result.type === 'success' && result.url) {
        const hashParams = new URLSearchParams(result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1]);
        const idToken = hashParams.get('id_token');

        if (!idToken) {
          return {
            success: false,
            error: 'No se recibió el token de identidad desde Apple.',
          };
        }

        const backendRes = await apiClient.authApple({
          identityToken: idToken,
        });

        if (backendRes.success && backendRes.data) {
          return {
            success: true,
            user: backendRes.data.user,
            token: backendRes.data.token,
          };
        } else {
          return {
            success: false,
            error: backendRes.error || 'Error al validar con el servidor.',
          };
        }
      }

      return {
        success: false,
        error: 'No se completó la autenticación con Apple.',
      };
    }
  } catch (err: any) {
    if (err.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, canceled: true };
    }
    return {
      success: false,
      error: err.message || 'Error durante la autenticación con Apple.',
    };
  }
}
