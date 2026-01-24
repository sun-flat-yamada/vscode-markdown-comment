import * as vscode from "vscode";
import { IDocumentRepository } from "../domain/IDocumentRepository";
import { MarkdownDocument } from "../domain/MarkdownDocument";

export class VSCodeDocumentRepository implements IDocumentRepository {
  public async getCurrentDocument(): Promise<MarkdownDocument | null> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return null;
    }

    if (editor.document.languageId !== "markdown") {
      return null;
    }

    return new MarkdownDocument(
      editor.document.getText(),
      editor.document.fileName,
    );
  }

  public async getDocumentByPath(
    filePath: string,
  ): Promise<MarkdownDocument | null> {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      return new MarkdownDocument(doc.getText(), doc.fileName);
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
