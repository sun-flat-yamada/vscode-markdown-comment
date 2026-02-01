/**
 * Preview View Client Script
 */

declare const acquireVsCodeApi: any;
let vscodeApi: any;

interface InitialData {
  threads: any[];
  statusIcons: Record<string, string>;
}

(function () {
  // --- State & Initialization ---
  vscodeApi =
    typeof (window as any).vscode !== "undefined"
      ? (window as any).vscode
      : acquireVsCodeApi();

  const state = vscodeApi.getState() || { sidebarVisible: false };
  const mainContent = document.getElementById("main-content");
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggle-sidebar-btn");

  // --- Sidebar Toggle ---
  function updateSidebar() {
    if (state.sidebarVisible) {
      sidebar?.classList.remove("hidden");
    } else {
      sidebar?.classList.add("hidden");
    }
  }

  toggleBtn?.addEventListener("click", () => {
    state.sidebarVisible = !state.sidebarVisible;
    vscodeApi.setState(state);
    updateSidebar();
    vscodeApi.postMessage({
      type: "toggleSidebar",
      visible: state.sidebarVisible,
    });
  });

  // Initialize sidebar state
  updateSidebar();

  // Render initial comments if available
  const initialData = (window as any).initialData as InitialData;
  if (initialData && initialData.threads) {
    renderComments(initialData.threads);
  }

  // --- Message Handling ---
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "update-comments":
        renderComments(message.data);
        break;
      case "scroll-to-line":
        scrollToLine(message.line);
        break;
      case "reveal-comment":
        revealComment(message.commentId);
        break;
    }
  });

  // --- Comment Rendering ---
  function renderComments(comments: any[]) {
    const list = document.getElementById("comments-list");
    const commentTemplate = document.getElementById(
      "comment-item-template",
    ) as HTMLTemplateElement;
    const tagTemplate = document.getElementById(
      "comment-tag-template",
    ) as HTMLTemplateElement;

    if (!list || !commentTemplate) return;

    list.innerHTML = ""; // Clear existing

    comments.forEach((thread) => {
      thread.comments.forEach((c: any, index: number) => {
        const commentNode = document.importNode(commentTemplate.content, true);
        const item = commentNode.querySelector(".comment-item") as HTMLElement;

        item.setAttribute("data-id", thread.id);
        if (index > 0) item.classList.add("reply");

        const authorEl = commentNode.querySelector(".author") as HTMLElement;
        const dateEl = commentNode.querySelector(".date") as HTMLElement;
        const contentEl = commentNode.querySelector(
          ".comment-content",
        ) as HTMLElement;
        const tagsContainer = commentNode.querySelector(
          ".comment-tags",
        ) as HTMLElement;

        authorEl.textContent = c.author;
        dateEl.textContent = formatDate(new Date(c.createdAt));
        contentEl.textContent = c.content;

        if (c.tags && c.tags.length > 0) {
          tagsContainer.style.display = "flex";
          c.tags.forEach((t: string) => {
            const tagNode = document.importNode(tagTemplate.content, true);
            const tagSpan = tagNode.querySelector(".tag") as HTMLElement;
            tagSpan.textContent = t;
            tagsContainer.appendChild(tagNode);
          });
        }

        list.appendChild(commentNode);
      });
    });

    // Re-attach listeners
    list.querySelectorAll(".comment-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        if (id) {
          vscodeApi.postMessage({ type: "revealComment", threadId: id });
          highlightInContent(id);
        }
      });
    });
  }

  // --- Helper Functions ---
  function scrollToLine(line: number) {
    if (!mainContent) return;
    const lineElement = mainContent.querySelector(`[data-line="${line}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function revealComment(commentId: string) {
    highlightInContent(commentId);
  }

  function highlightInContent(threadId: string) {
    document
      .querySelectorAll(".comment-highlight")
      .forEach((el) => el.classList.remove("active"));
    const target = document.querySelector(
      `.comment-highlight[data-thread-id="${threadId}"]`,
    );
    if (target) {
      target.classList.add("active");
      target.classList.add("flash");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        target.classList.remove("flash");
      }, 1500);
    }
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  function escapeHtml(unsafe: string) {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Content Interaction ---
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      vscodeApi.postMessage({ type: "selection", text: text });
    }
  });

  mainContent?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const highlight = target.closest(".comment-highlight");
    if (highlight) {
      const id = highlight.getAttribute("data-thread-id");
      if (id) {
        vscodeApi.postMessage({ type: "revealComment", threadId: id });
        highlightInContent(id);
      }
    }
  });
})();
