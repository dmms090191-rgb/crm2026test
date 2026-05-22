import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Bold, Underline, Type, Highlighter } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Argumentaire {
  id: string;
  title: string;
  content: string;
}

interface Props {
  existing?: Argumentaire | null;
  onSave: (title: string, content: string) => void;
  onClose: () => void;
}

const TEXT_COLORS = ['#ffffff', '#e2e8f0', '#f59e0b', '#22d3ee', '#10b981', '#ef4444', '#f97316', '#3b82f6'];
const HIGHLIGHT_COLORS = ['transparent', '#fbbf24', '#34d399', '#22d3ee', '#f87171', '#c084fc', '#fb923c'];

export default function SAArgumentaireModal({ existing, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [title, setTitle] = useState(existing?.title ?? '');
  const editorRef = useRef<HTMLDivElement>(null);
  const [showTextColors, setShowTextColors] = useState(false);
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && existing?.content) {
      editorRef.current.innerHTML = existing.content;
    }
  }, [existing]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, [restoreSelection]);

  const handleSave = () => {
    const html = editorRef.current?.innerHTML ?? '';
    if (!title.trim()) return;
    onSave(title.trim(), html);
  };

  const toolBtnStyle = (active?: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: t.text.secondary,
    border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
    borderRadius: '6px',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 150ms',
    position: 'relative' as const,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      style={{ background: t.modal.overlayBg, backdropFilter: 'blur(4px)' }}
      onClick={undefined}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '90vh',
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: t.modal.shadow,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <p className="text-sm font-semibold" style={{ color: t.modal.title }}>
            {existing ? 'Modifier l\'argumentaire' : 'Nouvel argumentaire'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: t.text.tertiary }}>Titre</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Argumentaire telephonique B2B"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: t.input.bg,
                border: `1px solid ${t.input.border}`,
                color: t.input.text,
              }}
            />
          </div>

          {/* Toolbar */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: t.text.tertiary }}>Contenu</label>
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-t-xl"
              style={{ background: t.surface.secondary, borderBottom: `1px solid ${t.surface.border}` }}
            >
              <button
                type="button"
                style={toolBtnStyle()}
                onMouseDown={e => { e.preventDefault(); saveSelection(); exec('bold'); }}
                title="Gras"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                style={toolBtnStyle()}
                onMouseDown={e => { e.preventDefault(); saveSelection(); exec('underline'); }}
                title="Souligne"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              {/* Text color */}
              <div className="relative">
                <button
                  type="button"
                  style={toolBtnStyle(showTextColors)}
                  onMouseDown={e => {
                    e.preventDefault();
                    saveSelection();
                    setShowTextColors(!showTextColors);
                    setShowHighlightColors(false);
                  }}
                  title="Couleur du texte"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                {showTextColors && (
                  <div
                    className="absolute left-0 top-full mt-1 p-2 rounded-lg flex gap-1.5 z-50"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                  >
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: 'rgba(255,255,255,0.2)' }}
                        onMouseDown={e => {
                          e.preventDefault();
                          exec('foreColor', c);
                          setShowTextColors(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Highlight */}
              <div className="relative">
                <button
                  type="button"
                  style={toolBtnStyle(showHighlightColors)}
                  onMouseDown={e => {
                    e.preventDefault();
                    saveSelection();
                    setShowHighlightColors(!showHighlightColors);
                    setShowTextColors(false);
                  }}
                  title="Surlignage"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                </button>
                {showHighlightColors && (
                  <div
                    className="absolute left-0 top-full mt-1 p-2 rounded-lg flex gap-1.5 z-50"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                  >
                    {HIGHLIGHT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: c === 'transparent' ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px' : c,
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                        onMouseDown={e => {
                          e.preventDefault();
                          exec('hiliteColor', c);
                          setShowHighlightColors(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Editable area */}
            <div
              ref={editorRef}
              contentEditable
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              className="w-full min-h-[200px] max-h-[40vh] overflow-y-auto px-4 py-3 rounded-b-xl text-sm leading-relaxed outline-none"
              style={{
                background: t.input.bg,
                border: `1px solid ${t.input.border}`,
                borderTop: 'none',
                color: t.input.text,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderTop: `1px solid ${t.surface.border}` }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            {existing ? 'Mettre a jour' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
