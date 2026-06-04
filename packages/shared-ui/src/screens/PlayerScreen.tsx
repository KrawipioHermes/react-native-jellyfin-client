import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Pressable } from 'react-native';
import { SpatialNavigationRoot, SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RemoteControlManager from '../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../app/remote-control/SupportedKeys';
import VideoOverlay from '../components/player/VideoOverlay';
import VolumePanel from '../components/player/VolumePanel';
import FocusablePressable from '../components/FocusablePressable';
import { VideoRef } from 'react-native-video';
import VideoPlayer from '../components/player/VideoPlayer';
import { RootStackParamList } from '../navigation/types';
import { useVolume } from '../hooks/useVolume';
import { scaledPixels } from '../hooks/useScale';
import { safeZones } from '../theme';
import { colors } from '../theme/colors';

const SHOW_NATIVE_CONTROLS = Platform.OS === 'ios';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, headerImage } = route.params;
  const isFocused = useIsFocused();
  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const videoRef = useRef<VideoRef>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const [volume, muted, setVolume, toggleMute] = useVolume();

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  const seek = useCallback((time: number) => {
    if (time < 0) {
      time = 0;
    } else if (time > durationRef.current) {
      time = durationRef.current;
    }
    videoRef.current?.seek(time);
    currentTimeRef.current = time;
    setCurrentTime(time);
    showControls();
  }, [showControls]);

  const togglePausePlay = useCallback(() => {
    setPaused((prev) => !prev);
    showControls();
  }, [showControls]);

  const handleVolumeOpen = useCallback(() => {
    setVolumeOpen(true);
    // Clear auto-hide while volume panel is open
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const handleVolumeClose = useCallback(() => {
    setVolumeOpen(false);
  }, []);

  useEffect(() => {
    if (SHOW_NATIVE_CONTROLS) return;

    const handleKeyDown = (key: SupportedKeys) => {
      switch (key) {
        case SupportedKeys.Right:
        case SupportedKeys.Rewind:
          seek(currentTimeRef.current + 10);
          break;
        case SupportedKeys.Left:
        case SupportedKeys.FastForward:
          seek(currentTimeRef.current - 10);
          break;
        case SupportedKeys.Back:
          navigation.goBack();
          break;
        case SupportedKeys.PlayPause:
          togglePausePlay();
          break;
        default:
          showControls();
          break;
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    return () => {
      RemoteControlManager.removeKeydownListener(listener);
    };
  }, [seek, togglePausePlay, showControls, navigation]);

  // When volume panel closes, restart auto-hide timer
  useEffect(() => {
    if (!volumeOpen && controlsVisible) {
      showControls();
    }
  }, [volumeOpen]);

  return (
    <SpatialNavigationRoot isActive={isFocused && Platform.OS === 'android'}>
      <Pressable style={playerStyles.container} onPress={showControls}>
        <VideoPlayer
          ref={videoRef}
          movie={movie}
          headerImage={headerImage}
          paused={paused}
          controls={SHOW_NATIVE_CONTROLS}
          volume={volume}
          muted={muted}
          onBuffer={setIsVideoBuffering}
          onProgress={setCurrentTime}
          onLoad={(d) => {
            durationRef.current = d;
            setDuration(d);
            if (!SHOW_NATIVE_CONTROLS) showControls();
          }}
          onEnd={() => {
            setPaused(true);
            navigation.goBack();
          }}
        />

        {!SHOW_NATIVE_CONTROLS && !!duration && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={() => navigation.goBack()}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isVideoBuffering}
          />
        )}

        {/* Volume panel (full-screen overlay) */}
        {!SHOW_NATIVE_CONTROLS && (
          <VolumePanel
            visible={volumeOpen}
            volume={volume}
            muted={muted}
            onVolumeChange={setVolume}
            onMutedChange={toggleMute}
            onClose={handleVolumeClose}
          />
        )}

        {/* Volume trigger button — shows in video area when controls are visible */}
        {!SHOW_NATIVE_CONTROLS && controlsVisible && !volumeOpen && (
          <SpatialNavigationFocusableView>
            {({ isFocused }) => (
              <FocusablePressable
                text="Volume"
                onSelect={handleVolumeOpen}
                style={[
                  playerStyles.volumeButton,
                  isFocused && playerStyles.volumeButtonFocused,
                ]}
              />
            )}
          </SpatialNavigationFocusableView>
        )}
      </Pressable>
    </SpatialNavigationRoot>
  );
}

const playerStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    volumeButton: {
      position: 'absolute',
      top: scaledPixels(16),
      end: scaledPixels(16),
      paddingHorizontal: scaledPixels(12),
      paddingVertical: scaledPixels(8),
      borderRadius: scaledPixels(8),
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 15,
    },
    volumeButtonFocused: {
      borderColor: colors.primary,
    },
  });
