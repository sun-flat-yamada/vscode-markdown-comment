import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension should be present", () => {
    assert.ok(
      vscode.extensions.getExtension("sun-flat-yamada.markdown-comment"),
    );
  });

  test("Analyze command should be registered", async () => {
    const extension = vscode.extensions.getExtension(
      "sun-flat-yamada.markdown-comment",
    );
    assert.ok(extension, "Extension should be found");

    await extension.activate();

    // This is a basic check to see if the command appears in the list
    const commands = await vscode.commands.getCommands(true);
    const commentCommands = commands.filter((c) =>
      c.startsWith("markdown-comment"),
    );
    console.log("Registered comment commands:", commentCommands);

    assert.ok(
      commands.includes("markdown-comment.analyze"),
      `Command 'markdown-comment.analyze' not found in [${commentCommands.join(", ")}]`,
    );
  });
});
