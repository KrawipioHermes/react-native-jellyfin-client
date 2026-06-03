import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FocusablePressable from '../FocusablePressable';
import { formatTime } from '../../utils/formatTime';
import { scaledPixels } from '../../hooks/useScale';
import { safeZones } from '../../theme';
import { colors } from '../../theme/colors';

interface TopBarProps {
  title?: string;
  currentTime: number;
  duration: number;
  onExit: () => void;
}

/**
 * Top bar of the video overlay: Exit button + title + time remaining.
 */
const TopBar: React.FC<TopBarProps> = React.memo(({ title, currentTime, duration, onExit }) => {
  const timeRemaining = duration > 0 ? duration - currentTime : 0;

  return (
    <View style={styles.container}>
      <FocusablePressable
        text="Exit"
        onSelect={onExit}
        style={styles.exitButton}
      />
      {title && (
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      )}
      <Text style={styles.timeRemainingText}>
        -{formatTime(timeRemaining)}
      </Text>
    </View>
  );
});

TopBar.displayName = 'TopBar';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: scaledPixels(safeZones.actionSafe.vertical),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  exitButton: {
    marginEnd: scaledPixels(20),
  },
  titleText: {
    flex: 1,
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
  },
  timeRemainingText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    marginStart: scaledPixels(20),
  },
});

export default TopBar;