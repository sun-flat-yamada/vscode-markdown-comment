export class TextSearchService {
  /**
   * Finds the best matching position of selected text within the document content,
   * using context (before/after) to disambiguate duplicates.
   */
  public findBestMatch(
    content: string,
    selectedText: string,
    contextBefore?: string,
    contextAfter?: string,
  ): { offset: number; length: number } | null {
    let bestIndex = -1;
    let bestScore = -1;
    let bestLength = 0;

    // Normalize whitespace for matching: treat any sequence of whitespace as [\s\r\n]+
    const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escapedText.replace(/\s+/g, "[\\s\\r\\n]+");
    const regex = new RegExp(pattern, "g");

    let match;
    while ((match = regex.exec(content)) !== null) {
      const searchIdx = match.index;
      const matchLength = match[0].length;
      let score = 0;

      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      // Strip Markdown syntax to allow matching DOM text against raw Markdown
      const stripMarkdown = (s: string) =>
        s
          .replace(/^#{1,6}\s+/gm, "") // Headers
          .replace(/\*\*|__/g, "") // Bold
          .replace(/\*|_/g, "") // Italic
          .replace(/~~([^~]+)~~/g, "$1") // Strikethrough
          .replace(/`([^`]+)`/g, "$1") // Inline code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1"); // Images

      const normBefore = contextBefore ? normalize(contextBefore) : "";
      const normAfter = contextAfter ? normalize(contextAfter) : "";

      // Check Context Before
      if (contextBefore) {
        // Get strictly preceding text
        const preText = content.substring(
          Math.max(0, searchIdx - contextBefore.length - 50),
          searchIdx,
        );
        // Strip Markdown from document content, then normalize
        const normPre = normalize(stripMarkdown(preText));
        if (normPre.endsWith(normBefore)) {
          score += 2;
        } else if (
          normPre.includes(normBefore) ||
          normBefore.includes(normPre.slice(-20))
        ) {
          // Partial match fallback
          score += 1;
        }
      }

      // Check Context After
      if (contextAfter) {
        const postText = content.substring(
          searchIdx + matchLength,
          searchIdx + matchLength + contextAfter.length + 50,
        );
        // Strip Markdown from document content, then normalize
        const normPost = normalize(stripMarkdown(postText));
        if (normPost.startsWith(normAfter)) {
          score += 2;
        } else if (
          normPost.includes(normAfter) ||
          normAfter.includes(normPost.slice(0, 20))
        ) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = searchIdx;
        bestLength = matchLength;
      }
    }

    if (bestIndex !== -1) {
      return { offset: bestIndex, length: bestLength };
    } else {
      // Fallback to simple indexOf if regex fails (unlikely but safe)
      const index = content.indexOf(selectedText);
      if (index !== -1) {
        return { offset: index, length: selectedText.length };
      }
    }

    return null;
  }
}
