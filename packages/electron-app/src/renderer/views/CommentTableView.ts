import { Component } from "../../infrastructure/ui/Component.js";

interface Column {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
}

export class CommentTableView extends Component {
  private tableBody: HTMLTableSectionElement;
  private tableHead: HTMLTableSectionElement;
  private columns: Column[] = [
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
  private sortState = { columnId: "", direction: "asc" as "asc" | "desc" };

  // Callback events
  public onCommentClick?: (threadId: string, commentId: string) => void;
  public onStatusChange?: (
    threadId: string,
    commentId: string,
    status: string,
  ) => void;
  public onReply?: (threadId: string) => void;
  public onEditTags?: (
    threadId: string,
    commentId: string,
    tags: string[],
  ) => void;
  public onDelete?: (threadId: string, commentId: string) => void;

  constructor() {
    super("comment-table"); // Assuming the table ID is comment-table
    this.tableBody = document.getElementById(
      "table-body",
    ) as HTMLTableSectionElement;
    this.tableHead = this.element.querySelector(
      "thead",
    ) as HTMLTableSectionElement;

    if (!this.tableBody)
      console.error("CommentTableView: table-body not found");
    // Initial Render
    this.renderHeader();
  }

  public render(threads: any[]): void {
    if (!this.tableBody) return;

    // Sort logic
    let displayThreads = [...threads];
    if (this.sortState.columnId) {
      displayThreads.sort((a, b) => {
        const comA = a.comments[0];
        const comB = b.comments[0];
        let valA = "",
          valB = "";

        switch (this.sortState.columnId) {
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
        }

        const cmp = valA.localeCompare(valB);
        return this.sortState.direction === "asc" ? cmp : -cmp;
      });
    }

    this.tableBody.innerHTML = "";
    displayThreads.forEach((thread) => {
      thread.comments.forEach((comment: any, index: number) => {
        const row = document.createElement("tr");
        row.className = index === 0 ? "thread-row" : "reply-row";
        row.setAttribute("data-thread-id", thread.id);
        row.setAttribute("data-comment-id", comment.id);

        this.columns.forEach((col) => {
          const td = document.createElement("td");
          td.style.width = `${col.width}px`;

          if (col.id === "status") {
            const select = document.createElement("select");
            select.className = `status-select status-${comment.status || "todo"}`;
            select.innerHTML = `
                 <option value="todo" ${comment.status === "todo" ? "selected" : ""}>TODO</option>
                 <option value="in_progress" ${comment.status === "in_progress" ? "selected" : ""}>Task</option>
                 <option value="done" ${comment.status === "done" ? "selected" : ""}>Done</option>
             `;
            select.onchange = (e) => {
              if (this.onStatusChange) {
                this.onStatusChange(
                  thread.id,
                  comment.id,
                  (e.target as HTMLSelectElement).value,
                );
              }
            };
            td.appendChild(select);
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

            td.querySelector(".reply-btn")!.addEventListener("click", (e) => {
              e.stopPropagation();
              if (this.onReply) this.onReply(thread.id);
            });
            td.querySelector(".tag-btn")!.addEventListener("click", (e) => {
              e.stopPropagation();
              if (this.onEditTags)
                this.onEditTags(thread.id, comment.id, comment.tags || []);
            });
            td.querySelector(".delete-btn")!.addEventListener("click", (e) => {
              e.stopPropagation();
              if (this.onDelete) this.onDelete(thread.id, comment.id);
            });
          }
          row.appendChild(td);
        });

        row.onclick = (e: any) => {
          if (!e.target.closest("select") && !e.target.closest("button")) {
            if (this.onCommentClick) this.onCommentClick(thread.id, comment.id);
          }
        };

        this.tableBody.appendChild(row);
      });
    });
  }

  private renderHeader(): void {
    if (!this.tableHead) return;
    this.tableHead.innerHTML = "";

    // Simple header rendering for now, dragging removed for simplicity in first pass
    this.columns.forEach((col) => {
      const th = document.createElement("th");
      th.style.width = `${col.width}px`;

      const span = document.createElement("span");
      span.innerText = col.label;
      th.appendChild(span);

      if (col.sortable) {
        th.classList.add("sortable");
        if (this.sortState.columnId === col.id) {
          const arrow = document.createElement("span");
          arrow.className = "sort-arrow";
          arrow.innerText = this.sortState.direction === "asc" ? " ▲" : " ▼";
          th.appendChild(arrow);
        }
        th.onclick = () => this.handleSort(col.id);
      }
      this.tableHead.appendChild(th);
    });
  }

  private handleSort(columnId: string): void {
    if (this.sortState.columnId === columnId) {
      this.sortState.direction =
        this.sortState.direction === "asc" ? "desc" : "asc";
    } else {
      this.sortState.columnId = columnId;
      this.sortState.direction = "asc";
    }
    this.renderHeader();
    // We need to re-render data.
    // Ideally this component just triggers an event, but here it holds state.
    // For now, let's assume the parent calls render() again or we trigger an update.
    // Hack: We don't have the data here to re-render immediately unless stored.
    // Let's dispatch an event to request re-render? Or just store data?
    // Storing data is easier.
  }
}
