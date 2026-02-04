export {};

// Declare global window.api
declare global {
  interface Window {
    api: any;
    handleIframeMessage: (msg: any) => void;
    getPreviewState: () => any;
    setPreviewState: (s: any) => void;
    rendererReply: (id: string) => void;
    rendererEditTags: (tid: string, cid: string, tags: string[]) => void;
    rendererUpdateStatus: (tid: string, cid: string, status: string) => void;
    rendererDeleteComment: (tid: string, cid: string) => void;
  }
}

const openBtn = document.getElementById("open-btn") as HTMLButtonElement;
const aiBtn = document.getElementById("ai-btn") as HTMLButtonElement;
const refreshBtn = document.getElementById("refresh-btn") as HTMLButtonElement;
const fileNameSpan = document.getElementById("file-name") as HTMLDivElement;
const previewFrame = document.getElementById(
  "preview-frame",
) as HTMLIFrameElement;
const recentFilesDiv = document.getElementById(
  "recent-files",
) as HTMLDivElement;
const printBtn = document.getElementById("print-btn") as HTMLButtonElement;
const toggleCommentsBtn = document.getElementById(
  "toggle-comments-btn",
) as HTMLButtonElement;
const themeSelect = document.getElementById(
  "theme-select",
) as HTMLSelectElement;
const resizerV = document.getElementById("resizer-v") as HTMLDivElement;
const resizerH = document.getElementById("resizer-h") as HTMLDivElement;
const sidebar = document.getElementById("sidebar") as HTMLDivElement;
const togglePanelBtn = document.getElementById(
  "toggle-panel-btn",
) as HTMLButtonElement;

const aiOverlay = document.getElementById("ai-overlay") as HTMLDivElement;
const promptOutput = document.getElementById(
  "prompt-output",
) as HTMLTextAreaElement;
const closeModalBtn = document.getElementById(
  "close-modal-btn",
) as HTMLButtonElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;

const recentFilesSection = document.getElementById(
  "recent-files-section",
) as HTMLDivElement;
const commentsSection = document.getElementById(
  "comments-section",
) as HTMLDivElement;
const commentsList = document.getElementById("comments-list") as HTMLDivElement;
const tabRecent = document.getElementById("tab-recent") as HTMLButtonElement;
const tabComments = document.getElementById(
  "tab-comments",
) as HTMLButtonElement;

const bottomPanel = document.getElementById("bottom-panel") as HTMLDivElement;
const tableBody = document.getElementById(
  "table-body",
) as HTMLTableSectionElement;
const tableHead = document.querySelector(
  "#comment-table thead",
) as HTMLTableSectionElement;
const addCommentBtn = document.getElementById(
  "add-comment-btn",
) as HTMLButtonElement;
const addCommentOverlay = document.getElementById(
  "add-comment-overlay",
) as HTMLDivElement;
const commentInput = document.getElementById(
  "comment-input",
) as HTMLTextAreaElement;
const saveCommentBtn = document.getElementById(
  "save-comment-btn",
) as HTMLButtonElement;
const cancelCommentBtn = document.getElementById(
  "cancel-comment-btn",
) as HTMLButtonElement;
const previewToolbar = document.getElementById(
  "preview-toolbar",
) as HTMLDivElement;
const modalTitle = document.getElementById("modal-title") as HTMLHeadingElement;

// Tag Edit Modal
const editTagsOverlay = document.getElementById(
  "edit-tags-overlay",
) as HTMLDivElement;
const tagsFilterInput = document.getElementById(
  "tags-filter-input",
) as HTMLInputElement;
const tagsList = document.getElementById("tags-list") as HTMLDivElement;
const saveTagsBtn = document.getElementById(
  "save-tags-btn",
) as HTMLButtonElement;
const cancelTagsBtn = document.getElementById(
  "cancel-tags-btn",
) as HTMLButtonElement;

// State
let currentFilePath: string | null = null;
let currentThreads: any[] = [];
let selectedThreadId: string | null = null;
let replyThreadId: string | null = null;
let lastSelectionText: string = "";
let lastSelectionContext: { before: string; after: string } | null = null;
let previewSidebarVisible: boolean = false;

