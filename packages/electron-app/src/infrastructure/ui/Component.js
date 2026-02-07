export class Component {
    constructor(elementId) {
        const el = document.getElementById(elementId);
        if (!el) {
            throw new Error(`Component Error: Element with id '${elementId}' not found.`);
        }
        this.element = el;
    }
    show(displayStyle = "block") {
        this.element.style.display = displayStyle;
    }
    hide() {
        this.element.style.display = "none";
    }
    isVisible() {
        return this.element.style.display !== "none";
    }
    getElement(selector) {
        return this.element.querySelector(selector);
    }
}
//# sourceMappingURL=Component.js.map