import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';

export interface StartRecordingResult {
  success: boolean;
  isPermissionDenied?: boolean;
  error?: string;
}

function getPlatformRecordingOptions() {
  const preset = RecordingPresets.HIGH_QUALITY;
  const common = {
    extension: preset.extension || '.m4a',
    sampleRate: preset.sampleRate || 44100,
    numberOfChannels: 1, // Mono para voz humana clara y archivos ligeros
    bitRate: 128000,
    isMeteringEnabled: false,
  };

  if (Platform.OS === 'android') {
    return {
      ...common,
      directory: preset.directory,
      ...preset.android,
    };
  }
  if (Platform.OS === 'ios') {
    return {
      ...common,
      directory: preset.directory,
      ...preset.ios,
    };
  }
  return {
    ...common,
    directory: preset.directory,
    ...preset.web,
  };
}

class TabyAudioRecorderService {
  private currentRecorder: any = null;
  private recordingActive = false;
  private hasPermission = false;
  private isAudioModeConfigured = false;
  private startPromise: Promise<StartRecordingResult> | null = null;
  private recordStartTime = 0;

  /**
   * Prepara la sesión de audio en segundo plano apenas se activa Taby
   */
  async prewarm(): Promise<void> {
    try {
      const perm = await getRecordingPermissionsAsync().catch(() => null);
      if (perm?.granted) {
        this.hasPermission = true;
      }
      if (!this.isAudioModeConfigured) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        }).catch(() => {});
        this.isAudioModeConfigured = true;
      }
    } catch (_) {}
  }

  async start(): Promise<StartRecordingResult> {
    // Si ya hay un inicio en progreso, esperar a que termine
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this._startInternal();
    try {
      const result = await this.startPromise;
      return result;
    } finally {
      this.startPromise = null;
    }
  }

  private async _startInternal(): Promise<StartRecordingResult> {
    try {
      // 1. Permisos de micrófono
      let perm = await getRecordingPermissionsAsync().catch(() => null);
      if (!perm || !perm.granted) {
        perm = await requestRecordingPermissionsAsync().catch(() => null);
      }
      if (!perm || !perm.granted) {
        return {
          success: false,
          isPermissionDenied: true,
          error: 'Permiso de micrófono requerido para hablar con Taby',
        };
      }
      this.hasPermission = true;

      // 2. Configurar modo de audio del dispositivo SIEMPRE antes de grabar.
      // En iOS, reproducir video o TTS resetea AVAudioSession a .playback (solo salida),
      // lo cual bloquea el hardware del micrófono y causa grabaciones vacías de puro silencio.
      // Forzar .playAndRecord con mixWithOthers activa el micrófono en iOS y Android.
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers' as any,
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('[TabyAudioRecorderService] setAudioModeAsync warning:', e);
      }

      // 3. Detener grabadora previa si existiera
      if (this.currentRecorder) {
        try {
          await this.currentRecorder.stop();
        } catch (_) {}
        this.currentRecorder = null;
      }

      // 4. Instanciar nueva grabadora nativa
      const platformOptions = getPlatformRecordingOptions();
      const recorder = new AudioModule.AudioRecorder(platformOptions);
      await recorder.prepareToRecordAsync();
      recorder.record();

      this.recordStartTime = Date.now();
      this.currentRecorder = recorder;
      this.recordingActive = true;
      console.log('[TabyAudioRecorderService] Native recorder started successfully with allowsRecording=true');
      return { success: true };
    } catch (err: any) {
      console.warn('[TabyAudioRecorderService] Error starting recording:', err);
      this.recordingActive = false;
      this.currentRecorder = null;
      return {
        success: false,
        isPermissionDenied: false,
        error: err?.message || 'Error al iniciar la grabación de audio',
      };
    }
  }

  async stop(): Promise<string | null> {
    try {
      // Si la grabación apenas estaba iniciando, esperar a que termine de inicializarse
      if (this.startPromise) {
        await this.startPromise;
      }

      if (!this.currentRecorder) {
        this.recordingActive = false;
        return null;
      }

      this.recordingActive = false;
      const rec = this.currentRecorder;
      this.currentRecorder = null;

      // CRÍTICO PARA ANDROID: En MediaRecorder nativo, si stop() se ejecuta
      // antes de que se hayan grabado al menos ~650ms de audio, Android lanza:
      // java.lang.RuntimeException: stop failed. y corrompe/elimina el archivo.
      // Aseguramos que hayan transcurrido al menos 700ms de audio real.
      const elapsed = Date.now() - this.recordStartTime;
      if (elapsed < 700) {
        const waitMs = 700 - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      await rec.stop();
      const outputUri = rec.uri || null;
      console.log('[TabyAudioRecorderService] Recording finished with URI:', outputUri);

      // Restaurar modo de solo reproducción para que la voz y efectos de Taby
      // se reproduzcan con volumen total por el altavoz principal
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers' as any,
          shouldRouteThroughEarpiece: false,
        });
      } catch (_) {}

      return outputUri;
    } catch (err) {
      console.warn('[TabyAudioRecorderService] Error stopping recording:', err);
      this.recordingActive = false;
      this.currentRecorder = null;
      return null;
    }
  }

  isRecording(): boolean {
    return this.recordingActive;
  }
}

export const tabyAudioRecorderService = new TabyAudioRecorderService();

