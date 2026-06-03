import { useState, useRef, useCallback } from 'react';

/**
 * Hook to manage the controls visibility with auto-hide timer.
 *
 * @param autoHideMs - Time in ms before controls auto-hide (default: 5000)
 * @returns [controlsVisible, showControls]
 */
export function useAutoHideControls(autoHideMs: number = 5000): [boolean, () => void] {
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, autoHideMs);
  }, [autoHideMs]);

  return [controlsVisible, showControls];
}