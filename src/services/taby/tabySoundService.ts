import { createAudioPlayer } from 'expo-audio';

const SOUND_ASSETS: Record<string, any> = {
  bubble: require('../../../assets/taby/bubble.mp3'),
  chime: require('../../../assets/taby/chime.mp3'),
  twinkle: require('../../../assets/taby/twinkle.mp3'),
  pop: require('../../../assets/taby/pop.mp3'),
  alarm: require('../../../assets/taby/alarm.mp3'),
};

export type TabySoundName = 'bubble' | 'chime' | 'twinkle' | 'pop' | 'alarm';

class TabySoundService {
  private players: Partial<Record<TabySoundName, any>> = {};

  private getPlayer(sound: TabySoundName) {
    if (!this.players[sound]) {
      try {
        const source = SOUND_ASSETS[sound];
        if (source) {
          this.players[sound] = createAudioPlayer(source);
        }
      } catch (err) {
        console.warn(`[TabySoundService] Error creando reproductor para ${sound}:`, err);
      }
    }
    return this.players[sound];
  }

  play(sound: TabySoundName) {
    try {
      const player = this.getPlayer(sound);
      if (player) {
        if (typeof player.seekTo === 'function') {
          player.seekTo(0).catch(() => {});
        } else if ('currentTime' in player) {
          try {
            player.currentTime = 0;
          } catch (_) {}
        }
        player.play();
      }
    } catch (err) {
      console.warn(`[TabySoundService] Error reproduciendo ${sound}:`, err);
    }
  }
}

export const tabySoundService = new TabySoundService();