// Tag Edit State
let editTagsThreadId: string | null = null;
let editTagsCommentId: string | null = null;
let editTagsSelectedTags: Set<string> = new Set();
let editTagsAvailableTags: string[] = [];
let currentTheme: string = localStorage.getItem("theme") || "system";

// Table State
interface Column {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
}

let columns: Column[] = [
  { id: "status", label: "Status", width: 80, minWidth: 60, sortable: true },
  { id: "author", label: "Author", width: 100, minWidth: 80, sortable: true },
  { id: "tags", label: "Tags", width: 120, minWidth: 100, sortable: false },
  {
    id: "content",
    label: "Content",
    width: 300,
    minWidth: 150,
    sortable: true,
  },
  {
    id: "actions",
    label: "Actions",
    width: 100,
    minWidth: 80,
    sortable: false,
  },
];

let sortState = { columnId: "", direction: "asc" as "asc" | "desc" };
let dragSrcColumnId: string | null = null;

console.log("Renderer: Loaded (TS Mode)");

// Theme Initialization
applyTheme(currentTheme);
if (themeSelect) {
  themeSelect.value = currentTheme;
}

// Global Message Handlers for Iframe (exposed to window.parent)
window.handleIframeMessage = (msg: any) => {
  console.log("Renderer: handleIframeMessage:", msg);
  if (msg.type === "revealComment") {
    syncSelection(msg.threadId, msg.commentId);
  } else if (msg.type === "selection") {
    lastSelectionText = msg.text;
    lastSelectionContext = {
      before: msg.contextBefore || "",
      after: msg.contextAfter || "",
    };
  } else if (msg.type === "toggleSidebar") {
    previewSidebarVisible = msg.visible;
  } else {
    switch (msg.type) {
      case "openExternal":
        if (msg.url) {
          window.api.log("Opening external URL: " + msg.url);
          console.log("Opening external URL: " + msg.url); // For tests
          window.api.openExternal(msg.url);
        }
        break;
      case "contextMenu":
        window.api.showContextMenu();
        break;
    }
  }
};

window.addEventListener("message", (event) => {
  if (event.data) {
    console.log("Renderer: Received message from iframe:", event.data.type);
    window.handleIframeMessage(event.data);
  }
});

window.getPreviewState = () => ({ sidebarVisible: previewSidebarVisible });
window.setPreviewState = (s: any) => {
  if (s && typeof s.sidebarVisible === "boolean") {
    previewSidebarVisible = s.sidebarVisible;
  }
};

// Theme Handling Functions
function applyTheme(theme: string) {
  document.documentElement.classList.remove("dark-mode", "theme-system");
  if (theme === "dark") {
    document.documentElement.classList.add("dark-mode");
  } else if (theme === "system") {
    document.documentElement.classList.add("theme-system");
  }

  // Delay a bit for CSS calculation
  requestAnimationFrame(() => {
    injectThemeToIframe();
  });
}

