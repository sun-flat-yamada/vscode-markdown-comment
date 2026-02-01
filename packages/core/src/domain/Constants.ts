export const METADATA_EXTENSION = ".meta.json"; // New format (Pretty Printed JSON)
export const METADATA_EXTENSION_LEGACY = ".meta.jsonl"; // Legacy format (JSON Lines)
export const HTML_EXTENSION = ".html";
export const CSS_EXTENSION = ".css";
export const SCSS_EXTENSION = ".scss";
export const JS_EXTENSION = ".js";
export const TS_EXTENSION = ".ts";
export const MARKDOWN_EXTENSION = ".md";
export const METADATA_VERSION = "2.0";

export enum MetadataRecordType {
  CommentThread = "comment_thread",
  CommentTagDict = "comment_tag_dict",
}

export const COMMENT_CONTROLLER_ID = "markdown-comment-comments";
export const COMMENTS_VIEW_ID = "markdown-comment.comments";
