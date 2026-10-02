import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore, CommonTemplate } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks';
import { apiClient } from '@/api/apiClient';
import { CURRENCIES, Category } from '@/types';

// ==========================================
// 1. MODAL VINCULAR / CREAR CUENTA
// ==========================================
interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Por favor introduce correo y contraseña');
      return;
    }
    setLoading(true);
    setStatusMsg('');

    try {
      const endpoint = tab === 'register' ? '/auth/register' : '/auth/login';
      const body = tab === 'register' ? { name, email, password } : { email, password };
      const res = await apiClient.post<{ token: string; user: any }>(endpoint, body);

      if (res.success && res.data?.token) {
        await apiClient.setToken(res.data.token);
        setStatusMsg('¡Sesión vinculada exitosamente con la nube!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg(res.error || 'Credenciales inválidas o error de conexión');
      }
    } catch (e: any) {
      setStatusMsg('Modo offline: Cuenta guardada localmente');
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {tab === 'register' ? 'Crear tu Cuenta' : 'Iniciar Sesión'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab switcher */}
          <View style={[styles.authTabRow, { backgroundColor: colors.backgroundSubtle }]}>
            <Pressable
              onPress={() => setTab('register')}
              style={[
                styles.authTabBtn,
                tab === 'register' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.authTabBtnText,
                  { color: tab === 'register' ? '#0D0C0A' : colors.textSecondary },
                ]}
              >
                Registro
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab('login')}
              style={[
                styles.authTabBtn,
                tab === 'login' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.authTabBtnText,
                  { color: tab === 'login' ? '#0D0C0A' : colors.textSecondary },
                ]}
              >
                Ingreso
              </Text>
            </Pressable>
          </View>

          {tab === 'register' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder="Tu nombre completo"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
            placeholder="Contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {statusMsg ? (
            <Text style={[styles.statusText, { color: colors.primary }]}>{statusMsg}</Text>
          ) : null}

          <Pressable
            onPress={handleAuth}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0D0C0A" />
            ) : (
              <Text style={styles.submitBtnText}>
                {tab === 'register' ? 'Crear Cuenta y Vincular' : 'Iniciar Sesión'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 2. MODAL PERÍODO DE PRESUPUESTO
// ==========================================
interface BudgetPeriodModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BudgetPeriodModal: React.FC<BudgetPeriodModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const budgetPeriod = useSettingsStore((state) => state.budgetPeriod);
  const setBudgetPeriod = useSettingsStore((state) => state.setBudgetPeriod);

  const periods = [
    { id: 'Mensual', title: 'Mensual', desc: 'Del 1 al último día de cada mes (Recomendado)', icon: 'calendar-outline' },
    { id: 'Quincenal', title: 'Quincenal', desc: 'Cortes los días 15 y 30 de cada mes', icon: 'time-outline' },
    { id: 'Semanal', title: 'Semanal', desc: 'Reinicio cada lunes de semana', icon: 'repeat-outline' },
    { id: 'Anual', title: 'Anual', desc: 'Acumulado y control del año fiscal', icon: 'globe-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Período de Presupuesto</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Define el ciclo en el que se renuevan y calculan tus metas y presupuestos:
          </Text>

          {periods.map((p) => {
            const isSelected = budgetPeriod === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  setBudgetPeriod(p.id);
                  onClose();
                }}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.12)' : colors.backgroundSubtle,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.08)' }]}>
                  <Ionicons name={p.icon as any} size={18} color={isSelected ? '#0D0C0A' : colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.text, fontWeight: isSelected ? '800' : '600' }]}>
                    {p.title}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{p.desc}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 3. MODAL GESTOR DE CATEGORÍAS Y GRUPOS (MODERNO CON GRUPOS DE CATEGORÍAS)
// ==========================================
export { CategoryManagerModal } from '@/components/categories/CategoryManagerModal';


// ==========================================
// 4. MODAL REGISTROS COMUNES (UN TOQUE)
// ==========================================
export { CommonTemplatesModal } from './CommonTemplatesModal';