function injectThemeToIframe() {
  if (!previewFrame || !previewFrame.contentWindow) return;
  const frameDoc = previewFrame.contentWindow.document;
  if (!frameDoc || !frameDoc.head) return;

  // Remove existing injected theme style if any
  const existing = frameDoc.getElementById("injected-theme-style");
  if (existing) existing.remove();

  const styleEl = frameDoc.createElement("style");
  styleEl.id = "injected-theme-style";

  // Force reflow and get styles
  const rootStyles = getComputedStyle(document.documentElement);
  const bg =
    rootStyles.getPropertyValue("--vscode-bg-color").trim() || "#ffffff";
  const txt =
    rootStyles.getPropertyValue("--vscode-text-color").trim() || "#333333";
  const border =
    rootStyles.getPropertyValue("--vscode-border-color").trim() || "#e5e5e5";
  const accent =
    rootStyles.getPropertyValue("--vscode-accent-color").trim() || "#007acc";
  const sidebarBg =
    rootStyles.getPropertyValue("--vscode-sidebar-bg").trim() || "#f3f3f3";

  console.log("Renderer: Injecting theme to iframe:", {
    currentTheme,
    bg,
    txt,
  });

  styleEl.textContent = `
    :root {
      --vscode-editor-background: ${bg};
      --vscode-editor-foreground: ${txt};
      --vscode-widget-border: ${border};
      --vscode-focusBorder: ${accent};
      --vscode-sideBar-background: ${sidebarBg};
      --vscode-button-background: ${accent};
      --vscode-button-foreground: #ffffff;
      --vscode-sideBarSectionHeader-background: ${sidebarBg};
      --vscode-sideBarSectionHeader-foreground: ${txt};
      --vscode-badge-background: ${accent};
      --vscode-badge-foreground: #ffffff;
    }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      overflow-y: auto !important; /* Ensure iframe itself is scrollable */
    }
    body {
      background-color: var(--vscode-editor-background) !important;
      color: var(--vscode-editor-foreground) !important;
    }
    #sidebar { display: none !important; }
    #toggle-sidebar-btn { display: none !important; }
    #toolbar { display: none !important; }
    #main-content {
      width: 100% !important;
      max-width: 100% !important;
      padding: 20px 40px !important;
      background-color: transparent !important;
      color: inherit !important;
      box-sizing: border-box;
      overflow: visible !important; /* Let body handle scrolling */
      min-height: 100%;
    }
    /* Fix toggle comments effect */
    .comment-highlight.toggled-off {
      background-color: transparent !important;
      border-bottom: none !important;
      color: inherit !important;
    }
    .comment-highlight.toggled-off::before {
      display: none !important;
    }
  `;
  frameDoc.head.appendChild(styleEl);

  // Sync theme classes
  frameDoc.documentElement.classList.remove("dark-mode", "theme-system");
  if (currentTheme === "dark")
    frameDoc.documentElement.classList.add("dark-mode");
  if (currentTheme === "system")
    frameDoc.documentElement.classList.add("theme-system");
}

if (themeSelect) {
  themeSelect.onchange = (e: any) => {
    currentTheme = e.target.value;
    localStorage.setItem("theme", currentTheme);
    applyTheme(currentTheme);
  };
}

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (currentTheme === "system") {
      applyTheme("system");
    }
  });

// Initial state
setTimeout(() => {
  console.log("Renderer: Calling getRecentFiles after delay");
  if (window.api && window.api.getRecentFiles) {
    window.api.getRecentFiles().then(updateRecentFilesList);
  }
}, 500);

window.api.getWindowState().then((state: any) => {
  if (sidebar && state.sidebarWidth) {
    const w = Math.max(150, Math.min(600, state.sidebarWidth));
    sidebar.style.width = `${w}px`;
    resizerV.style.left = `${w}px`;
  }
  if (bottomPanel && state.panelHeight) {
    const h = Math.max(
      100,
      Math.min(window.innerHeight - 200, state.panelHeight),
    );
    bottomPanel.style.height = `${h}px`;
  }
  // Initialize table header
  renderTableHeader();
});

// Tab switching
if (tabRecent) {
  tabRecent.onclick = () => {
    tabRecent.classList.add("active");
    tabComments.classList.remove("active");
    recentFilesSection.style.display = "block";
    commentsSection.style.display = "none";
  };
}

if (tabComments) {
  tabComments.onclick = () => {
    tabComments.classList.add("active");
    tabRecent.classList.remove("active");
    recentFilesSection.style.display = "none";
    commentsSection.style.display = "block";
  };
}

if (openBtn) {
  openBtn.onclick = async () => {
    const result = await window.api.openFile();
    if (result) {
      updateCurrentFile(result.filePath);
    }
  };
}

function updateCurrentFile(filePath: string) {
  currentFilePath = filePath;
  const fileName = filePath.split(/[\\/]/).pop() || "";
  if (fileNameSpan) {
    fileNameSpan.innerText = filePath;
    fileNameSpan.title = filePath; // Tooltip for full path
  }
  // Keep tab-recent text as "FILES" instead of changing to filename
  if (tabRecent) {
    tabRecent.innerText = "FILES";
  }
}

if (refreshBtn) {
  refreshBtn.onclick = () => {
    refreshComments();
  };
}

if (printBtn) {
  printBtn.onclick = () => {
    // Attempt system print
    if (previewFrame && previewFrame.contentWindow) {
      previewFrame.contentWindow.focus();
      previewFrame.contentWindow.print();
    } else {
      window.print();
    }
  };
}

