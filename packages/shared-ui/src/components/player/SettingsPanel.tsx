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

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface SettingsPanelProps {
  visible: boolean;
  playbackSpeed: PlaybackSpeed;
  onSelectSpeed: (speed: PlaybackSpeed) => void;
  onClose: () => void;
  opacity?: Animated.Value;
}

/**
 * Full-screen overlay panel for playback settings.
 *
 * Shows playback speed options in a grid layout.
 * Each item is focusable via react-tv-space-navigation.
 * The panel replaces the regular VideoOverlay when active.
 *
 * TV-friendly design:
 * - Up/Down/Left/Right to navigate speed options
 * - Back to close
 */
const SettingsPanel: React.FC<SettingsPanelProps> = ({
  visible,
  playbackSpeed,
  onSelectSpeed,
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
        <Text style={styles.headerTitle}>Playback Speed</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Speed options grid */}
      <View style={styles.speedGridContainer}>
        <Text style={styles.sectionSubtitle}>
          Change how fast or slow the video plays
        </Text>
        <View style={styles.speedGrid}>
          {PLAYBACK_SPEEDS.map((speed) => (
            <SpatialNavigationFocusableView key={speed}>
              {({ isFocused }) => {
                const isSelected = playbackSpeed === speed;
                const label = speed === 1 ? 'Normal' : `${speed}x`;
                return (
                  <FocusablePressable
                    text={label}
                    onSelect={() => onSelectSpeed(speed)}
                    style={[
                      styles.speedItem,
                      isSelected && styles.speedItemSelected,
                      isFocused && !isSelected && styles.speedItemFocused,
                    ]}
                  >
                    <Text
                      style={[
                        styles.speedLabel,
                        isSelected && styles.speedLabelSelected,
                        isFocused && !isSelected && styles.speedLabelFocused,
                      ]}
                    >
                      {label}
                    </Text>
                    {speed === 1 && (
                      <Text style={styles.speedDefaultHint}>Default</Text>
                    )}
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </FocusablePressable>
                );
              }}
            </SpatialNavigationFocusableView>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

SettingsPanel.displayName = 'SettingsPanel';

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
  speedGridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingTop: scaledPixels(30),
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: scaledPixels(20),
    marginBottom: scaledPixels(40),
    textAlign: 'center',
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: scaledPixels(16),
    maxWidth: scaledPixels(900),
  },
  speedItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaledPixels(32),
    paddingVertical: scaledPixels(20),
    borderRadius: scaledPixels(12),
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: scaledPixels(160),
    minHeight: scaledPixels(100),
  },
  speedItemSelected: {
    backgroundColor: 'rgba(0, 150, 255, 0.2)',
    borderColor: colors.primary,
  },
  speedItemFocused: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  speedLabel: {
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
  },
  speedLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  speedLabelFocused: {
    color: '#fff',
  },
  speedDefaultHint: {
    color: colors.textSecondary,
    fontSize: scaledPixels(14),
    marginTop: scaledPixels(4),
  },
  checkmark: {
    color: colors.primary,
    fontSize: scaledPixels(22),
    fontWeight: '700',
    position: 'absolute',
    top: scaledPixels(8),
    right: scaledPixels(8),
  },
});

export default SettingsPanel;
