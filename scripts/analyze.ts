import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..', 'src');
const OUT_PATH = path.resolve(__dirname, '..', 'src', 'generated', 'auditSnapshot.json');
const LARGE_FILE_THRESHOLD = 300;

interface AnyOccurrence {
  file: string;
  line: number;
  text: string;
}

interface UnusedImport {
  file: string;
  line: number;
  name: string;
}

interface LargeFile {
  file: string;
  lines: number;
  overflow: number;
}

interface TscError {
  file: string;
  line: number;
  code: string;
  message: string;
}

interface EslintIssue {
  file: string;
  line: number;
  severity: 'error' | 'warning';
  ruleId: string;
  message: string;
}

interface AuditSnapshot {
  generatedAt: string;
  anyCount: number;
  anyOccurrences: AnyOccurrence[];
  unusedImportCount: number;
  unusedImports: UnusedImport[];
  largeFileCount: number;
  largeFiles: LargeFile[];
  tscErrorCount: number;
  tscErrors: TscError[];
  eslintErrorCount: number;
  eslintWarningCount: number;
  eslintIssues: EslintIssue[];
  totalFilesAnalyzed: number;
  totalLinesAnalyzed: number;
  totalOverflowLines: number;
}

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'generated') continue;
      results.push(...collectTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function relPath(filePath: string): string {
  return path.relative(path.resolve(__dirname, '..'), filePath);
}

function detectAny(files: string[]): AnyOccurrence[] {
  const results: AnyOccurrence[] = [];
  const pattern = /:\s*any\b|<any\b|as\s+any\b/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        results.push({
          file: relPath(file),
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }
  return results;
}

function detectUnusedImports(files: string[]): UnusedImport[] {
  const results: UnusedImport[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const importedNames = new Map<string, number>();

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) return;
      const clause = node.importClause;
      if (!clause) return;

      const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      if (clause.name) {
        importedNames.set(clause.name.text, lineNum);
      }

      const bindings = clause.namedBindings;
      if (bindings) {
        if (ts.isNamedImports(bindings)) {
          for (const spec of bindings.elements) {
            if (spec.name.text === 'type') continue;
            importedNames.set(spec.name.text, lineNum);
          }
        } else if (ts.isNamespaceImport(bindings)) {
          importedNames.set(bindings.name.text, lineNum);
        }
      }
    });

    if (importedNames.size === 0) continue;

    const usedNames = new Set<string>();

    function visit(node: ts.Node) {
      if (ts.isIdentifier(node)) {
        const parent = node.parent;
        if (parent && ts.isImportSpecifier(parent) && parent.name === node) return;
        if (parent && ts.isImportClause(parent) && parent.name === node) return;
        if (parent && ts.isNamespaceImport(parent)) return;
        usedNames.add(node.text);
      }
      ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) return;
      visit(node);
    });

    for (const [name, line] of importedNames) {
      if (!usedNames.has(name)) {
        results.push({ file: relPath(filePath), line, name });
      }
    }
  }

  return results;
}

function detectLargeFiles(files: string[]): { largeFiles: LargeFile[]; totalLines: number } {
  const results: LargeFile[] = [];
  let totalLines = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lineCount = content.split('\n').length;
    totalLines += lineCount;
    if (lineCount > LARGE_FILE_THRESHOLD) {
      results.push({ file: relPath(file), lines: lineCount, overflow: lineCount - LARGE_FILE_THRESHOLD });
    }
  }
  return { largeFiles: results.sort((a, b) => a.lines - b.lines), totalLines };
}

function detectTscErrors(): TscError[] {
  const projectRoot = path.resolve(__dirname, '..');
  try {
    execSync('npx tsc --noEmit --pretty false -p tsconfig.app.json', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return [];
  } catch (err: unknown) {
    const output = [
      (err as { stdout?: string }).stdout ?? '',
      (err as { stderr?: string }).stderr ?? '',
    ].join('\n');

    const results: TscError[] = [];
    const linePattern = /^(.+)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)$/;

    for (const line of output.split('\n')) {
      const match = linePattern.exec(line.trim());
      if (match) {
        const absFile = path.isAbsolute(match[1])
          ? match[1]
          : path.resolve(projectRoot, match[1]);
        results.push({
          file: relPath(absFile),
          line: Number(match[2]),
          code: match[3],
          message: match[4],
        });
      }
    }
    return results;
  }
}

