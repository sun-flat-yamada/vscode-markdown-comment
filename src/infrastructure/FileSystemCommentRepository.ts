import * as fs from "fs/promises";
import * as path from "path";
import { CommentThread, Comment, CommentStatus } from "../domain/Comment";
import { ICommentRepository } from "../domain/ICommentRepository";
import { METADATA_EXTENSION, MetadataRecordType } from "../domain/Constants";

interface SerializedThread {
  type?: MetadataRecordType;
  id: string;
  anchor: {
    text: string;
    contextBefore: string;
    contextAfter: string;
    offset: number;
    length: number;
  };
  comments: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    status?: string;
    tags: string[];
  }>;
}

interface TagDictRecord {
  type: MetadataRecordType;
  tags: string[];
}

type MetadataRecord = SerializedThread | TagDictRecord;

export class FileSystemCommentRepository implements ICommentRepository {
  private cache: Map<string, CommentThread[]> = new Map();
  private tagCache: Map<string, string[]> = new Map();

  private getPrimaryPath(filePath: string): string {
    // sample.md -> sample.meta.jsonl
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return path.join(dir, name + METADATA_EXTENSION);
  }

  public async save(thread: CommentThread): Promise<void> {
    const threads = await this.findByFilePath(thread.filePath);
    const index = threads.findIndex((t) => t.id === thread.id);

    if (index !== -1) {
      threads[index] = thread;
    } else {
      threads.push(thread);
    }

    this.cache.set(thread.filePath, [...threads]);
    await this.writeThreads(thread.filePath, threads);
  }

  public async delete(filePath: string, threadId: string): Promise<void> {
    const threads = await this.findByFilePath(filePath);
    const filtered = threads.filter((t) => t.id !== threadId);
    this.cache.set(filePath, filtered);
    await this.writeThreads(filePath, filtered);
  }

  public async findByFilePath(filePath: string): Promise<CommentThread[]> {
    if (this.cache.has(filePath)) {
      return [...(this.cache.get(filePath) || [])];
    }

    const primaryPath = this.getPrimaryPath(filePath);
    let threads: CommentThread[] = [];

    // 1. Try reading primary path (expecting JSONL)
    try {
      const content = await fs.readFile(primaryPath, "utf-8");
      // Check if it looks like JSONL or legacy Markdown-wrapped JSON
      if (content.trim().startsWith("#")) {
        // It might be a Markdown-wrapped file (legacy format but with new naming)
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]) as {
            threads: SerializedThread[];
          };
          threads = this.deserializeThreads(data.threads, filePath);
        }
      } else {
        threads = this.parseJsonl(content, filePath);
      }
    } catch (e) {
      // Not found or error, return empty
    }

    this.cache.set(filePath, threads);
    return [...threads];
  }

  public async findById(
    filePath: string,
    id: string,
  ): Promise<CommentThread | null> {
    const threads = await this.findByFilePath(filePath);
    return threads.find((t) => t.id === id) || null;
  }

  public async getTags(filePath: string): Promise<string[]> {
    if (this.tagCache.has(filePath)) {
      return [...(this.tagCache.get(filePath) || [])];
    }
    // ensure loaded
    await this.findByFilePath(filePath);
    return [...(this.tagCache.get(filePath) || [])];
  }

  public async saveTags(filePath: string, tags: string[]): Promise<void> {
    const existingTags = await this.getTags(filePath);
    // explicit update
    this.tagCache.set(filePath, tags);
    // Write everything back (threads + tags)
    const threads = await this.findByFilePath(filePath);
    await this.writeThreads(filePath, threads, tags);
  }

  private async writeThreads(
    filePath: string,
    threads: CommentThread[],
    tags?: string[], // optional, if not provided use cache
  ): Promise<void> {
    const primaryPath = this.getPrimaryPath(filePath);
    const existingTags = tags || (await this.getTags(filePath));

    // Serialize threads
    const lines = threads.map((t) => {
      // Ensure 'type' is the FIRST key for future extensibility
      const serializedFn = {
        type: MetadataRecordType.CommentThread,
        id: t.id,
        anchor: t.anchor,
        comments: t.comments.map((c, index) => ({
          id: c.id,
          content: c.content,
          author: c.author,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          status: index === 0 ? c.status : undefined, // Only root has status
          tags: c.tags,
        })),
      };
      return JSON.stringify(serializedFn);
    });

    // Serialize Tags
    if (existingTags && existingTags.length > 0) {
      const tagRecord: TagDictRecord = {
        type: MetadataRecordType.CommentTagDict,
        tags: existingTags,
      };
      lines.unshift(JSON.stringify(tagRecord));
    }

    await fs.writeFile(primaryPath, lines.join("\n"), "utf-8");
  }

  private parseJsonl(content: string, filePath: string): CommentThread[] {
    const lines = content.trim().split("\n");
    const threads: SerializedThread[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const obj = JSON.parse(line);
        // Dispatch based on 'type' if present, otherwise default to CommentThread for compatibility
        if (!obj.type || obj.type === MetadataRecordType.CommentThread) {
          threads.push(obj as SerializedThread);
        } else if (obj.type === MetadataRecordType.CommentTagDict) {
          // Update tag cache directly
          const tagRec = obj as TagDictRecord;
          this.tagCache.set(filePath, tagRec.tags);
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    return this.deserializeThreads(threads, filePath);
  }

  private deserializeThreads(
    serialized: SerializedThread[],
    filePath: string,
  ): CommentThread[] {
    return serialized.map((t) => {
      const thread = new CommentThread(t.id, filePath, t.anchor);
      thread.comments = t.comments.map(
        (c, index) =>
          new Comment(
            c.id,
            c.content,
            c.author,
            new Date(c.createdAt),
            new Date(c.updatedAt),
            index === 0 ? (c.status as CommentStatus) : undefined, // Only root has status
            c.tags,
          ),
      );
      return thread;
    });
  }
}
