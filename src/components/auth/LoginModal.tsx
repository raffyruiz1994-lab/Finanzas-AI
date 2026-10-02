import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TermsModal, PrivacyModal } from '@/components/modals/SettingsModals';

const { width } = Dimensions.get('window');

interface LoginModalProps {
  visible: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginModal: React.FC<LoginModalProps> = ({
  visible,
  onClose,
  canDismiss = false,
}) => {
  const loginWithGoogle = useSettingsStore((state) => state.loginWithGoogle);
  const loginWithApple = useSettingsStore((state) => state.loginWithApple);
  const loginWithEmail = useSettingsStore((state) => state.loginWithEmail);
  const registerWithEmail = useSettingsStore((state) => state.registerWithEmail);
  const forgotPassword = useSettingsStore((state) => state.forgotPassword);
  const loginAsGuest = useSettingsStore((state) => state.loginAsGuest);

  // Modo actual: 'login' (Iniciar sesión), 'register' (Crear cuenta), 'forgot' (Olvidé contraseña)
  const [mode, setMode] = useState<AuthMode>('login');

  // Campos de formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estados de carga y feedback
  const [loadingAction, setLoadingAction] = useState<'google' | 'apple' | 'email' | 'guest' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modales legales
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setLoadingAction('google');
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        if (onClose) onClose();
      } else if (!res.canceled) {
        setErrorMessage(res.error || 'No se pudo completar el inicio con Google.');
      }
    } catch (e: any) {
      setErrorMessage('Ocurrió un error al contactar con Google.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAppleLogin = async () => {
    clearMessages();
    setLoadingAction('apple');
    try {
      const res = await loginWithApple();
      if (res.success) {
        if (onClose) onClose();
      } else if (!res.canceled) {
        setErrorMessage(res.error || 'No se pudo completar el inicio con Apple.');
      }
    } catch (e: any) {
      setErrorMessage('Ocurrió un error al contactar con Apple.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmailSubmit = async () => {
    clearMessages();

    if (!email.trim()) {
      setErrorMessage('Por favor introduce tu correo electrónico.');
      return;
    }

    if (mode === 'forgot') {
      setLoadingAction('email');
      try {
        const res = await forgotPassword(email.trim());
        if (res.success) {
          setSuccessMessage(
            res.message || 'Si el correo está registrado, recibirás un enlace de recuperación.'
          );
        } else {
          setErrorMessage(res.error || 'Error al solicitar recuperación.');
        }
      } catch (err: any) {
        setErrorMessage('Error de conexión al servidor.');
      } finally {
        setLoadingAction(null);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Por favor introduce tu contraseña.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor introduce tu nombre completo.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      setLoadingAction('email');
      try {
        const res = await registerWithEmail(name.trim(), email.trim(), password);
        if (res.success) {
          setSuccessMessage('¡Cuenta creada exitosamente! Bienvenido a Finanzas AI.');
          setTimeout(() => {
            if (onClose) onClose();
          }, 600);
        } else {
          setErrorMessage(res.error || 'No se pudo crear la cuenta.');
        }
      } catch (err: any) {
        setErrorMessage('Error de conexión al servidor.');
      } finally {
        setLoadingAction(null);
      }
    } else {
      // Login
      setLoadingAction('email');
      try {
        const res = await loginWithEmail(email.trim(), password);
        if (res.success) {
          if (onClose) onClose();
        } else {
          setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
        }
      } catch (err: any) {
        setErrorMessage('Error de conexión con el servidor.');
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const handleGuestLogin = () => {
    clearMessages();
    setLoadingAction('guest');
    setTimeout(() => {
      loginAsGuest();
      setLoadingAction(null);
      if (onClose) {
        onClose();
      }
    }, 250);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (canDismiss && onClose) onClose();
      }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Background glow & gradients */}
        <LinearGradient
          colors={['#0D0C0A', '#14120E', '#0D0C0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.ambientGlow} />

        {/* Top Header */}
        <View style={styles.topBar}>
          {canDismiss && onClose ? (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color="#FFFDF5" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <Text style={styles.topBarTitle}>
            {mode === 'register'
              ? 'Crear Cuenta'
              : mode === 'forgot'
              ? 'Recuperar Contraseña'
              : 'Iniciar Sesión'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Emblema central de seguridad */}
            <View style={styles.shieldSection}>
              <View style={styles.outerRing}>
                <View style={styles.middleRing}>
                  <View style={styles.innerShieldBox}>
                    <Ionicons name="shield-checkmark" size={38} color="#10B981" />
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={13} color="#0D0C0A" />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Textos de cabecera */}
            <View style={styles.textContainer}>
              <Text style={styles.mainTitle}>
                {mode === 'register'
                  ? 'Crea tu Espacio Financiero'
                  : mode === 'forgot'
                  ? 'Recupera tu Acceso'
                  : 'Protege tus Datos'}
              </Text>
              <Text style={styles.mainSubtitle}>
                {mode === 'forgot'
                  ? 'Introduce tu correo y te enviaremos las instrucciones de recuperación.'
                  : 'Sincroniza tus transacciones entre dispositivos con cifrado seguro y respaldo automático en la nube.'}
              </Text>
            </View>

            {/* Banners de feedback (Errores y Éxitos amigables) */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                <Text style={styles.successBannerText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* BOTONES SOCIALES (Google y Apple) disponibles en login y register */}
            {mode !== 'forgot' && (
              <View style={styles.socialButtonsContainer}>
                {/* 1. Botón Google Real */}
                <Pressable
                  onPress={handleGoogleLogin}
                  disabled={loadingAction !== null}
                  style={({ pressed }) => [
                    styles.btnGoogle,
                    pressed && { transform: [{ scale: 0.98 }] },
                    loadingAction === 'google' && { opacity: 0.8 },
                  ]}
                >
                  {loadingAction === 'google' ? (
                    <ActivityIndicator size="small" color="#1F2937" />
                  ) : (
                    <>
                      <View style={styles.googleIconCircle}>
                        <Ionicons name="logo-google" size={18} color="#EA4335" />
                      </View>
                      <Text style={styles.btnGoogleText}>Continuar con Google</Text>
                    </>
                  )}
                </Pressable>

                {/* 2. Botón Apple Real */}
                <Pressable
                  onPress={handleAppleLogin}
                  disabled={loadingAction !== null}
                  style={({ pressed }) => [
                    styles.btnApple,
                    pressed && { transform: [{ scale: 0.98 }] },
                    loadingAction === 'apple' && { opacity: 0.8 },
                  ]}
                >
                  {loadingAction === 'apple' ? (
                    <ActivityIndicator size="small" color="#FFFDF5" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={20} color="#FFFDF5" style={{ marginRight: 8 }} />
                      <Text style={styles.btnAppleText}>Continuar con Apple</Text>
                    </>
                  )}
                </Pressable>

                {/* Divisor "O continuar con correo" */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o con correo electrónico</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            )}

            {/* FORMULARIO DE CORREO Y CONTRASEÑA */}
            <View style={styles.formContainer}>
              {/* Pestañas de alternancia Iniciar sesión / Crear cuenta */}
              {mode !== 'forgot' && (
                <View style={styles.tabSelector}>
                  <Pressable
                    onPress={() => {
                      clearMessages();
                      setMode('login');
                    }}
                    style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        mode === 'login' ? styles.tabBtnTextActive : styles.tabBtnTextInactive,
                      ]}
                    >
                      Iniciar sesión
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      clearMessages();
                      setMode('register');
                    }}
                    style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        mode === 'register' ? styles.tabBtnTextActive : styles.tabBtnTextInactive,
                      ]}
                    >
                      Crear cuenta
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Campo Nombre (Solo en modo Registro) */}
              {mode === 'register' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="person-outline" size={18} color="#948770" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej. Raffy Ruiz"
                      placeholderTextColor="#6B7280"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Campo Correo Electrónico */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail-outline" size={18} color="#948770" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="tu.correo@ejemplo.com"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Campo Contraseña (No visible en modo forgot) */}
              {mode !== 'forgot' && (
                <View style={styles.inputWrapper}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.inputLabel}>Contraseña</Text>
                    {mode === 'login' && (
                      <Pressable
                        onPress={() => {
                          clearMessages();
                          setMode('forgot');
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.forgotPassLink}>¿Olvidaste tu contraseña?</Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.inputBox}>
                    <Ionicons name="lock-closed-outline" size={18} color="#948770" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={10}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#948770"
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Botón Principal de Acción de Correo */}
              <Pressable
                onPress={handleEmailSubmit}
                disabled={loadingAction !== null}
                style={({ pressed }) => [
                  styles.btnEmailSubmit,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                  loadingAction === 'email' && { opacity: 0.8 },
                ]}
              >
                {loadingAction === 'email' ? (
                  <ActivityIndicator size="small" color="#0D0C0A" />
                ) : (
                  <Text style={styles.btnEmailSubmitText}>
                    {mode === 'register'
                      ? 'Crear mi cuenta segura'
                      : mode === 'forgot'
                      ? 'Enviar enlace de recuperación'
                      : 'Iniciar sesión'}
                  </Text>
                )}
              </Pressable>

              {/* Link para regresar al login desde forgot */}
              {mode === 'forgot' && (
                <Pressable
                  onPress={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  style={styles.backToLoginBtn}
                >
                  <Ionicons name="arrow-back-outline" size={16} color="#FF6800" />
                  <Text style={styles.backToLoginText}>Volver a iniciar sesión</Text>
                </Pressable>
              )}
            </View>

            {/* Divisor "O entra sin cuenta" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o entra sin cuenta</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* BOTÓN INVITADO (GUEST MODE) */}
            <Pressable
              onPress={handleGuestLogin}
              disabled={loadingAction !== null}
              style={({ pressed }) => [
                styles.btnGuest,
                pressed && { transform: [{ scale: 0.98 }], backgroundColor: 'rgba(255, 104, 0, 0.14)' },
                loadingAction === 'guest' && { opacity: 0.8 },
              ]}
            >
              {loadingAction === 'guest' ? (
                <ActivityIndicator size="small" color="#FF6800" />
              ) : (
                <View style={styles.guestRow}>
                  <View style={styles.guestIconBox}>
                    <Ionicons name="person-outline" size={18} color="#FF6800" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnGuestTitle}>Continuar como invitado</Text>
                    <Text style={styles.btnGuestSubtitle}>Explora todas las funciones sin registrarte</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#FF6800" />
                </View>
              )}
            </Pressable>

            {/* Footer Legal con enlaces clickeables a Términos y Privacidad */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                Al continuar, aceptas nuestros{' '}
                <Text style={styles.legalLink} onPress={() => setTermsVisible(true)}>
                  Términos de Servicio
                </Text>{' '}
                y{' '}
                <Text style={styles.legalLink} onPress={() => setPrivacyVisible(true)}>
                  Política de Privacidad
                </Text>
                .
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modales legales funcionales */}
        <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
        <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0F15',
  },
  ambientGlow: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: width * 0.85,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 104, 0, 0.06)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2B3142',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  shieldSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  outerRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 104, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 104, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerShieldBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#181B24',
    borderWidth: 1,
    borderColor: '#2B3142',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#181B24',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFDF5',
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#948770',
    textAlign: 'center',
    fontWeight: '400',
  },
  errorBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  successBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  successBannerText: {
    flex: 1,
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
  },
  socialButtonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 6,
  },
  btnGoogle: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  googleIconCircle: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnGoogleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  btnApple: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1C1917',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAppleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFDF5',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2B3142',
  },
  dividerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#181B24',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B3142',
    padding: 18,
    gap: 14,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FF6800',
  },
  tabBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabBtnTextInactive: {
    color: '#94A3B8',
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassLink: {
    fontSize: 11.5,
    color: '#FF6800',
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0F15',
    borderWidth: 1,
    borderColor: '#2B3142',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  btnEmailSubmit: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF6800',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnEmailSubmitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backToLoginText: {
    color: '#FF6800',
    fontSize: 13,
    fontWeight: '600',
  },
  btnGuest: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 104, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 0, 0.28)',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 104, 0, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnGuestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6800',
  },
  btnGuestSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  legalContainer: {
    marginTop: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#FF6800',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
