import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FocusablePressable from '../FocusablePressable';
import { scaledPixels } from '../../hooks/useScale';
import { colors } from '../../theme/colors';

interface SkipIntroButtonProps {
  visible: boolean;
  onSkip: () => void;
}

/**
 * A floating "Skip Intro >>" button that appears when the playback
 * position is within an intro chapter (detected via Jellyfin chapter markers).
 *
 * Renders independently of the VideoOverlay visibility — it has its own
 * show/hide logic driven by the useSkipIntro hook.
 *
 * Positioned at bottom-center, above the seek bar area.
 */
const SkipIntroButton: React.FC<SkipIntroButtonProps> = React.memo(
  ({ visible, onSkip }) => {
    if (!visible) {
      return null;
    }

    return (
      <View style={styles.container}>
        <FocusablePressable
          text="Skip Intro >>"
          onSelect={onSkip}
          style={styles.button}
        />
      </View>
    );
  },
);

SkipIntroButton.displayName = 'SkipIntroButton';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: scaledPixels(140),
    alignSelf: 'center',
    zIndex: 15,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: scaledPixels(32),
    paddingVertical: scaledPixels(16),
    borderRadius: scaledPixels(8),
    borderWidth: 2,
    borderColor: colors.primary,
  },
});

export default SkipIntroButton;
