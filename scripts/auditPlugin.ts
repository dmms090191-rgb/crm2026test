import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

const LARGE_FILE_THRESHOLD = 300;

interface LargeFile {
  file: string;
  lines: number;
  overflow: number;
}

interface AnyOccurrence {
  file: string;
  line: number;
  text: string;
}

function collectTsFiles(dir: string, skip: Set<string>): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skip.has(entry.name)) continue;
      results.push(...collectTsFiles(full, skip));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function runFastAudit(projectRoot: string) {
  const srcDir = path.resolve(projectRoot, 'src');
  const outPath = path.resolve(srcDir, 'generated', 'auditSnapshot.json');
  const skip = new Set(['node_modules', 'generated']);

  const files = collectTsFiles(srcDir, skip);

  const anyOccurrences: AnyOccurrence[] = [];
  const largeFiles: LargeFile[] = [];
  let totalLines = 0;
  const anyPattern = /:\s*any\b|<any\b|as\s+any\b/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    totalLines += lineCount;

    const rel = path.relative(projectRoot, file);

    if (lineCount > LARGE_FILE_THRESHOLD) {
      largeFiles.push({ file: rel, lines: lineCount, overflow: lineCount - LARGE_FILE_THRESHOLD });
    }

    for (let i = 0; i < lines.length; i++) {
      if (anyPattern.test(lines[i])) {
        anyOccurrences.push({ file: rel, line: i + 1, text: lines[i].trim() });
      }
    }
  }

  largeFiles.sort((a, b) => a.lines - b.lines);
  const totalOverflow = largeFiles.reduce((s, f) => s + f.overflow, 0);

  let prev: Record<string, unknown> = {};
  try {
    prev = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  } catch { /* first run */ }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    anyCount: anyOccurrences.length,
    anyOccurrences,
    unusedImportCount: (prev as { unusedImportCount?: number }).unusedImportCount ?? 0,
    unusedImports: (prev as { unusedImports?: unknown[] }).unusedImports ?? [],
    largeFileCount: largeFiles.length,
    largeFiles,
    tscErrorCount: (prev as { tscErrorCount?: number }).tscErrorCount ?? 0,
    tscErrors: (prev as { tscErrors?: unknown[] }).tscErrors ?? [],
    eslintErrorCount: (prev as { eslintErrorCount?: number }).eslintErrorCount ?? 0,
    eslintWarningCount: (prev as { eslintWarningCount?: number }).eslintWarningCount ?? 0,
    eslintIssues: (prev as { eslintIssues?: unknown[] }).eslintIssues ?? [],
    totalFilesAnalyzed: files.length,
    totalLinesAnalyzed: totalLines,
    totalOverflowLines: totalOverflow,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');

  return outPath;
}

export default function auditAutoRefreshPlugin(): Plugin {
  let projectRoot = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let server: ViteDevServer | null = null;

  function scheduleRefresh() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const outPath = runFastAudit(projectRoot);
        if (server) {
          const mod = server.moduleGraph.getModuleById(outPath);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: 'full-reload' });
          }
        }
      } catch { /* swallow errors to avoid crashing dev server */ }
    }, 300);
  }

  return {
    name: 'audit-auto-refresh',
    apply: 'serve',

    configResolved(config) {
      projectRoot = config.root;
    },

    configureServer(srv) {
      server = srv;
      try {
        runFastAudit(projectRoot);
      } catch { /* ignore initial errors */ }
    },

    handleHotUpdate({ file }) {
      if (!file.includes(path.join('src', ''))) return;
      if (file.includes(path.join('generated', ''))) return;
      if (!/\.(ts|tsx)$/.test(file)) return;
      scheduleRefresh();
    },
  };
}
