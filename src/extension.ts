import * as vscode from "vscode";
import { VSCodeDocumentRepository } from "./infrastructure/VSCodeDocumentRepository";
import { AnalyzeDocumentUseCase } from "./application/AnalyzeDocumentUseCase";
import { AnalyzeDocumentController } from "./interface/AnalyzeDocumentController";
import { ShowPreviewUseCase } from "./application/ShowPreviewUseCase";
import { PreviewController } from "./interface/PreviewController";
import { WebviewPreviewPresenter } from "./infrastructure/WebviewPreviewPresenter";
import { AddCommentFromPreviewController } from "./interface/AddCommentFromPreviewController";
import { FileSystemCommentRepository } from "./infrastructure/FileSystemCommentRepository";
import { AnchoringService } from "./application/AnchoringService";
import { CommentService } from "./application/CommentService";
import { VSCodeCommentController } from "./infrastructure/VSCodeCommentController";
import { CommentsWebviewViewProvider } from "./infrastructure/CommentsWebviewViewProvider";
import { COMMENTS_VIEW_ID } from "./domain/Constants";

export function activate(context: vscode.ExtensionContext) {
  console.log("Markdown Comment is active!");

  // Composition Root
  const documentRepository = new VSCodeDocumentRepository();
  const analyzeUseCase = new AnalyzeDocumentUseCase(documentRepository);
  const controller = new AnalyzeDocumentController(analyzeUseCase);

  // Comment Feature Setup
  const commentRepository = new FileSystemCommentRepository();
  const anchoringService = new AnchoringService();
  const commentService = new CommentService(
    commentRepository,
    anchoringService,
  );

  const previewPresenter = new WebviewPreviewPresenter();
  const showPreviewUseCase = new ShowPreviewUseCase(
    documentRepository,
    previewPresenter,
    commentService,
  );
  const previewController = new PreviewController(showPreviewUseCase);

  // Comments WebviewView Setup
  const commentsWebviewProvider = new CommentsWebviewViewProvider(
    context,
    commentService,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CommentsWebviewViewProvider.viewType,
      commentsWebviewProvider,
    ),
  );

  // Helper function to refresh tree view
  const refreshCommentsTreeView = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === "markdown") {
      await commentsWebviewProvider.refresh(
        editor.document.uri.fsPath,
        editor.document.getText(),
      );
    }
  };

  // Shared refresh function
  const handleCommentChange = async () => {
    const currentPath = previewPresenter.getCurrentFilePath();
    // Run preview refresh and tree view refresh in parallel for better responsiveness
    await Promise.all([
      previewController.handle("beside", currentPath),
      refreshCommentsTreeView(),
    ]);
  };

  const commentController = new VSCodeCommentController(
    context,
    commentService,
    handleCommentChange,
  );

  const addCommentFromPreviewController = new AddCommentFromPreviewController(
    commentService,
    previewPresenter,
    documentRepository,
    handleCommentChange,
  );

  previewPresenter.onDidClickComment(async (threadId) => {
    await commentController.revealThread(threadId);
  });

  previewPresenter.onUpdateStatus(
    async (threadId: string, commentId: string, status: string) => {
      const currentPath = previewPresenter.getCurrentFilePath();
      if (currentPath) {
        await commentService.updateStatus(
          currentPath,
          threadId,
          commentId,
          status as any,
        );
        await handleCommentChange();
      }
    },
  );

  // Command to reveal comment from Table
  let revealCommentFromTreeDisposable = vscode.commands.registerCommand(
    "markdown-comment.revealCommentFromTable",
    async (threadId: string, filePath: string) => {
      const uri = vscode.Uri.file(filePath);
      await vscode.window.showTextDocument(uri, { preview: false });
      await commentController.revealThread(threadId);
    },
  );

  let analyzeDisposable = vscode.commands.registerCommand(
    "markdown-comment.analyze",
    async () => {
      await controller.handle();
    },
  );

  let openPreviewDisposable = vscode.commands.registerCommand(
    "markdown-comment.openPreview",
    async () => {
      await previewController.handle("active");
    },
  );

  let openPreviewSideDisposable = vscode.commands.registerCommand(
    "markdown-comment.openPreviewToSide",
    async () => {
      await previewController.handle("beside");
    },
  );

  let addCommentFromPreviewDisposable = vscode.commands.registerCommand(
    "markdown-comment.addCommentFromPreview",
    async () => {
      // Logic inside controller now triggers the refresh via handleCommentChange
      await addCommentFromPreviewController.handle();

      // Additional UI sync for open editors (not covered by preview refresh)
      const filePath = previewPresenter.getCurrentFilePath();
      if (filePath) {
        const uri = vscode.Uri.file(filePath);
        const editors = vscode.window.visibleTextEditors.filter(
          (e) => e.document.uri.toString() === uri.toString(),
        );
        for (const editor of editors) {
          await commentController.refreshForEditor(editor, true);
        }
      }
    },
  );

  let changeDisposable = vscode.workspace.onDidChangeTextDocument(async (e) => {
    if (e.document.languageId === "markdown") {
      // 自動更新は現在のパネルがあれば行う
      // Run refreshes in parallel
      await Promise.all([
        previewController.handle("beside", e.document.uri.fsPath),
        refreshCommentsTreeView(),
      ]);

      // Find editor for this document and refresh gutter comments
      const editor = vscode.window.visibleTextEditors.find(
        (ed) => ed.document === e.document,
      );
      if (editor) {
        await commentController.refreshForEditor(editor);
      }
    }
  });

  // Refresh comments when active editor changes
  let editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
    async (editor) => {
      if (editor && editor.document.languageId === "markdown") {
        await commentController.refreshForEditor(editor);
        await commentsWebviewProvider.refresh(
          editor.document.uri.fsPath,
          editor.document.getText(),
        );
      } else {
        commentsWebviewProvider.clear();
      }
    },
  );

  // Initial refresh
  if (vscode.window.activeTextEditor) {
    const editor = vscode.window.activeTextEditor;
    commentController.refreshForEditor(editor);
    if (editor.document.languageId === "markdown") {
      commentsWebviewProvider.refresh(
        editor.document.uri.fsPath,
        editor.document.getText(),
      );
    }
  }

  context.subscriptions.push(
    analyzeDisposable,
    openPreviewDisposable,
    openPreviewSideDisposable,
    addCommentFromPreviewDisposable,
    changeDisposable,
    editorChangeDisposable,
    revealCommentFromTreeDisposable,
    vscode.commands.registerCommand("markdown-comment.showCommentTable", () => {
      vscode.commands.executeCommand(`${COMMENTS_VIEW_ID}.focus`);
    }),
  );
}

export function deactivate() {}
