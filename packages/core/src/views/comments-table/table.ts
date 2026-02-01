// Table View Script
declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.type) {
    case "setLoading":
      if (message.loading) {
        document.body.classList.add("is-loading");
      } else {
        document.body.classList.remove("is-loading");
      }
      break;
    case "updateData":
      const body = document.getElementById("comment-body");
      if (body) body.innerHTML = message.rowsHtml;

      const headRow = document.querySelector("thead tr");
      if (headRow) headRow.innerHTML = message.headerHtml;

      const header = document.getElementById("file-header");
      if (header) {
        if (message.fileName) {
          header.style.display = "flex";
          header.innerText = message.fileName;
          header.title = message.fullPath;
        } else {
          header.style.display = "none";
        }
      }

      document.body.classList.remove("is-loading");
      break;
    case "selectComment":
      const rows = document.querySelectorAll("#comment-body tr");
      rows.forEach((r) => r.classList.remove("selected-row"));
      const targetRow = Array.from(rows).find(
        (r) =>
          (r as HTMLElement).dataset.threadId === message.threadId &&
          (r as HTMLElement).dataset.commentId === message.commentId,
      );
      if (targetRow) {
        targetRow.classList.add("selected-row");
        targetRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      break;
  }
});

vscode.postMessage({ type: "ready" });

const table = document.getElementById("comment-table");
if (table) {
  table.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const tr = target.closest("tr");
    if (tr && !target.closest("select") && !target.closest("button")) {
      const threadId = tr.dataset.threadId;
      const filePath = tr.dataset.filePath;
      if (threadId && filePath) {
        vscode.postMessage({ type: "reveal", threadId, filePath });
      }
    }
  });
}

// Global functions exposed for HTML inline handlers
(window as any).updateStatus = function (
  select: HTMLSelectElement,
  threadId: string,
  commentId: string,
) {
  vscode.postMessage({
    type: "updateStatus",
    threadId: threadId,
    commentId: commentId,
    status: select.value,
  });
  select.className = "status-select status-" + select.value;
};

(window as any).editComment = function (
  threadId: string,
  commentId: string,
  currentContent: string,
  filePath: string,
) {
  vscode.postMessage({
    type: "edit",
    threadId,
    commentId,
    currentContent,
    filePath,
  });
};

(window as any).deleteComment = function (
  threadId: string,
  commentId: string,
  filePath: string,
) {
  vscode.postMessage({ type: "delete", threadId, commentId, filePath });
};

(window as any).editTags = function (
  threadId: string,
  commentId: string,
  tagsJson: string,
  filePath: string,
) {
  const tags = JSON.parse(decodeURIComponent(tagsJson));
  vscode.postMessage({
    type: "editTags",
    threadId,
    commentId,
    currentTags: tags,
    filePath,
  });
};

/* Resizing Logic */
let isResizing = false;
let currentColumn: string | null = null;
let startX = 0;
let startWidth = 0;

(window as any).startResizing = function (e: MouseEvent, col: string) {
  isResizing = true;
  currentColumn = col;
  startX = e.pageX;
  const target = e.target as HTMLElement;
  const th = target.parentElement as HTMLElement;
  startWidth = th.offsetWidth;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", stopResizing);
  e.preventDefault();
  e.stopPropagation(); // Prevent drag start
};

function handleMouseMove(e: MouseEvent) {
  if (!isResizing) return;
  const diff = e.pageX - startX;
  const newWidth = Math.max(20, startWidth + diff);
  const th = document.querySelector(
    'th[data-col="' + currentColumn + '"]',
  ) as HTMLElement;
  if (th) th.style.width = newWidth + "px";
}

function stopResizing() {
  if (isResizing) {
    const th = document.querySelector(
      'th[data-col="' + currentColumn + '"]',
    ) as HTMLElement;
    if (th) {
      vscode.postMessage({
        type: "resize",
        column: currentColumn,
        width: th.offsetWidth,
      });
    }
  }
  isResizing = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", stopResizing);
}

/* D&D Logic */
let dragSrcCol: HTMLElement | null = null;

(window as any).handleDragStart = function (e: DragEvent) {
  dragSrcCol = e.target as HTMLElement; // th
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    if (e.target instanceof HTMLElement && e.target.dataset.col) {
      e.dataTransfer.setData("text/plain", e.target.dataset.col);
    }
  }
  (e.target as HTMLElement).classList.add("dragging");
};

(window as any).handleDragOver = function (e: DragEvent) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
  const target = e.target as HTMLElement;
  const th = target.closest("th");
  th?.classList.add("drag-over");
  return false;
};

(window as any).handleDragLeave = function (e: DragEvent) {
  const target = e.target as HTMLElement;
  const th = target.closest("th");
  th?.classList.remove("drag-over");
};

(window as any).handleDrop = function (e: DragEvent) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  const target = e.target as HTMLElement;
  const th = target.closest("th");
  th?.classList.remove("drag-over");

  if (dragSrcCol !== th && th && e.dataTransfer && th.dataset.col) {
    const fromCol = e.dataTransfer.getData("text/plain");
    const toCol = th.dataset.col;
    vscode.postMessage({ type: "reorderColumns", from: fromCol, to: toCol });
  }
  return false;
};

document.addEventListener("dragend", () => {
  document.querySelectorAll("th").forEach((th) => {
    th.classList.remove("dragging");
    th.classList.remove("drag-over");
  });
});
