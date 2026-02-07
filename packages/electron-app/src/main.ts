/**
 * @file main.ts
 * @description Electron Mainプロセスのエントリーポイント。
 * アプリケーションのライフサイクル管理、サービスの初期化、ウィンドウ生成を行う。
 *
 * 【責務】
 * - アプリケーションの起動と終了の制御。
 * - 各種サービス（ドキュメントリポジトリ、コメントサービスなど）の依存性注入と初期化。
 * - IPCハンドラーとメニューマネージャーのセットアップ。
 *
 * 【実現メカニズム】
 * - `app.whenReady()` を待機してから初期化フローを開始。
 * - Clean Architectureに基づき、ドメイン層のユースケースにインフラ層の実装をDIする。
 */
import { app } from "electron";
import * as path from "path";
import {
  ShowPreviewUseCase,
  CommentService,
  AnchoringService,
  FileSystemCommentRepository,
  FileSystemViewResourceProvider,
  ViewBuilder,
  GenerateAIPromptUseCase,
  AnnotationService,
} from "@markdown-comment/core";
import { WindowManager } from "./main/WindowManager";
import { MenuManager } from "./main/MenuManager";
import { IpcHandler } from "./main/IpcHandler";
import { ElectronDocumentRepository } from "./infrastructure/ElectronDocumentRepository";
import { ElectronPreviewPresenter } from "./infrastructure/ElectronPreviewPresenter";
import { ElectronRecentFilesRepository } from "./infrastructure/repositories/ElectronRecentFilesRepository";
import { TextSearchService } from "./domain/services/TextSearchService";

/**
 * メインプロセスの初期化エントリーポイント。
 * 必要なサービスとコンポーネントを順序立てて初期化・接続する。
 */
async function main() {
  console.log("Main process: Starting...");
  const docRepo = new ElectronDocumentRepository();
  const windowManager = new WindowManager();

  await app.whenReady();

  // 1. Create Window (but don't load file yet)
  const mainWindow = await windowManager.createWindow();

  // 2. Setup Services
  const previewPresenter = new ElectronPreviewPresenter(mainWindow);
  const commentRepository = new FileSystemCommentRepository();
  const anchoringService = new AnchoringService();
  const commentService = new CommentService(
    commentRepository,
    anchoringService,
  );

  const viewsPath = path.resolve(__dirname, "../../core/dist/views");
  const viewResourceProvider = new FileSystemViewResourceProvider(viewsPath);
  const viewBuilder = new ViewBuilder(viewResourceProvider);

  // Refactoring: New Services
  const recentFilesRepo = new ElectronRecentFilesRepository();
  const textSearchService = new TextSearchService();
  const annotationService = new AnnotationService();

  // 3. Setup IPC (Before loading file)
  const showPreviewUseCase = new ShowPreviewUseCase(
    docRepo,
    previewPresenter,
    commentService,
    viewBuilder,
    annotationService,
  );

  const generateAIPromptUseCase = new GenerateAIPromptUseCase();

  const ipcHandler = new IpcHandler(
    mainWindow,
    docRepo,
    showPreviewUseCase,
    generateAIPromptUseCase,
    commentService,
    windowManager,
    recentFilesRepo,
    textSearchService,
  );
  ipcHandler.setup();

  // 4. Load the file AFTER everything is ready
  await windowManager.loadMainFile();

  const menuManager = new MenuManager(() => {
    mainWindow.webContents.send("trigger-open-file");
  });
  menuManager.setup();

  recentFilesRepo.onRecentFilesUpdated((files) => {
    menuManager.refreshRecentFiles(files, (file) => {
      ipcHandler.openFile(file);
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

main().catch((err) => {
  console.error("Startup error:", err);
  app.quit();
});
