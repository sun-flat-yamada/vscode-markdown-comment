import * as MarkdownIt from "markdown-it";
import * as path from "path";

export interface IResourceProvider {
  asWebviewUri(localPath: string): string;
}

export class MarkdownEngine {
  private md: MarkdownIt;

  constructor(private readonly resourceProvider: IResourceProvider) {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
    this.addImageRenderer();
    this.addLinkRenderer();
    this.addHtmlRenderer();
    this.addSourceMapPlugin();
  }

  public render(content: string, filePath: string): string {
    // Pass context via environment if needed, or just rely on closure/class state
    // We need filePath for relative image resolution
    const env = { filePath };
    return this.md.render(content, env);
  }

  private addImageRenderer(): void {
    const defaultImageRule =
      this.md.renderer.rules.image ||
      ((tokens, idx, options, _env, self) => {
        return self.renderToken(tokens, idx, options);
      });

    this.md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex("src");
      if (srcIndex >= 0 && token.attrs) {
        const src = token.attrs[srcIndex][1];
        if (
          !src.startsWith("http") &&
          !src.startsWith("https") &&
          !src.startsWith("data:")
        ) {
          // Resolve path relative to the document
          // env.filePath MUST be provided in .render()
          if (env && env.filePath) {
            const absolutePath = path.isAbsolute(src)
              ? src
              : path.resolve(path.dirname(env.filePath), src);
            token.attrs[srcIndex][1] =
              this.resourceProvider.asWebviewUri(absolutePath);
            // Debug: append absolute path info
            token.attrSet("data-debug-path", absolutePath);
          }
        }
      }

      // Clean up placeholders in attributes
      if (token.attrs) {
        token.attrs.forEach((attr) => {
          attr[1] = this.stripPlaceholders(attr[1]);
        });
      }

      // DO NOT strip from children/text here, ShowPreviewUseCase will handle it after render
      return defaultImageRule(tokens, idx, options, env, self);
    };
  }

  private addLinkRenderer(): void {
    const defaultRender =
      this.md.renderer.rules.link_open ||
      ((tokens, idx, options, _env, self) => {
        return self.renderToken(tokens, idx, options);
      });

    this.md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      // Clean up placeholders in attributes
      if (token.attrs) {
        token.attrs.forEach((attr) => {
          attr[1] = this.stripPlaceholders(attr[1]);
        });
      }

      const hrefIndex = token.attrIndex("href");
      if (hrefIndex >= 0 && token.attrs) {
        const href = token.attrs[hrefIndex][1];
        if (href.startsWith("http") || href.startsWith("https")) {
          token.attrSet("target", "_blank");
          token.attrSet("rel", "noopener noreferrer");
        }
      }
      return defaultRender(tokens, idx, options, env, self);
    };
  }

  private addSourceMapPlugin(): void {
    // Inject data-line attribute for scroll sync
    const originalRenderToken = this.md.renderer.renderToken.bind(
      this.md.renderer,
    );

    this.md.renderer.renderToken = (tokens, idx, options) => {
      const token = tokens[idx];
      if (token.level === 0 && token.map) {
        // VS Code expects 0-based lines for scroll sync (data-line)
        token.attrSet("data-line", String(token.map[0]));
      }
      return originalRenderToken(tokens, idx, options);
    };

    // Also patch fence renderer as it might not use renderToken directly for wrapper
    const defaultFence =
      this.md.renderer.rules.fence ||
      ((tokens, idx, options, _env, self) => {
        return self.renderToken(tokens, idx, options);
      });

    this.md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.map) {
        token.attrSet("data-line", String(token.map[0]));
      }
      return defaultFence(tokens, idx, options, env, self);
    };
  }

  private addHtmlRenderer(): void {
    const defaultInline =
      this.md.renderer.rules.html_inline ||
      ((tokens, idx, _options, _env, _self) => {
        return tokens[idx].content;
      });
    const defaultBlock =
      this.md.renderer.rules.html_block ||
      ((tokens, idx, _options, _env, _self) => {
        return tokens[idx].content;
      });

    const patchHtml = (
      tokens: any[],
      idx: number,
      options: any,
      env: any,
      self: any,
      defaultRenderer: any,
    ) => {
      const token = tokens[idx];
      let content = token.content;

      if (/<img/i.test(content)) {
        // Resolve src, but also strip placeholders from attributes specifically
        content = content.replace(
          /(src=["'])([^"']+)(["'])/gi,
          (match: string, prefix: string, src: string, suffix: string) => {
            const cleanSrc = this.stripPlaceholders(src);
            if (
              !cleanSrc.startsWith("http") &&
              !cleanSrc.startsWith("https") &&
              !cleanSrc.startsWith("data:")
            ) {
              if (env && env.filePath) {
                const absolutePath = path.isAbsolute(cleanSrc)
                  ? cleanSrc
                  : path.resolve(path.dirname(env.filePath), cleanSrc);
                return (
                  prefix +
                  this.resourceProvider.asWebviewUri(absolutePath) +
                  `" data-debug-path="${absolutePath}` +
                  suffix
                );
              }
            }
            return prefix + cleanSrc + suffix;
          },
        );

        // Also clean other attributes in the HTML tag
        content = content.replace(
          /(\s+alt=["'])([^"']+)(["'])/gi,
          (_: string, p: string, v: string, s: string) =>
            p + this.stripPlaceholders(v) + s,
        );
        content = content.replace(
          /(\s+title=["'])([^"']+)(["'])/gi,
          (_: string, p: string, v: string, s: string) =>
            p + this.stripPlaceholders(v) + s,
        );

        token.content = content;
      }
      return defaultRenderer(tokens, idx, options, env, self);
    };

    this.md.renderer.rules.html_inline = (tokens, idx, options, env, self) =>
      patchHtml(tokens, idx, options, env, self, defaultInline);
    this.md.renderer.rules.html_block = (tokens, idx, options, env, self) =>
      patchHtml(tokens, idx, options, env, self, defaultBlock);
  }

  private stripPlaceholders(text: string): string {
    return text.replace(/MC(FIRST|START|END)\d+MC/g, "");
  }
}
