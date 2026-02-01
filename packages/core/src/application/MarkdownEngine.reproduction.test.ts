import * as assert from "assert";
import { MarkdownEngine } from "./MarkdownEngine";
import { IResourceProvider } from "./MarkdownEngine";

suite("MarkdownEngine Reproduction", () => {
  const mockProvider: IResourceProvider = {
    asWebviewUri: (p) => `vscode-resource://${p}`,
  };
  const engine = new MarkdownEngine(mockProvider);

  test("should render <img> tag correctly even if it contains placeholders (simulating breakage)", () => {
    // This simulates ShowPreviewUseCase splitting an <img> tag
    const content = '<img src="MCFIRST0MCimages/logo.png" alt="Logo" />';
    const rendered = engine.render(content, "test.md");

    // If it's correctly handled by MarkdownEngine's patchHtml,
    // the placeholder inside src should be stripped and path resolved.
    assert.ok(
      rendered.includes('<img src="vscode-resource://'),
      "Should resolve image path",
    );
    assert.ok(!rendered.includes("MCFIRST0MC"), "Should strip placeholder");
  });

  test("should NOT break <img> tag if placeholder is injected at the start of attribute", () => {
    // Another case of breakage
    const content = '<img MCFIRST0MCsrc="logo.png" />';
    const rendered = engine.render(content, "test.md");

    // This is tricky. If MarkdownIt doesn't recognize it as HTML, it might be escaped.
    // If it's escaped, it will contain &lt;img
    assert.ok(!rendered.includes("&lt;img"), "Should NOT be escaped");
  });
});
