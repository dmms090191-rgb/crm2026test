import { useState } from 'react';
import { FolderOpen, FileCode, ChevronDown, Folder } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { TreeNode, FolderSection } from './structureCrmData';

export function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const tokens = useThemeTokens();
  const isFolder = node.type === 'folder';

  return (
    <div className={depth > 0 ? 'pl-3.5 md:pl-5' : ''}>
      <div className="flex items-start gap-1.5 md:gap-2 py-[3px]">
        <span
          className="flex-shrink-0 mt-0.5"
          style={{ color: isFolder ? '#fb923c' : tokens.text.quaternary, opacity: isFolder ? 1 : 0.7 }}
        >
          {isFolder ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <FileCode className="w-3 h-3" />
          )}
        </span>
        <span
          className="break-words min-w-0"
          style={{
            color: isFolder ? tokens.text.primary : tokens.text.secondary,
            fontWeight: isFolder ? 600 : 400,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: isFolder ? '12px' : '11px',
          }}
        >
          {node.name}
        </span>
        {node.description && (
          <span
            className="text-[10px] md:text-[11px] ml-1 hidden md:inline"
            style={{ color: tokens.text.quaternary }}
          >
            {node.description}
          </span>
        )}
      </div>
      {node.children && node.children.map((child, idx) => (
        <TreeNodeView key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FolderCard({ section }: { section: FolderSection }) {
  const tokens = useThemeTokens();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: tokens.surface.tertiary,
        border: `1px solid ${tokens.surface.borderLight}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 md:px-5 py-3 md:py-4 text-left cursor-pointer"
        style={{ borderBottom: open ? `1px solid ${tokens.surface.borderLight}` : 'none' }}
      >
        <div className="flex items-center gap-2.5 md:gap-3">
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `${section.color}15`,
              border: `1px solid ${section.color}25`,
            }}
          >
            <span style={{ color: section.color }}>{section.icon ?? <Folder className="w-3.5 h-3.5 md:w-4 md:h-4" />}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs md:text-sm font-semibold truncate"
              style={{ color: tokens.text.primary }}
            >
              {section.title}
            </p>
            <p
              className="text-[11px] md:text-xs mt-0.5 truncate"
              style={{ color: tokens.text.quaternary }}
            >
              {section.description}
            </p>
          </div>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{
              color: tokens.text.quaternary,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      <div
        className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: open ? '1000px' : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-3 md:px-5 py-3 md:py-4">
          <div className="mb-3">
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: section.color, opacity: 0.8 }}
            >
              Role
            </p>
            <p className="text-[12px] md:text-[13px]" style={{ color: tokens.text.secondary, lineHeight: '1.7' }}>
              {section.role}
            </p>
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: section.color, opacity: 0.8 }}
            >
              Contenu
            </p>
            <div className="flex flex-col gap-1">
              {section.contains.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span
                    className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: section.color, opacity: 0.5 }}
                  />
                  <p className="text-[11px] md:text-[12px] break-words min-w-0" style={{ color: tokens.text.tertiary, lineHeight: '1.65' }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
