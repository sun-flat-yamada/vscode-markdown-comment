import { Component } from "../../infrastructure/ui/Component.js";

export class AddCommentDialog extends Component {
  private input: HTMLTextAreaElement;
  private saveBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private title: HTMLHeadingElement;

  public onSave?: (content: string) => void;
  public onCancel?: () => void;

  constructor() {
    super("add-comment-overlay");
    this.input = document.getElementById(
      "comment-input",
    ) as HTMLTextAreaElement;
    this.saveBtn = document.getElementById(
      "save-comment-btn",
    ) as HTMLButtonElement;
    this.cancelBtn = document.getElementById(
      "cancel-comment-btn",
    ) as HTMLButtonElement;
    this.title = document.getElementById("modal-title") as HTMLHeadingElement;

    if (this.saveBtn) {
      this.saveBtn.onclick = () => {
        if (this.onSave && this.input) this.onSave(this.input.value);
      };
    }

    if (this.cancelBtn) {
      this.cancelBtn.onclick = () => {
        this.hide();
        if (this.onCancel) this.onCancel();
      };
    }
  }

  public open(
    titleText: string = "Add Comment",
    initialContent: string = "",
  ): void {
    if (this.title) this.title.innerText = titleText;
    if (this.input) {
      this.input.value = initialContent;
      this.input.focus();
    }
    this.show("flex");
  }
}

export class EditTagsDialog extends Component {
  private input: HTMLInputElement;
  private saveBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private tagsList: HTMLDivElement;
  private currentTags: Set<string> = new Set();
  private allTags: Set<string> = new Set(["bug", "feature", "enhancement"]); // Mock initial tags

  public onSave?: (tags: string[]) => void;

  constructor() {
    super("edit-tags-overlay");
    this.input = document.getElementById(
      "tags-filter-input",
    ) as HTMLInputElement;
    this.saveBtn = document.getElementById(
      "save-tags-btn",
    ) as HTMLButtonElement;
    this.cancelBtn = document.getElementById(
      "cancel-tags-btn",
    ) as HTMLButtonElement;
    this.tagsList = document.getElementById("tags-list") as HTMLDivElement;

    if (this.input) {
      this.input.oninput = () => this.renderList();
      this.input.onkeydown = (e) => {
        if (e.key === "Enter") {
          const val = this.input.value.trim();
          if (val) {
            this.toggleTag(val, true);
            this.input.value = "";
            this.renderList();
          }
        }
      };
    }

    if (this.saveBtn) {
      this.saveBtn.onclick = () => {
        if (this.onSave) {
          this.onSave(Array.from(this.currentTags));
        }
        this.hide();
      };
    }
    if (this.cancelBtn) {
      this.cancelBtn.onclick = () => this.hide();
    }
  }

  public open(currentTags: string[]): void {
    this.currentTags = new Set(currentTags);
    if (this.input) {
      this.input.value = "";
      this.input.focus();
    }
    this.renderList();
    this.show("flex");
  }

  private renderList() {
    if (!this.tagsList) return;
    this.tagsList.innerHTML = "";
    const filter = this.input.value.trim().toLowerCase();

    // Existing Tags
    const shownTags = Array.from(this.allTags).filter((t) =>
      t.toLowerCase().includes(filter),
    );

    shownTags.forEach((tag) => {
      const div = document.createElement("div");
      div.className = "tag-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = this.currentTags.has(tag);
      checkbox.onchange = (e) =>
        this.toggleTag(tag, (e.target as HTMLInputElement).checked);

      const span = document.createElement("span");
      span.innerText = tag;

      div.onclick = (e) => {
        // Prevent toggling when clicking checkbox directly (handled by onchange)
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          this.toggleTag(tag, checkbox.checked);
        }
      };

      div.appendChild(checkbox);
      div.appendChild(span);
      this.tagsList.appendChild(div);
    });

    // Create New Option
    if (filter && !this.allTags.has(filter)) {
      const div = document.createElement("div");
      div.className = "tag-item create-tag"; // IMPORTANT: Class for test
      div.innerHTML = `<span class="tag-icon">+</span> <span>Create "${this.input.value}"</span>`;
      div.onclick = () => {
        this.toggleTag(this.input.value, true);
        this.input.value = "";
        this.renderList();
      };
      this.tagsList.appendChild(div);
    }
  }

  private toggleTag(tag: string, active: boolean) {
    if (active) {
      this.currentTags.add(tag);
      this.allTags.add(tag);
    } else {
      this.currentTags.delete(tag);
    }
  }
}

export class AiPromptDialog extends Component {
  private output: HTMLTextAreaElement;
  private closeBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;

  constructor() {
    super("ai-overlay");
    this.output = document.getElementById(
      "prompt-output",
    ) as HTMLTextAreaElement;
    this.closeBtn = document.getElementById(
      "close-modal-btn",
    ) as HTMLButtonElement;
    this.copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;

    if (this.closeBtn) this.closeBtn.onclick = () => this.hide();
    if (this.copyBtn) {
      this.copyBtn.onclick = () => {
        this.output.select();
        document.execCommand("copy");
        this.copyBtn.innerText = "Copied!";
        setTimeout(() => (this.copyBtn.innerText = "Copy to Clipboard"), 2000);
      };
    }
  }

  public showPrompt(prompt: string): void {
    if (this.output) this.output.value = prompt;
    this.show("flex");
  }
}
