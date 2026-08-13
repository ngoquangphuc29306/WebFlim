'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
  Gauge,
  PictureInPicture2,
  Play,
  X,
  FastForward,
  RotateCcw,
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
import { getPlayerSourceKey, isEditableKeyboardTarget } from './player-logic';
import { usePlyrPlayer } from './hooks/usePlyrPlayer';

export type { PlayerMode } from './hooks/useHlsPlayer';

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

class VideoElementHandle {
  private element: HTMLVideoElement | null = null;

  get(): HTMLVideoElement | null {
    return this.element;
  }

  set(element: HTMLVideoElement | null): void {
    this.element = element;
  }
}

interface VideoPlayerProps {
  embedUrl: string;
  m3u8Url?: string;
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  episodeName: string;
  episodeSlug: string;
  serverName: string;
  serverIndex?: number;
  nextEpisodeSlug?: string;
  nextEpisodeName?: string;
}

const ALLOWED_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

function VideoPlayerInner({
  embedUrl,
  m3u8Url,
  movieSlug,
  movieTitle,
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

  // Player preferences state
  // Keep the first render deterministic for SSR. Browser storage is loaded
  // after hydration so persisted preferences do not change server markup.
  const [prefs, setPrefs] = useState<PlayerPreferences>(DEFAULT_PREFERENCES);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Picture-in-Picture active state tracking
  const [isInPiP, setIsInPiP] = useState(false);

  // Double-tap gesture seek feedback state
  const [seekFeedback, setSeekFeedback] = useState<{ type: 'forward' | 'backward'; id: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!useDirectStream || !videoHandle.get()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const now = e.timeStamp;

    if (now - lastTapRef.current.time < 350 && Math.abs(clickX - lastTapRef.current.x) < 80) {
      const v = videoHandle.get();
      if (!v) return;
      if (clickX < width * 0.4) {
        if (Number.isFinite(v.duration)) {
          v.currentTime = Math.max(0, v.currentTime - 10);
          setSeekFeedback({ type: 'backward', id: now });
          if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
          seekTimerRef.current = setTimeout(() => setSeekFeedback(null), 800);
        }
      } else if (clickX > width * 0.6) {
        if (Number.isFinite(v.duration)) {
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          setSeekFeedback({ type: 'forward', id: now });
          if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
          seekTimerRef.current = setTimeout(() => setSeekFeedback(null), 800);
        }
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: clickX };
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Plyr wraps and mutates its target element. Keep that DOM subtree outside
  // React's child reconciliation while retaining the same video element refs.
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoHandle] = useState(() => new VideoElementHandle());
  const getVideoElement = useCallback(() => {
    if (!videoReady) return null;
    return videoHandle.get();
  }, [videoHandle, videoReady]);
  const hlsRef = useRef<Hls | null>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const directVideoListenersCleanupRef = useRef<(() => void) | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const hasResumedRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPrefs(getPlayerPreferences());
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const disposeDirectBackend = useCallback(() => {
    sourceGenerationRef.current += 1;

    const video = videoHandle.get();
    video?.pause();

    if (plyrRef.current) {
      plyrRef.current.destroy();
      plyrRef.current = null;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    directVideoListenersCleanupRef.current?.();
    directVideoListenersCleanupRef.current = null;

    if (video) {
      video.removeAttribute('src');
      video.load();
      videoHandle.set(null);
      setVideoReady(false);
      video.remove();
    }
  }, [setVideoReady, videoHandle]);

  useLayoutEffect(() => {
    const host = videoHostRef.current;
    if (!host) return;

    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.className = 'w-full h-full object-contain';
    host.appendChild(video);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled && host.isConnected) {
        videoHandle.set(video);
        setVideoReady(true);
      }
    });

    return () => {
      cancelled = true;
      disposeDirectBackend();
      video.remove();
    };
  }, [disposeDirectBackend, setVideoReady, videoHandle]);

  // Recovery & Guard Refs
  const networkRecoveryCountRef = useRef<number>(0);
  const mediaRecoveryCountRef = useRef<number>(0);
  const fallbackTriggeredRef = useRef<boolean>(false);
  const sourceGenerationRef = useRef<number>(0);
  const activeEpisodeRef = useRef({ movieSlug, episodeSlug });

  useEffect(() => {
    activeEpisodeRef.current = { movieSlug, episodeSlug };
  }, [movieSlug, episodeSlug]);

  // Store metadata in refs for visibilitychange / unmount handlers
  const propsRef = useRef({
    embedUrl,
    m3u8Url,
    movieSlug,
    movieTitle,
    posterUrl,
    episodeName,
    episodeSlug,
    serverName,
    serverIndex,
    useDirectStream,
    nextEpisodeSlug,
  });

  useEffect(() => {
    propsRef.current = {
      embedUrl,
      m3u8Url,
      movieSlug,
      movieTitle,
      posterUrl,
      episodeName,
      episodeSlug,
      serverName,
      serverIndex,
      useDirectStream,
      nextEpisodeSlug,
    };
  }, [
    embedUrl,
    m3u8Url,
    movieSlug,
    movieTitle,
    posterUrl,
    episodeName,
    episodeSlug,
    serverName,
    serverIndex,
    useDirectStream,
    nextEpisodeSlug,
  ]);

  // Capabilities abstraction
  const capabilities = useDirectStream ? DIRECT_PLAYER_CAPABILITIES : EMBED_PLAYER_CAPABILITIES;

  // Clear auto-next countdown helper
  const cancelAutoNext = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  };

  const handleReplayCurrentEpisode = () => {
    cancelAutoNext();
    if (videoHandle.get()) {
      setVideoCurrentTime(videoHandle.get()!, 0);
      videoHandle.get()!.play().catch(() => {});
    }
  };

  // Picture-in-Picture event listeners
  useEffect(() => {
    const video = videoHandle.get();
    if (!video) return;

    const handleEnterPiP = () => setIsInPiP(true);
    const handleLeavePiP = () => setIsInPiP(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [useDirectStream, playerMode]);

  // Smooth scroll into view when Theater Mode is toggled on
  useEffect(() => {
    if (isTheaterMode && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isTheaterMode]);

  // Cleanup auto-next timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // Centralized Fallback Helper
  const fallbackToEmbed = React.useCallback((reason?: string) => {
    if (fallbackTriggeredRef.current) return;
    fallbackTriggeredRef.current = true;

    if (reason) {
      console.warn(`[VideoPlayer] Fallback to embed triggered: ${reason}`);
    }

    disposeDirectBackend();

    setUseDirectStream(false);
    if (embedUrl) {
      setPlayerMode('embed');
      toast.info('Đã tự động chuyển sang nguồn phát dự phòng.');
    } else {
      setPlayerMode('unavailable');
      toast.error('Nguồn phát không khả dụng cho tập này.');
    }
    setLoading(true);
  }, [disposeDirectBackend, embedUrl]);

  // Record watch history on mount/source init
  useEffect(() => {
    if (movieSlug && episodeName && (embedUrl || m3u8Url)) {
      saveWatchHistory({
        slug: movieSlug,
        title: movieTitle,
        posterUrl,
        episodeName,
        episodeSlug,
        serverName,
        serverIndex,
      });
    }
  }, [movieSlug, movieTitle, posterUrl, episodeName, episodeSlug, serverName, serverIndex, embedUrl, m3u8Url]);

  // HLS lifecycle, recovery, cleanup, and source-generation guards.
  useHlsPlayer({
    useDirectStream,
    m3u8Url,
    embedUrl,
    getVideoElement,
    hlsRef,
    sourceGenerationRef,
    networkRecoveryCountRef,
    mediaRecoveryCountRef,
    fallbackTriggeredRef,
    countdownTimerRef,
    setPlayerMode,
    fallbackToEmbed,
  });

  usePlyrPlayer({
    enabled: useDirectStream && Boolean(m3u8Url),
    getVideoElement,
    plyrRef,
  });

  // Keep PHEVO preferences synchronized with Plyr's underlying video element.
  useEffect(() => {
    const video = videoHandle.get();
    if (!video || !useDirectStream) return;

    const handleRateChange = () => {
      if (ALLOWED_PLAYBACK_RATES.includes(video.playbackRate)) {
        setPrefs((previous) => {
          if (previous.playbackRate === video.playbackRate) return previous;
          const next = { ...previous, playbackRate: video.playbackRate };
          savePlayerPreferences(next);
          return next;
        });
      }
    };
    const handleVolumeChange = () => {
      setPrefs((previous) => {
        const next = { ...previous, volume: video.volume, muted: video.muted };
        if (next.volume === previous.volume && next.muted === previous.muted) return previous;
        savePlayerPreferences(next);
        return next;
      });
    };

    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('volumechange', handleVolumeChange);
    return () => {
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [useDirectStream]);

  // Helper to save current video progress
  const saveCurrentVideoProgress = (force: boolean = false, isEnded: boolean = false) => {
    const v = videoHandle.get();
    const p = propsRef.current;
    if (!v || !p.useDirectStream || !p.movieSlug || !p.episodeSlug) return;
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    if (!Number.isFinite(v.currentTime) || v.currentTime < 0) return;

    const now = Date.now();
    if (force || now - lastSaveTimeRef.current >= 5000) {
      lastSaveTimeRef.current = now;
      savePlaybackProgress(
        {
          movieSlug: p.movieSlug,
          movieTitle: p.movieTitle,
          posterUrl: p.posterUrl,
          episodeSlug: p.episodeSlug,
          episodeName: p.episodeName,
          serverIndex: p.serverIndex,
          serverName: p.serverName,
          currentTime: isEnded ? v.duration : v.currentTime,
          duration: v.duration,
        },
        force
      );
    }
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    setLoading(false);
    const v = videoHandle.get();
    const p = propsRef.current;
    if (!v || !p.movieSlug || !p.episodeSlug) return;

    // Apply restored preferences
    setVideoProperties(v, prefs.volume, prefs.muted, prefs.playbackRate);

    if (hasResumedRef.current) return;

    // Resume playback logic
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
      } catch (err) {
        console.warn('Failed to set resume currentTime:', err);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!capabilities.canReadCurrentTime) return;
    saveCurrentVideoProgress(false);
  };

  const handlePause = () => {
    if (!capabilities.canReadCurrentTime) return;
    saveCurrentVideoProgress(true);
  };

  const triggerNextEpisodeNavigation = useCallback(() => {
    cancelAutoNext();
    if (!nextEpisodeSlug) return;
    router.push(`/xem-phim/${movieSlug}?ep=${nextEpisodeSlug}&server=${serverIndex}`);
  }, [nextEpisodeSlug, movieSlug, serverIndex, router]);

  const handleEnded = () => {
    if (!capabilities.canDetectEnded) return;
    saveCurrentVideoProgress(true, true);

    // Auto-next episode countdown (only if nextEpisodeSlug exists and feature is enabled)
    if (prefs.autoplayNextEpisode && nextEpisodeSlug) {
      setAutoNextCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      const startingEpSlug = episodeSlug;
      countdownTimerRef.current = setInterval(() => {
        // Validate active episode hasn't changed
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
  };

  const handleDirectError = () => {
    // Mode-aware error handling to prevent racing with HLS.js recovery
    if (playerMode === 'native-hls') {
      fallbackToEmbed('Native video onError fired');
    } else if (playerMode === 'hls-js') {
      // In HLS.js mode, only trigger fallback if HLS.js recovery has exhausted retries or is inactive
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
  };

  // Bind React-owned behavior to the imperatively created video element.
  useEffect(() => {
    const video = videoHandle.get();
    if (!video) return;

    const handleLoadedDataEvent = () => setLoading(false);
    video.addEventListener('loadeddata', handleLoadedDataEvent);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleDirectError);

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoadedDataEvent);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleDirectError);
    };

    directVideoListenersCleanupRef.current = cleanup;
    return () => {
      cleanup();
      if (directVideoListenersCleanupRef.current === cleanup) {
        directVideoListenersCleanupRef.current = null;
      }
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handlePause, handleEnded, handleDirectError]);

  // Page visibility & pagehide listener to save progress when app is backgrounded/tab switched
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
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }

      if (e.key === 'Escape' && isTheaterMode) {
        setIsTheaterMode(false);
        return;
      }

      // Check keyboard focus scope for Arrow keys
      const isFullscreen = Boolean(document.fullscreenElement);
      const isPlayerFocused =
        containerRef.current === document.activeElement ||
        (containerRef.current && containerRef.current.contains(document.activeElement)) ||
        videoHandle.get() === document.activeElement;

      // Global-safe shortcuts
      if (e.key === 'f' || e.key === 'F') {
        if (useDirectStream || embedUrl) {
          e.preventDefault();
          if (containerRef.current) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              containerRef.current.requestFullscreen().catch(() => {});
            }
          }
        }
        return;
      }

      if (!useDirectStream || !videoHandle.get()) return;
      const v = videoHandle.get()!;

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

        // Arrow keys REQUIRE player container focus or fullscreen
        case 'ArrowRight':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            if (Number.isFinite(v.duration)) {
              v.currentTime = Math.min(v.duration, v.currentTime + 10);
            }
          }
          break;

        case 'ArrowLeft':
          if (isFullscreen || isPlayerFocused) {
            e.preventDefault();
            if (Number.isFinite(v.duration)) {
              v.currentTime = Math.max(0, v.currentTime - 10);
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
  }, [useDirectStream, embedUrl, isTheaterMode, pipSupported, nextEpisodeSlug, triggerNextEpisodeNavigation]);

  // Preferences controls
  const handleVolumeChange = (newVol: number) => {
    if (videoHandle.get()) {
      setVideoVolume(videoHandle.get()!, newVol, newVol === 0);
    }
    const updated = savePlayerPreferences({ volume: newVol, muted: newVol === 0 });
    setPrefs(updated);
  };

  const handleMuteToggle = () => {
    const newMuted = !prefs.muted;
    if (videoHandle.get()) {
      setVideoVolume(videoHandle.get()!, videoHandle.get()!.volume, newMuted);
    }
    const updated = savePlayerPreferences({ muted: newMuted });
    setPrefs(updated);
  };

  const handleSpeedSelect = (rate: number) => {
    if (videoHandle.get()) {
      setVideoPlaybackRate(videoHandle.get()!, rate);
    }
    const updated = savePlayerPreferences({ playbackRate: rate });
    setPrefs(updated);
    setShowSpeedMenu(false);
  };

  const handleAutoplayToggle = () => {
    const updated = savePlayerPreferences({ autoplayNextEpisode: !prefs.autoplayNextEpisode });
    setPrefs(updated);
  };

  const handleTogglePiP = () => {
    if (!videoHandle.get() || !pipSupported) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      videoHandle.get()!.requestPictureInPicture().catch(() => {});
    }
  };

  // Reload player
  const reloadPlayer = () => {
    cancelAutoNext();
    setLoading(true);
    hasResumedRef.current = false;
    networkRecoveryCountRef.current = 0;
    mediaRecoveryCountRef.current = 0;
    fallbackTriggeredRef.current = false;
    setUseDirectStream(Boolean(m3u8Url));
    setIframeKey((prev) => prev + 1);
    if (videoHandle.get()) {
      videoHandle.get()!.load();
    }
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
        return 'Không khả dụng';
    }
  };

  return (
    <div className={`w-full transition-all duration-300 ${isTheaterMode ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
      {/* Video Container */}
      <div
        ref={containerRef}
        tabIndex={0}
        onClick={handleContainerClick}
        aria-label="Trình phát video PHEVO"
        className="relative w-full aspect-video bg-[#050505] rounded-2xl overflow-hidden border border-[#222] shadow-2xl group focus:outline-none focus:ring-1 focus:ring-[#e50914]"
      >
        {/* Double-tap Seek Feedback Overlay */}
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
                  <FastForward className="w-6 h-6 text-[#e50914]" />
                  <span className="text-xs font-extrabold mt-1 tracking-wider">+10 giây</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#a3a3a3]">
              Đang kết nối luồng phát ({getPlayerModeLabel()})...
            </p>
          </div>
        )}

        {/* Auto-Next Episode Overlay */}
        {autoNextCountdown !== null && capabilities.canDetectEnded && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-fade-in">
            <div className="bg-[#121212] border border-[#2a2a2a] p-5 sm:p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl relative overflow-hidden">
              {/* Background ambient glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#e50914]/15 rounded-full blur-2xl pointer-events-none" />

              {/* Top Badge */}
              <div className="flex items-center justify-center gap-2 text-[#e50914]">
                <FastForward className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-xs tracking-wider uppercase">Tự động chuyển tập</span>
              </div>

              {/* Episode Info & Circular Timer Ring */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#222]"
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
                    Chuẩn bị phát: Tập {nextEpisodeName || 'kế tiếp'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={triggerNextEpisodeNavigation}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold transition-all shadow-lg shadow-[#e50914]/25 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Phát ngay</span>
                </button>
                <button
                  onClick={cancelAutoNext}
                  className="py-2.5 px-3 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-[#a3a3a3] hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-[#333] active:scale-95"
                  title="Dừng tự động phát"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
              </div>

              <button
                onClick={handleReplayCurrentEpisode}
                className="w-full py-2 text-center text-xs text-[#a3a3a3] hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xem lại tập vừa chiếu</span>
              </button>
            </div>
          </div>
        )}

        {/* Only one playback backend is mounted at a time. */}
        {useDirectStream && m3u8Url ? (
          <div ref={videoHostRef} className="w-full h-full" />
        ) : embedUrl ? (
          <iframe
            key={iframeKey}
            src={embedUrl}
            title={`${movieTitle} - Tập ${episodeName}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        ) : !useDirectStream || !m3u8Url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#101010] text-[#a3a3a3]">
            <ShieldAlert className="w-10 h-10 text-[#e50914]" />
            <p className="text-sm font-medium">Không tìm thấy luồng phát cho tập này.</p>
          </div>
        ) : null}
      </div>

      {/* Control & Info Bar under Player */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2 text-xs text-[#a3a3a3]">
        {/* Left Server/Episode Info */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] text-white font-medium px-2.5 py-1 rounded-lg">
            <Tv className="w-3.5 h-3.5 text-[#e50914]" />
            {serverName || 'Server Vietsub'}
          </span>
          <span className="bg-[#e50914] text-white font-bold px-2.5 py-1 rounded-lg">
            Tập {episodeName}
          </span>
          <span className="hidden xs:inline-block bg-[#181818] border border-[#262626] text-[#737373] text-[11px] px-2 py-1 rounded-lg">
            {getPlayerModeLabel()}
          </span>
        </div>

        {/* Right Controls (Speed, Volume, PiP, Auto-next toggle, Reload, Theater) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {useDirectStream && (
            <>
              {/* Speed Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 bg-[#141414] hover:bg-[#1a1a1a] text-white px-2.5 py-1.5 rounded-lg border border-[#262626] transition-colors"
                  title="Tốc độ phát"
                >
                  <Gauge className="w-3.5 h-3.5 text-[#e50914]" />
                  <span>{prefs.playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute right-0 bottom-full mb-2 bg-[#121212] border border-[#282828] rounded-xl shadow-2xl p-1 z-40 min-w-[80px]">
                    {ALLOWED_PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedSelect(rate)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          prefs.playbackRate === rate
                            ? 'bg-[#e50914] text-white'
                            : 'text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Slider & Mute */}
              <div className="hidden sm:flex items-center gap-1 bg-[#141414] border border-[#262626] px-2.5 py-1 rounded-lg">
                <button
                  onClick={handleMuteToggle}
                  className="text-[#a3a3a3] hover:text-white transition-colors"
                  title={prefs.muted ? 'Bật tiếng' : 'Tắt tiếng'}
                >
                  {prefs.muted || prefs.volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#e50914]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={prefs.muted ? 0 : prefs.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 h-1 accent-[#e50914] cursor-pointer"
                />
              </div>

              {/* PiP Button */}
              {pipSupported && (
                <button
                  onClick={handleTogglePiP}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isInPiP
                      ? 'bg-[#e50914] border-[#e50914] text-white font-bold'
                      : 'bg-[#141414] hover:bg-[#1a1a1a] text-white border-[#262626]'
                  }`}
                  title={isInPiP ? 'Đang bật cửa sổ nổi (Click để thoát)' : 'Xem ở cửa sổ nổi (Picture-in-Picture)'}
                >
                  <PictureInPicture2 className={`w-3.5 h-3.5 ${isInPiP ? 'text-white' : 'text-[#e50914]'}`} />
                  <span>{isInPiP ? 'Đang phát PiP' : 'Cửa sổ nổi'}</span>
                </button>
              )}
            </>
          )}

          {/* Quick Next Episode Button (Available on all players if next episode exists) */}
          {nextEpisodeSlug && (
            <button
              onClick={triggerNextEpisodeNavigation}
              className="flex items-center gap-1.5 bg-[#e50914]/15 hover:bg-[#e50914]/25 text-[#e50914] hover:text-white px-2.5 py-1.5 rounded-lg border border-[#e50914]/40 font-bold transition-all active:scale-95"
              title={`Chuyển sang Tập ${nextEpisodeName || 'tiếp theo'} (Phím tắt N)`}
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Tập {nextEpisodeName || 'kế'}</span>
            </button>
          )}

          {/* Auto-Next Episode Toggle - ONLY show if direct player can detect ended */}
          {capabilities.canDetectEnded && (
            <button
              onClick={handleAutoplayToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                prefs.autoplayNextEpisode
                  ? 'bg-[#181818] border-[#e50914] text-white font-semibold'
                  : 'bg-[#141414] border-[#262626] text-[#737373] hover:text-white'
              }`}
              title="Tự động chuyển sang tập tiếp theo khi phát xong"
            >
              <span className={`w-2 h-2 rounded-full ${prefs.autoplayNextEpisode ? 'bg-[#e50914] animate-pulse' : 'bg-[#555]'}`} />
              <span className="hidden xs:inline">Tự chuyển tập</span>
            </button>
          )}

          {/* Reload Player */}
          <button
            onClick={reloadPlayer}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-white px-2.5 py-1.5 rounded-lg border border-[#262626] transition-colors"
            title="Tải lại trình phát nếu bị giật hoặc đứng hình"
            aria-label="Tải lại trình phát"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#e50914]" />
            <span className="hidden xs:inline">Tải lại</span>
          </button>

          {/* Theater Mode */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              isTheaterMode
                ? 'bg-[#e50914] border-[#e50914] text-white font-bold'
                : 'bg-[#141414] hover:bg-[#1a1a1a] text-white border-[#262626]'
            }`}
            title={isTheaterMode ? 'Thoát chế độ rạp phim (Esc)' : 'Bật chế độ rạp phim mở rộng'}
          >
            {isTheaterMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-white" />
                <span>Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#e50914]" />
                <span>Rạp phim</span>
              </>
            )}
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
