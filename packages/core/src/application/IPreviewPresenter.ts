export interface IPreviewPresenter {
  /**
   * 指定されたHTMLコンテンツをプレビューとして表示・更新します。
   * @param html 表示するHTML文字列
   * @param title プレビューのタイトル
   */
  show(
    html: string,
    title: string,
    filePath: string,
    column: "active" | "beside" | undefined,
    threads?: any[],
  ): Promise<void>;

  /**
   * Ensuring the preview panel exists and is ready for rendering (e.g., asWebviewUri and getCspSource).
   */
  ensurePanel(
    filePath: string,
    title: string,
    column?: "active" | "beside",
  ): Promise<void>;

  /**
   * ローカルのファイルパスを Webview で利用可能な URI 形式に変換します。
   */
  asWebviewUri(localPath: string): string;

  /**
   * Webview の CSP ソースを取得します。
   */
  getCspSource(): string;

  /**
   * プレビュー画面で現在選択されているテキストを取得します。
   */
  getSelectedText(): string;

  /**
   * 現在プレビュー表示しているドキュメントのパスを取得します。
   */
  getCurrentFilePath(): string | undefined;

  /**
   * コメントハイライトがクリックされた時のイベントを登録します。
   */
  onDidClickComment(
    callback: (threadId: string, commentId?: string) => void,
  ): void;

  /**
   * プレビュー画面でステータスが変更された時のイベントを登録します。
   */
  onUpdateStatus(
    callback: (threadId: string, commentId: string, status: string) => void,
  ): void;

  /**
   * プレビュー画面のサイドバー表示状態を取得します。
   */
  isSidebarVisible(filePath: string): boolean;

  /**
   * プレビュー画面のサイドバー表示状態が変更された時のイベントを登録します。
   */
  onDidToggleSidebar(
    callback: (filePath: string, visible: boolean) => void,
  ): void;
}
