import { IViewResourceProvider } from "./IViewResourceProvider";

export class ViewBuilder {
  constructor(private readonly resourceProvider: IViewResourceProvider) {}

  /**
   * Build the final HTML for a view
   * @param viewName View name (e.g. "preview/preview")
   * @param variables Key-value pairs to replace in the template (e.g. { TITLE: "My Title" })
   */
  async build(
    viewName: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const template = await this.resourceProvider.loadTemplate(viewName);
    const style = await this.resourceProvider.loadStyle(viewName);
    const script = await this.resourceProvider.loadScript(viewName);

    // Initial replacements
    let html = template
      .replace("{{STYLES}}", () => style)
      .replace("{{SCRIPT}}", () => script);

    // Variable replacements
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), () => value);
    }

    return html;
  }

  /**
   * Build a fragment of HTML
   * @param viewName View name
   * @param fragmentName Fragment name
   * @param variables Variables to replace
   */
  async buildFragment(
    viewName: string,
    fragmentName: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const template = await this.resourceProvider.loadFragment(
      viewName,
      fragmentName,
    );
    let html = template;

    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), () => value);
    }

    return html;
  }
}
