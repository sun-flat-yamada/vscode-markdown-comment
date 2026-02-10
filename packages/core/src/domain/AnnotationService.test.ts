import * as assert from "assert";
import { AnnotationService } from "./AnnotationService";

suite("AnnotationService", () => {
  let service: AnnotationService;

  setup(() => {
    service = new AnnotationService();
  });

  test("injectPlaceholders handles simple anchors", () => {
    const content = "Hello world";
    const threads = [
      { id: "t1", anchor: { offset: 0, length: 5 } }, // Hello
    ];

    const result = service.injectPlaceholders(content, threads);

    // MCFIRST0MC + Hello + MCEND0MC + world
    // Note: implementation wraps the segment.
    const expected = "MCFIRST0MCHelloMCEND0MC world";
    assert.strictEqual(result.htmlContent, expected);
  });

  test("injectPlaceholders handles multiple threads", () => {
    const content = "Hello world";
    const threads = [
      { id: "t1", anchor: { offset: 0, length: 5 } }, // Hello
      { id: "t2", anchor: { offset: 6, length: 5 } }, // world
    ];

    const result = service.injectPlaceholders(content, threads);
    // MCFIRST0MCHelloMCEND0MC MCFIRST1MCworldMCEND1MC
    // Note: space is between them at offset 5.
    // 0-5: Hello
    // 5-6: " " (untouched)
    // 6-11: world
    const segment1 = "MCFIRST0MCHelloMCEND0MC";
    const space = " ";
    const segment2 = "MCFIRST1MCworldMCEND1MC";
    assert.strictEqual(result.htmlContent, segment1 + space + segment2);
  });

  test("injectPlaceholders protects HTML tags (snaps outward)", () => {
    const content = "<div>Target</div>";
    const threads = [
      { id: "t1", anchor: { offset: 1, length: 3 } }, // "div" inside <div>
    ];

    // Should snap to wrap the whole <div>
    const result = service.injectPlaceholders(content, threads);
    assert.ok(result.htmlContent.includes("MCFIRST0MC<div>MCEND0MC"));
  });

  test("injectPlaceholders protects HTML tags (snaps when overlap)", () => {
    const content = "<span>Unsafe</span>";
    // <span> is 0-6. </span> is 12-19.
    // Attempt anchor starting INSIDE the tag: offset 2 ("apn")
    const threads = [{ id: "t1", anchor: { offset: 2, length: 3 } }];

    // Should snap start to 0 or 6?
    // The logic: if offset is inside <...>, snap start to 'before' or 'after'.
    // Logic: if point.type == start, snap to 'start' (outward left).
    const result = service.injectPlaceholders(content, threads);

    // We expect the anchor to expand to include the tag, or move outside.
    // The logic in AnnotationService:
    // if start -> set to range.start (before <)
    // if end -> set to range.end (after >)

    // So t1 start (2) -> 0.
    // t1 end (5) -> 2+3=5. 5 is inside <span>? "pan"
    // content[2] = 'a', [3]='n', [4]='>'
    // <span> i s s p a n >
    // 012345
    // < s p a n >
    // offset 2 is 'p'.
    // offset 5 is '>'.
    // Protection range is 0-6 (entire tag).
    // Start snaps to 0.
    // End snaps to 6?
    // Wait, end check passes offset 5. 5 is inside. So end snaps to 6.

    // Result should wrap the tag.
    // MCFIRST0MC<span>MCEND0MC...
    assert.strictEqual(
      result.htmlContent.startsWith("MCFIRST0MC<span>MCEND0MC"),
      true,
    );
  });

  test("injectPlaceholders protects Markdown links", () => {
    const content = "Click [Here](http://url)";
    // [Here] is 6-12 (Here is 7-11).
    // Try anchoring "Here". offset 7.
    // Logic checks: inside [...]
    const threads = [{ id: "t1", anchor: { offset: 7, length: 4 } }];

    const result = service.injectPlaceholders(content, threads);
    // Should snap out of [Here](...)
    // Markdown range involves the whole thing?
    // Implementation: getMarkdownSyntaxRange checks [ ... ] or ![ ... ] and following (...)
    // So it should detect [Here](http://url).
    // It should wrap the WHOLE link.

    assert.ok(
      result.htmlContent.includes("MCFIRST0MC[Here](http://url)MCEND0MC"),
    );
  });

  test("injectPlaceholders protects Headers (snaps end)", () => {
    const content = "# Header";
    // Anchor starts at 0. length 1 (#).
    const threads = [{ id: "t1", anchor: { offset: 0, length: 1 } }];

    const result = service.injectPlaceholders(content, threads);
    console.log("HTML (Header):", result.htmlContent);
    assert.strictEqual(result.htmlContent.startsWith("# "), true);
    assert.ok(result.htmlContent.includes("MCFIRST0MC"));
  });

  test("injectPlaceholders handles overlapping comments (nested)", () => {
    const content = "Hello world";
    // t1: Hello (0-5)
    // t2: el (1-3) -> Nested in t1
    // Expected: t2 should be "on top" / "inner".
    // Structure: MCFIRST0MC H MCFIRST1MC el MCEND1MC lo MCEND0MC
    const threads = [
      { id: "t1", anchor: { offset: 0, length: 5 }, createdAt: new Date(1000) },
      { id: "t2", anchor: { offset: 1, length: 2 }, createdAt: new Date(2000) },
    ];

    const result = service.injectPlaceholders(content, threads as any);
    // We expect index 1 (t2) to be opened AFTER index 0 (t1) when they overlap.
    // Index 0 starts at 0. Index 1 starts at 1.
    // 0: "H" -> Active=[t1]. MCFIRST0MC H MCEND0MC
    // 1-3: "el" -> Active=[t1, t2]. Sort=[t2, t1] (t2 is inner).
    //      Segment: MCFIRST1MC el MCEND1MC
    //      Wrapped by t1: MCSTART0MC MCFIRST1MC el MCEND1MC MCEND0MC
    // 3-5: "lo" -> Active=[t1]. MCSTART0MC lo MCEND0MC
    const expected =
      "MCFIRST0MCHMCEND0MC" +
      "MCSTART0MCMCFIRST1MCelMCEND1MCMCEND0MC" +
      "MCSTART0MCloMCEND0MC" +
      " world";

    assert.strictEqual(result.htmlContent, expected);
  });

  test("injectPlaceholders handles identical ranges (newer is inner)", () => {
    const content = "Hello";
    // t1: Hello (0-5), Old
    // t2: Hello (0-5), New
    // Expected: t2 is inner (opened last).
    // MCFIRST0MC MCFIRST1MC Hello MCEND1MC MCEND0MC
    const threads = [
      { id: "t1", anchor: { offset: 0, length: 5 }, createdAt: new Date(1000) },
      { id: "t2", anchor: { offset: 0, length: 5 }, createdAt: new Date(2000) },
    ];

    const result = service.injectPlaceholders(content, threads as any);
    // Since both start at 0, the sorting order of "active" determines who comes first.
    // Currently, typical set iteration might be insertion order.
    // We WANT t1 (older) to be outer (first in string), t2 (newer) to be inner (second in string).
    // So: ...t1... ...t2... content ...
    assert.ok(
      result.htmlContent.includes("MCFIRST0MCMCFIRST1MCHelloMCEND1MCMCEND0MC"),
    );
  });
});