if (toggleCommentsBtn) {
  toggleCommentsBtn.onclick = () => {
    const doc =
      previewFrame.contentDocument || previewFrame.contentWindow!.document;
    const highlights = doc.querySelectorAll(".comment-highlight");
    const isOff = highlights[0]?.classList.contains("toggled-off");

    highlights.forEach((h) => {
      if (isOff) {
        h.classList.remove("toggled-off");
      } else {
        h.classList.add("toggled-off");
      }
    });
  };
}

if (togglePanelBtn) {
  togglePanelBtn.onclick = () => {
    if (bottomPanel.classList.contains("collapsed")) {
      bottomPanel.classList.remove("collapsed");
      togglePanelBtn.innerText = "×";
    } else {
      bottomPanel.classList.add("collapsed");
      togglePanelBtn.innerText = "+";
    }
  };
}

if (aiBtn) {
  aiBtn.onclick = async () => {
    const prompt = await window.api.generateAiPrompt();
    if (prompt) {
      promptOutput.value = prompt;
      aiOverlay.style.display = "flex";
    }
  };
}

if (closeModalBtn) {
  closeModalBtn.onclick = () => {
    aiOverlay.style.display = "none";
  };
}

if (copyBtn) {
  copyBtn.onclick = () => {
    promptOutput.select();
    document.execCommand("copy");
    copyBtn.innerText = "Copied!";
    setTimeout(() => {
      copyBtn.innerText = "Copy to Clipboard";
    }, 2000);
  };
}

// Comment Management
if (addCommentBtn) {
  addCommentBtn.onclick = () => {
    console.log("Add Comment Clicked. Last Selection:", lastSelectionText);
    if (modalTitle) modalTitle.innerText = "Add Comment";
    replyThreadId = null;
    if (addCommentOverlay) addCommentOverlay.style.display = "flex";
    if (commentInput) commentInput.focus();
  };
}

if (cancelCommentBtn) {
  cancelCommentBtn.onclick = () => {
    if (addCommentOverlay) addCommentOverlay.style.display = "none";
    if (commentInput) commentInput.value = "";
  };
}

if (saveCommentBtn) {
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
        await window.api.addComment({
          filePath: currentFilePath,
          content: content,
          offset: 0,
          length: 0,
          selectedText: lastSelectionText,
          contextBefore: lastSelectionContext?.before,
          contextAfter: lastSelectionContext?.after,
          author: "User",
        });
      }

      if (addCommentOverlay) addCommentOverlay.style.display = "none";
      if (commentInput) commentInput.value = "";
      refreshComments();
    } catch (err) {
      console.error("Renderer: addComment IPC error:", err);
    }
  };
}

async function refreshComments() {
  if (currentFilePath) {
    const threads = await window.api.getThreads(currentFilePath);
    currentThreads = threads;
    renderCommentsList(threads);
    renderCommentTable(threads);
  }
}

