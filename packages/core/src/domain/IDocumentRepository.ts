import { MarkdownDocument } from "./MarkdownDocument";

export interface IDocumentRepository {
  getCurrentDocument(): Promise<MarkdownDocument | null>;
  getDocumentByPath(filePath: string): Promise<MarkdownDocument | null>;
}
