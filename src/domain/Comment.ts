export enum CommentStatus {
  Open = "open",
  Resolved = "resolved",
  Closed = "closed",
}

export const STATUS_ICONS: Record<CommentStatus, string> = {
  [CommentStatus.Open]: "🟠",
  [CommentStatus.Resolved]: "✅",
  [CommentStatus.Closed]: "⚫",
};

export function getStatusIcon(status: CommentStatus | string): string {
  return STATUS_ICONS[status as CommentStatus] || "";
}

export interface CommentAnchor {
  readonly text: string;
  readonly contextBefore: string;
  readonly contextAfter: string;
  readonly offset: number;
  readonly length: number;
}

export class Comment {
  constructor(
    public readonly id: string,
    public content: string,
    public readonly author: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public status?: CommentStatus,
    public tags: string[] = [],
  ) {}

  public update(content: string): void {
    this.content = content;
    this.updatedAt = new Date();
  }
}

export class CommentThread {
  private static readonly MAX_REPLIES = 64;

  constructor(
    public readonly id: string,
    public readonly filePath: string,
    public anchor: CommentAnchor,
    public comments: Comment[] = [],
  ) {}

  public addComment(content: string, author: string): Comment {
    if (this.comments.length >= CommentThread.MAX_REPLIES) {
      throw new Error(
        `Maximum number of replies (${CommentThread.MAX_REPLIES}) exceeded.`,
      );
    }

    const nextId = this.generateNextId();
    const comment = new Comment(
      nextId,
      content,
      author,
      new Date(),
      new Date(),
    );
    this.comments.push(comment);
    return comment;
  }

  public deleteComment(commentId: string): void {
    const index = this.comments.findIndex((c) => c.id === commentId);
    if (index === -1) return;

    // Note: For synthesized IDs like 1.1, 1.2, deleting middle nodes
    // might require re-connecting logic depending on how UI displays it.
    // For now, we just remove it.
    this.comments.splice(index, 1);
  }

  private generateNextId(): string {
    if (this.comments.length === 0) {
      return `${this.id}.1`;
    }

    // Extract the last number from the last comment's ID and increment it
    const lastComment = this.comments[this.comments.length - 1];
    const parts = lastComment.id.split(".");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    parts[parts.length - 1] = (lastNum + 1).toString();

    return parts.join(".");
  }
}
