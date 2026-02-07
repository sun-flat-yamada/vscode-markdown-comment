import { Component } from "../../infrastructure/ui/Component.js";

export class ThreadListView extends Component {
  public onCommentClick?: (threadId: string, commentId: string) => void;

  constructor() {
    super("comments-list");
  }

  public render(threads: any[]): void {
    this.element.innerHTML = "";
    if (threads.length === 0) {
      this.element.innerHTML =
        '<div class="empty-state">No comments in this file.</div>';
      return;
    }

    threads.forEach((thread) => {
      const threadDiv = document.createElement("div");
      threadDiv.className = "comment-thread-item";
      threadDiv.setAttribute("data-thread-id", thread.id);
      const comment = thread.comments[0];

      threadDiv.innerHTML = `
        <div class="comment-author">${comment.author || "User"}</div>
        <div class="comment-content">${comment.content}</div>
        <div class="comment-meta">Line: ${thread.anchor ? "..." : "N/A"}</div>
      `;
      threadDiv.onclick = () => {
        if (this.onCommentClick) {
          this.onCommentClick(thread.id, comment.id);
        }
      };
      this.element.appendChild(threadDiv);
    });
  }
}
