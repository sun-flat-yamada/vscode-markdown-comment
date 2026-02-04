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
} from "@markdown-comment/core";
import { WindowManager } from "./main/WindowManager";
import { MenuManager } from "./main/MenuManager";
import { IpcHandler } from "./main/IpcHandler";
import { ElectronDocumentRepository } from "./infrastructure/ElectronDocumentRepository";
import { ElectronPreviewPresenter } from "./infrastructure/ElectronPreviewPresenter";

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

  const showPreviewUseCase = new ShowPreviewUseCase(
    docRepo,
    previewPresenter,
    commentService,
    viewBuilder,
  );

  const generateAIPromptUseCase = new GenerateAIPromptUseCase();

  // 3. Setup IPC (Before loading file)
  const ipcHandler = new IpcHandler(
    mainWindow,
    docRepo,
    showPreviewUseCase,
    generateAIPromptUseCase,
    commentService,
    windowManager,
  );
  ipcHandler.setup();

  // 4. Load the file AFTER everything is ready
  await windowManager.loadMainFile();

  const menuManager = new MenuManager(() => {
    mainWindow.webContents.send("trigger-open-file");
  });
  menuManager.setup();

  ipcHandler.onRecentFilesUpdated((files) => {
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
