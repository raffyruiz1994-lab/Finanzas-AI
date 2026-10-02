import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppSplashScreen } from '@/components/auth/AppSplashScreen';
import { LoginModal } from '@/components/auth/LoginModal';
import { GlobalToastContainer } from '@/components/animated/GlobalToastContainer';

export default function RootLayout() {
  const { isDark, colors } = useAppTheme();
  const user = useSettingsStore((state) => state.user);
  const isGuest = useSettingsStore((state) => state.isGuest);
  const checkAuthSession = useSettingsStore((state) => state.checkAuthSession);

  // La pantalla de carga se muestra cada vez que se abre la app
  const [showSplash, setShowSplash] = useState(true);

  // Verificar sesión existente en el backend al iniciar la app
  useEffect(() => {
    checkAuthSession().catch(() => {});
  }, []);

  // Si no hay usuario ni modo invitado activo, se requiere autenticación
  const needsAuth = !user && !isGuest;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider style={{ backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>

        {/* Global Toast / Notification Container */}
        <GlobalToastContainer />

        {/* Pantalla de carga (Splash) en cada apertura de la app */}
        {showSplash && (
          <AppSplashScreen
            minDuration={2100}
            onFinish={() => setShowSplash(false)}
          />
        )}

        {/* Pantalla de Login si aún no ha iniciado sesión ni activado modo invitado */}
        {!showSplash && needsAuth && (
          <LoginModal visible={true} canDismiss={false} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

