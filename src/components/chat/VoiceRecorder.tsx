import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

const MAX_DURATION_SEC = 120;

function getMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
  return '';
}

function getExtension(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface VoiceRecorderProps {
  onSendMessage: (content: string, file?: { url: string; name: string; type: string }) => Promise<void>;
  tokens: ThemeTokens;
  accentRgb: string;
  bubbleGradient: string;
  onStateChange?: (active: boolean) => void;
}

export default function VoiceRecorder({ onSendMessage, tokens, accentRgb, bubbleGradient, onStateChange }: VoiceRecorderProps) {
  const [state, _setState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const setState = useCallback((s: 'idle' | 'recording' | 'uploading') => {
    _setState(s);
    onStateChange?.(s !== 'idle');
  }, [onStateChange]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef('');

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    recorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    setError('');
    const mime = getMimeType();
    if (!mime) { setError('Votre navigateur ne supporte pas l\'enregistrement audio.'); return; }
    mimeRef.current = mime;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(250);
      setState('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= MAX_DURATION_SEC) {
            recorder.stop();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);

      recorder.onstop = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        stream.getTracks().forEach(t => t.stop());
      };
    } catch (err: unknown) {
      cleanup();
      setState('idle');
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError('Acces au microphone refuse. Verifiez les permissions de votre navigateur.');
      } else {
        setError('Impossible d\'acceder au microphone.');
      }
    }
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanup();
    setState('idle');
  }, [cleanup]);

  const sendRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    setState('uploading');

    const blob = await new Promise<Blob>((resolve) => {
      if (recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: mimeRef.current }));
        return;
      }
      recorder.onstop = () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        resolve(new Blob(chunksRef.current, { type: mimeRef.current }));
      };
      recorder.stop();
    });

    const ext = getExtension(mimeRef.current);
    const path = `chat/voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    try {
      const { data, error: uploadErr } = await supabase.storage.from('chat-files').upload(path, blob, { upsert: false, contentType: mimeRef.current });
      if (uploadErr || !data) throw new Error(uploadErr?.message ?? 'Upload failed');

      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
      const durationLabel = formatDuration(elapsed);
      await onSendMessage('', { url: publicUrl, name: `Vocal ${durationLabel}`, type: 'audio' });
    } catch {
      setError('Echec de l\'envoi du message vocal.');
    } finally {
      cleanup();
      setState('idle');
    }
  }, [elapsed, onSendMessage, cleanup]);

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-red-400 truncate max-w-[200px]">{error}</span>
        <button onClick={() => setError('')} className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: tokens.text.tertiary }}>
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <button
        onClick={startRecording}
        className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
        style={{ background: tokens.chat.inputBg, border: `1px solid ${tokens.chat.inputBorder}`, color: tokens.text.tertiary }}
        title="Message vocal"
      >
        <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>
    );
  }

  if (state === 'uploading') {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg md:rounded-xl" style={{ background: tokens.chat.inputBg, border: `1px solid ${tokens.chat.inputBorder}` }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: `rgba(${accentRgb},0.8)` }} />
          <span className="text-xs" style={{ color: tokens.text.tertiary }}>Envoi...</span>
        </div>
      </div>
    );
  }

  const isAtLimit = elapsed >= MAX_DURATION_SEC;

  return (
    <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
      <button
        onClick={cancelRecording}
        className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
        title="Annuler"
      >
        <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>

      <div
        className="flex items-center gap-2.5 flex-1 px-3 py-2 rounded-lg md:rounded-xl min-w-0"
        style={{ background: tokens.chat.inputBg, border: `1px solid rgba(239,68,68,0.3)` }}
      >
        <div className="relative flex items-center justify-center w-3 h-3 shrink-0">
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
        </div>
        <span className="text-xs font-mono tabular-nums" style={{ color: tokens.text.secondary }}>
          {formatDuration(elapsed)}
        </span>
        {isAtLimit && (
          <span className="text-[10px] text-red-400 truncate">Limite atteinte</span>
        )}
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: `rgba(${accentRgb},0.1)` }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min((elapsed / MAX_DURATION_SEC) * 100, 100)}%`, background: `rgba(239,68,68,0.6)` }}
          />
        </div>
      </div>

      {!isAtLimit && (
        <button
          onClick={() => { if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop(); }}
          className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
          title="Arreter"
        >
          <Square className="w-3 h-3 md:w-3.5 md:h-3.5" />
        </button>
      )}

      <button
        onClick={sendRecording}
        className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
        style={{ background: bubbleGradient, boxShadow: `0 0 14px rgba(${accentRgb},0.3)` }}
        title="Envoyer le vocal"
      >
        <Send className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#ffffff' }} />
      </button>
    </div>
  );
}
