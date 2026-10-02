# 📋 Tareas Pendientes - Finanzas AI

Este archivo mantiene el registro oficial de las tareas pendientes y futuras mejoras planificadas para el proyecto. Cada vez que me pidas ver las tareas o agregar una nueva, consultaremos y actualizaremos esta lista.

---

## ⚡ Comandos Rápidos del Proyecto

* **Compilación de Android**: *"compila y dame la app android"* ➔ Dispara manualmente la creación de un nuevo `.apk` en GitHub Actions y entrega el enlace de descarga directo (para no compilar en cada cambio menor).
* **Login Offline**: *"pongamos el login que guarde de manera local en la apk"* ➔ Activa la implementación de autenticación local en el dispositivo.

---

## ⏳ Tareas Pendientes

### 1. Autenticación y Registro Local Offline en el APK
* **Frase clave de activación**: *"pongamos el login que guarde de manera local en la apk"*
* **Fecha de registro**: 2026-10-02
* **Prioridad**: Alta / Siguiente fase
* **Descripción**:
  * Implementar un sistema de autenticación offline en `AsyncStorage` (`useSettingsStore.ts` y `LoginModal.tsx`).
  * Si el servidor de la PC está apagado o el teléfono no tiene conexión, permitir que el usuario cree su cuenta (Nombre, Correo y Contraseña) directamente en el dispositivo.
  * Validar inicio de sesión localmente sin errores de conexión.
  * Permitir que los datos del usuario se guarden en el almacenamiento privado del teléfono sin depender de la computadora encendida.

---

## ✅ Tareas Completadas Recientemente

* [x] **Compilación y generación del instalador Android APK (`app-release.apk`)**: Configurado flujo de GitHub Actions con Node 20, Java 17 y Gradle. Generado APK release firmado automáticamente.
* [x] **Eliminación y reversión completa del Avatar AI**: Removidas librerías pesadas y limpiadas las pantallas para mantener el rendimiento fluido original.
* [x] **Normalización de estilos en Modales**: Adaptación de `NewTransactionModal` (categorías, etiquetas) y `RecurringConfigModal` al tema dinámico (oscuro/claro) con la paleta de colores de la app.
