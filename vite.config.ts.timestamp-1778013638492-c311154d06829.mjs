// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";

// scripts/auditPlugin.ts
import * as fs from "node:fs";
import * as path from "node:path";
var LARGE_FILE_THRESHOLD = 300;
function collectTsFiles(dir, skip) {
  const results = [];
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
function runFastAudit(projectRoot) {
  const srcDir = path.resolve(projectRoot, "src");
  const outPath = path.resolve(srcDir, "generated", "auditSnapshot.json");
  const skip = /* @__PURE__ */ new Set(["node_modules", "generated"]);
  const files = collectTsFiles(srcDir, skip);
  const anyOccurrences = [];
  const largeFiles = [];
  let totalLines = 0;
  const anyPattern = /:\s*any\b|<any\b|as\s+any\b/;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
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
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  } catch {
  }
  const snapshot = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    anyCount: anyOccurrences.length,
    anyOccurrences,
    unusedImportCount: prev.unusedImportCount ?? 0,
    unusedImports: prev.unusedImports ?? [],
    largeFileCount: largeFiles.length,
    largeFiles,
    tscErrorCount: prev.tscErrorCount ?? 0,
    tscErrors: prev.tscErrors ?? [],
    eslintErrorCount: prev.eslintErrorCount ?? 0,
    eslintWarningCount: prev.eslintWarningCount ?? 0,
    eslintIssues: prev.eslintIssues ?? [],
    totalFilesAnalyzed: files.length,
    totalLinesAnalyzed: totalLines,
    totalOverflowLines: totalOverflow
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  return outPath;
}
function auditAutoRefreshPlugin() {
  let projectRoot = "";
  let timer = null;
  let server = null;
  function scheduleRefresh() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const outPath = runFastAudit(projectRoot);
        if (server) {
          const mod = server.moduleGraph.getModuleById(outPath);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
          }
        }
      } catch {
      }
    }, 300);
  }
  return {
    name: "audit-auto-refresh",
    apply: "serve",
    configResolved(config) {
      projectRoot = config.root;
    },
    configureServer(srv) {
      server = srv;
      try {
        runFastAudit(projectRoot);
      } catch {
      }
    },
    handleHotUpdate({ file }) {
      if (!file.includes(path.join("src", ""))) return;
      if (file.includes(path.join("generated", ""))) return;
      if (!/\.(ts|tsx)$/.test(file)) return;
      scheduleRefresh();
    }
  };
}

