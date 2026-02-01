import { CommentAnchor } from "../domain/Comment";

export class AnchoringService {
  private static readonly CONTEXT_SIZE = 20;

  /**
   * Creates an anchor for a given range in the content.
   */
  public createAnchor(
    content: string,
    offset: number,
    length: number,
  ): CommentAnchor {
    const text = content.substring(offset, offset + length);
    const contextBefore = content.substring(
      Math.max(0, offset - AnchoringService.CONTEXT_SIZE),
      offset,
    );
    const contextAfter = content.substring(
      offset + length,
      Math.min(content.length, offset + length + AnchoringService.CONTEXT_SIZE),
    );

    return {
      text,
      contextBefore,
      contextAfter,
      offset,
      length,
    };
  }

  /**
   * Resolves the current offset of an anchor in the potentially modified content.
   */
  public resolveOffset(content: string, anchor: CommentAnchor): number | null {
    // 1. Exact match at original offset
    if (
      content.substring(anchor.offset, anchor.offset + anchor.length) ===
      anchor.text
    ) {
      return anchor.offset;
    }

    // 2. Search for the text within a reasonable range or globally
    // For simplicity, we search globally, but prioritize the context matching
    const textEscaped = anchor.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(textEscaped, "g");
    let match;
    let bestOffset = -1;
    let maxScore = -1;

    while ((match = pattern.exec(content)) !== null) {
      const currentOffset = match.index;
      let score = 0;

      // Score based on context match
      const actualContextBefore = content.substring(
        Math.max(0, currentOffset - anchor.contextBefore.length),
        currentOffset,
      );
      const actualContextAfter = content.substring(
        currentOffset + anchor.length,
        Math.min(
          content.length,
          currentOffset + anchor.length + anchor.contextAfter.length,
        ),
      );

      if (actualContextBefore === anchor.contextBefore) {
        score += 2;
      } else if (
        actualContextBefore.endsWith(anchor.contextBefore.slice(-10))
      ) {
        score += 1;
      }

      if (actualContextAfter === anchor.contextAfter) {
        score += 2;
      } else if (
        actualContextAfter.startsWith(anchor.contextAfter.slice(0, 10))
      ) {
        score += 1;
      }

      // Score based on proximity to original offset
      const distance = Math.abs(currentOffset - anchor.offset);
      score += Math.max(0, 5 - Math.log10(distance + 1));

      if (score > maxScore) {
        maxScore = score;
        bestOffset = currentOffset;
      }
    }

    return maxScore >= 2 ? bestOffset : null;
  }
}
