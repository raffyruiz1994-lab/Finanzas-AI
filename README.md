# 💎 Finanzas AI — Asistente Inteligente de Finanzas Personales

> **Aplicación móvil y web moderna de finanzas personales**, desarrollada desde cero con **Expo**, **React Native**, **TypeScript** y **Expo Router**, inspirada en la agilidad de registro y claridad de *Lukas* y en los estándares de excelencia de *Copilot*, *Monarch* y *Revolut*.

---

## 📱 Capturas y Referencias de Experiencia

La aplicación implementa los patrones visuales y funcionales clave:
- **Balance Disponible** con barra porcentual de disponibilidad y split cards de **+Ingresos** vs **-Gastos**.
- **Seguro para Gastar**: Indicador principal de liquidez real que descuenta facturas y compromisos programados, calculando el cupo diario disponible (ej. `RD$38,200.00 / día · 2 días restantes`).
- **Ocultamiento de Privacidad**: Botón de ojo en cabecera para anonimizar saldos con `••••••` en lugares públicos.
- **Historial Agrupado por Día**: Cronología con saldo neto diario (ej. `Sábado, 26 Sept. +RD$91,400.00`), iconos temáticos y tags de contexto (ej. `#tarjeta`).
- **Registro Rápido con IA**: Asistente de lenguaje natural que interpreta frases como:
  - *“Gasté 750 pesos en gasolina con la tarjeta”*
  - *“Gasté 2,500 en supermercado”*
  - *“Pagué 1,800 de luz”*
  - *“Recibí 50,000 de salario”*
- **Tarjetas de Crédito**: Visualización de límite total, saldo utilizado, crédito disponible, fecha de corte y fecha de pago.
- **Estadísticas & Vista Rápida**: Grid 2x2 con gasto promedio diario, categoría top, día de mayor gasto y Donut Chart de gastos por categoría.
- **Multi-moneda y Temas**: Soporte nativo para Peso Dominicano (`RD$ DOP`), Dólar (`$ USD`), Euro (`€ EUR`), con selector de modo Oscuro / Claro y datos demo integrados.

---

## 🚀 Cómo Iniciar y Probar la Aplicación

Desde la terminal en Windows o cualquier sistema operativo:

```bash
# 1. Navegar a la carpeta del proyecto
cd Finanzas-AI

# 2. Iniciar el servidor de desarrollo Expo
npx expo start
```

### Opciones de Visualización:
- **Versión Web**: Presiona la tecla `w` en la consola para abrir inmediatamente la aplicación en tu navegador web.
- **iPhone (iOS)**: Abre la cámara de tu iPhone y escanea el código QR mostrado en la terminal para abrirlo en **Expo Go**.
- **Android**: Escanea el código QR desde la aplicación Expo Go en tu dispositivo Android.

---

## 🏗️ Arquitectura del Sistema

```text
Finanzas-AI/
├── src/
│   ├── api/                     # Capa desacoplada para comunicación con Backend API (JWT, REST)
│   │   ├── apiClient.ts
│   │   └── types.ts
│   ├── services/                # Lógica de dominio y servicios independientes de la UI
│   │   ├── safeSpendService.ts  # Algoritmo de cálculo de "Seguro para Gastar"
│   │   └── ai/                  # Capa de IA agnóstica de proveedor
│   │       ├── aiService.interface.ts
│   │       └── naturalLanguageParser.ts # Procesamiento semántico de voz y texto
│   ├── store/                   # Estado global reactivo con Zustand y persistencia local
│   │   ├── useFinanceStore.ts   # Cuentas, transacciones, presupuestos, categorías
│   │   ├── useSettingsStore.ts  # Tema (Dark/Light), moneda, privacidad, modo demo
│   │   └── mockData.ts          # Datos demo de alta fidelidad en RD$
│   ├── constants/               # Tokens de diseño y categorías
│   │   ├── theme.ts             # Paleta esmeralda/obsidiana premium
│   │   └── categories.ts        # Categorías, subcategorías y presets rápidos
│   ├── types/                   # Modelos de datos TypeScript
│   │   └── index.ts
│   ├── components/              # Componentes UI reutilizables
│   │   ├── dashboard/           # HeaderDashboard, BalanceHeroCard, SafeToSpendCard
│   │   ├── transactions/        # TransactionItem, TransactionDayGroup
│   │   └── modals/              # NewTransactionModal (IA + Manual), TransactionDetailModal
│   └── app/                     # Rutas con Expo Router
│       ├── _layout.tsx          # Root Layout con StatusBar y SafeArea
│       └── (tabs)/              # Barra de navegación inferior
│           ├── _layout.tsx      # Configuración de pestañas
│           ├── index.tsx        # Dashboard principal
│           ├── accounts.tsx     # Cuentas bancarias y tarjetas de crédito
│           ├── stats.tsx        # Estadísticas, Vista Rápida y Donut Chart
│           └── settings.tsx     # Ajustes, Sesión invitado, Moneda, Tema y Datos Demo
```

---

## 🗺️ Hoja de Ruta de Desarrollo

- [x] **FASE 1 (Completada con éxito)**:
  - Proyecto Expo configurado y libre de errores de compilación (`tsc --noEmit` limpio).
  - Exportación y bundling Web y Móvil verificados.
  - Dashboard completo con métricas de Lukas (Balance Disponible, Seguro para Gastar, Historial).
  - Cuentas líquidas y Tarjetas de crédito con límites y fechas.
  - Registro inteligente con IA por lenguaje natural y accesos rápidos.
  - Modo Oscuro / Claro y selector de monedas con persistencia.
- [ ] **FASE 2**: Backend API REST / GraphQL, autenticación con Supabase / Firebase / Node, sincronización en la nube.
- [ ] **FASE 3**: Presupuestos avanzados con alertas al 80%/90%/100%, pagos recurrentes con recordatorios, metas de ahorro con aportes periódicos y seguimiento de préstamos/deudas.
- [ ] **FASE 4**: Integración con modelos de IA remotos (Google Gemini, OpenAI, Claude), dictado de voz nativo en streaming, escaneo OCR de recibos con cámara.
- [ ] **FASE 5**: Notificaciones push, widgets de iOS/Android, atajos de Siri y Apple Shortcuts, integración con WhatsApp / Telegram.
