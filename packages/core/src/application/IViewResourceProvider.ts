export interface IViewResourceProvider {
  /**
   * Load HTML template for the given view
   * @param viewName relative path under views directory (e.g. "preview/preview")
   */
  loadTemplate(viewName: string): Promise<string>;

  /**
   * Load CSS styles for the given view (compiles SCSS if needed or loads CSS)
   * @param viewName relative path under views directory
   */
  loadStyle(viewName: string): Promise<string>;

  /**
   * Load Client-side script for the given view
   * @param viewName relative path under views directory
   */
  loadScript(viewName: string): Promise<string>;
  /**
   * Load a fragment HTML for the given view
   * @param viewName relative path under views directory
   * @param fragmentName fragment name (e.g. "row", "cell")
   */
  loadFragment(viewName: string, fragmentName: string): Promise<string>;
}
