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
  const windowManager = new WindowManager();
  const docRepo = new ElectronDocumentRepository();

  await app.whenReady();

  const mainWindow = await windowManager.createWindow();

  // Core services setup
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

  // IPC and Menu setup
  const ipcHandler = new IpcHandler(
    mainWindow,
    docRepo,
    showPreviewUseCase,
    generateAIPromptUseCase,
    commentService,
  );
  ipcHandler.setup();

  const menuManager = new MenuManager(() => {
    mainWindow.webContents.send("trigger-open-file");
  });
  menuManager.setup();

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