function detectEslintIssues(): EslintIssue[] {
  const projectRoot = path.resolve(__dirname, '..');
  let jsonOutput: string;

  try {
    jsonOutput = execSync('npx eslint --format json src/', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    jsonOutput = (err as { stdout?: string }).stdout ?? '';
    if (!jsonOutput) return [];
  }

  let parsed: { filePath: string; messages: { line: number; severity: number; ruleId: string | null; message: string }[] }[];
  try {
    parsed = JSON.parse(jsonOutput);
  } catch {
    return [];
  }

  const results: EslintIssue[] = [];
  for (const file of parsed) {
    for (const msg of file.messages) {
      if (!msg.ruleId) continue;
      results.push({
        file: relPath(file.filePath),
        line: msg.line,
        severity: msg.severity === 2 ? 'error' : 'warning',
        ruleId: msg.ruleId,
        message: msg.message,
      });
    }
  }
  return results;
}

function main() {
  console.log('Analyzing src/ ...\n');

  const files = collectTsFiles(SRC_DIR);
  console.log(`  Found ${files.length} TypeScript files\n`);

  const anyOccurrences = detectAny(files);
  console.log(`  "any" occurrences: ${anyOccurrences.length}`);
  for (const o of anyOccurrences) {
    console.log(`    ${o.file}:${o.line}  ${o.text.substring(0, 80)}`);
  }

  console.log('');
  const unusedImports = detectUnusedImports(files);
  console.log(`  Unused imports: ${unusedImports.length}`);
  for (const u of unusedImports) {
    console.log(`    ${u.file}:${u.line}  "${u.name}"`);
  }

  console.log('');
  const { largeFiles, totalLines } = detectLargeFiles(files);
  const totalOverflowLines = largeFiles.reduce((s, f) => s + f.overflow, 0);
  console.log(`  Large files (>${LARGE_FILE_THRESHOLD} lines): ${largeFiles.length}`);
  for (const f of largeFiles) {
    console.log(`    ${f.file}  (${f.lines} lines, +${f.overflow})`);
  }

  console.log('\n  Running tsc --noEmit ...');
  const tscErrors = detectTscErrors();
  console.log(`  TypeScript errors: ${tscErrors.length}`);
  for (const e of tscErrors) {
    console.log(`    ${e.file}:${e.line}  ${e.code} ${e.message.substring(0, 80)}`);
  }

  console.log('\n  Running ESLint ...');
  const eslintIssues = detectEslintIssues();
  const eslintErrors = eslintIssues.filter((i) => i.severity === 'error');
  const eslintWarnings = eslintIssues.filter((i) => i.severity === 'warning');
  console.log(`  ESLint errors: ${eslintErrors.length}, warnings: ${eslintWarnings.length}`);
  for (const i of eslintIssues) {
    console.log(`    ${i.file}:${i.line}  [${i.severity}] ${i.ruleId} — ${i.message.substring(0, 80)}`);
  }

  const snapshot: AuditSnapshot = {
    generatedAt: new Date().toISOString(),
    anyCount: anyOccurrences.length,
    anyOccurrences,
    unusedImportCount: unusedImports.length,
    unusedImports,
    largeFileCount: largeFiles.length,
    largeFiles,
    tscErrorCount: tscErrors.length,
    tscErrors,
    eslintErrorCount: eslintErrors.length,
    eslintWarningCount: eslintWarnings.length,
    eslintIssues,
    totalFilesAnalyzed: files.length,
    totalLinesAnalyzed: totalLines,
    totalOverflowLines,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\nSnapshot written to ${relPath(OUT_PATH)}`);

  const violations: string[] = [];
  if (anyOccurrences.length > 0) violations.push(`  any occurrences: ${anyOccurrences.length}`);
  if (unusedImports.length > 0) violations.push(`  unused imports: ${unusedImports.length}`);
  if (largeFiles.length > 0) violations.push(`  large files (>${LARGE_FILE_THRESHOLD} lines): ${largeFiles.length}`);
  if (tscErrors.length > 0) violations.push(`  TypeScript errors: ${tscErrors.length}`);
  if (eslintErrors.length > 0) violations.push(`  ESLint errors: ${eslintErrors.length}`);
  if (eslintWarnings.length > 0) violations.push(`  ESLint warnings: ${eslintWarnings.length}`);

  if (violations.length > 0) {
    console.error('\n--- REGRESSION DETECTED ---');
    for (const v of violations) console.error(v);
    console.error('---------------------------\n');
    process.exit(1);
  }

  console.log('\nAll checks passed — 0 regressions.');
}

main();
