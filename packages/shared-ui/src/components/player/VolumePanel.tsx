import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels } from '../../hooks/useScale';
import { safeZones } from '../../theme';
import { colors } from '../../theme/colors';

/** Number of volume steps (0-10 mapping to 0-1) */
const VOLUME_STEPS = 10;

interface VolumePanelProps {
  visible: boolean;
  volume: number;
  muted: boolean;
  onVolumeChange: (level: number) => void;
  onMutedChange: () => void;
  onClose: () => void;
  opacity?: Animated.Value;
}

/**
 * Full-screen overlay panel for volume control.
 *
 * Shows volume level in a vertical bar layout with focusable +/- controls
 * and a mute toggle. Follows the same full-screen pattern as SettingsPanel
 * for TV focus consistency.
 *
 * TV-friendly design:
 * - +/- buttons to adjust volume in 10% steps
 * - Mute toggle button
 * - Visual volume bar showing current level
 * - "← Back" to close
 */
const VolumePanel: React.FC<VolumePanelProps> = ({
  visible,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  onClose,
  opacity: externalOpacity,
}) => {
  const localOpacity = useMemo(() => new Animated.Value(0), []);
  const opacity = externalOpacity || localOpacity;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) {
    return null;
  }

  const displayVolume = muted ? 0 : volume;
  const volumePercent = Math.round(displayVolume * 100);
  const volumeIcon = muted
    ? '🔇'
    : volume < 0.3
      ? '🔈'
      : volume < 0.7
        ? '🔉'
        : '🔊';

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <SpatialNavigationFocusableView>
          {({ isFocused }) => (
            <FocusablePressable
              text="← Back"
              onSelect={onClose}
              style={[
                styles.backButton,
                isFocused && styles.backButtonFocused,
              ]}
            />
          )}
        </SpatialNavigationFocusableView>
        <Text style={styles.headerTitle}>Volume</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Volume controls */}
      <View style={styles.volumeContainer}>
        {/* Volume icon and percentage */}
        <Text style={styles.volumeIcon}>{volumeIcon}</Text>
        <Text style={styles.volumePercent}>
          {muted ? 'Muted' : `${volumePercent}%`}
        </Text>

        {/* Volume bar */}
        <View style={styles.volumeBarContainer}>
          <View
            style={[
              styles.volumeBar,
              { width: `${volumePercent}%` },
              muted && styles.volumeBarMuted,
            ]}
          />
        </View>

        {/* Step indicators */}
        <Text style={styles.stepHint}>
          {muted
            ? 'Unmute to adjust volume'
            : `Level: ${Math.round(volume * VOLUME_STEPS)} / ${VOLUME_STEPS}`}
        </Text>

        {/* Controls row */}
        <View style={styles.controlsRow}>
          {/* Volume Down */}
          <SpatialNavigationFocusableView>
            {({ isFocused }) => (
              <FocusablePressable
                text="-"
                onSelect={() => onVolumeChange(volume - 0.1)}
                style={[
                  styles.volumeButton,
                  isFocused && styles.volumeButtonFocused,
                  volume <= 0 && styles.volumeButtonDisabled,
                ]}
              />
            )}
          </SpatialNavigationFocusableView>

          {/* Mute toggle */}
          <SpatialNavigationFocusableView>
            {({ isFocused }) => (
              <FocusablePressable
                text={muted ? 'Unmute' : 'Mute'}
                onSelect={onMutedChange}
                style={[
                  styles.muteButton,
                  isFocused && styles.muteButtonFocused,
                  muted && styles.muteButtonActive,
                ]}
              />
            )}
          </SpatialNavigationFocusableView>

          {/* Volume Up */}
          <SpatialNavigationFocusableView>
            {({ isFocused }) => (
              <FocusablePressable
                text="+"
                onSelect={() => onVolumeChange(volume + 0.1)}
                style={[
                  styles.volumeButton,
                  isFocused && styles.volumeButtonFocused,
                  volume >= 1 && styles.volumeButtonDisabled,
                ]}
              />
            )}
          </SpatialNavigationFocusableView>
        </View>
      </View>
    </Animated.View>
  );
};

VolumePanel.displayName = 'VolumePanel';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: scaledPixels(safeZones.actionSafe.vertical),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingBottom: scaledPixels(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(8),
    borderRadius: scaledPixels(8),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
  },
  headerSpacer: {
    width: scaledPixels(100),
  },
  volumeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingBottom: scaledPixels(80),
  },
  volumeIcon: {
    fontSize: scaledPixels(72),
    marginBottom: scaledPixels(16),
  },
  volumePercent: {
    color: colors.text,
    fontSize: scaledPixels(48),
    fontWeight: '700',
    marginBottom: scaledPixels(32),
  },
  volumeBarContainer: {
    width: '60%',
    height: scaledPixels(24),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scaledPixels(12),
    overflow: 'hidden',
    marginBottom: scaledPixels(16),
  },
  volumeBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: scaledPixels(12),
  },
  volumeBarMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepHint: {
    color: colors.textSecondary,
    fontSize: scaledPixels(18),
    marginBottom: scaledPixels(48),
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaledPixels(32),
  },
  volumeButton: {
    width: scaledPixels(80),
    height: scaledPixels(80),
    borderRadius: scaledPixels(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: scaledPixels(36),
  },
  volumeButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 150, 255, 0.2)',
  },
  volumeButtonDisabled: {
    opacity: 0.3,
  },
  muteButton: {
    paddingHorizontal: scaledPixels(32),
    paddingVertical: scaledPixels(16),
    borderRadius: scaledPixels(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: scaledPixels(160),
  },
  muteButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 150, 255, 0.2)',
  },
  muteButtonActive: {
    backgroundColor: 'rgba(255, 50, 50, 0.2)',
    borderColor: '#ff4444',
  },
});

export default VolumePanel;
