import * as fs from "fs/promises";
import { IDocumentRepository, MarkdownDocument } from "@markdown-comment/core";

export class ElectronDocumentRepository implements IDocumentRepository {
  private currentFilePath?: string;
  private currentContent?: string;

  async getCurrentDocument(): Promise<MarkdownDocument | null> {
    if (!this.currentFilePath || !this.currentContent) return null;
    return new MarkdownDocument(this.currentContent, this.currentFilePath);
  }

  async getDocumentByPath(filePath: string): Promise<MarkdownDocument | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return new MarkdownDocument(content, filePath);
    } catch (e) {
      return null;
    }
  }

  setDocument(filePath: string, content: string): void {
    this.currentFilePath = filePath;
    this.currentContent = content;
  }

  getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }
}
