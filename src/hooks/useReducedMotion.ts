import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to reactively track whether device has Reduced Motion enabled.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
