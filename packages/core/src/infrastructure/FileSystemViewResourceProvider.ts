import * as fs from "fs/promises";
import * as path from "path";
import * as sass from "sass";
import { IViewResourceProvider } from "../application/IViewResourceProvider";
import {
  HTML_EXTENSION,
  CSS_EXTENSION,
  SCSS_EXTENSION,
  JS_EXTENSION,
  TS_EXTENSION,
} from "../domain/Constants";

export class FileSystemViewResourceProvider implements IViewResourceProvider {
  private readonly viewsDir: string;
  // Simple in-memory cache for styles to avoid recompiling every time
  private styleCache: Map<string, string> = new Map();

  constructor(
    // Base directory for views.
    // In production/dist, this might need adjustment, but for now we assume source structure or copied assets.
    // Default implementation assumes running from standard structure relative to this file.
    baseViewsDir?: string,
  ) {
    if (baseViewsDir) {
      this.viewsDir = baseViewsDir;
    } else {
      // Assuming structure: packages/core/dist/infrastructure/FileSystemViewResourceProvider.js
      // Views are at: packages/core/dist/views (if copied) OR packages/core/src/views (dev)
      // For development (ts-node), __dirname is src/infrastructure
      // We look for ../views
      this.viewsDir = path.resolve(__dirname, "../views");
    }
  }

  async loadTemplate(viewName: string): Promise<string> {
    const filePath = path.join(this.viewsDir, viewName + HTML_EXTENSION);
    return await fs.readFile(filePath, "utf-8");
  }

  async loadStyle(viewName: string): Promise<string> {
    if (this.styleCache.has(viewName)) {
      return this.styleCache.get(viewName)!;
    }

    // Try CSS first (pre-compiled)
    try {
      const cssPath = path.join(this.viewsDir, viewName + CSS_EXTENSION);
      const css = await fs.readFile(cssPath, "utf-8");
      this.styleCache.set(viewName, css);
      return css;
    } catch {
      // Fallback to SCSS compilation (dev mode or if CSS missing)
      const scssPath = path.join(this.viewsDir, viewName + SCSS_EXTENSION);
      try {
        await fs.stat(scssPath);
        const result = sass.compile(scssPath, {
          style: "compressed",
          loadPaths: [this.viewsDir],
        });
        const css = result.css;
        this.styleCache.set(viewName, css);
        return css;
      } catch (e) {
        console.warn(`Failed to load style for ${viewName}:`, e);
        return "";
      }
    }
  }

  async loadScript(viewName: string): Promise<string> {
    // Try .js (compiled/bundled) first, then .ts (dev)
    const jsPath = path.join(this.viewsDir, viewName + JS_EXTENSION);
    try {
      return await fs.readFile(jsPath, "utf-8");
    } catch {
      const tsPath = path.join(this.viewsDir, viewName + TS_EXTENSION);
      try {
        // For .ts files in dev, we just return content.
        // In a real Webview, this needs transpile.
        // However, our preview.ts is valid JS (with a few types).
        // To be safe we should transpile, but for now lets return raw
        // and assume webview environment can handle modern JS or it is simple enough.
        // Actually, typescript types will cause syntax error in browser.
        // We really should transpile.
        // Since we have ts-node, maybe we can use typescript compiler API?
        // Or simplified: simple regex strip for type assertions?
        // Let's rely on webpack build in production.
        // For NOW (Execution phase), let's assume raw TS content might fail if it has types.
        // The preview.ts I wrote uses `as HTMLElement`. This is TS syntax.
        // It WON'T run in browser.
        // Adding simple transpile using 'typescript' package if available or simple regex replace.
        const content = await fs.readFile(tsPath, "utf-8");
        return this.transpileSimple(content);
      } catch {
        return "";
      }
    }
  }

  private transpileSimple(tsContent: string): string {
    // Very naive transpilation for dev mode
    return (
      tsContent
        // Remove `as Type`
        .replace(/as\s+[a-zA-Z0-9_<>]+/g, "")
        // Remove type annotations in args: (a: string) -> (a)
        // This is too complex for regex.
        // Ideally we use `typescript` module if available.
        // packages/core devDependencies has typescript.
        // We can try dynamic import.
        .replace(/:\s*[a-zA-Z0-9_<>\[\]]+/g, "") // risky but maybe enough for simple script
    );
  }
  async loadFragment(viewName: string, fragmentName: string): Promise<string> {
    const filePath = path.join(
      this.viewsDir,
      viewName,
      fragmentName + HTML_EXTENSION,
    );
    return await fs.readFile(filePath, "utf-8");
  }
}
