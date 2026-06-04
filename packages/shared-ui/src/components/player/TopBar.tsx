import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
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
  onTracks?: () => void;
  hasTracks?: boolean;
  onSettings?: () => void;
}

/**
 * Top bar of the video overlay: Exit button + title + time remaining + tracks button + settings button.
 */
const TopBar: React.FC<TopBarProps> = React.memo(({
  title,
  currentTime,
  duration,
  onExit,
  onTracks,
  hasTracks = false,
  onSettings,
}) => {
  const timeRemaining = duration > 0 ? duration - currentTime : 0;

  return (
    <View style={styles.container}>
      <SpatialNavigationFocusableView>
        {({ isFocused }) => (
          <FocusablePressable
            text="Exit"
            onSelect={onExit}
            style={[
              styles.navButton,
              isFocused && styles.navButtonFocused,
            ]}
          />
        )}
      </SpatialNavigationFocusableView>
      {title && (
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      )}
      {onTracks && hasTracks && (
        <SpatialNavigationFocusableView>
          {({ isFocused }) => (
            <FocusablePressable
              text="Tracks"
              onSelect={onTracks}
              style={[
                styles.navButton,
                isFocused && styles.navButtonFocused,
              ]}
            />
          )}
        </SpatialNavigationFocusableView>
      )}
      {onSettings && (
        <SpatialNavigationFocusableView>
          {({ isFocused }) => (
            <FocusablePressable
              text="Settings"
              onSelect={onSettings}
              style={[
                styles.navButton,
                isFocused && styles.navButtonFocused,
              ]}
            />
          )}
        </SpatialNavigationFocusableView>
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
  navButton: {
    paddingHorizontal: scaledPixels(16),
    paddingVertical: scaledPixels(8),
    borderRadius: scaledPixels(8),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navButtonFocused: {
    borderColor: colors.primary,
  },
  titleText: {
    flex: 1,
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: '600',
    marginHorizontal: scaledPixels(12),
  },
  timeRemainingText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    marginStart: scaledPixels(12),
  },
});

export default TopBar;