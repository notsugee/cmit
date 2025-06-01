const vscode = require("vscode");
const path = require("path");

function activate(context) {
  const generateCommand = vscode.commands.registerCommand(
    "cmit.generateCommitMessage",
    async () => {
      try {
        // getting the git extension
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
          vscode.window.showErrorMessage(
            "Git extension not found. Please ensure Git is enabled."
          );
          return;
        }
        await gitExtension.activate();
        const git = gitExtension.exports.getAPI(1);
        if (!git) {
          vscode.window.showErrorMessage("Git API not available.");
          return;
        }

        // getting the current repo
        const repo = git.repositories[0];
        if (!repo) {
          vscode.window.showErrorMessage(
            "No Git repository found. Please open a repository."
          );
          return;
        }

        // getting staged changes
        const stagedChanges = repo.state.indexChanges;
        console.log(
          "Staged changes:",
          stagedChanges.map((change) => change.uri.fsPath)
        );
        if (!stagedChanges || stagedChanges.length === 0) {
          vscode.window.showErrorMessage(
            "No staged changes found. Please stage files with git add."
          );
          return;
        }

        // getting user settings to check for emojis
        const config = vscode.workspace.getConfiguration("cmit");
        const useEmojis = config.get("useEmojis", true);
        const maxLength = config.get("maxLength", 72);

        // generating a commit message based on the first staged file
        const firstChange = stagedChanges[0];
        const filePath = firstChange.uri.fsPath;
        const fileName = path.basename(filePath);
        const pathParts = path.dirname(filePath).split(path.sep);

        // getting parent folder as module
        const moduleName =
          pathParts.length > 1 ? pathParts[pathParts.length - 1] : "";

        let commitType = "";
        let emoji = "";
        switch (firstChange.status) {
          case 1:
            commitType = "Add";
            emoji = useEmojis ? "✨ " : "";
            break;
          case 0:
            commitType = "Update";
            emoji = useEmojis ? "🐛 " : "";
            break;
          case 2:
            commitType = "Delete";
            emoji = useEmojis ? "🗑️ " : "";
            break;
          case 3:
            commitType = "Rename";
            emoji = useEmojis ? "🔄 " : "";
            break;
          case 4:
            commitType = "Copy";
            emoji = useEmojis ? "📋 " : "";
            break;
          default:
            commitType = "Change";
            emoji = useEmojis ? "🔧 " : "";
        }

        // building the commit message
        const context = moduleName ? `${moduleName} ` : "";
        const commitMessage =
          `${emoji}${commitType} ${context}${fileName}`.trim();

        // showing input box with the generated message
        const promptForCommit = async (initialMessage) => {
          const userInput = await vscode.window.showInputBox({
            prompt: "Enter your commit message",
            value: initialMessage,
            placeHolder: "Type or edit the commit message",
          });

          if (!userInput) {
            vscode.window.showWarningMessage(
              "No commit message entered. Commit cancelled."
            );
            return null;
          }

          if (userInput.length > maxLength) {
            vscode.window.showErrorMessage(
              `Commit message exceeds maximum length of ${maxLength} characters. Please shorten it.`
            );
            return await promptForCommit(userInput);
          }

          return userInput;
        };

        // prompt for the commit message
        const userInput = await promptForCommit(commitMessage);

        // if user provided message, show confirmation
        if (userInput) {
          try {
            await repo.commit(userInput);
            vscode.window.showInformationMessage(
              `Committed with message: ${userInput}`
            );
          } catch (commitError) {
            vscode.window.showErrorMessage(
              `Failed to commit: ${commitError.message}`
            );
            console.log("Commit error details:", commitError);
          }
        } else {
          vscode.window.showWarningMessage(
            "No commit message entered. Commit cancelled."
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error generating commit message: ${error.message}`
        );
        console.log("Error details:", error);
      }
    }
  );

  context.subscriptions.push(generateCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
