const vscode = require("vscode");

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    "cmit.generateCommitMessage",
    async () => {
      const commitMessage = "Add feature";

      const userInput = await vscode.window.showInputBox({
        prompt: "Enter your commit message",
        value: commitMessage,
        placeHolder: "Type or edit your commit message here",
      });

      // show confirmation
      if (userInput) {
        vscode.window.showInformationMessage(`Commit message: ${userInput}`);
      } else {
        vscode.window.showWarningMessage("No commit message provided.");
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
