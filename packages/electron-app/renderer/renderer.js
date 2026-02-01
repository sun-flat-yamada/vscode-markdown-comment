const openBtn = document.getElementById("open-btn");
const aiBtn = document.getElementById("ai-btn");
const refreshBtn = document.getElementById("refresh-btn");
const fileNameSpan = document.getElementById("file-name");
const previewFrame = document.getElementById("preview-frame");
const recentFilesDiv = document.getElementById("recent-files");
const printBtn = document.getElementById("print-btn");
const toggleCommentsBtn = document.getElementById("toggle-comments-btn");
const contextMenu = document.getElementById("context-menu");
const ctxAddComment = document.getElementById("ctx-add-comment");
const resizerV = document.getElementById("resizer-v");
const resizerH = document.getElementById("resizer-h");
const sidebar = document.getElementById("sidebar");
const togglePanelBtn = document.getElementById("toggle-panel-btn");

const aiOverlay = document.getElementById("ai-overlay");
const promptOutput = document.getElementById("prompt-output");
const closeModalBtn = document.getElementById("close-modal-btn");
const copyBtn = document.getElementById("copy-btn");

const recentFilesSection = document.getElementById("recent-files-section");
const commentsSection = document.getElementById("comments-section");
const commentsList = document.getElementById("comments-list");
const tabRecent = document.getElementById("tab-recent");
const tabComments = document.getElementById("tab-comments");

const bottomPanel = document.getElementById("bottom-panel");
const tableBody = document.getElementById("table-body");
const addCommentBtn = document.getElementById("add-comment-btn");
const addCommentOverlay = document.getElementById("add-comment-overlay");
const commentInput = document.getElementById("comment-input");
const saveCommentBtn = document.getElementById("save-comment-btn");
const cancelCommentBtn = document.getElementById("cancel-comment-btn");
const previewToolbar = document.getElementById("preview-toolbar");
const modalTitle = document.getElementById("modal-title");

// State
let currentFilePath = null;
let currentThreads = [];
let selectedThreadId = null;
let replyThreadId = null;
let lastSelectionText = "";
let previewSidebarVisible = false;
console.log("Renderer: Loaded");
if (window.api && window.api.log) {
  window.api.log("Renderer: Loaded via IPC");
}

// Global Message Handlers for Iframe (exposed to window.parent)
window.handleIframeMessage = (msg) => {
  console.log("Renderer: handleIframeMessage:", msg);
  if (msg.type === "revealComment") {
    syncSelection(msg.threadId, msg.commentId);
  } else if (msg.type === "selection") {
    // Note: preview.js sends raw text. We might want to trim if we care about empty selection.
    // Core IpcHandler checks for empty.
    lastSelectionText = msg.text;
    console.log("Renderer: updated lastSelectionText:", lastSelectionText);
  } else if (msg.type === "toggleSidebar") {
    previewSidebarVisible = msg.visible;
  }
};

window.getPreviewState = () => ({ sidebarVisible: previewSidebarVisible });
window.setPreviewState = (s) => {
  if (s && typeof s.sidebarVisible === "boolean") {
    previewSidebarVisible = s.sidebarVisible;
  }
};

// Initial state
window.api.getRecentFiles().then(updateRecentFilesList);

// Tab switching
tabRecent.onclick = () => {
  tabRecent.classList.add("active");
  tabComments.classList.remove("active");
  recentFilesSection.style.display = "block";
  commentsSection.style.display = "none";
};

tabComments.onclick = () => {
  tabComments.classList.add("active");
  tabRecent.classList.remove("active");
  recentFilesSection.style.display = "none";
  commentsSection.style.display = "block";
};

openBtn.onclick = async () => {
  const result = await window.api.openFile();
  if (result) {
    fileNameSpan.innerText = result.filePath;
    currentFilePath = result.filePath;
  }
};

refreshBtn.onclick = () => {
  refreshComments();
};

printBtn.onclick = () => {
  window.print();
};

