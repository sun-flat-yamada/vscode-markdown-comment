export class AnnotationService {
  /**
   * Calculates the precise content to inject (with placeholders) based on comment threads.
   * Handles protection rules (HTML, Markdown links/headers) and sorting.
   */
  public injectPlaceholders(
    content: string,
    threads: {
      id: string;
      anchor: { offset: number; length: number };
      createdAt?: Date;
    }[],
  ): {
    htmlContent: string;
    points: { offset: number; type: "start" | "end"; threadId: string }[];
  } {
    const points: {
      offset: number;
      type: "start" | "end";
      threadId: string;
      threadIndex: number;
    }[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      points.push({
        offset: thread.anchor.offset,
        type: "start",
        threadId: thread.id,
        threadIndex: i,
      });
      points.push({
        offset: thread.anchor.offset + thread.anchor.length,
        type: "end",
        threadId: thread.id,
        threadIndex: i,
      });
    }

    // Adjust points to snap to protection boundaries
    for (const point of points) {
      // 1. Strict protection (HTML, links, images) - snap outward
      const protectionRange = this.getProtectionRange(content, point.offset);
      if (protectionRange) {
        if (point.type === "start") {
          point.offset = protectionRange.start;
        } else {
          point.offset = protectionRange.end;
        }
      }

      // 2. Header protection - snap to END of prefix
      const headerPrefix = this.getMarkdownHeaderRange(content, point.offset);
      if (headerPrefix) {
        if (point.offset < headerPrefix.end) {
          point.offset = headerPrefix.end;
        }
      }
    }

    points.sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }
      if (a.type !== b.type) {
        return a.type === "end" ? -1 : 1;
      }
      return a.threadIndex - b.threadIndex;
    });

    const collapsedThreads = new Set<number>();
    const threadRanges = new Map<number, { start?: number; end?: number }>();

    for (const point of points) {
      const range = threadRanges.get(point.threadIndex) || {};
      if (point.type === "start") {
        range.start = point.offset;
      } else {
        range.end = point.offset;
      }
      threadRanges.set(point.threadIndex, range);
    }

    for (const [index, range] of threadRanges) {
      if (
        range.start !== undefined &&
        range.end !== undefined &&
        range.start === range.end
      ) {
        collapsedThreads.add(index);
      }
    }

    let htmlContentWithPlaceholders = "";
    let lastOffset = 0;
    const activeThreadIndices = new Set<number>();
    const iconDisplayed = new Set<number>();

    for (const point of points) {
      if (point.offset > lastOffset) {
        let segment = content.substring(lastOffset, point.offset);

        // Sort active threads to determine nesting order (Inner -> Outer)
        // The loop applies wrappers sequentially: segment = <Wrapper>segment</Wrapper>
        // So the First item in the list becomes the Innermost tag.
        // The Last item in the list becomes the Outermost tag.
        // We want:
        // - Higher Start Offset (More specific) -> Inner -> First
        // - Newer CreatedAt -> Inner -> First
        const sortedActive = Array.from(activeThreadIndices).sort((a, b) => {
          const threadA = threads[a];
          const threadB = threads[b];

          // Primary: Start offset (DESCENDING)
          if (threadA.anchor.offset !== threadB.anchor.offset) {
            return threadB.anchor.offset - threadA.anchor.offset;
          }

          // Secondary: CreatedAt (DESCENDING - Newer is Inner)
          if (threadA.createdAt && threadB.createdAt) {
            return threadB.createdAt.getTime() - threadA.createdAt.getTime();
          }

          // Fallback: Index (Stability - Higher index first to keep consistency with "Newer" heuristic if dates missing)
          return b - a;
        });

        for (const idx of sortedActive) {
          const isFirst = !iconDisplayed.has(idx);
          if (isFirst) {
            segment = `MCFIRST${idx}MC` + segment + `MCEND${idx}MC`;
            iconDisplayed.add(idx);
          } else {
            segment = `MCSTART${idx}MC` + segment + `MCEND${idx}MC`;
          }
        }
        htmlContentWithPlaceholders += segment;
      } else if (point.offset === lastOffset && point.type === "start") {
        // Zero-length or Collapsed comments
        if (collapsedThreads.has(point.threadIndex)) {
          if (!iconDisplayed.has(point.threadIndex)) {
            htmlContentWithPlaceholders += `MCFIRST${point.threadIndex}MCMCEND${point.threadIndex}MC`;
            iconDisplayed.add(point.threadIndex);
          }
        }
      }

      if (point.type === "start") {
        activeThreadIndices.add(point.threadIndex);
      } else {
        activeThreadIndices.delete(point.threadIndex);
      }
      lastOffset = point.offset;
    }

    if (lastOffset < content.length) {
      htmlContentWithPlaceholders += content.substring(lastOffset);
    }

    return {
      htmlContent: htmlContentWithPlaceholders,
      points: points.map((p) => ({
        offset: p.offset,
        type: p.type,
        threadId: p.threadId,
      })),
    };
  }

  private getProtectionRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    const htmlRange = this.getHtmlTagRange(content, offset);
    if (htmlRange) return htmlRange;

    const mdRange = this.getMarkdownSyntaxRange(content, offset);
    if (mdRange) return mdRange;

    return null;
  }

  private getHtmlTagRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    const before = content.lastIndexOf("<", offset);
    if (before === -1) return null;

    const charAfterLT = content[before + 1];
    if (charAfterLT && /\s/.test(charAfterLT)) return null;

    const after = content.indexOf(">", before);
    if (after === -1) return null;

    if (before < offset && offset <= after) {
      const newline = content.substring(before, after).includes("\n");
      if (newline) return null;
      return { start: before, end: after + 1 };
    }
    return null;
  }

  private getMarkdownSyntaxRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    let searchStart = offset;
    while (searchStart >= 0) {
      const openBracket = content.lastIndexOf("[", searchStart);
      if (openBracket === -1) break;

      const isImage = openBracket > 0 && content[openBracket - 1] === "!";
      const syntaxStart = isImage ? openBracket - 1 : openBracket;

      const closeBracket = content.indexOf("]", openBracket);
      if (
        closeBracket === -1 ||
        (closeBracket + 1 < content.length &&
          closeBracket < offset &&
          content[closeBracket + 1] !== "(" &&
          content[closeBracket + 1] !== "[")
      ) {
        searchStart = openBracket - 1;
        continue;
      }

      let syntaxEnd = closeBracket + 1;
      if (content[closeBracket + 1] === "(") {
        const closeParen = content.indexOf(")", closeBracket + 1);
        if (closeParen !== -1) {
          syntaxEnd = closeParen + 1;
        }
      } else if (content[closeBracket + 1] === "[") {
        const closeRef = content.indexOf("]", closeBracket + 1);
        if (closeRef !== -1) {
          syntaxEnd = closeRef + 1;
        }
      }

      if (syntaxStart < offset && offset < syntaxEnd) {
        const segment = content.substring(syntaxStart, syntaxEnd);
        if (segment.split("\n").length > 5) {
          searchStart = openBracket - 1;
          continue;
        }
        return { start: syntaxStart, end: syntaxEnd };
      }

      searchStart = openBracket - 1;
    }

    return null;
  }

  private getMarkdownHeaderRange(
    content: string,
    offset: number,
  ): { start: number; end: number } | null {
    const lineStart = content.lastIndexOf("\n", offset - 1) + 1;
    if (content[lineStart] === "#") {
      let i = lineStart;
      while (i < content.length && content[i] === "#") {
        i++;
      }
      if (i < content.length && content[i] === " ") {
        i++;
      }
      if (offset >= lineStart && offset < i) {
        return { start: lineStart, end: i };
      }
    }
    return null;
  }
}
