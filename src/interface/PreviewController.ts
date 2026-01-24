import * as vscode from "vscode";
import { ShowPreviewUseCase } from "../application/ShowPreviewUseCase";

export class PreviewController {
  constructor(private readonly showPreviewUseCase: ShowPreviewUseCase) {}

  public async handle(
    column: "active" | "beside" = "beside",
    filePath?: string,
  ) {
    try {
      await this.showPreviewUseCase.execute(column, filePath);
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage("Failed to show preview.");
    }
  }
}
