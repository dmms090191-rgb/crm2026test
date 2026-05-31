import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface AudioPlayerProps {
  url: string;
  name: string;
  tokens: ThemeTokens;
  isOwn?: boolean;
  accentRgb?: string;
}

export default function AudioPlayer({ url, name, tokens, isOwn, accentRgb = '14,165,233' }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onLoaded = () => { setDuration(audio.duration); setLoaded(true); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const accent = `rgba(${accentRgb},1)`;
  const accentSoft = `rgba(${accentRgb},0.15)`;
  const subtextColor = isOwn ? 'rgba(255,255,255,0.6)' : tokens.text.quaternary;
  const trackBg = isOwn ? 'rgba(255,255,255,0.15)' : accentSoft;
  const trackFill = isOwn ? 'rgba(255,255,255,0.8)' : accent;
  const btnBg = isOwn ? 'rgba(255,255,255,0.18)' : accentSoft;
  const btnColor = isOwn ? '#ffffff' : accent;

  return (
    <div className="flex items-center gap-2 mt-1 min-w-[180px] max-w-[260px]">
      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
        style={{ background: btnBg, color: btnColor }}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="h-1.5 rounded-full cursor-pointer relative"
          style={{ background: trackBg }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${progress}%`, background: trackFill }}
          />
          {loaded && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm transition-all"
              style={{ left: `calc(${progress}% - 5px)`, background: trackFill, border: `1.5px solid ${isOwn ? 'rgba(255,255,255,0.5)' : 'white'}` }}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5" style={{ color: subtextColor }} />
            <span className="text-[9px] font-medium" style={{ color: subtextColor }}>
              {loaded ? formatTime(playing ? currentTime : duration) : '...'}
            </span>
          </div>
          <span className="text-[8px] truncate max-w-[100px]" style={{ color: subtextColor }}>{name}</span>
        </div>
      </div>
    </div>
  );
}
