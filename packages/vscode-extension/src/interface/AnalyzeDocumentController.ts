import * as vscode from "vscode";
import { AnalyzeDocumentUseCase } from "@markdown-comment/core";

export class AnalyzeDocumentController {
  constructor(private readonly useCase: AnalyzeDocumentUseCase) {}

  public async handle() {
    try {
      const result = await this.useCase.execute();

      if (!result) {
        vscode.window.showWarningMessage(
          "Please open a Markdown file to analyze.",
        );
        return;
      }

      const message = `
                Analysis Result:
                Word Count: ${result.wordCount}
                Characters: ${result.characterCount}
                Estimated Reading Time: ${result.readingTimeMinutes} min
            `;

      vscode.window.showInformationMessage(message);
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to analyze document.");
    }
  }
}
