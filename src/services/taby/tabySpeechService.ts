import * as Speech from 'expo-speech';

class TabySpeechService {
  private isSpeakingState = false;

  async speak(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onDone?: () => void;
      onStopped?: () => void;
    }
  ) {
    try {
      // Limpiar emojis, símbolos de markdown y caracteres raros para que la voz fluya natural
      const cleanText = text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        callbacks?.onDone?.();
        return;
      }

      await this.stop();
      this.isSpeakingState = true;

      Speech.speak(cleanText, {
        language: 'es-ES',
        pitch: 1.16, // Tono ligeramente más agudo y tierno, idéntico al Taby de los videos de referencia
        rate: 0.95, // Ritmo claro, conversacional y expresivo
        onStart: () => {
          this.isSpeakingState = true;
          callbacks?.onStart?.();
        },
        onDone: () => {
          this.isSpeakingState = false;
          callbacks?.onDone?.();
        },
        onStopped: () => {
          this.isSpeakingState = false;
          callbacks?.onStopped?.();
        },
        onError: (err) => {
          console.warn('[TabySpeechService] Error during Speech.speak:', err);
          this.isSpeakingState = false;
          callbacks?.onDone?.();
        },
      });
    } catch (err) {
      console.warn('[TabySpeechService] Error in speak:', err);
      this.isSpeakingState = false;
      callbacks?.onDone?.();
    }
  }

  async stop() {
    try {
      this.isSpeakingState = false;
      await Speech.stop();
    } catch (err) {
      console.warn('[TabySpeechService] Error stopping speech:', err);
    }
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }
}

export const tabySpeechService = new TabySpeechService();

