'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Hls from 'hls.js';
import {
  RefreshCw,
  Maximize2,
  ShieldAlert,
  Tv,
  Volume2,
  VolumeX,
  Gauge,
  PictureInPicture2,
  Play,
  X,
  FastForward,
} from 'lucide-react';
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
  getPlayerPreferences,
  savePlayerPreferences,
  PlayerPreferences,
} from '@/lib/utils/player-preferences';

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

export type PlayerMode = 'native-hls' | 'hls-js' | 'embed' | 'unavailable';

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
  const [playerMode, setPlayerMode] = useState<PlayerMode>(
    m3u8Url ? 'native-hls' : embedUrl ? 'embed' : 'unavailable'
  );

  // Player preferences state
  const [prefs, setPrefs] = useState<PlayerPreferences>(getPlayerPreferences);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [pipSupported] = useState<boolean>(() => {
    return (
      typeof document !== 'undefined' &&
      'pictureInPictureEnabled' in document &&
      Boolean(document.pictureInPictureEnabled)
    );
  });

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const hasResumedRef = useRef<boolean>(false);

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

  // HLS stream setup & HLS.js cross-browser integration
  useEffect(() => {
    // Clear previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!useDirectStream || !m3u8Url) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Check Native HLS support (Safari, Mobile Safari, iOS)
    const canNative = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    if (canNative) {
      video.src = m3u8Url;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('HLS.js fatal error encountered:', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Cannot recover, fallback to embed
              hls.destroy();
              hlsRef.current = null;
              setUseDirectStream(false);
              setPlayerMode('embed');
              setLoading(true);
              break;
          }
        }
      });
    } else {
      // HLS not supported natively or via Hls.js -> fallback
      queueMicrotask(() => {
        setUseDirectStream(false);
        setPlayerMode('embed');
        setLoading(true);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [useDirectStream, m3u8Url, embedUrl]);

  // Helper to save current video progress
  const saveCurrentVideoProgress = (force: boolean = false, isEnded: boolean = false) => {
    const v = videoRef.current;
    const p = propsRef.current;
    if (!v || !p.useDirectStream || !p.movieSlug || !p.episodeSlug) return;
    if (!Number.isFinite(v.duration) || v.duration <= 0) return;
    if (!Number.isFinite(v.currentTime) || v.currentTime < 0) return;

    const now = Date.now();
    if (force || now - lastSaveTimeRef.current >= 5000) {
      lastSaveTimeRef.current = now;
      savePlaybackProgress({
        movieSlug: p.movieSlug,
        movieTitle: p.movieTitle,
        posterUrl: p.posterUrl,
        episodeSlug: p.episodeSlug,
        episodeName: p.episodeName,
        serverIndex: p.serverIndex,
        serverName: p.serverName,
        currentTime: isEnded ? v.duration : v.currentTime,
        duration: v.duration,
      });
    }
  };

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    setLoading(false);
    const v = videoRef.current;
    const p = propsRef.current;
    if (!v || !p.movieSlug || !p.episodeSlug) return;

    // Apply restored preferences
    v.volume = prefs.volume;
    v.muted = prefs.muted;
    v.playbackRate = prefs.playbackRate;

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
        v.currentTime = saved.currentTime;
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

  const triggerNextEpisodeNavigation = () => {
    if (!nextEpisodeSlug) return;
    router.push(`/xem-phim/${movieSlug}?ep=${nextEpisodeSlug}&server=${serverIndex}`);
  };

  const cancelAutoNext = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  };

  const handleEnded = () => {
    if (!capabilities.canDetectEnded) return;
    saveCurrentVideoProgress(true, true);

    // Auto-next episode countdown
    if (prefs.autoplayNextEpisode && nextEpisodeSlug) {
      setAutoNextCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      countdownTimerRef.current = setInterval(() => {
        setAutoNextCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            triggerNextEpisodeNavigation();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleDirectError = () => {
    console.warn('Direct stream playback error, falling back to embed iframe');
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setUseDirectStream(false);
    setPlayerMode('embed');
    setLoading(true);
  };

  // Page visibility listener to save progress when app is backgrounded/tab switched
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentVideoProgress(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      saveCurrentVideoProgress(true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape' && isTheaterMode) {
        setIsTheaterMode(false);
        return;
      }

      if (!useDirectStream || !videoRef.current) return;
      const v = videoRef.current;

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

        case 'ArrowRight':
          e.preventDefault();
          if (Number.isFinite(v.duration)) {
            v.currentTime = Math.min(v.duration, v.currentTime + 10);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (Number.isFinite(v.duration)) {
            v.currentTime = Math.max(0, v.currentTime - 10);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          const newVolUp = Math.min(1, Number((v.volume + 0.1).toFixed(2)));
          v.volume = newVolUp;
          v.muted = false;
          setPrefs((prev) => {
            const next = { ...prev, volume: newVolUp, muted: false };
            savePlayerPreferences(next);
            return next;
          });
          break;

        case 'ArrowDown':
          e.preventDefault();
          const newVolDown = Math.max(0, Number((v.volume - 0.1).toFixed(2)));
          v.volume = newVolDown;
          setPrefs((prev) => {
            const next = { ...prev, volume: newVolDown };
            savePlayerPreferences(next);
            return next;
          });
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

        case 'f':
        case 'F':
          e.preventDefault();
          if (containerRef.current) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              containerRef.current.requestFullscreen().catch(() => {});
            }
          }
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          if (pipSupported && v) {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            } else {
              v.requestPictureInPicture().catch(() => {});
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useDirectStream, isTheaterMode, pipSupported]);

  // Preferences controls
  const handleVolumeChange = (newVol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    const updated = savePlayerPreferences({ volume: newVol, muted: newVol === 0 });
    setPrefs(updated);
  };

  const handleMuteToggle = () => {
    const newMuted = !prefs.muted;
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    const updated = savePlayerPreferences({ muted: newMuted });
    setPrefs(updated);
  };

  const handleSpeedSelect = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
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
    if (!videoRef.current || !pipSupported) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {});
    }
  };

  // Reload player
  const reloadPlayer = () => {
    cancelAutoNext();
    setLoading(true);
    hasResumedRef.current = false;
    setUseDirectStream(Boolean(m3u8Url));
    setIframeKey((prev) => prev + 1);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className={`w-full transition-all duration-300 ${isTheaterMode ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
      {/* Video Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-[#050505] rounded-2xl overflow-hidden border border-[#222] shadow-2xl group"
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-[#080808] flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-10 h-10 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#a3a3a3]">
              Đang kết nối luồng phát ({useDirectStream ? playerMode : 'embed'})...
            </p>
          </div>
        )}

        {/* Auto-Next Episode Overlay */}
        {autoNextCountdown !== null && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-[#121212] border border-[#282828] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-center gap-2 text-[#e50914]">
                <FastForward className="w-6 h-6 animate-pulse" />
                <span className="font-bold text-sm tracking-wide uppercase">Tập tiếp theo</span>
              </div>

              <div>
                <p className="text-white font-bold text-lg">Tập {nextEpisodeName || 'mới'}</p>
                <p className="text-xs text-[#a3a3a3] mt-1">Sẽ tự động phát sau {autoNextCountdown} giây</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={triggerNextEpisodeNavigation}
                  className="flex-1 py-2 px-4 rounded-xl bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold transition-all shadow-lg shadow-[#e50914]/20 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Phát ngay</span>
                </button>
                <button
                  onClick={cancelAutoNext}
                  className="flex-1 py-2 px-4 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-[#a3a3a3] hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-[#333]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player rendering: Direct Video or Embedded iFrame */}
        {useDirectStream && m3u8Url ? (
          <video
            ref={videoRef}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onLoadedData={() => setLoading(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            onEnded={handleEnded}
            onError={handleDirectError}
          />
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
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#101010] text-[#a3a3a3]">
            <ShieldAlert className="w-10 h-10 text-[#e50914]" />
            <p className="text-sm font-medium">Không tìm thấy luồng phát cho tập này.</p>
          </div>
        )}
      </div>

      {/* Control & Info Bar under Player */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-[#a3a3a3]">
        {/* Left Server/Episode Info */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] text-white font-medium px-2.5 py-1 rounded-md">
            <Tv className="w-3.5 h-3.5 text-[#e50914]" />
            {serverName || 'Server Vietsub'}
          </span>
          <span className="bg-[#e50914] text-white font-bold px-2 py-1 rounded-md">
            Tập {episodeName}
          </span>
        </div>

        {/* Right Controls (Speed, Volume, PiP, Auto-next toggle, Reload, Theater) */}
        <div className="flex flex-wrap items-center gap-2">
          {useDirectStream && (
            <>
              {/* Speed Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 bg-[#141414] hover:bg-[#1a1a1a] text-white px-2.5 py-1.5 rounded-md border border-[#262626] transition-colors"
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
              <div className="hidden sm:flex items-center gap-1 bg-[#141414] border border-[#262626] px-2.5 py-1 rounded-md">
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
                  className="hidden sm:flex items-center gap-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-white px-2.5 py-1.5 rounded-md border border-[#262626] transition-colors"
                  title="Xem ở cửa sổ nổi (Picture-in-Picture)"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5 text-[#e50914]" />
                  <span>Hình trong hình</span>
                </button>
              )}
            </>
          )}

          {/* Auto-Next Episode Toggle */}
          <button
            onClick={handleAutoplayToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
              prefs.autoplayNextEpisode
                ? 'bg-[#181818] border-[#e50914] text-white font-semibold'
                : 'bg-[#141414] border-[#262626] text-[#737373] hover:text-white'
            }`}
            title="Tự động phát tập tiếp theo khi hết phim"
          >
            <FastForward className={`w-3.5 h-3.5 ${prefs.autoplayNextEpisode ? 'text-[#e50914]' : ''}`} />
            <span>Tự chuyển tập</span>
          </button>

          {/* Reload Player */}
          <button
            onClick={reloadPlayer}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-white px-3 py-1.5 rounded-md border border-[#262626] transition-colors"
            title="Tải lại trình phát nếu bị giật hoặc đứng hình"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#e50914]" />
            <span>Tải lại</span>
          </button>

          {/* Theater Mode */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="hidden sm:flex items-center gap-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-white px-3 py-1.5 rounded-md border border-[#262626] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#e50914]" />
            <span>{isTheaterMode ? 'Thu nhỏ' : 'Rạp phim'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoPlayer(props: VideoPlayerProps) {
  const sourceKey = `${props.movieSlug}:${props.episodeSlug}:${props.serverIndex ?? 0}:${props.m3u8Url ?? props.embedUrl}`;
  return <VideoPlayerInner key={sourceKey} {...props} />;
}
