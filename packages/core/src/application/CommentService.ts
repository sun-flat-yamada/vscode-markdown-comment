import { CommentThread, CommentAnchor, CommentStatus } from "../domain/Comment";
import { ICommentRepository } from "../domain/ICommentRepository";
import { AnchoringService } from "./AnchoringService";

export class CommentService {
  constructor(
    private readonly repository: ICommentRepository,
    private readonly anchoringService: AnchoringService,
  ) {}

  public async createThread(
    filePath: string,
    content: string,
    offset: number,
    length: number,
    author: string,
    initialComment: string,
  ): Promise<CommentThread> {
    const anchor = this.anchoringService.createAnchor(content, offset, length);
    const threadId = Date.now().toString(); // Use timestamp for root ID
    const thread = new CommentThread(threadId, filePath, anchor);

    const comment = thread.addComment(initialComment, author);
    comment.status = CommentStatus.Open;
    await this.repository.save(thread);
    return thread;
  }

  public async addReply(
    filePath: string,
    threadId: string,
    content: string,
    author: string,
  ): Promise<CommentThread> {
    const thread = await this.repository.findById(filePath, threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found.`);
    }

    thread.addComment(content, author);
    await this.repository.save(thread);
    return thread;
  }

  public async deleteComment(
    filePath: string,
    threadId: string,
    commentId: string,
  ): Promise<void> {
    const thread = await this.repository.findById(filePath, threadId);
    if (!thread) {
      return;
    }

    thread.deleteComment(commentId);
    if (thread.comments.length === 0) {
      await this.repository.delete(filePath, threadId);
    } else {
      await this.repository.save(thread);
    }
  }

  public async updateStatus(
    filePath: string,
    threadId: string,
    commentId: string,
    status: CommentStatus,
  ): Promise<void> {
    const thread = await this.repository.findById(filePath, threadId);
    if (!thread) {
      return;
    }
    const comment = thread.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.status = status;
      comment.updatedAt = new Date();
      await this.repository.save(thread);
    }
  }

  public async updateComment(
    filePath: string,
    threadId: string,
    commentId: string,
    content: string,
  ): Promise<void> {
    const thread = await this.repository.findById(filePath, threadId);
    if (!thread) {
      return;
    }
    const comment = thread.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.update(content);
      await this.repository.save(thread);
    }
  }

  public async updateTags(
    filePath: string,
    threadId: string,
    commentId: string,
    tags: string[],
  ): Promise<void> {
    const thread = await this.repository.findById(filePath, threadId);
    if (!thread) {
      return;
    }
    const comment = thread.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.tags = tags;
      comment.updatedAt = new Date();
      await this.repository.save(thread);

      // Sync with Tag Dictionary
      const existingTags = await this.repository.getTags(filePath);
      const newTags = tags.filter((t) => !existingTags.includes(t));
      if (newTags.length > 0) {
        await this.repository.saveTags(filePath, [...existingTags, ...newTags]);
      }
    }
  }

  public async getAvailableTags(filePath: string): Promise<string[]> {
    return this.repository.getTags(filePath);
  }

  public async getThreadsForFile(
    filePath: string,
    currentContent: string,
  ): Promise<CommentThread[]> {
    const threads = await this.repository.findByFilePath(filePath);

    // Update offsets based on current content
    for (const thread of threads) {
      const newOffset = this.anchoringService.resolveOffset(
        currentContent,
        thread.anchor,
      );
      if (newOffset !== null) {
        thread.anchor = { ...thread.anchor, offset: newOffset };
      }
      // If newOffset is null, it's 'orphaned' - handled by controller UI
    }

    // Sync metadata: ensure all tags in comments exist in dictionary
    const existingTags = await this.repository.getTags(filePath);
    const usedTags = new Set<string>();
    threads.forEach((t) =>
      t.comments.forEach((c) => c.tags.forEach((tag) => usedTags.add(tag))),
    );
    const missingTags = Array.from(usedTags).filter(
      (t) => !existingTags.includes(t),
    );

    if (missingTags.length > 0) {
      await this.repository.saveTags(filePath, [
        ...existingTags,
        ...missingTags,
      ]);
    }

    return threads;
  }

  public async getThreadAtOffset(
    filePath: string,
    content: string,
    offset: number,
  ): Promise<CommentThread | undefined> {
    const threads = await this.getThreadsForFile(filePath, content);
    return threads.find((t) => {
      const start = t.anchor.offset;
      const end = start + t.anchor.length;
      return offset >= start && offset <= end;
    });
  }
}
