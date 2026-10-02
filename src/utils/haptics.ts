import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized Haptic Feedback Engine
 * Provides subtle, premium tactile feedback for financial interactions.
 * Safely guards against web or unsupported devices.
 */
class HapticsEngine {
  private isEnabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Light impact: For standard button presses, tabs, segmented controls
   */
  public async light(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Fail silently on unsupported hardware
    }
  }

  /**
   * Medium impact: For cards, toggles, modal triggers
   */
  public async medium(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Heavy impact: For major financial operations or confirmations
   */
  public async heavy(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Selection feedback: For picker rolls, list scrolling ticks, carousel page changes
   */
  public async selection(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Success notification: Upon saving transactions, budgets, goals
   */
  public async success(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Warning notification: For exceeding budget, safe-spend warnings
   */
  public async warning(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Error notification: Form validation failure, network sync issue
   */
  public async error(): Promise<void> {
    if (!this.isEnabled || Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      // Fail silently
    }
  }
}

export const haptic = new HapticsEngine();

