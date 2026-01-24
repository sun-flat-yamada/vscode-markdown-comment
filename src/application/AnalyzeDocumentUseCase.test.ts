import * as assert from "assert";
import { AnalyzeDocumentUseCase } from "./AnalyzeDocumentUseCase";
import { IDocumentRepository } from "../domain/IDocumentRepository";
import { MarkdownDocument } from "../domain/MarkdownDocument";

// Mock Repository
class MockDocumentRepository implements IDocumentRepository {
  private document: MarkdownDocument | null = null;

  constructor(content: string | null = null) {
    if (content !== null) {
      this.document = new MarkdownDocument(content, "test.md");
    }
  }

  async getCurrentDocument(): Promise<MarkdownDocument | null> {
    return this.document;
  }

  async getDocumentByPath(_: string): Promise<MarkdownDocument | null> {
    return this.document;
  }
}

suite("AnalyzeDocumentUseCase Unit Test", () => {
  test("Returns null when no document is available", async () => {
    const repo = new MockDocumentRepository(null);
    const useCase = new AnalyzeDocumentUseCase(repo);
    const result = await useCase.execute();
    assert.strictEqual(result, null);
  });

  test("Returns analysis result for valid document", async () => {
    const content = "Hello world this is a test"; // 6 words, 26 chars
    const repo = new MockDocumentRepository(content);
    const useCase = new AnalyzeDocumentUseCase(repo);
    const result = await useCase.execute();

    assert.ok(result);
    assert.strictEqual(result.wordCount, 6);
    assert.strictEqual(result.characterCount, 26);
    assert.strictEqual(result.readingTimeMinutes, 1);
  });
});
