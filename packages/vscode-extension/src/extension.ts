import * as vscode from "vscode";
import { VSCodeDocumentRepository } from "./infrastructure/VSCodeDocumentRepository";
import {
  AnalyzeDocumentUseCase,
  ShowPreviewUseCase,
  CommentService,
  AnchoringService,
  COMMENTS_VIEW_ID,
  FileSystemCommentRepository,
  ViewBuilder,
  FileSystemViewResourceProvider,
  GenerateAIPromptUseCase,
  AnnotationService,
} from "@markdown-comment/core";
import { AnalyzeDocumentController } from "./interface/AnalyzeDocumentController";
import { PreviewController } from "./interface/PreviewController";
import { WebviewPreviewPresenter } from "./infrastructure/WebviewPreviewPresenter";
import { AddCommentFromPreviewController } from "./interface/AddCommentFromPreviewController";
import { VSCodeCommentController } from "./infrastructure/VSCodeCommentController";
import { CommentsWebviewViewProvider } from "./infrastructure/CommentsWebviewViewProvider";

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

  // Initialize ViewBuilder with views path
  // In dev: packages/vscode-extension/../../packages/core/src/views
  const viewsPath = vscode.Uri.joinPath(
    context.extensionUri,
    "..",
    "core",
    "dist",
    "views",
  ).fsPath;
  const viewResourceProvider = new FileSystemViewResourceProvider(viewsPath);
  const viewBuilder = new ViewBuilder(viewResourceProvider);

  const annotationService = new AnnotationService();

  const showPreviewUseCase = new ShowPreviewUseCase(
    documentRepository,
    previewPresenter,
    commentService,
    viewBuilder,
    annotationService,
  );
  const generateAIPromptUseCase = new GenerateAIPromptUseCase();
  const previewController = new PreviewController(showPreviewUseCase);

  // Comments WebviewView Setup
  const commentsWebviewProvider = new CommentsWebviewViewProvider(
    context,
    commentService,
    async (filePath?: string) => {
      await handleCommentChange(filePath);
    },
    viewBuilder,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CommentsWebviewViewProvider.viewType,
      commentsWebviewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
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
  const handleCommentChange = async (filePath?: string) => {
    const currentPath = filePath || previewPresenter.getCurrentFilePath();

    // Run preview refresh and tree view refresh
    if (currentPath) {
      await Promise.all([
        previewController.handle("beside", currentPath),
        refreshCommentsTreeView(),
      ]);

      // Also refresh visible editors to ensure gutter comments and decorations are up to date
      const uri = vscode.Uri.file(currentPath);
      const editors = vscode.window.visibleTextEditors.filter(
        (e) => e.document.uri.toString() === uri.toString(),
      );
      for (const editor of editors) {
        await commentController.refreshForEditor(editor, true);
      }
    } else {
      // Fallback: refresh tree view at least
      await refreshCommentsTreeView();
    }
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

  previewPresenter.onDidClickComment(async (threadId, commentId) => {
    // Reveal in Editor (may trigger Native Panel)
    await commentController.revealThread(threadId, undefined, false);

    // When clicking a thread in preview, select its specific comment in the table

    if (commentId) {
      commentsWebviewProvider.selectComment(threadId, commentId);
    } else {
      const threads = await commentService.getThreadsForFile(
        previewPresenter.getCurrentFilePath() || "",
        "",
      );
      const thread = threads.find((t) => t.id === threadId);
      if (thread && thread.comments.length > 0) {
        commentsWebviewProvider.selectComment(threadId, thread.comments[0].id);
      }
    }
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
      // Reveal in Editor but DON'T switch focus to native Comments panel
      await commentController.revealThread(threadId, filePath, false);
      // Explicitly bring focus back to our Table view
      await vscode.commands.executeCommand("markdown-comment.comments.focus");
    },
  );

  let showCommentTableDisposable = vscode.commands.registerCommand(
    "markdown-comment.showCommentTable",
    async () => {
      await vscode.commands.executeCommand("markdown-comment.comments.focus");
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
      }
    },
  );

  let selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection(
    async (e) => {
      if (e.textEditor.document.languageId === "markdown") {
        const offset = e.textEditor.document.offsetAt(e.selections[0].active);
        const thread = await commentService.getThreadAtOffset(
          e.textEditor.document.uri.fsPath,
          e.textEditor.document.getText(),
          offset,
        );
        if (thread && thread.comments.length > 0) {
          commentsWebviewProvider.selectComment(
            thread.id,
            thread.comments[0].id,
          );
        }
      }
    },
  );

  let configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
    async (e) => {
      if (e.affectsConfiguration("markdownComment.commentsTable")) {
        // Refresh table if columns or widths changed
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === "markdown") {
          await commentsWebviewProvider.refresh(
            editor.document.uri.fsPath,
            editor.document.getText(),
          );
        }
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
    selectionChangeDisposable,
    configChangeDisposable,
    revealCommentFromTreeDisposable,
    showCommentTableDisposable,

    vscode.commands.registerCommand(
      "markdown-comment.generateAIPrompt",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "markdown") {
          vscode.window.showErrorMessage("Please open a Markdown file.");
          return;
        }

        const filePath = editor.document.uri.fsPath;
        const content = editor.document.getText();
        const document = await documentRepository.getDocumentByPath(filePath);
        if (!document) {
          return;
        }

        const threads = await commentService.getThreadsForFile(
          filePath,
          content,
        );
        if (threads.length === 0) {
          vscode.window.showWarningMessage(
            "No comments found for this document.",
          );
          return;
        }

        const prompt = generateAIPromptUseCase.execute(document, threads);

        // Copy to clipboard
        await vscode.env.clipboard.writeText(prompt);
        vscode.window.showInformationMessage(
          "AI Prompt copied to clipboard! You can now paste it into your favorite AI tool.",
        );

        // Also show in an output channel or new editor
        const doc = await vscode.workspace.openTextDocument({
          content: prompt,
          language: "markdown",
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      },
    ),
  );
}

export function deactivate() {}
