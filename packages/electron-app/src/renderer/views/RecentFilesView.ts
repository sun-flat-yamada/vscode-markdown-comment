import { Component } from "../../infrastructure/ui/Component.js";

export class RecentFilesView extends Component {
  public onFileClick?: (filePath: string) => void;

  constructor() {
    super("recent-files");
  }

  public render(files: string[]): void {
    this.element.innerHTML = "";
    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "recent-file-item";
      item.innerText = file.split(/[\\/]/).pop() || "";
      item.title = file;
      item.onclick = () => {
        if (this.onFileClick) this.onFileClick(file);
      };
      this.element.appendChild(item);
    });
  }
}
