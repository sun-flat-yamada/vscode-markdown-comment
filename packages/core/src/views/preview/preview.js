/**
 * Preview View Client Script (Pure JS)
 */

(function () {
  // --- State & Initialization ---
  // @ts-ignore
  const vscodeApi = typeof vscode !== "undefined" ? vscode : acquireVsCodeApi();

  // @ts-ignore
  const state = vscodeApi.getState() || { sidebarVisible: true };
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
  });

  // Initialize sidebar state
  updateSidebar();

  // Render initial comments if available
  const initialData = window.initialData;
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

  // --- Comment Rendering (Simplified) ---
  function renderComments(comments) {
    const list = document.getElementById("comments-list");
    if (!list) return;

    list.innerHTML = comments
      .map((thread) => {
        const c = thread.comments[0];
        if (!c) return "";

        return `
            <div class="comment-item" data-id="${thread.id}">
                <div class="comment-header">
                    <span class="author">${escapeHtml(c.author)}</span>
                    <span class="date">${new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="comment-body">
                    ${escapeHtml(c.content)}
                </div>
            </div>
            `;
      })
      .join("");

    // Re-attach listeners
    list.querySelectorAll(".comment-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        if (id) {
          // Find the first comment's ID for this thread in the data
          const thread = comments.find((t) => t.id === id);
          const commentId =
            thread && thread.comments[0] ? thread.comments[0].id : "";
          vscodeApi.postMessage({
            type: "revealComment",
            threadId: id,
            commentId,
          });
          highlightInContent(id);
        }
      });
    });
  }

  // --- Helper Functions ---
  function scrollToLine(line) {
    if (!mainContent) return;
    const lineElement = mainContent.querySelector(`[data-line="${line}"]`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function revealComment(commentId) {
    highlightInContent(commentId);
  }

  function highlightInContent(threadId) {
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

  function escapeHtml(unsafe) {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Content Interaction ---
  mainContent?.addEventListener("click", (e) => {
    const target = e.target;
    const highlight = target.closest(".comment-highlight");
    if (highlight) {
      const id = highlight.getAttribute("data-thread-id");
      if (id) {
        // For content clicks, we don't necessarily have a specific commentId,
        // so we let the receiver find the first one.
        vscodeApi.postMessage({ type: "revealComment", threadId: id });
        highlightInContent(id);
      }
    }
  });

  // Track selection for "Add Comment" feature
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      vscodeApi.postMessage({ type: "selection", text: text });
    }
  });
})();
