'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type Hls from 'hls.js';
import type Plyr from 'plyr';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Tv,
  Volume2,
  VolumeX,
  Volume1,
  Gauge,
  PictureInPicture2,
  Play,
  Pause,
  X,
  FastForward,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  SkipForward,
} from 'lucide-react';
import { toast } from '@/lib/utils/toast';
import { saveWatchHistory } from '@/lib/utils/history';

import {
  savePlaybackProgress,
  getPlaybackProgress,
  MIN_RESUME_SECONDS,
  COMPLETION_THRESHOLD,
} from '@/lib/utils/progress';
import {
  EMBED_PLAYER_CAPABILITIES,
  DIRECT_PLAYER_CAPABILITIES,
} from '@/lib/utils/player-capabilities';
import {
  DEFAULT_PREFERENCES,
  getPlayerPreferences,
  savePlayerPreferences,
  PlayerPreferences,
} from '@/lib/utils/player-preferences';
import {
  useHlsPlayer,
  MAX_MEDIA_RECOVERY_ATTEMPTS,
  MAX_NETWORK_RECOVERY_ATTEMPTS,
} from './hooks/useHlsPlayer';
import type { PlayerMode } from './hooks/useHlsPlayer';
import {
  getPlayerSourceKey,
  isCurrentPlayerSourceGeneration,
  isPlayerShortcutBlockedTarget,
  isNativeVideoFullscreen,
  selectFullscreenStrategy,
} from './player-logic';
import type { WebkitVideoElement } from './player-logic';

export type { PlayerMode } from './hooks/useHlsPlayer';