toggleCommentsBtn.onclick = () => {
  const doc =
    previewFrame.contentDocument || previewFrame.contentWindow.document;
  const style =
    doc.getElementById("toggle-comments-style") || doc.createElement("style");
  style.id = "toggle-comments-style";
  if (style.parentElement) {
    style.remove();
  } else {
    style.textContent =
      ".comment-highlight { background-color: transparent !important; border-bottom: none !important; } .comment-highlight::before { display: none !important; }";
    doc.head.appendChild(style);
  }
};

togglePanelBtn.onclick = () => {
  if (bottomPanel.style.display === "none") {
    bottomPanel.style.display = "flex";
    togglePanelBtn.innerText = "×";
  } else {
    bottomPanel.style.display = "none";
    togglePanelBtn.innerText = "+";
  }
};

aiBtn.onclick = async () => {
  const prompt = await window.api.generateAiPrompt();
  if (prompt) {
    promptOutput.value = prompt;
    aiOverlay.style.display = "flex";
  }
};

closeModalBtn.onclick = () => {
  aiOverlay.style.display = "none";
};

copyBtn.onclick = () => {
  promptOutput.select();
  document.execCommand("copy");
  copyBtn.innerText = "Copied!";
  setTimeout(() => {
    copyBtn.innerText = "Copy to Clipboard";
  }, 2000);
};

// Comment Management
addCommentBtn.onclick = () => {
  console.log("Add Comment Clicked. Last Selection:", lastSelectionText);
  modalTitle.innerText = "Add Comment";
  replyThreadId = null;
  addCommentOverlay.style.display = "flex";
  commentInput.focus();
};

cancelCommentBtn.onclick = () => {
  addCommentOverlay.style.display = "none";
  commentInput.value = "";
};

saveCommentBtn.onclick = async () => {
  const content = commentInput.value.trim();
  if (!content || !currentFilePath) return;

  try {
    if (replyThreadId) {
      await window.api.addReply({
        filePath: currentFilePath,
        threadId: replyThreadId,
        content: content,
        author: "User",
      });
    } else {
      console.log("Renderer: Calling addComment IPC with:", {
        filePath: currentFilePath,
        selectedText: lastSelectionText,
        content: content,
      });
      const result = await window.api.addComment({
        filePath: currentFilePath,
        content: content,
        offset: 0,
        length: 0,
        selectedText: lastSelectionText,
        author: "User",
      });
      console.log("Renderer: addComment IPC returned:", result);
    }

    addCommentOverlay.style.display = "none";
    commentInput.value = "";
    refreshComments();
  } catch (err) {
    console.error("Renderer: addComment IPC error:", err);
  }
};

async function refreshComments() {
  if (currentFilePath) {
    const threads = await window.api.getThreads(currentFilePath);
    currentThreads = threads;
    renderCommentsList(threads);
    renderCommentTable(threads);
  }
}

window.api.onUpdatePreview((data) => {
  const doc =
    previewFrame.contentDocument || previewFrame.contentWindow.document;

  // Extract nonce if present (to pass Content Security Policy)
  const nonceMatch = data.html.match(/nonce="([^"]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : "";
  console.log("Renderer: Computed Nonce:", nonce);
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";

  // Inject mock script to ensure acquireVsCodeApi is available before preview.js runs
  const mockScript = `
    <script${nonceAttr}>
      window.acquireVsCodeApi = () => ({
        postMessage: (msg) => {
          if (window.parent && window.parent.handleIframeMessage) {
            window.parent.handleIframeMessage(msg);
          }
        },
        getState: () => {
           if (window.parent && window.parent.getPreviewState) {
             return window.parent.getPreviewState();
           }
           return { sidebarVisible: true };
        },
        setState: (s) => {
           if (window.parent && window.parent.setPreviewState) {
             window.parent.setPreviewState(s);
           }
        }
      });
    </script>
  `;
  const htmlWithMock = data.html.replace("<head>", "<head>" + mockScript);

  doc.open();
  doc.write(htmlWithMock);
  doc.close();

  // [Fix Bug 2] Hide internal sidebar and toggle button in Electron app as we have the external one
  const style = doc.createElement("style");
  style.textContent =
    "#sidebar { display: none !important; } #toggle-sidebar-btn { display: none !important; } #toolbar { display: none !important; } #main-content { width: 100% !important; padding-right: 20px !important; }";
  doc.head.appendChild(style);

  // Note: acquireVsCodeApi is now injected via script tag in data.html

  fileNameSpan.innerText = data.filePath;
  currentFilePath = data.filePath;
  previewToolbar.style.display = "flex";

  if (data.threads) {
    currentThreads = data.threads;
    renderCommentsList(data.threads);
    renderCommentTable(data.threads);
  }

  // Setup Iframe Context Menu
  previewFrame.contentWindow.oncontextmenu = (e) => {
    e.preventDefault();
    const rect = previewFrame.getBoundingClientRect();
    contextMenu.style.left = `${rect.left + e.clientX}px`;
    contextMenu.style.top = `${rect.top + e.clientY}px`;
    contextMenu.style.display = "block";
  };
});

