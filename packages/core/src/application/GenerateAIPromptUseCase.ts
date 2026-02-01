import { CommentThread } from "../domain/Comment";
import { MarkdownDocument } from "../domain/MarkdownDocument";

export class GenerateAIPromptUseCase {
  public execute(document: MarkdownDocument, threads: CommentThread[]): string {
    const commentsList = threads
      .map((thread, index) => {
        const commentText = thread.comments
          .map((c) => `- ${c.author}: ${c.content}`)
          .join("\n");
        return `Comment #${index + 1} (at offset ${thread.anchor.offset}):\n${commentText}`;
      })
      .join("\n\n");

    return `I want you to act as an expert editor. Below is a Markdown document and a list of comments/suggestions at specific locations.
Please rewrite the Markdown document to incorporate all the suggestions. Maintain the original formatting and style where possible.

### Original Document:
\`\`\`markdown
${document.content}
\`\`\`

### Comments:
${commentsList}

### Instruction:
Return the complete improved Markdown document only. Do not include any explanations.
`;
  }
}