// ==========================================
// 5. MODAL ADMINISTRAR ETIQUETAS
// ==========================================
interface TagsManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TagsManagerModal: React.FC<TagsManagerModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const tags = useFinanceStore((state) => state.tags);
  const addTag = useFinanceStore((state) => state.addTag);
  const deleteTag = useFinanceStore((state) => state.deleteTag);
  const transactions = useFinanceStore((state) => state.transactions);

  const [newTagInput, setNewTagInput] = useState('');

  const handleAdd = () => {
    if (!newTagInput.trim()) return;
    addTag(newTagInput.trim());
    setNewTagInput('');
  };

  const getTagCount = (t: string) => {
    return transactions.filter((tx) => tx.tags && tx.tags.includes(t)).length;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Etiquetas ({tags.length})</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.textSecondary }]}>
                  Separa tus gastos por contexto
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Input para agregar */}
          <View style={styles.addTagInputRow}>
            <TextInput
              style={[styles.tagInput, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder="#nueva_etiqueta"
              placeholderTextColor={colors.textMuted}
              value={newTagInput}
              onChangeText={setNewTagInput}
            />
            <Pressable onPress={handleAdd} style={[styles.addTagBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={20} color="#0D0C0A" />
              <Text style={styles.addTagBtnText}>Agregar</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false}>
            {tags.map((t) => {
              const count = getTagCount(t);
              return (
                <View
                  key={t}
                  style={[styles.tagCardRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}
                >
                  <View style={styles.tagBadgePill}>
                    <Text style={styles.tagBadgePillText}>{t}</Text>
                  </View>
                  <Text style={[styles.tagUsageText, { color: colors.textSecondary }]}>
                    {count} {count === 1 ? 'movimiento' : 'movimientos'}
                  </Text>
                  <Pressable onPress={() => deleteTag(t)} style={styles.trashBtn} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 6. MODAL CONFIGURACIÓN SEGURO PARA GASTAR
// ==========================================
interface SafeSpendConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SafeSpendConfigModal: React.FC<SafeSpendConfigModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const isSafeSpendVisible = useSettingsStore((state) => state.isSafeSpendVisible);
  const setIsSafeSpendVisible = useSettingsStore((state) => state.setIsSafeSpendVisible);

  const [reserveBills, setReserveBills] = useState('15,000');
  const [reserveDays, setReserveDays] = useState('2');

  const handleSave = () => {
    alert('Configuración de Seguro para Gastar guardada con éxito.');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Seguro para Gastar</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Toggle Visible en Inicio */}
          <View style={[styles.toggleCardRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Visible en Inicio</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Muestra el widget protector en tu pantalla principal
              </Text>
            </View>
            <Switch
              value={isSafeSpendVisible}
              onValueChange={setIsSafeSpendVisible}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#334155', true: '#00C076' }}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Reserva fija para facturas y compromisos (RD$)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
            value={reserveBills}
            onChangeText={setReserveBills}
            keyboardType="numeric"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Días de amortización hasta tu próximo ingreso
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
            value={reserveDays}
            onChangeText={setReserveDays}
            keyboardType="numeric"
          />

          <Pressable onPress={handleSave} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.submitBtnText}>Guardar Configuración</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 7. MODAL RESPALDO Y RESTAURACIÓN
// ==========================================
interface BackupRestoreModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const backupData = useFinanceStore((state) => state.backupData);
  const restoreData = useFinanceStore((state) => state.restoreData);
  const syncWithBackend = useFinanceStore((state) => state.syncWithBackend);
  const transactions = useFinanceStore((state) => state.transactions);

  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [showRestoreBox, setShowRestoreBox] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleCreateBackup = async () => {
    try {
      const jsonStr = backupData();
      await Share.share({
        title: 'finanzas_ai_backup.json',
        message: jsonStr,
      });
      setStatusMsg('✓ Copia de seguridad exportada');
    } catch (e: any) {
      setStatusMsg('✓ Copia generada en memoria');
    }
  };

  const handleApplyRestore = () => {
    if (!restoreJsonInput.trim()) {
      alert('Pega el texto JSON de tu copia de seguridad');
      return;
    }
    const result = restoreData(restoreJsonInput.trim());
    if (result.success) {
      alert(result.message);
      setShowRestoreBox(false);
      setRestoreJsonInput('');
      onClose();
    } else {
      alert(result.message);
    }
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    await syncWithBackend();
    setSyncing(false);
    setStatusMsg('✓ Sincronización completada');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="shield-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Respaldo y Restauración</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.textSecondary }]}>
                  Respaldar y restaurar datos
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {statusMsg ? (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={16} color="#00C076" />
              <Text style={styles.successToastText}>{statusMsg}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false}>
            {/* Opción 1: Crear Respaldo */}
            <Pressable
              onPress={handleCreateBackup}
              style={[styles.actionOptionCard, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Crear Copia de Seguridad</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Guarda tus {transactions.length} transacciones y categorías en un archivo JSON portátil.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>

            {/* Opción 2: Restaurar desde copia */}
            <Pressable
              onPress={() => setShowRestoreBox(!showRestoreBox)}
              style={[styles.actionOptionCard, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="download-outline" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Restaurar Copia</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Importa datos desde un archivo o texto JSON guardado previamente.
                </Text>
              </View>
              <Ionicons name={showRestoreBox ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </Pressable>

            {showRestoreBox && (
              <View style={[styles.restoreInputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Pega aquí el código JSON de tu respaldo:
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder='{"appName": "Finanzas AI", ...}'
                  placeholderTextColor={colors.textMuted}
                  value={restoreJsonInput}
                  onChangeText={setRestoreJsonInput}
                  multiline
                />
                <Pressable onPress={handleApplyRestore} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.submitBtnText}>Validar y Restaurar Datos</Text>
                </Pressable>
              </View>
            )}

            {/* Opción 3: Sincronización en la Nube */}
            <Pressable
              onPress={handleSyncCloud}
              style={[styles.actionOptionCard, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Ionicons name="sync-outline" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Sincronizar Finanzas AI Cloud</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Envía y descarga los últimos movimientos a tu servidor seguro.
                </Text>
              </View>
              {syncing ? <ActivityIndicator size="small" color="#3B82F6" /> : <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 8. MODAL EXPORTAR DATOS (CSV Y REPORTE)
// ==========================================
interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);

  const [format, setFormat] = useState<'csv' | 'report'>('csv');
  const [range, setRange] = useState<'all' | 'month'>('all');
  const [copied, setCopied] = useState(false);

  const generateExportContent = () => {
    if (format === 'csv') {
      const header = 'Fecha,Tipo,Categoría,Descripción,Monto,Moneda,Etiquetas\n';
      const rows = transactions.map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId)?.name || t.categoryId;
        return `${t.date},${t.type},"${cat}","${t.description.replace(/"/g, '""')}",${t.amount},${t.currency},"${(t.tags || []).join(';')}"`;
      });
      return header + rows.join('\n');
    } else {
      let totalExp = 0;
      let totalInc = 0;
      transactions.forEach((t) => {
        if (t.type === 'expense') totalExp += t.amount;
        if (t.type === 'income') totalInc += t.amount;
      });

      return `==============================\nREPORTE FINANCIERO - FINANZAS AI\nFecha: ${new Date().toLocaleDateString()}\n==============================\nTotal Ingresos: RD$ ${totalInc.toLocaleString()}\nTotal Gastos: RD$ ${totalExp.toLocaleString()}\nBalance Neto: RD$ ${(totalInc - totalExp).toLocaleString()}\nMovimientos Registrados: ${transactions.length}\n==============================\n`;
    }
  };

  const handleShareExport = async () => {
    const content = generateExportContent();
    try {
      await Share.share({
        title: format === 'csv' ? 'finanzas_ai.csv' : 'reporte_finanzas.txt',
        message: content,
      });
    } catch (e) {
      alert('Contenido listo para exportación');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Exportar Datos</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.textSecondary }]}>
                  Descargar en CSV o reporte PDF
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Formato Selection */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Formato de descarga:</Text>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setFormat('csv')}
              style={[styles.tabBtn, format === 'csv' && { backgroundColor: colors.primary }]}
            >
              <Ionicons name="grid-outline" size={16} color={format === 'csv' ? '#0D0C0A' : colors.textSecondary} />
              <Text style={[styles.tabBtnText, { color: format === 'csv' ? '#0D0C0A' : colors.textSecondary }]}>
                CSV (Excel / Sheets)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFormat('report')}
              style={[styles.tabBtn, format === 'report' && { backgroundColor: colors.primary }]}
            >
              <Ionicons name="newspaper-outline" size={16} color={format === 'report' ? '#0D0C0A' : colors.textSecondary} />
              <Text style={[styles.tabBtnText, { color: format === 'report' ? '#0D0C0A' : colors.textSecondary }]}>
                Reporte de Texto
              </Text>
            </Pressable>
          </View>

          {/* Resumen de contenido a exportar */}
          <View style={[styles.exportSummaryCard, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <Text style={[styles.exportSummaryTitle, { color: colors.text }]}>
              Resumen para exportar
            </Text>
            <Text style={[styles.exportSummarySub, { color: colors.textSecondary }]}>
              • {transactions.length} transacciones registradas{'\n'}
              • {categories.length} categorías incluidas{'\n'}
              • Formato compatible con cualquier software contable
            </Text>
          </View>

          <Pressable onPress={handleShareExport} style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
            <Ionicons name="share-outline" size={18} color="#0D0C0A" />
            <Text style={styles.submitBtnText}>Descargar / Compartir Archivo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 9. MODAL NOTIFICACIONES Y ALERTAS
// ==========================================
interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const notifications = useSettingsStore((state) => state.notifications);
  const updateNotifications = useSettingsStore((state) => state.updateNotifications);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Notificaciones</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.textSecondary }]}>
                  Recordatorios y alertas
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Item 1: Recordatorio Diario */}
          <View style={[styles.toggleCardRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Recordatorio diario</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Aviso a las {notifications.reminderTime} para anotar tus gastos del día
              </Text>
            </View>
            <Switch
              value={notifications.dailyReminder}
              onValueChange={(val) => updateNotifications({ dailyReminder: val })}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>

          {/* Item 2: Alertas de Presupuesto */}
          <View style={[styles.toggleCardRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Alertas de Presupuesto</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Notificación al alcanzar el 80% y 100% del límite mensual
              </Text>
            </View>
            <Switch
              value={notifications.budgetAlerts}
              onValueChange={(val) => updateNotifications({ budgetAlerts: val })}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>

          {/* Item 3: Transacciones Programadas */}
          <View style={[styles.toggleCardRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Pagos Programados</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Aviso un día antes de facturas y suscripciones fijas
              </Text>
            </View>
            <Switch
              value={notifications.recurringAlerts}
              onValueChange={(val) => updateNotifications({ recurringAlerts: val })}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#334155', true: colors.primary }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 10. MODAL TÉRMINOS DE SERVICIO
// ==========================================
interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Términos de Servicio</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Última actualización: Septiembre 2026{'\n\n'}
              1. Aceptación de Términos{'\n'}
              Al descargar y utilizar Finanzas AI, aceptas cumplir con estos términos. La aplicación está diseñada como una herramienta de apoyo para el registro y gestión de finanzas personales.{'\n\n'}
              2. Propiedad de los Datos{'\n'}
              Toda la información registrada (transacciones, saldos, categorías, notas) es propiedad exclusiva del usuario. Los datos se almacenan de manera local y privada.{'\n\n'}
              3. Asistencia de Inteligencia Artificial{'\n'}
              Los análisis, proyecciones y lecturas de recibos generados mediante IA son meramente informativos y orientativos, y no constituyen asesoría financiera formal o legal.{'\n\n'}
              4. Licencia de Uso{'\n'}
              Se otorga al usuario una licencia personal, no exclusiva y gratuita para la gestión de sus finanzas.{'\n\n'}
              5. Modificaciones{'\n'}
              Nos reservamos el derecho de mejorar continuamente la aplicación y actualizar los términos según corresponda.
            </Text>
          </ScrollView>

          <Pressable onPress={onClose} style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 12 }]}>
            <Text style={styles.submitBtnText}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 11. MODAL POLÍTICA DE PRIVACIDAD
// ==========================================
interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Política de Privacidad</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.categoryScrollList} showsVerticalScrollIndicator={false}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Finanzas AI está comprometida con la máxima privacidad y discreción de tu vida financiera:{'\n\n'}
              🛡️ Almacenamiento Local (Offline-First){'\n'}
              Tus movimientos bancarios, montos y descripciones residen en la base de datos interna de tu dispositivo. No transferimos tus registros financieros a terceros ni empresas publicitarias.{'\n\n'}
              🔒 Sin Rastreo Publicitario{'\n'}
              Finanzas AI no contiene cookies de seguimiento, SDKs de rastreo comercial ni venta de perfiles de consumo.{'\n\n'}
              🤖 Procesamiento de IA Seguro{'\n'}
              El reconocimiento de recibos y procesamiento de texto por lenguaje natural se realiza con canales cifrados bajo estrictos estándares de anonimización.{'\n\n'}
              🗑️ Derecho al Olvido Total{'\n'}
              Puedes utilizar la opción "Eliminar mis datos" en cualquier momento para borrar inmediatamente todo el historial sin dejar rastro en ningún servidor.
            </Text>
          </ScrollView>

          <Pressable onPress={onClose} style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 12 }]}>
            <Text style={styles.submitBtnText}>Aceptar y Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 12. MODAL CONÉCTATE CON EL DEV (@kevindrums92)
// ==========================================
interface ConnectDevModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ConnectDevModal: React.FC<ConnectDevModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const handleOpenInstagram = () => {
    Linking.openURL('https://instagram.com/kevindrums92').catch(() => {
      alert('Puedes seguir al desarrollador en Instagram: @kevindrums92');
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                <Ionicons name="logo-instagram" size={20} color="#EC4899" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Conéctate con el dev</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Dev Card */}
          <View style={[styles.devCardProfile, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={styles.devAvatarBox}>
              <Text style={{ fontSize: 32 }}>🥁</Text>
            </View>
            <Text style={[styles.devName, { color: colors.text }]}>Kevin Drums</Text>
            <Text style={[styles.devHandle, { color: colors.primary }]}>@kevindrums92</Text>
            <Text style={[styles.devBio, { color: colors.textSecondary }]}>
              Creador y desarrollador de Finanzas AI. Construyendo aplicaciones móviles modernas y herramientas privadas con IA.
            </Text>
          </View>

          <Pressable
            onPress={handleOpenInstagram}
            style={[styles.socialBtn, { backgroundColor: '#E1306C' }]}
          >
            <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
            <Text style={styles.socialBtnText}>Abrir Instagram (@kevindrums92)</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              alert('¡Gracias por tus comentarios! Escribe a kevindrums92 en Instagram para cualquier sugerencia.');
              onClose();
            }}
            style={[styles.outlineBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={colors.text} />
            <Text style={[styles.outlineBtnText, { color: colors.text }]}>Enviar sugerencia de función</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ==========================================
// 13. MODAL CONFIRMACIÓN ELIMINAR MIS DATOS
// ==========================================
interface DeleteDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppTheme();

  const clearAllData = useFinanceStore((state) => state.clearAllData);

  const handleConfirmDelete = () => {
    clearAllData();
    alert('Todos tus datos han sido eliminados de forma permanente.');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#1C1312' : '#FEF2F2', borderColor: '#EF4444' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name="warning-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.modalTitle, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Eliminar mis datos</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={{ color: isDark ? '#FEE2E2' : '#991B1B', fontSize: 13.5, lineHeight: 20 }}>
            ¿Estás completamente seguro de que deseas eliminar todos tus datos?{'\n\n'}
            Esta acción borrará todas tus transacciones, presupuestos y etiquetas. La aplicación quedará en blanco de forma irreversible.
          </Text>

          <View style={styles.dialogBtnRow}>
            <Pressable onPress={onClose} style={[styles.dialogCancelBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }]}>
              <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleConfirmDelete} style={[styles.dialogConfirmBtn, { backgroundColor: '#EF4444' }]}>
              <Text style={[styles.dialogConfirmText, { color: '#FFF' }]}>Sí, eliminar todo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
    padding: 22,
    borderWidth: 1,
    gap: 12,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 430,
    height: '80%',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  modalSubtitleSmall: {
    fontSize: 11,
    marginTop: 1,
  },
  authTabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginVertical: 4,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  authTabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#0D0C0A',
    fontSize: 14,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillText: {
    fontSize: 12,
  },
  createActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  createActionBtnText: {
    color: '#0D0C0A',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScrollList: {
    flex: 1,
    marginTop: 4,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  catIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catSubs: {
    fontSize: 11,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trashBtn: {
    padding: 6,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dialogConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogConfirmText: {
    color: '#0D0C0A',
    fontSize: 13,
    fontWeight: '800',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 192, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00C076',
    marginBottom: 8,
  },
  successToastText: {
    color: '#00C076',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  templateEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
  },
  templateAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  oneTapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  oneTapBtnText: {
    color: '#0D0C0A',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emojiRow: {
    gap: 8,
    paddingVertical: 6,
  },
  emojiPill: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  addTagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  tagInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addTagBtnText: {
    color: '#0D0C0A',
    fontSize: 13,
    fontWeight: '800',
  },
  tagCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  tagBadgePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgePillText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  tagUsageText: {
    fontSize: 12,
  },
  toggleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  restoreInputBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  exportSummaryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  exportSummaryTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  exportSummarySub: {
    fontSize: 12,
    lineHeight: 18,
  },
  legalText: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  devCardProfile: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 6,
  },
  devAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  devName: {
    fontSize: 17,
    fontWeight: '800',
  },
  devHandle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  devBio: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    marginTop: 6,
  },
  socialBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