window.onclick = () => {
  contextMenu.style.display = "none";
};

ctxAddComment.onclick = () => {
  addCommentBtn.click();
};

// Resizer Logic
let isResizingV = false;
let isResizingH = false;

resizerV.onmousedown = (e) => {
  isResizingV = true;
  document.body.classList.add("resizing-v");
};

resizerH.onmousedown = (e) => {
  isResizingH = true;
  document.body.classList.add("resizing-h");
};

window.onmousemove = (e) => {
  if (isResizingV) {
    const sidebarWidth = e.clientX;
    if (sidebarWidth > 50 && sidebarWidth < 600) {
      sidebar.style.width = `${sidebarWidth}px`;
      resizerV.style.left = `${sidebarWidth}px`;
    }
  }
  if (isResizingH) {
    const panelHeight = window.innerHeight - e.clientY;
    if (panelHeight > 50 && panelHeight < window.innerHeight - 100) {
      bottomPanel.style.height = `${panelHeight}px`;
    }
  }
};

window.onmouseup = () => {
  isResizingV = false;
  isResizingH = false;
  document.body.classList.remove("resizing-v", "resizing-h");
};

window.api.onTriggerOpenFile(() => {
  openBtn.click();
});

window.api.onUpdateRecentFiles((files) => {
  updateRecentFilesList(files);
});

function updateRecentFilesList(files) {
  recentFilesDiv.innerHTML = "";
  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "recent-file-item";
    item.innerText = file.split(/[\\/]/).pop();
    item.title = file;
    item.onclick = () => window.api.openFileSpecific(file);
    recentFilesDiv.appendChild(item);
  });
}

function renderCommentsList(threads) {
  commentsList.innerHTML = "";
  if (threads.length === 0) {
    commentsList.innerHTML =
      '<div class="empty-state">No comments in this file.</div>';
    return;
  }

  threads.forEach((thread) => {
    const threadDiv = document.createElement("div");
    threadDiv.className = "comment-thread-item";
    threadDiv.setAttribute("data-thread-id", thread.id);
    const comment = thread.comments[0]; // Header comment

    threadDiv.innerHTML = `
      <div class="comment-author">${comment.author || "User"}</div>
      <div class="comment-content">${comment.content}</div>
      <div class="comment-meta">Line: ${thread.anchor ? "..." : "N/A"}</div>
    `;
    threadDiv.onclick = () => {
      syncSelection(thread.id, comment.id);
    };
    commentsList.appendChild(threadDiv);
  });
}

