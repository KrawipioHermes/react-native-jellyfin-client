import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels } from '../../hooks/useScale';
import { safeZones } from '../../theme';
import { colors } from '../../theme/colors';

interface NextEpisodeButtonProps {
  visible: boolean;
  episodeTitle?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  loading?: boolean;
  onPlay: () => void;
}

/**
 * A floating "Next Episode" button that appears when the current
 * video is near the end (within the last 60 seconds) and a next
 * episode is available.
 *
 * Renders independently of the VideoOverlay visibility.
 * Positioned at bottom-right, near the seek bar area.
 */
const NextEpisodeButton: React.FC<NextEpisodeButtonProps> = React.memo(
  ({
    visible,
    episodeTitle,
    episodeNumber,
    seasonNumber,
    loading = false,
    onPlay,
  }) => {
    if (!visible) {
      return null;
    }

    let episodeLabel = '';
    if (seasonNumber != null && episodeNumber != null) {
      episodeLabel = `S${seasonNumber} E${episodeNumber}`;
    } else if (episodeNumber != null) {
      episodeLabel = `E${episodeNumber}`;
    }

    const displayTitle = episodeLabel
      ? `${episodeLabel} · ${episodeTitle ?? '?'}`
      : (episodeTitle ?? 'Next Episode');

    return (
      <View style={styles.container}>
        {loading ? (
          <View style={[styles.button, styles.loadingButton]}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FocusablePressable
            text={`Next: ${displayTitle}`}
            onSelect={onPlay}
            style={styles.button}
          />
        )}
      </View>
    );
  },
);

NextEpisodeButton.displayName = 'NextEpisodeButton';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: scaledPixels(90),
    right: scaledPixels(safeZones.actionSafe.horizontal),
    zIndex: 15,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: scaledPixels(24),
    paddingVertical: scaledPixels(14),
    borderRadius: scaledPixels(8),
    borderWidth: 2,
    borderColor: colors.primary,
    maxWidth: scaledPixels(500),
  },
  loadingButton: {
    borderColor: colors.textSecondary,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
  },
});

export default NextEpisodeButton;
