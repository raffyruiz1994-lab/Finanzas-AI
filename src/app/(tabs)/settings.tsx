import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { CURRENCIES, CurrencyCode } from '@/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { PressableScale } from '@/components/animated/PressableScale';
import { MotionView } from '@/components/animated/MotionView';
import { TabScreenTransition } from '@/components/animated/TabScreenTransition';
import { RecurringModal } from '@/components/modals/RecurringModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { AppSplashScreen } from '@/components/auth/AppSplashScreen';
import {
  AuthModal,
  BudgetPeriodModal,
  CategoryManagerModal,
  CommonTemplatesModal,
  TagsManagerModal,
  SafeSpendConfigModal,
  BackupRestoreModal,
  ExportDataModal,
  NotificationsModal,
  TermsModal,
  PrivacyModal,
  ConnectDevModal,
  DeleteDataModal,
} from '@/components/modals/SettingsModals';

export default function SettingsScreen() {
  const { isDark, colors, themeMode, setThemeMode } = useAppTheme();

  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const budgetPeriod = useSettingsStore((state) => state.budgetPeriod);
  const isSafeSpendVisible = useSettingsStore((state) => state.isSafeSpendVisible);
  const user = useSettingsStore((state) => state.user);
  const isGuest = useSettingsStore((state) => state.isGuest);
  const logout = useSettingsStore((state) => state.logout);

  const categories = useFinanceStore((state) => state.categories);
  const tags = useFinanceStore((state) => state.tags);
  const commonTemplates = useFinanceStore((state) => state.commonTemplates);

  // Modals state
  const [budgetPeriodModalVisible, setBudgetPeriodModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [commonTemplatesModalVisible, setCommonTemplatesModalVisible] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [safeSpendModalVisible, setSafeSpendModalVisible] = useState(false);

  const [backupRestoreModalVisible, setBackupRestoreModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [connectDevModalVisible, setConnectDevModalVisible] = useState(false);
  const [deleteDataModalVisible, setDeleteDataModalVisible] = useState(false);

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [previewSplash, setPreviewSplash] = useState(false);

  return (
    <TabScreenTransition style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.brandIconBox, { backgroundColor: 'rgba(255, 104, 0, 0.15)' }]}>
            <Ionicons name="trending-up" size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
            <Text style={[styles.subTitle, { color: colors.textSecondary }]}>General y Cuenta</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* SECCIÓN 0: PERFIL Y ESTADO DE CUENTA                      */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={0}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>MI CUENTA Y SEGURIDAD</Text>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: user ? colors.border : 'rgba(245, 158, 11, 0.3)' }]}>
            {user ? (
              <View style={styles.profileContent}>
                <View style={styles.profileTopRow}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarBox, { backgroundColor: colors.primaryGlow }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileInfoCol}>
                    <Text style={[styles.profileName, { color: colors.text }]}>{user.name}</Text>
                    <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                    <View style={styles.profileBadgeRow}>
                      <View style={styles.statusDot} />
                      <Ionicons
                        name={user.provider === 'apple' ? 'logo-apple' : 'logo-google'}
                        size={12}
                        color={user.provider === 'apple' ? '#FFFDF5' : '#EA4335'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.profileProviderText, { color: colors.textMuted }]}>
                        Sincronizado con {user.provider === 'apple' ? 'Apple' : 'Google'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.border, marginVertical: 12 }]} />

                <PressableScale
                  activeScale={0.97}
                  hapticType="warning"
                  onPress={() => {
                    Alert.alert(
                      'Cerrar sesión',
                      '¿Deseas cerrar sesión? Volverás a la pantalla de bienvenida.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Cerrar sesión',
                          style: 'destructive',
                          onPress: () => logout(),
                        },
                      ]
                    );
                  }}
                  style={styles.logoutBtn}
                >
                  <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                  <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                </PressableScale>
              </View>
            ) : (
              <View style={styles.profileContent}>
                <View style={styles.profileTopRow}>
                  <View style={[styles.avatarBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.profileInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.profileName, { color: colors.text }]}>Modo Invitado</Text>
                      <View style={styles.guestBadge}>
                        <Text style={styles.guestBadgeText}>Sin sincronizar</Text>
                      </View>
                    </View>
                    <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                      Tus datos están guardados solo en este dispositivo.
                    </Text>
                  </View>
                </View>

                <View style={[styles.separator, { backgroundColor: colors.border, marginVertical: 12 }]} />

                <PressableScale
                  activeScale={0.97}
                  hapticType="medium"
                  onPress={() => setLoginModalVisible(true)}
                  style={[
                    styles.connectAccountBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={16} color="#0D0C0A" />
                  <Text style={styles.connectAccountBtnText}>Iniciar sesión / Respaldar datos</Text>
                </PressableScale>
              </View>
            )}
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* SECCIÓN 1: GESTIÓN DE GASTOS                              */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={1}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>GESTIÓN DE GASTOS</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* 1. Período de presupuesto */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setBudgetPeriodModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Período de presupuesto</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{budgetPeriod}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 2. Categorías (23) */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setCategoryModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="folder-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Categorías ({categories.length})
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Administrar categorías</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 3. Registros comunes */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setCommonTemplatesModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Registros comunes</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    Movimientos repetidos de un toque
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 4. Etiquetas (1) */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setTagsModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Etiquetas ({tags.length})
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    Separa tus gastos por contexto
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 5. Programadas */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setRecurringModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="repeat-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Programadas</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Transacciones automáticas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 6. Seguro para Gastar */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setSafeSpendModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Seguro para Gastar</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {isSafeSpendVisible ? 'Visible en Inicio' : 'Oculto en Inicio'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* SECCIÓN 2: PREFERENCIAS GENERALES                         */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={2}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>PREFERENCIAS GENERALES</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Moneda Principal */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setCurrencyModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="cash-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Moneda Principal</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {CURRENCIES[currency]?.flag} {currency} - {CURRENCIES[currency]?.name}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* Tema */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setThemeModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Apariencia</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    {themeMode === 'dark' ? '🌙 Oscuro' : themeMode === 'light' ? '☀️ Claro' : '⚙️ Automático (Sistema)'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* Pantalla de carga (Splash) */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setPreviewSplash(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Pantalla de carga (Splash)</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    Previsualizar animación de bienvenida
                  </Text>
                </View>
              </View>
              <Ionicons name="play-outline" size={16} color={colors.primary} />
            </PressableScale>
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* SECCIÓN 3: DATOS Y SEGURIDAD                              */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={3}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>DATOS Y SEGURIDAD</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* 1. Respaldo y restauración */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setBackupRestoreModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="shield-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Respaldo y restauración</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    Respaldar y restaurar datos
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 2. Exportar datos */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setExportModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Exportar datos</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                    Descargar en CSV o reporte PDF
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* 3. Notificaciones */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setNotificationsModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Notificaciones</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Recordatorios y alertas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* SECCIÓN 4: LEGAL                                          */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={4}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>LEGAL</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Términos de Servicio */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setTermsModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="newspaper-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Términos de Servicio</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* Política de Privacidad */}
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setPrivacyModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.backgroundSubtle }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Política de Privacidad</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* SECCIÓN 5: CONÉCTATE CON EL DEV                           */}
        {/* ========================================================= */}
        <MotionView preset="slideUp" index={5}>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 4 }]}>
            <PressableScale
              activeScale={0.985}
              hapticType="selection"
              onPress={() => setConnectDevModalVisible(true)}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Ionicons name="logo-instagram" size={18} color="#EC4899" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Conéctate con el dev</Text>
                  <Text style={[styles.settingValue, { color: colors.textSecondary }]}>@kevindrums92</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
            </PressableScale>
          </View>
        </MotionView>

        {/* ========================================================= */}
        {/* FOOTER: VERSIÓN Y BOTÓN ELIMINAR MIS DATOS                */}
        {/* ========================================================= */}
        <MotionView preset="fade" index={6}>
          <View style={styles.footerContainer}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>v0.17.11</Text>
            <PressableScale
              activeScale={0.96}
              hapticType="warning"
              onPress={() => setDeleteDataModalVisible(true)}
              style={styles.deleteBtn}
              hitSlop={12}
            >
              <Text style={styles.deleteBtnText}>Eliminar mis datos</Text>
            </PressableScale>
          </View>
        </MotionView>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ========================================================= */}
      {/* MODALES FUNCIONALES                                       */}
      {/* ========================================================= */}
      <BudgetPeriodModal
        visible={budgetPeriodModalVisible}
        onClose={() => setBudgetPeriodModalVisible(false)}
      />
      <CategoryManagerModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
      />
      <CommonTemplatesModal
        visible={commonTemplatesModalVisible}
        onClose={() => setCommonTemplatesModalVisible(false)}
      />
      <TagsManagerModal
        visible={tagsModalVisible}
        onClose={() => setTagsModalVisible(false)}
      />
      <RecurringModal
        visible={recurringModalVisible}
        onClose={() => setRecurringModalVisible(false)}
      />
      <SafeSpendConfigModal
        visible={safeSpendModalVisible}
        onClose={() => setSafeSpendModalVisible(false)}
      />

      <BackupRestoreModal
        visible={backupRestoreModalVisible}
        onClose={() => setBackupRestoreModalVisible(false)}
      />
      <ExportDataModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />

      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />
      <PrivacyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
      <ConnectDevModal
        visible={connectDevModalVisible}
        onClose={() => setConnectDevModalVisible(false)}
      />
      <DeleteDataModal
        visible={deleteDataModalVisible}
        onClose={() => setDeleteDataModalVisible(false)}
      />

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />

      {/* Modal de Inicio de Sesión / Respaldar Datos */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        canDismiss={true}
      />

      {/* Previsualización interactiva de la Pantalla de Carga (Splash) */}
      {previewSplash && (
        <AppSplashScreen
          minDuration={2200}
          onFinish={() => setPreviewSplash(false)}
        />
      )}

      {/* Modal Moneda */}
      <Modal visible={currencyModalVisible} transparent animationType="fade" onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Moneda</Text>
              <PressableScale
                activeScale={0.9}
                hapticType="light"
                onPress={() => setCurrencyModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </PressableScale>
            </View>

            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
              const c = CURRENCIES[code];
              const isSelected = currency === code;
              return (
                <PressableScale
                  key={code}
                  activeScale={0.97}
                  hapticType="selection"
                  onPress={() => {
                    setCurrency(code);
                    setCurrencyModalVisible(false);
                  }}
                  style={[
                    styles.currencyOption,
                    {
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : colors.backgroundSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.currencyFlag}>{c.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.currencyName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.currencyCodeText, { color: colors.textSecondary }]}>
                      {c.code} ({c.symbol})
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </PressableScale>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Modal Tema (Apariencia) */}
      <Modal visible={themeModalVisible} transparent animationType="fade" onRequestClose={() => setThemeModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Apariencia</Text>
              <PressableScale
                activeScale={0.9}
                hapticType="light"
                onPress={() => setThemeModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </PressableScale>
            </View>

            {[
              {
                id: 'light',
                label: '☀️ Claro',
                sublabel: 'Fondo claro, tarjetas blancas y alto contraste',
                icon: 'sunny-outline',
              },
              {
                id: 'dark',
                label: '🌙 Oscuro',
                sublabel: 'Obsidiana profunda y oro radiante',
                icon: 'moon-outline',
              },
              {
                id: 'system',
                label: '⚙️ Automático',
                sublabel: 'Sigue la configuración del sistema operativo',
                icon: 'phone-portrait-outline',
              },
            ].map((t) => {
              const isSelected = themeMode === t.id;
              return (
                <PressableScale
                  key={t.id}
                  activeScale={0.97}
                  hapticType="selection"
                  onPress={() => {
                    setThemeMode(t.id as any);
                    setThemeModalVisible(false);
                  }}
                  style={[
                    styles.currencyOption,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.backgroundSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={t.icon as any} size={22} color={isSelected ? colors.primary : colors.text} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.currencyName, { color: colors.text }]}>
                      {t.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {t.sublabel}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </PressableScale>
              );
            })}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </TabScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 12,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
    marginTop: 6,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginLeft: 66,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  currencyFlag: {
    fontSize: 22,
  },
  currencyName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  currencyCodeText: {
    fontSize: 11.5,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  profileContent: {
    width: '100%',
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#FF6800',
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: '400',
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  profileProviderText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  guestBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 104, 0, 0.15)',
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6800',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  connectAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectAccountBtnText: {
    color: '#0D0C0A',
    fontSize: 14,
    fontWeight: '800',
  },
});
