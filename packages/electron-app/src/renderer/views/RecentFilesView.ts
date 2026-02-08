import { Component } from "../../infrastructure/ui/Component.js";

export class RecentFilesView extends Component {
  public onFileClick?: (filePath: string) => void;

  constructor() {
    super("recent-files");
  }

  public render(files: string[]): void {
    this.element.innerHTML = "";
    // Remove duplicates to prevent ID collisions and redundant entries
    const uniqueFiles = [...new Set(files)];

    uniqueFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "recent-file-item";
      item.id = `recent-file-${index}`;
      item.innerText = file.split(/[\\/]/).pop() || "";
      item.title = file;

      item.addEventListener("click", () => {
        if (this.onFileClick) {
          this.onFileClick(file);
        }
      });

      this.element.appendChild(item);
    });
  }
}
