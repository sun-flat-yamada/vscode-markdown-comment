import * as vscode from "vscode";
import { CommentService } from "@markdown-comment/core";
import { IPreviewPresenter } from "@markdown-comment/core";
import { IDocumentRepository } from "@markdown-comment/core";

export class AddCommentFromPreviewController {
  constructor(
    private readonly commentService: CommentService,
    private readonly previewPresenter: IPreviewPresenter,
    private readonly documentRepository: IDocumentRepository,
    private readonly onDidUpdate?: () => void,
  ) {}

  public async handle(): Promise<void> {
    const selectedText = this.previewPresenter.getSelectedText();
    if (!selectedText) {
      vscode.window.showWarningMessage("No text selected in preview.");
      return;
    }

    const filePath = this.previewPresenter.getCurrentFilePath();
    let document = null;

    if (filePath) {
      document = await this.documentRepository.getDocumentByPath(filePath);
    }

    if (!document) {
      document = await this.documentRepository.getCurrentDocument();
    }

    if (!document) {
      vscode.window.showErrorMessage("No active document found.");
      return;
    }

    // Find the text in the document content
    // For simplicity, we find the first occurrence.
    const offset = document.content.indexOf(selectedText);
    if (offset === -1) {
      vscode.window.showErrorMessage(
        "Could not find the selected text in the document source.",
      );
      return;
    }

    const initialComment = await vscode.window.showInputBox({
      prompt: "Enter your comment",
    });

    if (!initialComment) {
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration("markdownComment");
      const author =
        config.get<string>("defaultAuthor") || vscode.env.machineId;

      await this.commentService.createThread(
        document.filePath,
        document.content,
        offset,
        selectedText.length,
        author,
        initialComment,
      );
      vscode.window.showInformationMessage("Comment added successfully.");
      if (this.onDidUpdate) {
        this.onDidUpdate();
      }
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to add comment.");
    }
  }
}
