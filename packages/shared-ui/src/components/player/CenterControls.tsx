import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DefaultFocus } from 'react-tv-space-navigation';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels } from '../../hooks/useScale';

interface CenterControlsProps {
  paused: boolean;
  onPlayPause: () => void;
}

/**
 * Center play/pause button.
 */
const CenterControls: React.FC<CenterControlsProps> = React.memo(({ paused, onPlayPause }) => {
  return (
    <View style={styles.container}>
      <DefaultFocus>
        <FocusablePressable
          text={paused ? '▶ Play' : '⏸ Pause'}
          onSelect={onPlayPause}
          style={styles.playPauseButton}
        />
      </DefaultFocus>
    </View>
  );
});

CenterControls.displayName = 'CenterControls';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    minWidth: scaledPixels(200),
    minHeight: scaledPixels(80),
  },
});

export default CenterControls;