import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SpatialNavigationRoot, SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  VideoPlayer,
  KeplerVideoSurfaceView,
  KeplerCaptionsView,
} from '@amazon-devices/react-native-w3cmedia';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';
import VideoOverlay from '@multi-tv/shared-ui/src/components/player/VideoOverlay';
import VolumePanel from '@multi-tv/shared-ui/src/components/player/VolumePanel';
import { RootStackParamList } from '../navigation/types';
import { HlsJsPlayer } from '../store/hlsjsplayer/HlsJsPlayer';
import Document from '../store/hlsjsplayer/polyfills/DocumentPolyfill';
import Element from '../store/hlsjsplayer/polyfills/ElementPolyfill';
import TextDecoderPolyfill from '../store/hlsjsplayer/polyfills/TextDecoderPolyfill';
import W3CMediaPolyfill from '../store/hlsjsplayer/polyfills/W3CMediaPolyfill';
import MiscPolyfill from '../store/hlsjsplayer/polyfills/MiscPolyfill';
import type { ChapterMarker } from '@multi-tv/shared-ui/src/types/player';
import { useSelector } from 'react-redux';
import JellyfinClient from '@multi-tv/shared-ui/src/services/JellyfinClient';
import { useAutoHideControls } from '@multi-tv/shared-ui/src/hooks/useAutoHideControls';
import { useSeekManager } from '@multi-tv/shared-ui/src/hooks/useSeekManager';
import { useMediaTracks } from '@multi-tv/shared-ui/src/hooks/useMediaTracks';
import FocusablePressable from '@multi-tv/shared-ui/src/components/FocusablePressable';
import type { PlaybackSpeed } from '@multi-tv/shared-ui/src/components/player/SettingsPanel';
import { useVolume } from '@multi-tv/shared-ui/src/hooks/useVolume';
import { scaledPixels } from '@multi-tv/shared-ui/src/hooks/useScale';
import { colors } from '@multi-tv/shared-ui/src/theme/colors';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function VegaPlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, title, itemId } = route.params;
  const isFocused = useIsFocused();

  const keplerAppStateManager: IKeplerAppStateManager = useKeplerAppStateManager();
  const componentInstance = keplerAppStateManager.getComponentInstance();

  // Get auth from Redux store
  const { accessToken, userId } = useSelector((state: any) => state.jellyfin);

  const [paused, setPaused] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoInitialized, setIsVideoInitialized] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chapters, setChapters] = useState<ChapterMarker[]>([]);
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [volumeOpen, setVolumeOpen] = useState(false);

  const videoPlayerRef = useRef<VideoPlayer | null>(null);
  const hlsPlayerRef = useRef<HlsJsPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const hlsReadyRef = useRef(false);
  const canPlayFiredRef = useRef(false);
  const nearEndRef = useRef(false);
  const captionViewHandleRef = useRef<string | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  const [controlsVisible, showControls] = useAutoHideControls(5000, trackSelectorOpen || settingsOpen || volumeOpen);

  const [volume, muted, setVolume, toggleMute] = useVolume();

  // Store HLS player ref for track switching
  const hlsPlayerForTracksRef = useRef<HlsJsPlayer | null>(null);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Fetch chapters on mount
  useEffect(() => {
    if (itemId && accessToken && userId) {
      JellyfinClient.getChapters(accessToken, userId, itemId)
        .then((ch) => setChapters(ch ?? []))
        .catch(() => {
          // Chapters are non-critical; fail silently
        });
    }
  }, [itemId, accessToken, userId]);

  // Fetch and manage tracks
  const {
    audioTracks,
    subtitleTracks,
    selectedAudioIndex,
    selectedSubtitleIndex,
    selectAudio,
    selectSubtitle,
    isDefaultLoaded,
  } = useMediaTracks(itemId, accessToken, userId);

  // Apply track selection to HlsJsPlayer when selection changes
  useEffect(() => {
    const hls = hlsPlayerForTracksRef.current;
    if (!hls || !isDefaultLoaded) return;

    // Apply audio track selection
    if (selectedAudioIndex !== null) {
      const track = audioTracks.find((t) => t.Index === selectedAudioIndex);
      if (track?.Language) {
        try {
          hls.selectAudioLanguage(track.Language);
        } catch (e) {
          console.warn('[VegaPlayerScreen] Audio track switch error:', e);
        }
      }
    }

    // Apply subtitle track selection
    if (selectedSubtitleIndex !== null) {
      const track = subtitleTracks.find((t) => t.Index === selectedSubtitleIndex);
      if (track) {
        try {
          const textTracks = hls.getTextTracks();
          const target = textTracks.find(
            (tt) => tt.language === track.Language || tt.label?.includes(track.DisplayTitle || ''),
          );
          if (target) {
            hls.setTextTrack(target, null);
          }
        } catch (e) {
          console.warn('[VegaPlayerScreen] Subtitle track switch error:', e);
        }
      }
    } else {
      // Subtitles off — disable all text tracks
      try {
        hls.setTextTrack(null, null);
      } catch {}
    }
  }, [selectedAudioIndex, selectedSubtitleIndex, audioTracks, subtitleTracks, isDefaultLoaded]);

  // Track selector toggle — pauses auto-hide while panel is open
  const handleTrackSelectorToggle = useCallback((open: boolean) => {
    setTrackSelectorOpen(open);
  }, []);

  // Settings panel toggle — pauses auto-hide while panel is open
  const handleSettingsToggle = useCallback((open: boolean) => {
    setSettingsOpen(open);
  }, []);

  const handleVolumeOpen = useCallback(() => {
    setVolumeOpen(true);
  }, []);

  const handleVolumeClose = useCallback(() => {
    setVolumeOpen(false);
    showControls();
  }, [showControls]);

  // Apply playback speed to the W3C VideoPlayer when speed changes
  useEffect(() => {
    if (videoPlayerRef.current && isVideoInitialized) {
      try {
        videoPlayerRef.current.playbackRate = playbackSpeed;
      } catch (e) {
        console.warn('[VegaPlayerScreen] Failed to set playback rate:', e);
      }
    }
  }, [playbackSpeed, isVideoInitialized]);

  // Sync volume to W3C VideoPlayer when it changes
  useEffect(() => {
    if (videoPlayerRef.current && isVideoInitialized) {
      try {
        videoPlayerRef.current.volume = muted ? 0 : volume;
      } catch (e) {
        console.warn('[VegaPlayerScreen] Volume set error:', e);
      }
    }
  }, [volume, muted, isVideoInitialized]);

  const seek = useCallback((time: number) => {
    if (videoPlayerRef.current && durationRef.current) {
      const clamped = Math.max(0, Math.min(time, durationRef.current));
      videoPlayerRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
      nearEndRef.current = clamped >= durationRef.current - 2;
      showControls();
    }
  }, [showControls]);

  const { seekPreviewTime, seekPreviewDirection, startAcceleratedSeek, stopAcceleratedSeek } =
    useSeekManager(currentTime, duration, seek);

  const togglePausePlay = useCallback(() => {
    if (!videoPlayerRef.current || !canPlayFiredRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play();
      setPaused(false);
    } else {
      videoPlayerRef.current.pause();
      setPaused(true);
    }
    showControls();
  }, [showControls]);

  const navigateBack = useCallback(() => {
    if (surfaceHandleRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.clearSurfaceHandle(surfaceHandleRef.current);
    }
    if (captionViewHandleRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.clearCaptionViewHandle(captionViewHandleRef.current);
    }
    hlsPlayerRef.current?.destroy();
    hlsPlayerRef.current = null;
    videoPlayerRef.current?.deinitialize();
    (global as any).gmedia = null;
    videoPlayerRef.current = null;
    setTimeout(() => navigation.goBack(), 300);
  }, [navigation]);

  useEffect(() => {
    if (!isFocused) return;

    let cancelled = false;

    const init = async () => {
      const vp = new VideoPlayer();
      (global as any).gmedia = vp;
      videoPlayerRef.current = vp;

      try {
        if (componentInstance) {
          await vp.setMediaControlFocus(componentInstance, null as any);
        }
      } catch {}

      vp.addEventListener('loadedmetadata', () => {
        if (cancelled) return;
        setDuration(vp.duration || 0);
        setIsVideoInitialized(true);
      });
      vp.addEventListener('timeupdate', () => {
        if (cancelled) return;
        const ct = vp.currentTime || 0;
        setCurrentTime(ct);
        setIsVideoBuffering(false);
        nearEndRef.current = durationRef.current > 0 && ct >= durationRef.current - 2;
      });
      vp.addEventListener('ended', () => {
        if (cancelled || !nearEndRef.current) return;
        setIsVideoEnded(true);
      });
      vp.addEventListener('waiting', () => {
        if (cancelled) return;
        setIsVideoBuffering(true);
      });
      vp.addEventListener('playing', () => {
        if (cancelled) return;
        setIsVideoBuffering(false);
      });

      await vp.initialize();
      if (cancelled) return;
      vp.autoplay = false;
      setIsPlayerReady(true);

      Document.install();
      Element.install();
      TextDecoderPolyfill.install();
      W3CMediaPolyfill.install();
      MiscPolyfill.install();

      const hlsPlayer = new HlsJsPlayer(vp);
      hlsPlayerRef.current = hlsPlayer;
      hlsPlayerForTracksRef.current = hlsPlayer;
      hlsPlayer.addPlayerEventListener('error', () => {
        if (!cancelled) setIsVideoError(true);
      });
      hlsReadyRef.current = true;

      vp.addEventListener('canplay', () => {
        if (cancelled || canPlayFiredRef.current) return;
        canPlayFiredRef.current = true;
        if (surfaceHandleRef.current && videoPlayerRef.current) {
          videoPlayerRef.current.play();
          setPaused(false);
        }
      });
    };

    init().catch(() => setIsVideoError(true));

    return () => {
      cancelled = true;
      hlsReadyRef.current = false;
      canPlayFiredRef.current = false;
      nearEndRef.current = false;
      if (surfaceHandleRef.current && videoPlayerRef.current) {
        videoPlayerRef.current.clearSurfaceHandle(surfaceHandleRef.current);
      }
      if (captionViewHandleRef.current && videoPlayerRef.current) {
        videoPlayerRef.current.clearCaptionViewHandle(captionViewHandleRef.current);
      }
      hlsPlayerRef.current?.destroy();
      hlsPlayerRef.current = null;
      hlsPlayerForTracksRef.current = null;
      videoPlayerRef.current?.deinitialize();
      (global as any).gmedia = null;
      videoPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, isFocused]);

  useEffect(() => {
    if (isVideoEnded) navigateBack();
  }, [isVideoEnded, navigateBack]);

  useEffect(() => {
    if (isVideoInitialized && duration > 0) showControls();
  }, [isVideoInitialized, duration, showControls]);

  useEffect(() => {
    const handleKeyDown = (key: SupportedKeys) => {
      switch (key) {
        case SupportedKeys.Right:
        case SupportedKeys.FastForward:
          startAcceleratedSeek(1);
          break;
        case SupportedKeys.Left:
        case SupportedKeys.Rewind:
          startAcceleratedSeek(-1);
          break;
        case SupportedKeys.Back:
          stopAcceleratedSeek();
          navigateBack();
          break;
        case SupportedKeys.PlayPause:
          togglePausePlay();
          break;
        default:
          showControls();
          break;
      }
    };

    const handleKeyUp = (key: SupportedKeys) => {
      if (
        key === SupportedKeys.Right ||
        key === SupportedKeys.Left ||
        key === SupportedKeys.FastForward ||
        key === SupportedKeys.Rewind
      ) {
        stopAcceleratedSeek();
      }
    };

    const downListener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const upListener = RemoteControlManager.addKeyupListener(handleKeyUp);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateBack();
      return true;
    });

    return () => {
      downListener();
      upListener();
      backHandler.remove();
      stopAcceleratedSeek();
    };
  }, [seek, togglePausePlay, showControls, navigateBack, startAcceleratedSeek, stopAcceleratedSeek]);

  const onSurfaceViewCreated = useCallback((surfaceHandle: string) => {
    surfaceHandleRef.current = surfaceHandle;
    videoPlayerRef.current?.setSurfaceHandle(surfaceHandle);

    if (hlsReadyRef.current && hlsPlayerRef.current) {
      hlsReadyRef.current = false;
      hlsPlayerRef.current.load(
        { uri: movie, secure: 'false', drm_scheme: '', drm_license_uri: '' },
        false,
      );
    }

    if (canPlayFiredRef.current && videoPlayerRef.current) {
      videoPlayerRef.current.play();
      setPaused(false);
    }
  }, [movie]);

  const onSurfaceViewDestroyed = useCallback((surfaceHandle: string) => {
    videoPlayerRef.current?.clearSurfaceHandle(surfaceHandle);
    surfaceHandleRef.current = null;
  }, []);

  const onCaptionViewCreated = useCallback((captionHandle: string) => {
    captionViewHandleRef.current = captionHandle;
    videoPlayerRef.current?.setCaptionViewHandle(captionHandle);
  }, []);

  const onCaptionViewDestroyed = useCallback((captionHandle: string) => {
    videoPlayerRef.current?.clearCaptionViewHandle(captionHandle);
    captionViewHandleRef.current = null;
  }, []);

  if (isVideoError) {
    return (
      <SpatialNavigationRoot isActive={isFocused}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FocusablePressable text="Exit" onSelect={navigateBack} />
          </View>
        </View>
      </SpatialNavigationRoot>
    );
  }

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.container}>
        {isPlayerReady && (
          <>
            <KeplerVideoSurfaceView
              style={styles.surface}
              onSurfaceViewCreated={onSurfaceViewCreated}
              onSurfaceViewDestroyed={onSurfaceViewDestroyed}
            />
            <KeplerCaptionsView
              style={styles.captions}
              onCaptionViewCreated={onCaptionViewCreated}
              onCaptionViewDestroyed={onCaptionViewDestroyed}
              show={false}
            />
          </>
        )}
        {!!durationRef.current && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={navigateBack}
            currentTime={currentTime}
            duration={durationRef.current}
            isBuffering={isVideoBuffering}
            title={title}
            chapters={chapters}
            seekPreviewTime={seekPreviewTime}
            seekPreviewDirection={seekPreviewDirection}
            audioTracks={audioTracks}
            subtitleTracks={subtitleTracks}
            selectedAudioIndex={selectedAudioIndex}
            selectedSubtitleIndex={selectedSubtitleIndex}
            onSelectAudio={selectAudio}
            onSelectSubtitle={selectSubtitle}
            onTrackSelectorToggle={handleTrackSelectorToggle}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={setPlaybackSpeed}
            onSettingsToggle={handleSettingsToggle}
          />
        )}

        {/* Volume panel (full-screen overlay) */}
        <VolumePanel
          visible={volumeOpen}
          volume={volume}
          muted={muted}
          onVolumeChange={setVolume}
          onMutedChange={toggleMute}
          onClose={handleVolumeClose}
        />

        {/* Volume trigger button */}
        {controlsVisible && !volumeOpen && (
          <SpatialNavigationFocusableView>
            {({ isFocused }) => (
              <FocusablePressable
                text="Volume"
                onSelect={handleVolumeOpen}
                style={[
                  volumeBtnStyles.trigger,
                  isFocused && volumeBtnStyles.triggerFocused,
                ]}
              />
            )}
          </SpatialNavigationFocusableView>
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  captions: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

const volumeBtnStyles = StyleSheet.create({
  trigger: {
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
  triggerFocused: {
    borderColor: colors.primary,
  },
});