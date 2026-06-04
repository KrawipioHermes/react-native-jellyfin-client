import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import FocusablePressable from '../FocusablePressable';
import type { MediaTrack } from '../../types/player';
import { scaledPixels } from '../../hooks/useScale';
import { safeZones } from '../../theme';
import { colors } from '../../theme/colors';

interface TrackSelectorPanelProps {
  visible: boolean;
  audioTracks: MediaTrack[];
  subtitleTracks: MediaTrack[];
  selectedAudioIndex: number | null;
  selectedSubtitleIndex: number | null;
  onSelectAudio: (index: number | null) => void;
  onSelectSubtitle: (index: number | null) => void;
  onClose: () => void;
  opacity?: Animated.Value;
}

/**
 * Full-screen overlay panel for selecting audio and subtitle tracks.
 *
 * Shows two columns: Audio tracks (left) and Subtitle tracks (right).
 * Each item is focusable via react-tv-space-navigation.
 * The panel replaces the regular VideoOverlay when active.
 * Pressing Back or the close button dismisses it.
 *
 * TV-friendly design:
 * - Up/Down to navigate tracks within a column
 * - Left/Right to switch between audio and subtitle columns
 * - Back to close
 */
const TrackSelectorPanel: React.FC<TrackSelectorPanelProps> = ({
  visible,
  audioTracks,
  subtitleTracks,
  selectedAudioIndex,
  selectedSubtitleIndex,
  onSelectAudio,
  onSelectSubtitle,
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

  const hasTracks = audioTracks.length > 0 || subtitleTracks.length > 0;

  const renderTrackItem = useCallback(
    (
      track: MediaTrack,
      isSelected: boolean,
      onSelect: () => void,
      column: 'audio' | 'subtitle',
    ) => {
      const label = track.DisplayTitle || track.Language || track.Codec || `Track ${track.Index}`;
      const languageLabel = track.Language
        ? track.Language.toUpperCase()
        : '';
      const subtitle = track.Codec
        ? `${languageLabel}${languageLabel ? ' · ' : ''}${track.Codec}`
        : languageLabel;

      return (
        <SpatialNavigationFocusableView key={`${column}-${track.Index}`}>
          {({ isFocused }) => (
            <FocusablePressable
              text={label}
              onSelect={onSelect}
              style={[
                styles.trackItem,
                isSelected && styles.trackItemSelected,
                isFocused && !isSelected && styles.trackItemFocused,
              ]}
            >
              <Text
                style={[
                  styles.trackLabel,
                  isSelected && styles.trackLabelSelected,
                  isFocused && !isSelected && styles.trackLabelFocused,
                ]}
              >
                {label}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.trackSubtitle,
                    isSelected && styles.trackLabelSelected,
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
              {isSelected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </FocusablePressable>
          )}
        </SpatialNavigationFocusableView>
      );
    },
    [],
  );

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
        <Text style={styles.headerTitle}>Audio & Subtitles</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!hasTracks ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No alternate tracks available</Text>
        </View>
      ) : (
        <View style={styles.columnsContainer}>
          {/* Audio tracks column */}
          {audioTracks.length > 0 && (
            <View style={styles.column}>
              <Text style={styles.columnTitle}>Audio</Text>
              <View style={styles.trackList}>
                {audioTracks.map((track) =>
                  renderTrackItem(
                    track,
                    selectedAudioIndex === track.Index,
                    () => onSelectAudio(track.Index),
                    'audio',
                  ),
                )}
              </View>
            </View>
          )}

          {/* Subtitle tracks column */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Subtitles</Text>
            <View style={styles.trackList}>
              {/* "Off" option for subtitles */}
              <SpatialNavigationFocusableView>
                {({ isFocused }) => (
                  <FocusablePressable
                    text="Off"
                    onSelect={() => onSelectSubtitle(null)}
                    style={[
                      styles.trackItem,
                      selectedSubtitleIndex === null && styles.trackItemSelected,
                      isFocused && selectedSubtitleIndex !== null && styles.trackItemFocused,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackLabel,
                        selectedSubtitleIndex === null && styles.trackLabelSelected,
                        isFocused && selectedSubtitleIndex !== null && styles.trackLabelFocused,
                      ]}
                    >
                      Off
                    </Text>
                  </FocusablePressable>
                )}
              </SpatialNavigationFocusableView>
              {subtitleTracks.map((track) =>
                renderTrackItem(
                  track,
                  selectedSubtitleIndex === track.Index,
                  () => onSelectSubtitle(track.Index),
                  'subtitle',
                ),
              )}
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

TrackSelectorPanel.displayName = 'TrackSelectorPanel';

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(24),
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    paddingTop: scaledPixels(30),
  },
  column: {
    flex: 1,
    paddingHorizontal: scaledPixels(20),
  },
  columnTitle: {
    color: colors.text,
    fontSize: scaledPixels(24),
    fontWeight: '700',
    marginBottom: scaledPixels(16),
    paddingHorizontal: scaledPixels(8),
  },
  trackList: {
    flexDirection: 'column',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(12),
    marginVertical: scaledPixels(4),
    borderRadius: scaledPixels(8),
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: scaledPixels(60),
  },
  trackItemSelected: {
    backgroundColor: 'rgba(0, 150, 255, 0.2)',
    borderColor: colors.primary,
  },
  trackItemFocused: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  trackLabel: {
    flex: 1,
    color: colors.text,
    fontSize: scaledPixels(22),
  },
  trackLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  trackLabelFocused: {
    color: '#fff',
  },
  trackSubtitle: {
    color: colors.textSecondary,
    fontSize: scaledPixels(16),
    marginRight: scaledPixels(8),
  },
  checkmark: {
    color: colors.primary,
    fontSize: scaledPixels(22),
    fontWeight: '700',
    marginLeft: scaledPixels(8),
  },
});

export default TrackSelectorPanel;