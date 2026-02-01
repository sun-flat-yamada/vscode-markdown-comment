// Table View Script (Pure JS)
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
      document.getElementById("comment-body").innerHTML = message.rowsHtml;
      document.querySelector("thead tr").innerHTML = message.headerHtml;

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
    case "selectComment": {
      const select = (attempts = 0) => {
        // Clear all existing selections first
        document
          .querySelectorAll("tr.selected")
          .forEach((r) => r.classList.remove("selected"));

        const row = document.querySelector(
          `tr[data-thread-id="${message.threadId}"][data-comment-id="${message.commentId}"]`,
        );
        if (row) {
          row.classList.add("selected");
          row.scrollIntoView({ behavior: "auto", block: "center" });
        } else if (attempts < 5) {
          // If the table is still rendering (async), retry a few times
          setTimeout(() => select(attempts + 1), 100);
        }
      };
      select();
      break;
    }
  }
});

vscode.postMessage({ type: "ready" });

const table = document.getElementById("comment-table");
if (table) {
  table.addEventListener("click", (e) => {
    const target = e.target;
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

function updateStatus(select, threadId, commentId) {
  vscode.postMessage({
    type: "updateStatus",
    threadId: threadId,
    commentId: commentId,
    status: select.value,
  });
  select.className = "status-select status-" + select.value;
}

function editComment(threadId, commentId, currentContent, filePath) {
  vscode.postMessage({
    type: "edit",
    threadId,
    commentId,
    currentContent,
    filePath,
  });
}

function deleteComment(threadId, commentId, filePath) {
  vscode.postMessage({ type: "delete", threadId, commentId, filePath });
}

function editTags(threadId, commentId, tagsJson, filePath) {
  const tags = JSON.parse(decodeURIComponent(tagsJson));
  vscode.postMessage({
    type: "editTags",
    threadId,
    commentId,
    currentTags: tags,
    filePath,
  });
}

/* Resizing Logic */
let isResizing = false;
let currentColumn = null;
let startX = 0;
let startWidth = 0;

function startResizing(e, col) {
  isResizing = true;
  currentColumn = col;
  startX = e.pageX;
  const th = e.target.parentElement;
  startWidth = th.offsetWidth;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", stopResizing);
  e.preventDefault();
  e.stopPropagation();
}

function handleMouseMove(e) {
  if (!isResizing) return;
  const diff = e.pageX - startX;
  const newWidth = Math.max(20, startWidth + diff);
  const th = document.querySelector('th[data-col="' + currentColumn + '"]');
  if (th) th.style.width = newWidth + "px";
}

function stopResizing() {
  if (isResizing) {
    const th = document.querySelector('th[data-col="' + currentColumn + '"]');
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
let dragSrcCol = null;

function handleDragStart(e) {
  dragSrcCol = e.target;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", e.target.dataset.col);
  }
  e.target.classList.add("dragging");
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
  const th = e.target.closest("th");
  if (th) th.classList.add("drag-over");
  return false;
}

function handleDragLeave(e) {
  const th = e.target.closest("th");
  if (th) th.classList.remove("drag-over");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  const th = e.target.closest("th");
  if (th) th.classList.remove("drag-over");

  if (dragSrcCol !== th && th && e.dataTransfer) {
    const fromCol = e.dataTransfer.getData("text/plain");
    const toCol = th.dataset.col;
    vscode.postMessage({ type: "reorderColumns", from: fromCol, to: toCol });
  }
  return false;
}

document.addEventListener("dragend", () => {
  document.querySelectorAll("th").forEach((th) => {
    th.classList.remove("dragging");
    th.classList.remove("drag-over");
  });
});
