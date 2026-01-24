import { CommentThread } from "./Comment";

export interface ICommentRepository {
  save(thread: CommentThread): Promise<void>;
  delete(filePath: string, threadId: string): Promise<void>;
  findByFilePath(filePath: string): Promise<CommentThread[]>;
  findById(filePath: string, id: string): Promise<CommentThread | null>;
}
