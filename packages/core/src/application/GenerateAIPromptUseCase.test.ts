import * as assert from "assert";
import { GenerateAIPromptUseCase } from "./GenerateAIPromptUseCase";
import {
  CommentThread,
  Comment,
  CommentStatus,
  MARKDOWN_EXTENSION,
} from "../index";
import { MarkdownDocument } from "../domain/MarkdownDocument";

suite("GenerateAIPromptUseCase", () => {
  let useCase: GenerateAIPromptUseCase;

  setup(() => {
    useCase = new GenerateAIPromptUseCase();
  });

  test("should generate a prompt with document and comments", () => {
    const document = new MarkdownDocument(
      "# Hello\nWorld",
      "test" + MARKDOWN_EXTENSION,
    );
    const thread = new CommentThread("t1", "test" + MARKDOWN_EXTENSION, {
      offset: 0,
      length: 5,
      text: "# Hel",
      contextBefore: "",
      contextAfter: "lo",
    });
    thread.addComment("A suggestion", "Author");

    const prompt = useCase.execute(document, [thread]);

    assert.ok(prompt.includes("# Hello"), "Should include document content");
    assert.ok(
      prompt.includes("A suggestion"),
      "Should include comment content",
    );
    assert.ok(prompt.includes("Author"), "Should include author");
  });
});