function formatEpisodeLabel(name: string | undefined, fallback: string): string {
  const label = name?.trim() || fallback;
  return label.toLowerCase().startsWith('tập') ? label : `Tập ${label}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainder
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

function setVideoProperties(el: HTMLVideoElement, volume: number, muted: boolean, rate: number) {
  el.volume = volume;
  el.muted = muted;
  el.playbackRate = rate;
}

function setVideoVolume(el: HTMLVideoElement, volume: number, muted: boolean) {
  el.volume = volume;
  el.muted = muted;
}

function setVideoPlaybackRate(el: HTMLVideoElement, rate: number) {
  el.playbackRate = rate;
}

function setVideoCurrentTime(el: HTMLVideoElement, time: number) {
  el.currentTime = time;
}

interface VideoPlayerProps {
  embedUrl: string;
  m3u8Url?: string;
  movieSlug: string;
  movieTitle: string;
  movieOriginalTitle?: string;
  quality?: string;
  posterUrl: string;
  episodeName: string;
  episodeSlug: string;
  serverName: string;
  serverIndex?: number;
  nextEpisodeSlug?: string;
  nextEpisodeName?: string;
}

const ALLOWED_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

function VideoPlayerInner({
  embedUrl,
  m3u8Url,
  movieSlug,
  movieTitle,
  movieOriginalTitle,
  quality,
  posterUrl,
  episodeName,
  episodeSlug,
  serverName,
  serverIndex = 0,
  nextEpisodeSlug,
  nextEpisodeName,
}: VideoPlayerProps) {
  const router = useRouter();

  const [iframeKey, setIframeKey] = useState(0);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useDirectStream, setUseDirectStream] = useState(Boolean(m3u8Url));
  const [playerMode, setPlayerMode] = useState<PlayerMode>('unavailable');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Top bar / Overlay visibility state (Netflix auto-hide on inactivity)
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const hideOverlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Player preferences initialized from local repository (safe with defaults)
  const [prefs, setPrefs] = useState<PlayerPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPrefs(getPlayerPreferences());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const supported =
        'pictureInPictureEnabled' in document &&
        Boolean(document.pictureInPictureEnabled) &&
        'requestPictureInPicture' in HTMLVideoElement.prototype;
      setPipSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayEpisodeLabel = formatEpisodeLabel(episodeName, 'Full');
  const nextEpisodeLabel = formatEpisodeLabel(nextEpisodeName, 'kế tiếp');

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Picture-in-Picture active state tracking
  const [isInPiP, setIsInPiP] = useState(false);

  // Double-tap seeking feedback state
  const [seekFeedback, setSeekFeedback] = useState<{
    type: 'forward' | 'backward';
    id: number;
  } | null>(null);
  const seekFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recovery tracking refs
  const networkRecoveryCountRef = useRef(0);
  const mediaRecoveryCountRef = useRef(0);
  const hasResumedRef = useRef(false);
  const fallbackTriggeredRef = useRef(false);

  // DOM node references
  const containerRef = useRef<HTMLDivElement>(null);
  const videoHostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const directCleanupRef = useRef<(() => void) | null>(null);
  const sourceGenerationRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current as WebkitVideoElement | null;
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement) || isNativeVideoFullscreen(video));
    };

    const handleWebkitBeginFullscreen = () => syncFullscreenState();
    const handleWebkitEndFullscreen = () => syncFullscreenState();

    document.addEventListener('fullscreenchange', syncFullscreenState);
    video?.addEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen);
    video?.addEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
    syncFullscreenState();

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      video?.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFullscreen);
      video?.removeEventListener('webkitendfullscreen', handleWebkitEndFullscreen);
    };
  }, [playerMode, useDirectStream]);

  // Active episode ref to prevent async timer race conditions
  const activeEpisodeRef = useRef({ movieSlug, episodeSlug });
  useLayoutEffect(() => {
    activeEpisodeRef.current = { movieSlug, episodeSlug };
  });

  const propsRef = useRef({
    movieSlug,
    movieTitle,
    posterUrl,
    episodeName,
    episodeSlug,
    serverName,
  });
  useLayoutEffect(() => {
    propsRef.current = {
      movieSlug,
      movieTitle,
      posterUrl,
      episodeName,
      episodeSlug,
      serverName,
    };
  });

  // Current capabilities based on stream type
  const capabilities = useDirectStream
    ? DIRECT_PLAYER_CAPABILITIES
    : EMBED_PLAYER_CAPABILITIES;

  // Trigger seek animation feedback
  const triggerSeekFeedback = (type: 'forward' | 'backward') => {
    if (seekFeedbackTimerRef.current) {
      clearTimeout(seekFeedbackTimerRef.current);
    }
    setSeekFeedback({ type, id: Date.now() });
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 750);
  };

  // Overlay mouse movement activity reset
  const handleUserActivity = useCallback(() => {
    setIsOverlayVisible(true);
    if (hideOverlayTimerRef.current) {
      clearTimeout(hideOverlayTimerRef.current);
    }
    hideOverlayTimerRef.current = setTimeout(() => {
      setIsOverlayVisible(false);
      setShowSpeedMenu(false);
    }, 3500);
  }, []);

  const handleContainerMouseLeave = useCallback(() => {
    if (hideOverlayTimerRef.current) {
      clearTimeout(hideOverlayTimerRef.current);
    }
    hideOverlayTimerRef.current = setTimeout(() => {
      setIsOverlayVisible(false);
      setShowSpeedMenu(false);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (hideOverlayTimerRef.current) {
        clearTimeout(hideOverlayTimerRef.current);
        hideOverlayTimerRef.current = null;
      }
      if (seekFeedbackTimerRef.current) {
        clearTimeout(seekFeedbackTimerRef.current);
        seekFeedbackTimerRef.current = null;
      }
    };
  }, []);

  // Cancel auto-next countdown
  const cancelAutoNext = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  // Fallback to embed player
  const fallbackToEmbed = useCallback((reason?: string, sourceGeneration?: number) => {
    if (
      sourceGeneration !== undefined &&
      !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, sourceGeneration)
    ) {
      return;
    }
    if (fallbackTriggeredRef.current) return;
    fallbackTriggeredRef.current = true;
    console.warn(`Fallback triggered: ${reason || 'unknown'}`);

    cancelAutoNext();
    directCleanupRef.current?.();

    setUseDirectStream(false);
    setPlayerMode(embedUrl ? 'embed' : 'unavailable');
    setLoading(!embedUrl);
  }, [cancelAutoNext, embedUrl]);

  const switchToEmbed = useCallback(() => {
    cancelAutoNext();
    directCleanupRef.current?.();
    setUseDirectStream(false);
    setPlayerMode(embedUrl ? 'embed' : 'unavailable');
    setLoading(!embedUrl);
  }, [cancelAutoNext, embedUrl]);

  const saveCurrentVideoProgress = useCallback(
    (flushSync = false) => {
      const v = videoRef.current;
      const p = propsRef.current;
      if (!v || !p.movieSlug || !p.episodeSlug) return;

      const currentTime = v.currentTime;
      const duration = v.duration;

      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) {
        return;
      }

      savePlaybackProgress(
        {
          movieSlug: p.movieSlug,
          movieTitle: p.movieTitle,
          posterUrl: p.posterUrl,
          episodeName: p.episodeName,
          episodeSlug: p.episodeSlug,
          serverName: p.serverName,
          currentTime,
          duration,
        },
        flushSync
      );
    },
    []
  );

  const triggerNextEpisodeNavigation = useCallback(() => {
    cancelAutoNext();
    if (!nextEpisodeSlug) return;
    router.push(`/xem-phim/${movieSlug}?ep=${nextEpisodeSlug}&server=${serverIndex}`);
  }, [nextEpisodeSlug, movieSlug, serverIndex, router, cancelAutoNext]);

  const handleLoadedMetadata = useCallback(() => {
    setLoading(false);
    const v = videoRef.current;
    const p = propsRef.current;
    if (!v || !p.movieSlug || !p.episodeSlug) return;

    setVideoProperties(v, prefs.volume, prefs.muted, prefs.playbackRate);
    if (Number.isFinite(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    }

    if (hasResumedRef.current) return;

    hasResumedRef.current = true;
    const saved = getPlaybackProgress(p.movieSlug, p.episodeSlug);
    if (
      saved &&
      !saved.completed &&
      saved.currentTime >= MIN_RESUME_SECONDS &&
      Number.isFinite(saved.currentTime) &&
      Number.isFinite(v.duration) &&
      v.duration > 0 &&
      saved.currentTime < v.duration &&
      saved.currentTime / v.duration < COMPLETION_THRESHOLD
    ) {
      try {
        setVideoCurrentTime(v, saved.currentTime);
        setCurrentTime(saved.currentTime);
      } catch (err) {
        console.warn('Failed to set resume currentTime:', err);
      }
    }
  }, [prefs.volume, prefs.muted, prefs.playbackRate]);

  const handleEnded = useCallback(() => {
    if (!capabilities.canDetectEnded) return;
    setIsPlaying(false);
    saveCurrentVideoProgress(true);

    if (prefs.autoplayNextEpisode && nextEpisodeSlug) {
      setAutoNextCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      const startingEpSlug = episodeSlug;
      countdownTimerRef.current = setInterval(() => {
        if (activeEpisodeRef.current.episodeSlug !== startingEpSlug) {
          cancelAutoNext();
          return;
        }

        setAutoNextCountdown((prev) => {
          if (prev === null || prev <= 1) {
            cancelAutoNext();
            triggerNextEpisodeNavigation();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [
    capabilities.canDetectEnded,
    prefs.autoplayNextEpisode,
    nextEpisodeSlug,
    episodeSlug,
    saveCurrentVideoProgress,
    cancelAutoNext,
    triggerNextEpisodeNavigation,
  ]);

  const handleDirectError = useCallback(() => {
    if (playerMode === 'native-hls') {
      fallbackToEmbed('Native video onError fired');
    } else if (playerMode === 'hls-js') {
      if (
        networkRecoveryCountRef.current >= MAX_NETWORK_RECOVERY_ATTEMPTS ||
        mediaRecoveryCountRef.current >= MAX_MEDIA_RECOVERY_ATTEMPTS ||
        !hlsRef.current
      ) {
        fallbackToEmbed('HLS.js exhausted retries / media error');
      }
    } else {
      fallbackToEmbed('Direct stream error');
    }
  }, [playerMode, fallbackToEmbed]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isDraggingProgress) {
      setCurrentTime(video.currentTime);
    }

    if (Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
      if (video.buffered.length > 0) {
        try {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          setBufferedPercent(Math.min(100, (bufferedEnd / video.duration) * 100));
        } catch {
          setBufferedPercent(0);
        }
      }
    }

    if (capabilities.canReadCurrentTime) {
      saveCurrentVideoProgress(false);
    }
  }, [isDraggingProgress, capabilities.canReadCurrentTime, saveCurrentVideoProgress]);

  // HLS and Plyr integration
  useHlsPlayer({
    useDirectStream,
    m3u8Url,
    embedUrl,
    videoHostRef,
    videoRef,
    hlsRef,
    plyrRef,
    directCleanupRef,
    sourceGenerationRef,
    networkRecoveryCountRef,
    mediaRecoveryCountRef,
    fallbackTriggeredRef,
    countdownTimerRef,
    setPlayerMode,
    fallbackToEmbed,
    onLoadedMetadata: handleLoadedMetadata,
    onCanPlay: () => {
      setLoading(false);
      const video = videoRef.current;
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    },
    onPlaying: () => {
      setLoading(false);
      setIsPlaying(true);
    },
    onTimeUpdate: handleTimeUpdate,
    onPause: () => {
      setIsPlaying(false);
      if (capabilities.canReadCurrentTime) {
        saveCurrentVideoProgress(true);
      }
    },
    onEnded: handleEnded,
    onError: handleDirectError,
    onEnterPiP: () => setIsInPiP(true),
    onLeavePiP: () => setIsInPiP(false),
  });

  // Watch history saving
  useEffect(() => {
    saveWatchHistory({
      slug: movieSlug,
      title: movieTitle,
      posterUrl,
      episodeName: displayEpisodeLabel,
      episodeSlug,
      serverName,
      serverIndex,
    });
  }, [movieSlug, movieTitle, posterUrl, displayEpisodeLabel, episodeSlug, serverName, serverIndex]);

  // Flush on visibility change / unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentVideoProgress(true);
      }
    };

    const handlePageHide = () => {
      saveCurrentVideoProgress(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      saveCurrentVideoProgress(true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveCurrentVideoProgress]);

  const handleFullscreenToggle = useCallback(() => {
    const video = videoRef.current as WebkitVideoElement | null;
    const container = containerRef.current;

    const reportFullscreenFailure = (error?: unknown) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Fullscreen request was rejected by the browser.', error);
      }
      toast.error('Trình duyệt không hỗ trợ toàn màn hình cho nguồn này.');
    };

    if (document.fullscreenElement) {
      const exit = document.exitFullscreen?.();
      if (exit) {
        void exit.catch(reportFullscreenFailure);
      }
      return;
    }

    if (isNativeVideoFullscreen(video)) {
      try {
        video?.webkitExitFullscreen?.();
      } catch (error) {
        reportFullscreenFailure(error);
      }
      return;
    }

    const strategy = selectFullscreenStrategy(useDirectStream ? 'direct' : 'embed', container, video);

    if (strategy === 'webkit-video') {
      try {
        video?.webkitEnterFullscreen?.();
      } catch (error) {
        reportFullscreenFailure(error);
      }
      return;
    }

    if (strategy === 'standard-container' && container?.requestFullscreen) {
      try {
        void container.requestFullscreen().catch(reportFullscreenFailure);
      } catch (error) {
        reportFullscreenFailure(error);
      }
      return;
    }

    toast.info('Toàn màn hình chưa khả dụng trên trình duyệt này.');
  }, [useDirectStream]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTheaterMode) {
        setIsTheaterMode(false);
        return;
      }

      if (isPlayerShortcutBlockedTarget(e.target)) {
        return;
      }

      const isPlayerFocused =
        containerRef.current === document.activeElement ||
        (containerRef.current && containerRef.current.contains(document.activeElement)) ||
        videoRef.current === document.activeElement;

      if (e.key === 'f' || e.key === 'F') {
        if (useDirectStream || embedUrl) {
          e.preventDefault();
          handleFullscreenToggle();
        }
        return;
      }

      if (!useDirectStream || !videoRef.current) return;
      const v = videoRef.current!;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (v.paused) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          v.muted = !v.muted;
          setPrefs((prev) => {
            const next = { ...prev, muted: v.muted };
            savePlayerPreferences(next);
            return next;
          });
          break;

        case 'p':
        case 'P':
          if (pipSupported) {
            e.preventDefault();
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            } else {
              v.requestPictureInPicture().catch(() => {});
            }
          }
          break;

        case 'n':
        case 'N':
          if (nextEpisodeSlug) {
            e.preventDefault();
            triggerNextEpisodeNavigation();
          }
          break;

        case 'ArrowRight':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            if (Number.isFinite(v.duration)) {
              v.currentTime = Math.min(v.duration, v.currentTime + 10);
              triggerSeekFeedback('forward');
            }
          }
          break;

        case 'ArrowLeft':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            if (Number.isFinite(v.duration)) {
              v.currentTime = Math.max(0, v.currentTime - 10);
              triggerSeekFeedback('backward');
            }
          }
          break;

        case 'ArrowUp':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            const newVolUp = Math.min(1, Number((v.volume + 0.1).toFixed(2)));
            v.volume = newVolUp;
            v.muted = false;
            setPrefs((prev) => {
              const next = { ...prev, volume: newVolUp, muted: false };
              savePlayerPreferences(next);
              return next;
            });
          }
          break;

        case 'ArrowDown':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            const newVolDown = Math.max(0, Number((v.volume - 0.1).toFixed(2)));
            v.volume = newVolDown;
            setPrefs((prev) => {
              const next = { ...prev, volume: newVolDown };
              savePlayerPreferences(next);
              return next;
            });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    useDirectStream,
    embedUrl,
    isTheaterMode,
    pipSupported,
    nextEpisodeSlug,
    triggerNextEpisodeNavigation,
    handleFullscreenToggle,
    isFullscreen,
  ]);

  // Seeking handlers
  const handleSeek = (offsetSeconds: number) => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) {
      const targetTime = Math.max(0, Math.min(v.duration, v.currentTime + offsetSeconds));
      v.currentTime = targetTime;
      setCurrentTime(targetTime);
      triggerSeekFeedback(offsetSeconds > 0 ? 'forward' : 'backward');
    }
  };

  const handleProgressBarChange = (value: number) => {
    setDragTime(value);
    setCurrentTime(value);
  };

  const handleProgressBarCommit = (value: number) => {
    setIsDraggingProgress(false);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) {
      const targetTime = Math.max(0, Math.min(video.duration, value));
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (videoRef.current) {
      setVideoVolume(videoRef.current, newVol, newVol === 0);
    }
    const updated = savePlayerPreferences({ volume: newVol, muted: newVol === 0 });
    setPrefs(updated);
  };

  const handleMuteToggle = () => {
    const newMuted = !prefs.muted;
    if (videoRef.current) {
      setVideoVolume(videoRef.current, videoRef.current.volume, newMuted);
    }
    const updated = savePlayerPreferences({ muted: newMuted });
    setPrefs(updated);
  };

  const handleSpeedSelect = (rate: number) => {
    if (videoRef.current) {
      setVideoPlaybackRate(videoRef.current, rate);
    }
    const updated = savePlayerPreferences({ playbackRate: rate });
    setPrefs(updated);
    setShowSpeedMenu(false);
    toast.success(`Tốc độ phát: ${rate}x`);
  };

  const handleTogglePiP = () => {
    if (!videoRef.current || !pipSupported) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {});
    }
  };

  const reloadPlayer = () => {
    cancelAutoNext();
    setLoading(true);
    hasResumedRef.current = false;
    networkRecoveryCountRef.current = 0;
    mediaRecoveryCountRef.current = 0;
    fallbackTriggeredRef.current = false;
    setUseDirectStream(Boolean(m3u8Url));
    setIframeKey((prev) => prev + 1);
    if (videoRef.current) {
      videoRef.current.load();
    }
    toast.success('Đang tải lại trình phát...');
  };

  const getPlayerModeLabel = () => {
    switch (playerMode) {
      case 'native-hls':
        return 'HLS Direct';
      case 'hls-js':
        return 'HLS Engine';
      case 'embed':
        return 'Nguồn dự phòng';
      case 'unavailable':
        return 'Đang tải';
    }
  };

  const currentDisplayTime = isDraggingProgress ? dragTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, (currentDisplayTime / duration) * 100) : 0;

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isTheaterMode
          ? 'fixed inset-0 z-50 bg-[#000000] flex flex-col justify-center px-2 sm:px-8 py-2 sm:py-6 overflow-y-auto'
          : 'max-w-7xl mx-auto'
      }`}
    >
      {/* Theater Box Container with 16:9 Aspect Ratio */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
        onMouseLeave={handleContainerMouseLeave}
        aria-label={`Trình phát phim ${movieTitle}`}
        className={`relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-2xl group focus:outline-none focus:ring-1 focus:ring-[#e50914] ${
          isTheaterMode ? 'max-h-[85vh] mx-auto' : ''
        }`}
      >
        {/* ============================================================ */}
        {/* 1. TOP PLAYER HEADER OVERLAY (Netflix Top Bar Overlay)       */}
        {/* ============================================================ */}
        <div
          className={`absolute top-0 left-0 right-0 z-30 pt-3 pb-8 px-3 sm:px-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-auto transition-opacity duration-300 ${
            isOverlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Back to Movie Details Button & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={`/phim/${movieSlug}`}
              className="flex items-center gap-1 bg-black/60 hover:bg-black/90 text-white hover:text-[#e50914] px-2.5 py-1.5 rounded-lg border border-white/20 backdrop-blur-md transition-all active:scale-95 shrink-0"
              title="Quay lại trang chi tiết phim"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden xs:inline">Chi tiết</span>
            </Link>

            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-white tracking-tight truncate drop-shadow-md">
                {movieTitle}
                <span className="text-white/60 font-normal mx-1.5">•</span>
                <span className="text-[#e50914] font-extrabold">{displayEpisodeLabel}</span>
              </h2>
              {movieOriginalTitle && (
                <p className="text-[10px] sm:text-xs text-zinc-400 truncate hidden md:block">
                  {movieOriginalTitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Badges in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            {quality && (
              <span className="bg-[#e50914] text-white text-[10px] font-black px-2 py-0.5 rounded shadow uppercase">
                {quality}
              </span>
            )}
            <span className="bg-black/70 border border-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-md hidden xs:inline">
              {serverName || 'Server VIP'}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. DOUBLE-TAP / SEEK FEEDBACK OVERLAY                         */}
        {/* ============================================================ */}
        {seekFeedback && (
          <div
            key={seekFeedback.id}
            className={`absolute inset-y-0 z-20 flex items-center justify-center pointer-events-none animate-pulse ${
              seekFeedback.type === 'backward'
                ? 'left-0 w-1/3 bg-gradient-to-r from-black/60 to-transparent rounded-r-full'
                : 'right-0 w-1/3 bg-gradient-to-l from-black/60 to-transparent rounded-l-full'
            }`}
          >
            <div className="flex flex-col items-center text-white bg-black/80 px-4 py-2.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl">
              {seekFeedback.type === 'backward' ? (
                <>
                  <RotateCcw className="w-6 h-6 text-[#e50914] animate-spin" />
                  <span className="text-xs font-extrabold mt-1 tracking-wider">-10 giây</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-6 h-6 text-[#e50914] animate-spin" />
                  <span className="text-xs font-extrabold mt-1 tracking-wider">+10 giây</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. LOADING SPINNER                                           */}
        {/* ============================================================ */}
        {loading && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3 z-10 select-none">
            <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400 font-medium">
              Đang kết nối luồng phát ({getPlayerModeLabel()})...
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. AUTO-NEXT EPISODE OVERLAY                                 */}
        {/* ============================================================ */}
        {autoNextCountdown !== null && capabilities.canDetectEnded && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in">
            <div className="bg-[#141414] border border-white/10 p-5 sm:p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-[#e50914]">
                <FastForward className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-xs tracking-wider uppercase">Tự động phát tập tiếp</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-zinc-800"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#e50914] transition-all duration-1000 ease-linear"
                      strokeDasharray="100, 100"
                      strokeDashoffset={((5 - autoNextCountdown) / 5) * 100}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black text-white">{autoNextCountdown}s</span>
                </div>

                <div>
                  <h3 className="text-white font-bold text-base sm:text-lg line-clamp-1">
                    {movieTitle}
                  </h3>
                  <p className="text-xs text-[#e50914] font-semibold mt-0.5">
                    Chuẩn bị phát: {nextEpisodeLabel}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={triggerNextEpisodeNavigation}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Phát ngay</span>
                </button>
                <button
                  onClick={cancelAutoNext}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-white/10 active:scale-95 cursor-pointer"
                  title="Dừng tự động phát"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. VIDEO ENGINE MOUNT (Direct HLS / Plyr / Iframe)           */}
        {/* ============================================================ */}
        {useDirectStream && m3u8Url ? (
          <div
            ref={videoHostRef}
            className="w-full h-full bg-black flex items-center justify-center"
          />
        ) : embedUrl ? (
          <iframe
            key={iframeKey}
            src={embedUrl}
            title={`${movieTitle} - ${displayEpisodeLabel}`}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        ) : !useDirectStream || !m3u8Url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-zinc-400 p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-[#e50914]" />
            <p className="text-sm font-semibold text-white">Không tìm thấy luồng phát cho tập này.</p>
            <p className="text-xs text-zinc-500 max-w-sm">Vui lòng thử đổi server hoặc chọn tập khác bên dưới.</p>
          </div>
        ) : null}

        {useDirectStream && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 pt-10 pb-2 px-2 sm:px-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-1.5 pointer-events-auto transition-opacity duration-300 select-none ${
              isOverlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="relative flex min-w-0 flex-1 items-center cursor-pointer py-1.5 group/bar">
                <div className="relative w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden group-hover/bar:h-2 sm:group-hover/bar:h-2.5 transition-all">
                  <div
                    className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all duration-300"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-[#e50914] rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration > 0 ? duration : 100}
                  step="0.1"
                  value={currentDisplayTime}
                  onMouseDown={() => setIsDraggingProgress(true)}
                  onTouchStart={() => setIsDraggingProgress(true)}
                  onChange={(event) => handleProgressBarChange(Number(event.target.value))}
                  onMouseUp={(event) => handleProgressBarCommit(Number(event.currentTarget.value))}
                  onTouchEnd={(event) => handleProgressBarCommit(Number(event.currentTarget.value))}
                  onKeyUp={(event) => {
                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                      handleProgressBarCommit(Number(event.currentTarget.value));
                    }
                  }}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:accent-[#e50914]"
                  aria-label="Thanh tua thời gian"
                />
                <div
                  className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#e50914] shadow-lg transition-transform group-hover/bar:scale-125 sm:h-4 sm:w-4"
                  style={{ left: `calc(${progressPercent}% - 7px)` }}
                />
              </div>
              <span className="shrink-0 whitespace-nowrap text-[9px] font-mono text-zinc-300 sm:text-xs">
                <span className="font-bold text-white">{formatTime(currentDisplayTime)}</span>
                <span className="mx-0.5 text-zinc-500 sm:mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-0.5 text-white max-[360px]:gap-0 sm:gap-2">
              <div className="flex min-w-0 items-center gap-0.5 max-[360px]:gap-0 sm:gap-1.5">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 active:scale-95"
                  title={isPlaying ? 'Tạm dừng (Space / K)' : 'Phát (Space / K)'}
                  aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {isPlaying ? <Pause className="h-5 w-5 fill-current sm:h-6 sm:w-6" /> : <Play className="h-5 w-5 fill-current sm:h-6 sm:w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(-10)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                  title="Tua lùi 10 giây (Phím ←)"
                  aria-label="Tua lùi 10 giây"
                >
                  <RotateCcw className="h-4 w-4 text-[#e50914] sm:h-5 sm:w-5" />
                  <span className="hidden text-[11px] font-bold md:inline">-10s</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSeek(10)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                  title="Tua tới 10 giây (Phím →)"
                  aria-label="Tua tới 10 giây"
                >
                  <RotateCw className="h-4 w-4 text-[#e50914] sm:h-5 sm:w-5" />
                  <span className="hidden text-[11px] font-bold md:inline">+10s</span>
                </button>
                <div className="flex min-h-11 min-w-11 items-center justify-center">
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/15 hover:text-white"
                    title={prefs.muted || prefs.volume === 0 ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'}
                    aria-label={prefs.muted || prefs.volume === 0 ? 'Bật tiếng' : 'Tắt tiếng'}
                  >
                    {prefs.muted || prefs.volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-[#e50914] sm:h-5 sm:w-5" />
                    ) : prefs.volume < 0.5 ? (
                      <Volume1 className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={prefs.muted ? 0 : prefs.volume}
                    onChange={(event) => handleVolumeChange(Number(event.target.value))}
                    className="hidden h-1.5 w-12 cursor-pointer rounded-full bg-white/20 accent-[#e50914] sm:block sm:w-16"
                    aria-label="Thanh chỉnh âm lượng"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 max-[360px]:gap-0 sm:gap-1.5">
                {nextEpisodeSlug && (
                  <button
                    type="button"
                    onClick={triggerNextEpisodeNavigation}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-[#e50914] text-white shadow-md transition-all hover:bg-[#f40612] active:scale-95"
                    title={`Chuyển sang ${nextEpisodeLabel}`}
                    aria-label={`Chuyển sang ${nextEpisodeLabel}`}
                  >
                    <SkipForward className="h-4 w-4 fill-current" />
                    <span className="hidden text-[11px] font-bold lg:inline">{nextEpisodeLabel}</span>
                  </button>
                )}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu((visible) => !visible)}
                    className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-white/20 bg-black/60 text-white transition-colors hover:bg-black/90"
                    title="Tốc độ phát"
                    aria-label="Tốc độ phát"
                    aria-expanded={showSpeedMenu}
                  >
                    <Gauge className="h-3.5 w-3.5 text-[#e50914]" />
                    <span className="text-[10px] font-bold sm:text-xs">{prefs.playbackRate}x</span>
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 z-40 mb-2 min-w-[96px] rounded-xl border border-white/20 bg-[#181818] p-1 shadow-2xl backdrop-blur-md">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tốc độ</div>
                      {ALLOWED_PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => handleSpeedSelect(rate)}
                          className={`min-h-9 w-full rounded-lg px-2.5 text-left text-xs font-semibold transition-colors ${
                            prefs.playbackRate === rate ? 'bg-[#e50914] font-bold text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {rate === 1 ? '1x (Chuẩn)' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {pipSupported && (
                  <button
                    type="button"
                    onClick={handleTogglePiP}
                    className={`hidden min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors md:flex ${
                      isInPiP ? 'bg-[#e50914] font-bold text-white' : 'text-zinc-200 hover:bg-white/15 hover:text-white'
                    }`}
                    title={isInPiP ? 'Thoát cửa sổ nổi' : 'Cửa sổ nổi (PiP - Phím P)'}
                    aria-label={isInPiP ? 'Thoát cửa sổ nổi' : 'Cửa sổ nổi'}
                  >
                    <PictureInPicture2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFullscreenToggle}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                  title={isFullscreen ? 'Thoát toàn màn hình (F / Esc)' : 'Toàn màn hình (F)'}
                  aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 7. QUICK ACTION BAR UNDER PLAYER (External utilities)        */}
      {/* ============================================================ */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 px-1 text-xs text-zinc-400 sm:px-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181818] px-2.5 py-1.5 font-medium text-white">
            <Tv className="h-3.5 w-3.5 text-[#e50914]" />
            {serverName || 'Server Vietsub'}
          </span>
          <span className="rounded-lg bg-[#e50914] px-2.5 py-1.5 font-bold text-white">{displayEpisodeLabel}</span>
          {m3u8Url && embedUrl && (
            <button
              type="button"
              onClick={() => {
                const nextDirect = !useDirectStream;
                if (nextDirect) {
                  setLoading(true);
                  setUseDirectStream(true);
                  setPlayerMode('hls-js');
                  toast.success('Đã chuyển sang luồng Direct');
                } else {
                  switchToEmbed();
                  toast.success('Đã chuyển sang luồng Dự phòng (Iframe)');
                }
              }}
              className="flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-[#181818] px-2.5 py-1.5 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              title={useDirectStream ? 'Chuyển sang nguồn nhúng dự phòng' : 'Thử lại nguồn Direct'}
              aria-label={useDirectStream ? 'Chuyển sang nguồn nhúng dự phòng' : 'Thử lại nguồn Direct'}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold">{useDirectStream ? 'Nguồn: Direct' : 'Nguồn: Dự phòng'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={reloadPlayer}
            className="flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-[#181818] px-2.5 py-1.5 text-white transition-colors hover:bg-zinc-800"
            title="Tải lại trình phát nếu bị giật hoặc đứng hình"
            aria-label="Tải lại trình phát"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#e50914]" />
            <span className="hidden xs:inline">Tải lại</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTheaterMode((active) => !active)}
            className={`hidden min-h-10 items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors sm:flex ${
              isTheaterMode
                ? 'border-[#e50914] bg-[#e50914] font-bold text-white'
                : 'border-white/10 bg-[#181818] text-white hover:bg-zinc-800'
            }`}
            title={isTheaterMode ? 'Thoát chế độ rạp phim (Esc)' : 'Bật chế độ rạp phim mở rộng'}
            aria-pressed={isTheaterMode}
          >
            {isTheaterMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-[#e50914]" />}
            <span>Rạp phim</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoPlayer(props: VideoPlayerProps) {
  const sourceKey = getPlayerSourceKey(props);
  return <VideoPlayerInner key={sourceKey} {...props} />;
}