function renderCommentTable(threads) {
  tableBody.innerHTML = "";
  threads.forEach((thread) => {
    thread.comments.forEach((comment, index) => {
      const row = document.createElement("tr");
      row.className = index === 0 ? "thread-row" : "reply-row";
      row.setAttribute("data-thread-id", thread.id);
      row.setAttribute("data-comment-id", comment.id);

      const statusHtml = comment.status
        ? `
        <select class="status-select status-${comment.status}" onchange="rendererUpdateStatus('${thread.id}', '${comment.id}', this.value)">
          <option value="todo" ${comment.status === "todo" ? "selected" : ""}>TODO</option>
          <option value="in_progress" ${comment.status === "in_progress" ? "selected" : ""}>Doing</option>
          <option value="done" ${comment.status === "done" ? "selected" : ""}>Done</option>
        </select>
      `
        : "-";

      row.innerHTML = `
        <td>${statusHtml}</td>
        <td>${comment.author || "User"}</td>
        <td class="tag-cell">${(comment.tags || []).join(", ") || "-"}</td>
        <td class="content-cell">${comment.content}</td>
        <td class="actions-cell">
          <button class="icon-btn reply-btn" onclick="rendererReply('${thread.id}')" title="Reply">💬</button>
          <button class="icon-btn tag-btn" title="Edit Tags">🏷️</button>
          <button class="icon-btn delete-btn" onclick="rendererDeleteComment('${thread.id}', '${comment.id}')" title="Delete">🗑️</button>
        </td>
      `;

      // Attach tag edit handler
      row.querySelector(".tag-btn").onclick = (e) => {
        e.stopPropagation();
        rendererEditTags(thread.id, comment.id, comment.tags || []);
      };

      row.querySelector(".tag-cell").onclick = (e) => {
        e.stopPropagation();
        rendererEditTags(thread.id, comment.id, comment.tags || []);
      };

      row.onclick = (e) => {
        if (!e.target.closest("select") && !e.target.closest("button")) {
          syncSelection(thread.id, comment.id);
        }
      };

      tableBody.appendChild(row);
    });
  });
}

// Global helpers for inline onclicks
window.rendererReply = (threadId) => {
  modalTitle.innerText = "Reply to Comment";
  replyThreadId = threadId;
  addCommentOverlay.style.display = "flex";
  commentInput.focus();
};

window.rendererEditTags = async (threadId, commentId, currentTags) => {
  const newTagsStr = prompt(
    "Enter tags (comma separated):",
    currentTags.join(", "),
  );
  if (newTagsStr !== null) {
    const tags = newTagsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    // Note: We need a core method for this if it doesn't exist, but for now we'll mock it or see if commentService supports it
    // Implementation-wise, we might need a new IPC handler for tags if commentService.updateComment doesn't handle tags
    // Let's assume we can pass it to updateComment for now or needs a new API.
    // In this repo, tags are usually part of the comment object.
    await window.api.updateComment({
      filePath: currentFilePath,
      threadId,
      commentId,
      tags: tags,
    });
    refreshComments();
  }
};

window.rendererUpdateStatus = async (threadId, commentId, status) => {
  await window.api.updateStatus({
    filePath: currentFilePath,
    threadId,
    commentId,
    status,
  });
  refreshComments();
};

window.rendererDeleteComment = async (threadId, commentId) => {
  if (confirm("Are you sure you want to delete this comment?")) {
    await window.api.deleteComment({
      threadId,
      commentId,
      filePath: currentFilePath,
    });
    refreshComments();
  }
};

function syncSelection(threadId, commentId) {
  selectedThreadId = threadId;
  highlightInContent(threadId);
  selectCommentInSidebar(threadId);
  selectCommentInTable(threadId, commentId);
}

function highlightInContent(id) {
  const doc =
    previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!doc) return;
  const highlights = doc.querySelectorAll(".comment-highlight");
  highlights.forEach((h) => h.classList.remove("active"));
  const target = doc.querySelector(
    `.comment-highlight[data-thread-id="${id}"]`,
  );
  if (target) {
    target.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // [Fix Bug 4] Trigger flash effect via message to iframe
    if (previewFrame.contentWindow) {
      previewFrame.contentWindow.postMessage(
        {
          command: "reveal-comment",
          commentId: id,
        },
        "*",
      );
    }
  }
}

function selectCommentInSidebar(id) {
  const items = commentsList.querySelectorAll(".comment-thread-item");
  items.forEach((item) => {
    if (item.getAttribute("data-thread-id") === id) {
      item.classList.add("active");
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      item.classList.remove("active");
    }
  });
}

function selectCommentInTable(threadId, commentId) {
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    if (
      row.getAttribute("data-thread-id") === threadId &&
      (!commentId || row.getAttribute("data-comment-id") === commentId)
    ) {
      row.classList.add("selected");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      row.classList.remove("selected");
    }
  });
}
