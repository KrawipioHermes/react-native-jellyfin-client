import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to manage the controls visibility with auto-hide timer.
 *
 * @param autoHideMs - Time in ms before controls auto-hide (default: 5000)
 * @param hold - When true, auto-hide is paused (default: false). Use this for
 *   overlays like track selectors that should stay visible while interacting.
 * @returns [controlsVisible, showControls]
 */
export function useAutoHideControls(
  autoHideMs: number = 5000,
  hold: boolean = false,
): [boolean, () => void] {
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdRef = useRef<boolean>(hold);

  // Keep ref in sync with prop so the timeout callback reads the latest value
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  const scheduleHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      // Don't auto-hide if hold is active (e.g., track selector panel open)
      if (!holdRef.current) {
        setControlsVisible(false);
      }
    }, autoHideMs);
  }, [autoHideMs]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // If hold changes while visible, schedule or clear appropriately
  useEffect(() => {
    if (controlsVisible) {
      if (hold) {
        // Clear the timeout while holding
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      } else {
        // Restart the timer when hold releases
        scheduleHide();
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [hold, controlsVisible, scheduleHide]);

  return [controlsVisible, showControls];
}