window.api.onUpdatePreview((data: any) => {
  const doc =
    previewFrame.contentDocument || previewFrame.contentWindow!.document;

  // Fix CSP to allow 'unsafe-inline' for our mock script
  const htmlContent = data.html
    .replace("'nonce-", "'unsafe-inline' 'nonce-")
    .replace("default-src 'none'", "default-src 'self'");

  const nonceMatch = htmlContent.match(/nonce="([^"]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : "";
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";

  const mockScript = `
    <script${nonceAttr}>
      window.acquireVsCodeApi = () => ({
        postMessage: (message) => {
          window.parent.postMessage(message, "*");
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
  const htmlWithMock = htmlContent.replace("<head>", "<head>" + mockScript);

  doc.open();
  doc.write(htmlWithMock);
  doc.close();

  // Inject Theme Variables and Styles
  setTimeout(() => {
    injectThemeToIframe();
  }, 100);

  updateCurrentFile(data.filePath);
  if (previewToolbar) previewToolbar.style.display = "flex";

  if (data.threads) {
    currentThreads = data.threads;
    renderCommentsList(data.threads);
    renderCommentTable(data.threads);
  }
});

window.api.onTriggerAddComment(() => {
  if (addCommentBtn) addCommentBtn.click();
});

window.api.onTriggerOpenFile(() => {
  if (openBtn) openBtn.click();
});

window.api.onUpdateRecentFiles((files: string[]) => {
  updateRecentFilesList(files);
});

function updateRecentFilesList(files: string[]) {
  if (!recentFilesDiv) return;
  recentFilesDiv.innerHTML = "";
  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "recent-file-item";
    item.innerText = file.split(/[\\/]/).pop() || "";
    item.title = file;
    item.onclick = () => window.api.openFileSpecific(file);
    recentFilesDiv.appendChild(item);
  });
}

function renderCommentsList(threads: any[]) {
  if (!commentsList) return;
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
    const comment = thread.comments[0];

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

function renderCommentTable(threads: any[]) {
  if (!tableBody || !tableHead) return;

  // Render Header
  renderTableHeader();

  // Sort threads based on the *first* comment's property
  let displayThreads = [...threads];
  if (sortState.columnId) {
    displayThreads.sort((a, b) => {
      const comA = a.comments[0];
      const comB = b.comments[0];
      let valA, valB;

      switch (sortState.columnId) {
        case "status":
          valA = comA.status || "";
          valB = comB.status || "";
          break;
        case "author":
          valA = comA.author || "";
          valB = comB.author || "";
          break;
        case "content":
          valA = comA.content || "";
          valB = comB.content || "";
          break;
        default:
          return 0;
      }

      const cmp = valA.localeCompare(valB);
      return sortState.direction === "asc" ? cmp : -cmp;
    });
  }

  tableBody.innerHTML = "";
  displayThreads.forEach((thread) => {
    thread.comments.forEach((comment: any, index: number) => {
      const row = document.createElement("tr");
      row.className = index === 0 ? "thread-row" : "reply-row";
      row.setAttribute("data-thread-id", thread.id);
      row.setAttribute("data-comment-id", comment.id);

      // Construct row cells based on columns order
      columns.forEach((col) => {
        const td = document.createElement("td");
        td.style.width = `${col.width}px`;

        if (col.id === "status") {
          const statusHtml = comment.status
            ? `<select class="status-select status-${comment.status}" onchange="rendererUpdateStatus('${thread.id}', '${comment.id}', this.value)">
                 <option value="todo" ${comment.status === "todo" ? "selected" : ""}>TODO</option>
                 <option value="in_progress" ${comment.status === "in_progress" ? "selected" : ""}>Task</option>
                 <option value="done" ${comment.status === "done" ? "selected" : ""}>Done</option>
               </select>`
            : "-";
          td.innerHTML = statusHtml;
        } else if (col.id === "author") {
          td.innerText = comment.author || "User";
        } else if (col.id === "tags") {
          td.className = "tag-cell";
          td.innerText = (comment.tags || []).join(", ") || "-";
        } else if (col.id === "content") {
          td.className = "content-cell";
          td.innerText = comment.content;
        } else if (col.id === "actions") {
          td.className = "actions-cell";
          td.innerHTML = `
            <button class="icon-btn reply-btn" title="Reply">💬</button>
            <button class="icon-btn tag-btn" title="Edit Tags">🏷️</button>
            <button class="icon-btn delete-btn" title="Delete">🗑️</button>
          `;
          // Re-attach listeners
          const replyBtn = td.querySelector(".reply-btn") as HTMLElement;
          const tagBtn = td.querySelector(".tag-btn") as HTMLElement;
          const deleteBtn = td.querySelector(".delete-btn") as HTMLElement;

          if (replyBtn)
            replyBtn.onclick = (e) => {
              e.stopPropagation();
              window.rendererReply(thread.id);
            };
          if (tagBtn)
            tagBtn.onclick = (e) => {
              e.stopPropagation();
              window.rendererEditTags(
                thread.id,
                comment.id,
                comment.tags || [],
              );
            };
          if (deleteBtn)
            deleteBtn.onclick = (e) => {
              e.stopPropagation();
              window.rendererDeleteComment(thread.id, comment.id);
            };
        }

        row.appendChild(td);
      });

      row.onclick = (e: any) => {
        if (!e.target.closest("select") && !e.target.closest("button")) {
          syncSelection(thread.id, comment.id);
        }
      };

      tableBody.appendChild(row);
    });
  });
}

function renderTableHeader() {
  if (!tableHead) return;
  tableHead.innerHTML = "";
  const tr = document.createElement("tr");

  columns.forEach((col, index) => {
    const th = document.createElement("th");
    th.style.width = `${col.width}px`;
    th.dataset.columnId = col.id;
    th.draggable = true; // Enable drag

    // Header Content
    const contentSpan = document.createElement("span");
    contentSpan.innerText = col.label;
    th.appendChild(contentSpan);

    // Sort Indicator
    if (col.sortable) {
      th.classList.add("sortable");
      if (sortState.columnId === col.id) {
        const arrow = document.createElement("span");
        arrow.className = "sort-arrow";
        arrow.innerText = sortState.direction === "asc" ? " ▲" : " ▼";
        th.appendChild(arrow);
      }
      th.onclick = (e) => {
        // Ignore if clicked on resizer
        if ((e.target as HTMLElement).classList.contains("col-resizer")) return;
        handleSort(col.id);
      };
    }

    // Resize Handle
    const resizer = document.createElement("div");
    resizer.className = "col-resizer";
    // Mousedown for resize
    resizer.onmousedown = (e) => initResize(e, col);
    th.appendChild(resizer);

    // Drag Events
    th.ondragstart = (e) => {
      dragSrcColumnId = col.id;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", col.id);
      }
      th.classList.add("dragging");
    };

    th.ondragover = (e) => {
      e.preventDefault(); // Necessary for allow drop
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      th.classList.add("drag-over");
    };

    th.ondragleave = (e) => {
      th.classList.remove("drag-over");
    };

    th.ondrop = (e) => {
      e.preventDefault();
      th.classList.remove("drag-over");
      if (dragSrcColumnId && dragSrcColumnId !== col.id) {
        handleDrop(dragSrcColumnId, col.id);
      }
      // Cleanup dragging class from all th
      const allTh = tableHead.querySelectorAll("th");
      allTh.forEach((t) => t.classList.remove("dragging"));
    };

    th.ondragend = (e) => {
      const allTh = tableHead.querySelectorAll("th");
      allTh.forEach((t) => {
        t.classList.remove("dragging");
        t.classList.remove("drag-over");
      });
    };

    tr.appendChild(th);
  });

  tableHead.appendChild(tr);
}

function handleSort(columnId: string) {
  if (sortState.columnId === columnId) {
    // Toggle direction
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    sortState.columnId = columnId;
    sortState.direction = "asc";
  }
  // Re-render
  if (currentThreads) {
    renderCommentTable(currentThreads);
  }
}

function handleDrop(srcId: string, targetId: string) {
  const srcIdx = columns.findIndex((c) => c.id === srcId);
  const targetIdx = columns.findIndex((c) => c.id === targetId);

  if (srcIdx >= 0 && targetIdx >= 0) {
    const [movedCol] = columns.splice(srcIdx, 1);
    columns.splice(targetIdx, 0, movedCol);
    // Re-render
    if (currentThreads) {
      renderCommentTable(currentThreads);
    }
  }
}

function initResize(e: MouseEvent, col: Column) {
  e.preventDefault(); // Prevent text selection
  const startX = e.clientX;
  const startWidth = col.width;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const diff = moveEvent.clientX - startX;
    let newWidth = startWidth + diff;
    if (newWidth < col.minWidth) newWidth = col.minWidth;
    col.width = newWidth;

    // Update width directly for performance, or re-render
    updateColumnWidth(col.id, newWidth);
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function updateColumnWidth(colId: string, width: number) {
  // Find the index of the column
  const index = columns.findIndex((c) => c.id === colId);
  if (index === -1) return;

  // Update Header
  if (tableHead) {
    const th = tableHead.querySelector(
      `th[data-column-id="${colId}"]`,
    ) as HTMLElement;
    if (th) th.style.width = `${width}px`;
  }

  // Update Body Cells
  if (tableBody) {
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach((row) => {
      const cell = row.children[index] as HTMLElement;
      if (cell) cell.style.width = `${width}px`;
    });
  }
}

window.rendererReply = (threadId: string) => {
  if (modalTitle) modalTitle.innerText = "Reply to Comment";
  replyThreadId = threadId;
  if (addCommentOverlay) addCommentOverlay.style.display = "flex";
  if (commentInput) commentInput.focus();
};

window.rendererEditTags = async (
  threadId: string,
  commentId: string,
  currentTags: string[],
) => {
  editTagsThreadId = threadId;
  editTagsCommentId = commentId;
  editTagsSelectedTags = new Set(currentTags);

  // Fetch available tags from file
  if (currentFilePath) {
    editTagsAvailableTags = await window.api.getAvailableTags(currentFilePath);
  } else {
    editTagsAvailableTags = [];
  }

  // Merge available tags with current tags
  const allTags = new Set([...editTagsAvailableTags, ...currentTags]);
  editTagsAvailableTags = Array.from(allTags).sort();

  // Reset filter and render
  if (tagsFilterInput) tagsFilterInput.value = "";
  renderTagsList("");
  if (editTagsOverlay) editTagsOverlay.style.display = "flex";
  if (tagsFilterInput) tagsFilterInput.focus();
};

function renderTagsList(filter: string) {
  if (!tagsList) return;
  tagsList.innerHTML = "";

  const lowerFilter = filter.toLowerCase();

  // Check if filter matches any existing tag
  const filterMatchesExisting = editTagsAvailableTags.some(
    (tag) => tag.toLowerCase() === lowerFilter,
  );

  // Helper to create tag
  const createTag = (tagName: string) => {
    editTagsSelectedTags.add(tagName);
    if (!editTagsAvailableTags.includes(tagName)) {
      editTagsAvailableTags.push(tagName);
      editTagsAvailableTags.sort();
    }
    if (tagsFilterInput) tagsFilterInput.value = "";
    renderTagsList("");
  };

  // Show "Create new tag" option if filter is non-empty and doesn't match existing
  if (filter && !filterMatchesExisting) {
    const createItem = document.createElement("div");
    createItem.className = "tag-item create-tag";
    createItem.innerHTML = `
      <span class="tag-icon">+</span>
      <span>Create new tag: "${filter}"</span>
    `;
    createItem.onclick = () => {
      createTag(filter);
    };
    tagsList.appendChild(createItem);
  }

  // Render existing tags
  for (const tag of editTagsAvailableTags) {
    if (filter && !tag.toLowerCase().includes(lowerFilter)) {
      continue;
    }
    const item = document.createElement("div");
    item.className = "tag-item";
    const isSelected = editTagsSelectedTags.has(tag);

    item.innerHTML = `
      <input type="checkbox" ${isSelected ? "checked" : ""} />
      <span>${tag}</span>
    `;
    item.onclick = (e) => {
      if ((e.target as HTMLElement).tagName !== "INPUT") {
        const checkbox = item.querySelector("input") as HTMLInputElement;
        checkbox.checked = !checkbox.checked;
      }
      const checkbox = item.querySelector("input") as HTMLInputElement;
      if (checkbox.checked) {
        editTagsSelectedTags.add(tag);
      } else {
        editTagsSelectedTags.delete(tag);
      }
    };
    tagsList.appendChild(item);
  }

  // If no tags exist, show empty state
  if (tagsList.children.length === 0) {
    tagsList.innerHTML =
      '<div class="empty-state">No tags. Type to create one.</div>';
  }
}

if (tagsFilterInput) {
  tagsFilterInput.oninput = () => {
    renderTagsList(tagsFilterInput.value);
  };

  tagsFilterInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagsFilterInput.value.trim();
      if (!val) {
        // Empty + Enter -> Save
        if (saveTagsBtn) saveTagsBtn.click();
        return;
      }

      const lowerVal = val.toLowerCase();
      // Check existing
      const exactMatch = editTagsAvailableTags.find(
        (t) => t.toLowerCase() === lowerVal,
      );

      if (exactMatch) {
        // Toggle existing
        if (editTagsSelectedTags.has(exactMatch)) {
          editTagsSelectedTags.delete(exactMatch);
        } else {
          editTagsSelectedTags.add(exactMatch);
        }
        tagsFilterInput.value = "";
        renderTagsList("");
      } else {
        // Create new
        editTagsSelectedTags.add(val);
        if (!editTagsAvailableTags.includes(val)) {
          editTagsAvailableTags.push(val);
          editTagsAvailableTags.sort();
        }
        tagsFilterInput.value = "";
        renderTagsList("");
      }
    }
  };
}

if (saveTagsBtn) {
  saveTagsBtn.onclick = async () => {
    if (!editTagsThreadId || !editTagsCommentId || !currentFilePath) return;
    await window.api.updateComment({
      filePath: currentFilePath,
      threadId: editTagsThreadId,
      commentId: editTagsCommentId,
      tags: Array.from(editTagsSelectedTags),
    });
    if (editTagsOverlay) editTagsOverlay.style.display = "none";
    editTagsThreadId = null;
    editTagsCommentId = null;
    editTagsSelectedTags = new Set();
    refreshComments();
  };
}

if (cancelTagsBtn) {
  cancelTagsBtn.onclick = () => {
    if (editTagsOverlay) editTagsOverlay.style.display = "none";
    editTagsThreadId = null;
    editTagsCommentId = null;
    editTagsSelectedTags = new Set();
  };
}

window.rendererUpdateStatus = async (
  threadId: string,
  commentId: string,
  status: string,
) => {
  await window.api.updateStatus({
    filePath: currentFilePath,
    threadId,
    commentId,
    status,
  });
  refreshComments();
};

window.rendererDeleteComment = async (threadId: string, commentId: string) => {
  if (confirm("Are you sure you want to delete this comment?")) {
    await window.api.deleteComment({
      threadId,
      commentId,
      filePath: currentFilePath,
    });
    refreshComments();
  }
};

function syncSelection(threadId: string, commentId?: string) {
  selectedThreadId = threadId;
  highlightInContent(threadId);
  selectCommentInSidebar(threadId);
  selectCommentInTable(threadId, commentId);
}

function highlightInContent(id: string) {
  const doc =
    previewFrame.contentDocument || previewFrame.contentWindow!.document;
  if (!doc) return;
  const highlights = doc.querySelectorAll(".comment-highlight");
  highlights.forEach((h) => h.classList.remove("active"));
  const target = doc.querySelector(
    `.comment-highlight[data-thread-id="${id}"]`,
  ) as HTMLElement;
  if (target) {
    target.classList.add("active");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

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

function selectCommentInSidebar(id: string) {
  if (!commentsList) return;
  const items = commentsList.querySelectorAll(".comment-thread-item");
  items.forEach((item: any) => {
    if (item.getAttribute("data-thread-id") === id) {
      item.classList.add("active");
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      item.classList.remove("active");
    }
  });
}

function selectCommentInTable(threadId: string, commentId?: string) {
  if (!tableBody) return;
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row: any) => {
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

// Resizer Logic
let isResizingV = false;
let isResizingH = false;

if (resizerV) {
  resizerV.onmousedown = (e) => {
    isResizingV = true;
    document.body.classList.add("resizing-v");
  };
}

if (resizerH) {
  resizerH.onmousedown = (e) => {
    isResizingH = true;
    document.body.classList.add("resizing-h");
  };
}

window.onmousemove = (e) => {
  if (isResizingV && sidebar && resizerV) {
    const sidebarWidth = e.clientX;
    if (sidebarWidth > 50 && sidebarWidth < 600) {
      sidebar.style.width = `${sidebarWidth}px`;
      resizerV.style.left = `${sidebarWidth}px`;
    }
  }
  if (isResizingH && bottomPanel) {
    const panelHeight = window.innerHeight - e.clientY;
    if (panelHeight > 50 && panelHeight < window.innerHeight - 100) {
      bottomPanel.style.height = `${panelHeight}px`;
    }
  }
};

window.onmouseup = () => {
  if (isResizingV || isResizingH) {
    window.api.saveLayout({
      sidebarWidth: parseInt(sidebar.style.width),
      panelHeight: parseInt(bottomPanel.style.height),
    });
  }
  isResizingV = false;
  isResizingH = false;
  document.body.classList.remove("resizing-v", "resizing-h");
};
