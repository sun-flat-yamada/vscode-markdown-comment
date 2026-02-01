import { BrowserWindow, app } from "electron";
import * as path from "path";
import * as fs from "fs/promises";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export class WindowManager {
  private window: BrowserWindow | null = null;
  private statePath: string;

  constructor() {
    this.statePath = path.join(app.getPath("userData"), "window-state.json");
  }

  async createWindow(): Promise<BrowserWindow> {
    const state = await this.loadState();

    this.window = new BrowserWindow({
      width: state.width,
      height: state.height,
      x: state.x,
      y: state.y,
      webPreferences: {
        preload: path.join(__dirname, "../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.on("close", () => {
      this.saveState();
    });

    await this.window.loadFile(path.join(__dirname, "../../index.html"));

    return this.window;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  private async loadState(): Promise<WindowState> {
    try {
      const data = await fs.readFile(this.statePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return { width: 1200, height: 800 };
    }
  }

  private async saveState(): Promise<void> {
    if (!this.window) return;
    const bounds = this.window.getBounds();
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    };
    try {
      await fs.writeFile(this.statePath, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save window state", e);
    }
  }
}