// vite.config.ts
var vite_config_default = defineConfig({
  plugins: [react(), auditAutoRefreshPlugin()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2NyaXB0cy9hdWRpdFBsdWdpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3Byb2plY3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcHJvamVjdC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBhdWRpdEF1dG9SZWZyZXNoUGx1Z2luIGZyb20gJy4vc2NyaXB0cy9hdWRpdFBsdWdpbic7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBhdWRpdEF1dG9SZWZyZXNoUGx1Z2luKCldLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3Byb2plY3Qvc2NyaXB0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcHJvamVjdC9zY3JpcHRzL2F1ZGl0UGx1Z2luLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvc2NyaXB0cy9hdWRpdFBsdWdpbi50c1wiO2ltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBQbHVnaW4sIFZpdGVEZXZTZXJ2ZXIgfSBmcm9tICd2aXRlJztcblxuY29uc3QgTEFSR0VfRklMRV9USFJFU0hPTEQgPSAzMDA7XG5cbmludGVyZmFjZSBMYXJnZUZpbGUge1xuICBmaWxlOiBzdHJpbmc7XG4gIGxpbmVzOiBudW1iZXI7XG4gIG92ZXJmbG93OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBBbnlPY2N1cnJlbmNlIHtcbiAgZmlsZTogc3RyaW5nO1xuICBsaW5lOiBudW1iZXI7XG4gIHRleHQ6IHN0cmluZztcbn1cblxuZnVuY3Rpb24gY29sbGVjdFRzRmlsZXMoZGlyOiBzdHJpbmcsIHNraXA6IFNldDxzdHJpbmc+KTogc3RyaW5nW10ge1xuICBjb25zdCByZXN1bHRzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pKSB7XG4gICAgY29uc3QgZnVsbCA9IHBhdGguam9pbihkaXIsIGVudHJ5Lm5hbWUpO1xuICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBpZiAoc2tpcC5oYXMoZW50cnkubmFtZSkpIGNvbnRpbnVlO1xuICAgICAgcmVzdWx0cy5wdXNoKC4uLmNvbGxlY3RUc0ZpbGVzKGZ1bGwsIHNraXApKTtcbiAgICB9IGVsc2UgaWYgKC9cXC4odHN8dHN4KSQvLnRlc3QoZW50cnkubmFtZSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaChmdWxsKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIHJ1bkZhc3RBdWRpdChwcm9qZWN0Um9vdDogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY0RpciA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgJ3NyYycpO1xuICBjb25zdCBvdXRQYXRoID0gcGF0aC5yZXNvbHZlKHNyY0RpciwgJ2dlbmVyYXRlZCcsICdhdWRpdFNuYXBzaG90Lmpzb24nKTtcbiAgY29uc3Qgc2tpcCA9IG5ldyBTZXQoWydub2RlX21vZHVsZXMnLCAnZ2VuZXJhdGVkJ10pO1xuXG4gIGNvbnN0IGZpbGVzID0gY29sbGVjdFRzRmlsZXMoc3JjRGlyLCBza2lwKTtcblxuICBjb25zdCBhbnlPY2N1cnJlbmNlczogQW55T2NjdXJyZW5jZVtdID0gW107XG4gIGNvbnN0IGxhcmdlRmlsZXM6IExhcmdlRmlsZVtdID0gW107XG4gIGxldCB0b3RhbExpbmVzID0gMDtcbiAgY29uc3QgYW55UGF0dGVybiA9IC86XFxzKmFueVxcYnw8YW55XFxifGFzXFxzK2FueVxcYi87XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKTtcbiAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgIGNvbnN0IGxpbmVDb3VudCA9IGxpbmVzLmxlbmd0aDtcbiAgICB0b3RhbExpbmVzICs9IGxpbmVDb3VudDtcblxuICAgIGNvbnN0IHJlbCA9IHBhdGgucmVsYXRpdmUocHJvamVjdFJvb3QsIGZpbGUpO1xuXG4gICAgaWYgKGxpbmVDb3VudCA+IExBUkdFX0ZJTEVfVEhSRVNIT0xEKSB7XG4gICAgICBsYXJnZUZpbGVzLnB1c2goeyBmaWxlOiByZWwsIGxpbmVzOiBsaW5lQ291bnQsIG92ZXJmbG93OiBsaW5lQ291bnQgLSBMQVJHRV9GSUxFX1RIUkVTSE9MRCB9KTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYW55UGF0dGVybi50ZXN0KGxpbmVzW2ldKSkge1xuICAgICAgICBhbnlPY2N1cnJlbmNlcy5wdXNoKHsgZmlsZTogcmVsLCBsaW5lOiBpICsgMSwgdGV4dDogbGluZXNbaV0udHJpbSgpIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxhcmdlRmlsZXMuc29ydCgoYSwgYikgPT4gYS5saW5lcyAtIGIubGluZXMpO1xuICBjb25zdCB0b3RhbE92ZXJmbG93ID0gbGFyZ2VGaWxlcy5yZWR1Y2UoKHMsIGYpID0+IHMgKyBmLm92ZXJmbG93LCAwKTtcblxuICBsZXQgcHJldjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgdHJ5IHtcbiAgICBwcmV2ID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMob3V0UGF0aCwgJ3V0Zi04JykpO1xuICB9IGNhdGNoIHsgLyogZmlyc3QgcnVuICovIH1cblxuICBjb25zdCBzbmFwc2hvdCA9IHtcbiAgICBnZW5lcmF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGFueUNvdW50OiBhbnlPY2N1cnJlbmNlcy5sZW5ndGgsXG4gICAgYW55T2NjdXJyZW5jZXMsXG4gICAgdW51c2VkSW1wb3J0Q291bnQ6IChwcmV2IGFzIHsgdW51c2VkSW1wb3J0Q291bnQ/OiBudW1iZXIgfSkudW51c2VkSW1wb3J0Q291bnQgPz8gMCxcbiAgICB1bnVzZWRJbXBvcnRzOiAocHJldiBhcyB7IHVudXNlZEltcG9ydHM/OiB1bmtub3duW10gfSkudW51c2VkSW1wb3J0cyA/PyBbXSxcbiAgICBsYXJnZUZpbGVDb3VudDogbGFyZ2VGaWxlcy5sZW5ndGgsXG4gICAgbGFyZ2VGaWxlcyxcbiAgICB0c2NFcnJvckNvdW50OiAocHJldiBhcyB7IHRzY0Vycm9yQ291bnQ/OiBudW1iZXIgfSkudHNjRXJyb3JDb3VudCA/PyAwLFxuICAgIHRzY0Vycm9yczogKHByZXYgYXMgeyB0c2NFcnJvcnM/OiB1bmtub3duW10gfSkudHNjRXJyb3JzID8/IFtdLFxuICAgIGVzbGludEVycm9yQ291bnQ6IChwcmV2IGFzIHsgZXNsaW50RXJyb3JDb3VudD86IG51bWJlciB9KS5lc2xpbnRFcnJvckNvdW50ID8/IDAsXG4gICAgZXNsaW50V2FybmluZ0NvdW50OiAocHJldiBhcyB7IGVzbGludFdhcm5pbmdDb3VudD86IG51bWJlciB9KS5lc2xpbnRXYXJuaW5nQ291bnQgPz8gMCxcbiAgICBlc2xpbnRJc3N1ZXM6IChwcmV2IGFzIHsgZXNsaW50SXNzdWVzPzogdW5rbm93bltdIH0pLmVzbGludElzc3VlcyA/PyBbXSxcbiAgICB0b3RhbEZpbGVzQW5hbHl6ZWQ6IGZpbGVzLmxlbmd0aCxcbiAgICB0b3RhbExpbmVzQW5hbHl6ZWQ6IHRvdGFsTGluZXMsXG4gICAgdG90YWxPdmVyZmxvd0xpbmVzOiB0b3RhbE92ZXJmbG93LFxuICB9O1xuXG4gIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUob3V0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBmcy53cml0ZUZpbGVTeW5jKG91dFBhdGgsIEpTT04uc3RyaW5naWZ5KHNuYXBzaG90LCBudWxsLCAyKSArICdcXG4nKTtcblxuICByZXR1cm4gb3V0UGF0aDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYXVkaXRBdXRvUmVmcmVzaFBsdWdpbigpOiBQbHVnaW4ge1xuICBsZXQgcHJvamVjdFJvb3QgPSAnJztcbiAgbGV0IHRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xuICBsZXQgc2VydmVyOiBWaXRlRGV2U2VydmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgZnVuY3Rpb24gc2NoZWR1bGVSZWZyZXNoKCkge1xuICAgIGlmICh0aW1lcikgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgb3V0UGF0aCA9IHJ1bkZhc3RBdWRpdChwcm9qZWN0Um9vdCk7XG4gICAgICAgIGlmIChzZXJ2ZXIpIHtcbiAgICAgICAgICBjb25zdCBtb2QgPSBzZXJ2ZXIubW9kdWxlR3JhcGguZ2V0TW9kdWxlQnlJZChvdXRQYXRoKTtcbiAgICAgICAgICBpZiAobW9kKSB7XG4gICAgICAgICAgICBzZXJ2ZXIubW9kdWxlR3JhcGguaW52YWxpZGF0ZU1vZHVsZShtb2QpO1xuICAgICAgICAgICAgc2VydmVyLndzLnNlbmQoeyB0eXBlOiAnZnVsbC1yZWxvYWQnIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7IC8qIHN3YWxsb3cgZXJyb3JzIHRvIGF2b2lkIGNyYXNoaW5nIGRldiBzZXJ2ZXIgKi8gfVxuICAgIH0sIDMwMCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdhdWRpdC1hdXRvLXJlZnJlc2gnLFxuICAgIGFwcGx5OiAnc2VydmUnLFxuXG4gICAgY29uZmlnUmVzb2x2ZWQoY29uZmlnKSB7XG4gICAgICBwcm9qZWN0Um9vdCA9IGNvbmZpZy5yb290O1xuICAgIH0sXG5cbiAgICBjb25maWd1cmVTZXJ2ZXIoc3J2KSB7XG4gICAgICBzZXJ2ZXIgPSBzcnY7XG4gICAgICB0cnkge1xuICAgICAgICBydW5GYXN0QXVkaXQocHJvamVjdFJvb3QpO1xuICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSBpbml0aWFsIGVycm9ycyAqLyB9XG4gICAgfSxcblxuICAgIGhhbmRsZUhvdFVwZGF0ZSh7IGZpbGUgfSkge1xuICAgICAgaWYgKCFmaWxlLmluY2x1ZGVzKHBhdGguam9pbignc3JjJywgJycpKSkgcmV0dXJuO1xuICAgICAgaWYgKGZpbGUuaW5jbHVkZXMocGF0aC5qb2luKCdnZW5lcmF0ZWQnLCAnJykpKSByZXR1cm47XG4gICAgICBpZiAoIS9cXC4odHN8dHN4KSQvLnRlc3QoZmlsZSkpIHJldHVybjtcbiAgICAgIHNjaGVkdWxlUmVmcmVzaCgpO1xuICAgIH0sXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVzs7O0FDRCtOLFlBQVksUUFBUTtBQUNyUSxZQUFZLFVBQVU7QUFHdEIsSUFBTSx1QkFBdUI7QUFjN0IsU0FBUyxlQUFlLEtBQWEsTUFBNkI7QUFDaEUsUUFBTSxVQUFvQixDQUFDO0FBQzNCLGFBQVcsU0FBWSxlQUFZLEtB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
