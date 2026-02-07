export class Disposable {
  dispose() {}
}

export enum CommentMode {
  Editing = 0,
  Preview = 1,
}

export enum CommentThreadCollapsibleState {
  Collapsed = 0,
  Expanded = 1,
}

export class Range {
  constructor(
    public startLine: number,
    public startCharacter: number,
    public endLine: number,
    public endCharacter: number,
  ) {}
}

export class Uri {
  static file(path: string) {
    return new Uri(path);
  }
  static parse(path: string) {
    return new Uri(path);
  }
  constructor(public path: string) {
    this.fsPath = path;
  }
  public fsPath: string;
  public scheme = "file";
  toString() {
    return this.path;
  }
}

export class MarkdownString {
  constructor(public value: string) {}
}

export namespace window {
  export const visibleTextEditors: any[] = [];
  export function showInformationMessage() {}
  export function showErrorMessage() {}
  export function createWebviewPanel() {
    return {
      webview: { onDidReceiveMessage: () => {} },
      onDidDispose: () => {},
    };
  }
}

export namespace workspace {
  export function getConfiguration() {
    return { get: () => {} };
  }
  export const workspaceFolders = [];
  export function onDidChangeTextDocument() {}
}

export namespace comments {
  export function createCommentController() {
    return {
      createCommentThread: () => ({ dispose: () => {} }),
      dispose: () => {},
    };
  }
}

export namespace commands {
  export function registerCommand() {}
  export function executeCommand() {}
}

export const ViewColumn = {
  One: 1,
  Two: 2,
};
