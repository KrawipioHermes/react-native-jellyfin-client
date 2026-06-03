import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import SeekBar from './SeekBar';
import type { ChapterMarker } from '../../types/player';
import { formatTime } from '../../utils/formatTime';
import { scaledPixels } from '../../hooks/useScale';
import { safeZones } from '../../theme';
import { colors } from '../../theme/colors';

interface BottomBarProps {
  currentTime: number;
  duration: number;
  chapters?: ChapterMarker[];
  seekPreviewTime?: number;
  seekPreviewDirection?: 'forward' | 'backward';
}

/**
 * Bottom bar of the video overlay: Seek bar + time display + seek preview.
 */
const BottomBar: React.FC<BottomBarProps> = React.memo(({
  currentTime,
  duration,
  chapters,
  seekPreviewTime,
  seekPreviewDirection,
}) => {
  // Compute seek preview overlay position along the seek bar (as percentage)
  const seekPreviewPercentage =
    seekPreviewTime !== undefined && duration > 0
      ? Math.min(100, Math.max(0, (seekPreviewTime / duration) * 100))
      : 0;

  return (
    <View style={styles.container}>
      {/* Seek preview overlay — shows target time during accelerated seeking */}
      {seekPreviewTime !== undefined && (
        <View
          style={[
            styles.seekPreviewOverlay,
            {
              [I18nManager.isRTL ? 'right' : 'left']: `${seekPreviewPercentage}%`,
            },
          ]}
        >
          <Text style={styles.seekPreviewText}>
            {seekPreviewDirection === 'forward' ? '>> ' : '<< '}
            {formatTime(seekPreviewTime)}
          </Text>
        </View>
      )}

      <Text style={styles.currentTimeText}>
        {formatTime(currentTime)}
      </Text>
      <View style={styles.seekBarContainer}>
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          chapters={chapters}
        />
      </View>
      <Text style={styles.durationText}>
        {formatTime(duration)}
      </Text>
    </View>
  );
});

BottomBar.displayName = 'BottomBar';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  currentTimeText: {
    color: colors.text,
    fontSize: scaledPixels(20),
    minWidth: scaledPixels(80),
    textAlign: 'center',
  },
  seekBarContainer: {
    flex: 1,
    marginHorizontal: scaledPixels(16),
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(20),
    minWidth: scaledPixels(80),
    textAlign: 'center',
  },
  seekPreviewOverlay: {
    position: 'absolute',
    bottom: scaledPixels(60),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: scaledPixels(8),
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(8),
    zIndex: 20,
    transform: [{ translateX: -scaledPixels(40) }],
  },
  seekPreviewText: {
    color: colors.primary,
    fontSize: scaledPixels(24),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

export default BottomBar;