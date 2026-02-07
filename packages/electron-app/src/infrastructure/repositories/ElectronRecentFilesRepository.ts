import { app } from "electron";
import * as path from "path";
import * as fs from "fs/promises";

export class ElectronRecentFilesRepository {
  private recentFilesPath: string;
  private recentFilesCallback?: (files: string[]) => void;

  constructor() {
    this.recentFilesPath = path.join(
      app.getPath("userData"),
      "recent-files.json",
    );
  }

  public onRecentFilesUpdated(callback: (files: string[]) => void): void {
    this.recentFilesCallback = callback;
    // Trigger initial load
    this.load().then((files) => callback(files));
  }

  public async load(): Promise<string[]> {
    try {
      const data = await fs.readFile(this.recentFilesPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public async add(filePath: string): Promise<void> {
    const files = await this.load();
    const filtered = [filePath, ...files.filter((f) => f !== filePath)].slice(
      0,
      10,
    );
    await fs.writeFile(this.recentFilesPath, JSON.stringify(filtered));

    if (this.recentFilesCallback) {
      this.recentFilesCallback(filtered);
    }
  }
}
