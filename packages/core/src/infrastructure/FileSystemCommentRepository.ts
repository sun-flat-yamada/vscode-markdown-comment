import * as fs from "fs/promises";
import * as path from "path";
import { CommentThread, Comment, CommentStatus } from "../domain/Comment";
import { ICommentRepository } from "../domain/ICommentRepository";
import {
  METADATA_EXTENSION,
  METADATA_EXTENSION_LEGACY,
  METADATA_VERSION,
  MetadataRecordType,
} from "../domain/Constants";

interface SerializedThread {
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

/**
 * New metadata file format (v1.0)
 * Pretty printed JSON for better Git diffs
 */
interface MetadataFile {
  version: string;
  tags: string[];
  threads: SerializedThread[];
}

/**
 * Legacy JSONL record types (for backward compatibility)
 */
interface LegacySerializedThread extends SerializedThread {
  type?: MetadataRecordType;
}

interface LegacyTagDictRecord {
  type: MetadataRecordType;
  tags: string[];
}

export class FileSystemCommentRepository implements ICommentRepository {
  private cache: Map<string, CommentThread[]> = new Map();
  private tagCache: Map<string, string[]> = new Map();

  private normalizePath(filePath: string): string {
    return process.platform === "win32" ? filePath.toLowerCase() : filePath;
  }

  /**
   * Get primary path for new format (.meta.json)
   */
  private getPrimaryPath(filePath: string): string {
    // sample.md -> sample.meta.json
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return path.join(dir, name + METADATA_EXTENSION);
  }

  /**
   * Get legacy path for backward compatibility (.meta.jsonl)
   */
  private getLegacyPath(filePath: string): string {
    // sample.md -> sample.meta.jsonl
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    return path.join(dir, name + METADATA_EXTENSION_LEGACY);
  }

  public async save(thread: CommentThread): Promise<void> {
    const threads = await this.findByFilePath(thread.filePath);
    const index = threads.findIndex((t) => t.id === thread.id);

    if (index !== -1) {
      threads[index] = thread;
    } else {
      threads.push(thread);
    }

    const normalized = this.normalizePath(thread.filePath);
    this.cache.set(normalized, [...threads]);
    await this.writeThreads(thread.filePath, threads);
  }

  public async delete(filePath: string, threadId: string): Promise<void> {
    const threads = await this.findByFilePath(filePath);
    const filtered = threads.filter((t) => t.id !== threadId);
    const normalized = this.normalizePath(filePath);
    this.cache.set(normalized, filtered);
    await this.writeThreads(filePath, filtered);
  }

  public async findByFilePath(filePath: string): Promise<CommentThread[]> {
    const normalized = this.normalizePath(filePath);
    if (this.cache.has(normalized)) {
      return [...(this.cache.get(normalized) || [])];
    }

    let threads: CommentThread[] = [];

    // 1. Try reading new format (.meta.json)
    const primaryPath = this.getPrimaryPath(filePath);
    try {
      const content = await fs.readFile(primaryPath, "utf-8");
      const result = this.parseNewFormat(content, filePath);
      if (result) {
        threads = result;
        this.cache.set(normalized, threads);
        return [...threads];
      }
    } catch {
      // File not found or error, try legacy format
    }

    // 2. Try reading legacy format (.meta.jsonl)
    const legacyPath = this.getLegacyPath(filePath);
    try {
      const content = await fs.readFile(legacyPath, "utf-8");
      threads = this.parseLegacyFormat(content, filePath);
    } catch {
      // Not found or error, return empty
    }

    this.cache.set(normalized, threads);
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
    const normalized = this.normalizePath(filePath);
    if (this.tagCache.has(normalized)) {
      return [...(this.tagCache.get(normalized) || [])];
    }
    // ensure loaded
    await this.findByFilePath(filePath);
    return [...(this.tagCache.get(normalized) || [])];
  }

  public async saveTags(filePath: string, tags: string[]): Promise<void> {
    // explicit update
    this.tagCache.set(this.normalizePath(filePath), tags);
    // Write everything back (threads + tags)
    const threads = await this.findByFilePath(filePath);
    await this.writeThreads(filePath, threads, tags);
  }

  /**
   * Write threads to new format (.meta.json) with Pretty Print
   */
  private async writeThreads(
    filePath: string,
    threads: CommentThread[],
    tags?: string[], // optional, if not provided use cache
  ): Promise<void> {
    const primaryPath = this.getPrimaryPath(filePath);
    const existingTags = tags || (await this.getTags(filePath));

    // Build metadata file structure
    const metadataFile: MetadataFile = {
      version: METADATA_VERSION,
      tags: existingTags || [],
      threads: threads.map((t) => this.serializeThread(t)),
    };

    // Pretty print with 2-space indent
    const content = JSON.stringify(metadataFile, null, 2);
    await fs.writeFile(primaryPath, content, "utf-8");
  }

  /**
   * Serialize a thread to the new format
   */
  private serializeThread(thread: CommentThread): SerializedThread {
    return {
      id: thread.id,
      anchor: thread.anchor,
      comments: thread.comments.map((c, index) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        status: index === 0 ? c.status : undefined, // Only root has status
        tags: c.tags,
      })),
    };
  }

  /**
   * Parse new format (.meta.json)
   */
  private parseNewFormat(
    content: string,
    filePath: string,
  ): CommentThread[] | null {
    try {
      const data = JSON.parse(content) as MetadataFile;

      // Validate it's the new format (has version field)
      if (!data.version || !data.threads) {
        return null;
      }

      // Update tag cache
      if (data.tags && data.tags.length > 0) {
        this.tagCache.set(this.normalizePath(filePath), data.tags);
      }

      return this.deserializeThreads(data.threads, filePath);
    } catch {
      return null;
    }
  }

  /**
   * Parse legacy format (.meta.jsonl) - JSON Lines or Markdown-wrapped
   */
  private parseLegacyFormat(
    content: string,
    filePath: string,
  ): CommentThread[] {
    // Check if it looks like Markdown-wrapped JSON (very old legacy format)
    if (content.trim().startsWith("#")) {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]) as {
            threads: SerializedThread[];
          };
          return this.deserializeThreads(data.threads, filePath);
        } catch {
          return [];
        }
      }
    }

    // Parse as JSONL
    return this.parseJsonl(content, filePath);
  }

  /**
   * Parse JSONL format (legacy)
   */
  private parseJsonl(content: string, filePath: string): CommentThread[] {
    const lines = content.trim().split("\n");
    const threads: SerializedThread[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const obj = JSON.parse(line);
        // Dispatch based on 'type' if present
        if (!obj.type || obj.type === MetadataRecordType.CommentThread) {
          threads.push(obj as LegacySerializedThread);
        } else if (obj.type === MetadataRecordType.CommentTagDict) {
          // Update tag cache directly
          const tagRec = obj as LegacyTagDictRecord;
          this.tagCache.set(this.normalizePath(filePath), tagRec.tags);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return this.deserializeThreads(threads, filePath);
  }

  /**
   * Deserialize threads from serialized format
   */
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
