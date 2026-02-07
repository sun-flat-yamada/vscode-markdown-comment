export abstract class Component {
  protected element: HTMLElement;

  constructor(elementId: string) {
    const el = document.getElementById(elementId);
    if (!el) {
      throw new Error(
        `Component Error: Element with id '${elementId}' not found.`,
      );
    }
    this.element = el;
  }

  public show(displayStyle: string = "block"): void {
    this.element.style.display = displayStyle;
  }

  public hide(): void {
    this.element.style.display = "none";
  }

  public isVisible(): boolean {
    return this.element.style.display !== "none";
  }

  protected getElement<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector(selector) as T | null;
  }
}
