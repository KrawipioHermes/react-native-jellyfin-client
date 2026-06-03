import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import {
  VideoPlayer,
  KeplerVideoSurfaceView,
  KeplerCaptionsView,
} from '@amazon-devices/react-native-w3cmedia';
import RemoteControlManager from '@multi-tv/shared-ui/src/app/remote-control/RemoteControlManager';
import { SupportedKeys } from '@multi-tv/shared-ui/src/app/remote-control/SupportedKeys';
import VideoOverlay from '@multi-tv/shared-ui/src/components/player/VideoOverlay.vega';
import ExitButton from '@multi-tv/shared-ui/src/components/player/ExitButton';
import { RootStackParamList } from '../navigation/types';
import { HlsJsPlayer } from '../store/hlsjsplayer/HlsJsPlayer';
import Document from '../store/hlsjsplayer/polyfills/DocumentPolyfill';
import Element from '../store/hlsjsplayer/polyfills/ElementPolyfill';
import TextDecoderPolyfill from '../store/hlsjsplayer/polyfills/TextDecoderPolyfill';
import W3CMediaPolyfill from '../store/hlsjsplayer/polyfills/W3CMediaPolyfill';
import MiscPolyfill from '../store/hlsjsplayer/polyfills/MiscPolyfill';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function VegaPlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, title } = route.params;
  const isFocused = useIsFocused();

  const keplerAppStateManager: IKeplerAppStateManager = useKeplerAppStateManager();
  const componentInstance = keplerAppStateManager.getComponentInstance();

  const [paused, setPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);   // surface gate: true after vp.initialize()
  const [isVideoInitialized, setIsVideoInitialized] = useState(false); // controls gate: true after loadedmetadata
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoPlayerRef = useRef<VideoPlayer | null>(null);
  const hlsPlayerRef = useRef<HlsJsPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const hlsReadyRef = useRef(false);
  const canPlayFiredRef = useRef(false);
  const captionViewHandleRef = useRef<string | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 5000);
  }, []);

  const seek = useCallback((time: number) => {
    if (videoPlayerRef.current && durationRef.current) {
      const clamped = Math.max(0, Math.min(time, durationRef.current));
      videoPlayerRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
      showControls();
    }
  }, [showControls]);

  const togglePausePlay = useCallback(() => {
    if (!videoPlayerRef.current) return;
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
        setCurrentTime(vp.currentTime || 0);
        setIsVideoBuffering(false);
      });
      vp.addEventListener('ended', () => {
        if (cancelled) return;
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
      hlsPlayer.addPlayerEventListener('error', () => {
        if (!cancelled) setIsVideoError(true);
      });
      hlsReadyRef.current = true;

      vp.addEventListener('canplay', () => {
        if (cancelled) return;
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
          seek(currentTimeRef.current + 10);
          break;
        case SupportedKeys.Left:
        case SupportedKeys.Rewind:
          seek(currentTimeRef.current - 10);
          break;
        case SupportedKeys.Back:
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

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateBack();
      return true;
    });

    return () => {
      RemoteControlManager.removeKeydownListener(listener);
      backHandler.remove();
    };
  }, [seek, togglePausePlay, showControls, navigateBack]);

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
            <ExitButton onSelect={navigateBack} />
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
          />
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
