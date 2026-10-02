import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';
import { AccessibilityInfo } from 'react-native';

/**
 * ============================================================================
 * CENTRALIZED FINTECH MOTION DESIGN SYSTEM (TOKENS & PHYSICS)
 * ============================================================================
 * Standardized across the entire application for consistent velocity,
 * spring physics, duration, and accessibility (reduced motion).
 */

// 1. Durations (Milliseconds)
export const MOTION_DURATION = {
  /** Fast microinteractions, presses, toggles (150–200ms) */
  fast: 180,
  /** Standard transitions, icon rotations, small card fades (250–350ms) */
  normal: 280,
  /** Smooth expansions, bottom sheets, full screen fades (350–450ms) */
  smooth: 380,
  /** Emphasized celebrations, number counts, toast reveals (450–650ms) */
  emphasis: 520,
} as const;

// 2. Standardized Easing Curves
export const MOTION_EASING = {
  /** Decelerating ease-out curve for natural entrances */
  decelerate: Easing.bezier(0.16, 1, 0.3, 1),
  /** Smooth ease-in-out curve for state morphing */
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  /** Accelerating ease-in curve for exits */
  accelerate: Easing.bezier(0.4, 0, 1, 1),
} as const;

// 3. Spring Configurations
export const SPRING_CONFIG_SNAPPY: WithSpringConfig = {
  damping: 18,
  stiffness: 240,
  mass: 0.8,
  overshootClamping: false,
};

export const SPRING_CONFIG_SMOOTH: WithSpringConfig = {
  damping: 24,
  stiffness: 180,
  mass: 0.9,
  overshootClamping: false,
};

export const SPRING_CONFIG_BOUNCY: WithSpringConfig = {
  damping: 12,
  stiffness: 220,
  mass: 0.7,
  overshootClamping: false,
};

export const SPRING_CONFIG_GENTLE: WithSpringConfig = {
  damping: 28,
  stiffness: 120,
  mass: 1.0,
  overshootClamping: true,
};

// 4. Timing Configurations
export const TIMING_CONFIG_FAST: WithTimingConfig = {
  duration: MOTION_DURATION.fast,
  easing: MOTION_EASING.smooth,
};

export const TIMING_CONFIG_NORMAL: WithTimingConfig = {
  duration: MOTION_DURATION.normal,
  easing: MOTION_EASING.decelerate,
};

export const TIMING_CONFIG_SMOOTH: WithTimingConfig = {
  duration: MOTION_DURATION.smooth,
  easing: MOTION_EASING.decelerate,
};

export const TIMING_CONFIG_EMPHASIS: WithTimingConfig = {
  duration: MOTION_DURATION.emphasis,
  easing: MOTION_EASING.decelerate,
};

// 5. Staggering System
export const STAGGER = {
  fast: 30,
  normal: 45,
  smooth: 65,
} as const;

/**
 * Calculates a capped stagger delay for list items
 * Prevents elements deep in lists from delaying indefinitely
 */
export function getStaggerDelay(
  index: number,
  intervalMs: number = STAGGER.normal,
  maxDelayMs: number = 360
): number {
  return Math.min(Math.max(0, index * intervalMs), maxDelayMs);
}

// 6. Reduced Motion Detection Helper
let isReducedMotionActive = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    isReducedMotionActive = enabled;
  })
  .catch(() => {});

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  isReducedMotionActive = enabled;
});

export function isReduceMotion(): boolean {
  return isReducedMotionActive;
}

export function getSafeDuration(durationMs: number): number {
  return isReducedMotionActive ? Math.min(durationMs, 100) : durationMs;
}
