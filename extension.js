const vscode = require("vscode");
const path = require("path");
const fs = require("fs").promises;
const os = require("os");

let lastPanel = null;

async function getStagedDiff(repo) {
  try {
    const diff = await repo.diffIndexWithHEAD();
    return diff || "";
  } catch (error) {
    console.log("error getting staged diff:", error);
    vscode.window.showErrorMessage(
      `Error getting staged diff: ${error.message}`
    );
    return "";
  }
}

async function generateAIMessage(provider, apiKey, diff, files) {
  let url, headers, body;
  const fileList = files.map((f) => `${f.fileName} (${f.filePath})`).join(", ");
  const prompt = `Generate a Git commit message in Conventional Commits format with a subject line and a body. The subject should be concise (around 50 characters, not enforced) in the format "<type>: <description>" (e.g., "feat: add auth module"). The body, separated by two new lines, should briefly describe only what was done in the changes, using 1-2 short sentences. Do not include future work or speculative comments. Based on these files: ${fileList}. Diff:\n\n${diff}\n\nTypes: feat (new feature), fix (bug fix), docs (documentation), style (formatting), refactor (code change), test (tests), chore (misc). Summarize changes, avoiding listing individual files in the message. Examples:\n\nfeat: add auth module\n\nAdded login and auth functions for user authentication.\n\nfix: resolve login bugs\n\nFixed login validation and error handling.`;

  if (provider === "gpt-4o-mini") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    body = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    };
  } else if (provider === "gemini-1.5-flash") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    headers = { "Content-Type": "application/json" };
    body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    };
  } else {
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    let message;
    if (provider === "gpt-4o-mini") {
      // @ts-ignore
      message = data.choices[0].message.content.trim();
    } else if (provider === "gemini-1.5-flash") {
      // @ts-ignore
      message = data.candidates[0].content.parts[0].text.trim();
    }
    return message;
  } catch (error) {
    console.log(`CMIT: error calling ${provider} API:`, error);
    vscode.window.showWarningMessage(
      `Failed to generate AI commit message: ${error.message}. Falling back to rule-based message.`
    );
    return null;
  }
}

function getModuleName(filePaths) {
  // extract last directory from each file path
  const lastDirs = filePaths.map((f) => path.basename(path.dirname(f)));
  const uniqueLastDirs = [...new Set(lastDirs)];
  // return single last directory if all files share it, else "files"
  return uniqueLastDirs.length === 1 && uniqueLastDirs[0]
    ? uniqueLastDirs[0]
    : "files";
}

async function promptForCommit(initialMessage, repoPath) {
  return new Promise((resolve) => {
    if (lastPanel) {
      lastPanel.dispose();
      lastPanel = null;
    }

    setTimeout(() => {
      const uniqueId = `cmit_${Date.now()}_${Math.floor(
        Math.random() * 1000000
      )}`;

      const panel = vscode.window.createWebviewPanel(
        uniqueId,
        `Commit Message`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: false,
        }
      );

      lastPanel = panel;

      // html webview content
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Commit Message</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              background-color: var(--vscode-editor-background, #1f1f1f);
              color: var(--vscode-editor-foreground, #cccccc);
              height: 100vh;
              overflow: hidden;
            }
            .container {
              height: 100%;
              display: flex;
              flex-direction: column;
              max-width: 800px;
              margin: 0 auto;
            }
            h2 {
              margin-bottom: 15px;
              color: var(--vscode-titleBar-activeForeground, #cccccc);
            }
            textarea {
              flex: 1;
              min-height: 200px;
              font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
              font-size: var(--vscode-editor-font-size, 14px);
              padding: 12px;
              border: 1px solid var(--vscode-input-border, #3c3c3c);
              border-radius: 4px;
              background-color: var(--vscode-input-background, #2c2c2c);
              color: var(--vscode-input-foreground, #cccccc);
              resize: vertical;
              outline: none;
              margin-bottom: 15px;
            }
            textarea:focus {
              border-color: var(--vscode-focusBorder, #007acc);
              box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
            }
            .buttons {
              display: flex;
              gap: 10px;
              justify-content: flex-end;
            }
            button {
              padding: 8px 20px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
            }
            .save {
              background-color: var(--vscode-button-background, #0e639c);
              color: var(--vscode-button-foreground, white);
            }
            .save:hover {
              background-color: var(--vscode-button-hoverBackground, #1177bb);
            }
            .cancel {
              background-color: var(--vscode-button-secondaryBackground, #3c3c3c);
              color: var(--vscode-button-secondaryForeground, #cccccc);
            }
            .cancel:hover {
              background-color: var(--vscode-button-secondaryHoverBackground, #4c4c4c);
            }
            .instructions {
              color: var(--vscode-descriptionForeground, #999);
              font-size: 12px;
              margin-top: 10px;
              line-height: 1.4;
            }
            .loading {
              opacity: 0.5;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <div class="container loading" id="container">
            <h2>Enter Commit Message</h2>
            <textarea 
              id="commitMessage" 
              placeholder="Loading commit message..."
              disabled
            ></textarea>
            <div class="buttons">
              <button class="cancel" onclick="cancel()" disabled>Cancel</button>
              <button class="save" onclick="save()" disabled>Commit</button>
            </div>
            <div class="instructions">
              Enter your commit message above. Click "Commit" to proceed or "Cancel" to abort.<br>
              Lines starting with '#' will be ignored in the final commit message.
            </div>
          </div>
          
          <script>
            const vscode = acquireVsCodeApi();
            const textarea = document.getElementById('commitMessage');
            const container = document.getElementById('container');
            const buttons = document.querySelectorAll('button');
            
            vscode.postMessage({ command: 'ready' });
            
            window.addEventListener('message', event => {
              const message = event.data;
              
              switch (message.command) {
                case 'setMessage':
                  textarea.value = message.content;
                  textarea.disabled = false;
                  textarea.placeholder = 'Enter your commit message...';
                  buttons.forEach(btn => btn.disabled = false);
                  container.classList.remove('loading');
                  textarea.focus();
                  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                  break;
              }
            });
            
            function save() {
              const message = textarea.value;
              
              const content = message
                .split('\\n')
                .filter(line => !line.trim().startsWith('#'))
                .join('\\n')
                .trim();
                
              if (!content) {
                alert('No commit message entered. Please enter a message or cancel.');
                return;
              }
              
              vscode.postMessage({ command: 'save', message: content });
            }
            
            function cancel() {
              vscode.postMessage({ command: 'cancel' });
            }
            
            textarea.addEventListener('keydown', function(e) {
              if (e.ctrlKey && e.key === 'Enter') {
                save();
              } else if (e.key === 'Escape') {
                cancel();
              }
            });
          </script>
        </body>
        </html>
      `;

      panel.webview.html = htmlContent;
      panel.reveal(vscode.ViewColumn.One);

      const messageHandler = panel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
          case "ready":
            panel.webview.postMessage({
              command: "setMessage",
              content: initialMessage,
            });
            break;

          case "save":
            messageHandler.dispose();
            if (message.message && message.message.trim()) {
              resolve(message.message);
            } else {
              vscode.window.showWarningMessage(
                "No commit message entered. Commit cancelled."
              );
              resolve(null);
            }
            panel.dispose();
            lastPanel = null;
            break;

          case "cancel":
            messageHandler.dispose();
            resolve(null);
            panel.dispose();
            lastPanel = null;
            break;
        }
      });

      panel.onDidDispose(() => {
        messageHandler.dispose();
        if (lastPanel === panel) {
          lastPanel = null;
        }
        resolve(null);
      });
    }, 100);
  });
}

function activate(context) {
  const generateCommand = vscode.commands.registerCommand(
    "cmit.generateCommitMessage",
    async () => {
      try {
        // get the git extension
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

        // get the current repo
        const repo = git.repositories[0];
        if (!repo) {
          vscode.window.showErrorMessage(
            "No Git repository found. Please open a repository."
          );
          return;
        }

        // get staged changes
        const stagedChanges = repo.state.indexChanges;
        if (!stagedChanges || stagedChanges.length === 0) {
          vscode.window.showErrorMessage(
            "No staged changes found. Please stage files with git add."
          );
          return;
        }

        // get user settings
        const config = vscode.workspace.getConfiguration("cmit");
        const useEmojis = config.get("useEmojis", true);
        const aiProvider = config.get("aiProvider", "none");
        const apiKey = config.get("apiKey", "");

        let commitMessage = "";
        let messageSource = "none";

        // try AI message if enabled
        if (aiProvider !== "none" && apiKey) {
          messageSource = "ai";
          const diff = await getStagedDiff(repo);
          const files = stagedChanges.map((change) => ({
            fileName: path.basename(change.uri.fsPath),
            filePath: change.uri.fsPath,
            status: change.status,
          }));
          if (diff) {
            const aiMessage = await generateAIMessage(
              aiProvider,
              apiKey,
              diff,
              files
            );
            if (aiMessage) {
              commitMessage = aiMessage;
            } else {
              messageSource = "fallback";
            }
          } else {
            vscode.window.showWarningMessage(
              "No staged changes diff available. Using rule-based message."
            );
            messageSource = "fallback";
          }
        } else {
          messageSource = "fallback";
        }

        // generate fallback if required
        if (messageSource === "fallback") {
          const filePaths = stagedChanges.map((change) => change.uri.fsPath);
          const moduleName = getModuleName(filePaths);
          const files = stagedChanges.map((change) => ({
            fileName: path.basename(change.uri.fsPath),
            filePath: change.uri.fsPath,
            status: change.status,
          }));

          // analyze file types and statuses
          let commitType = "chore";
          let emoji = useEmojis ? "🔧 " : "";
          let body = `Modified ${files.length} file${
            files.length > 1 ? "s" : ""
          } in ${moduleName}.`;

          // group files by extension and path
          const extensions = files.map((f) =>
            path.extname(f.fileName).toLowerCase()
          );
          const uniqueExtensions = [...new Set(extensions)];
          const isTest = files.some(
            (f) =>
              f.filePath.includes("test") ||
              f.fileName.includes(".test.") ||
              f.fileName.includes(".spec.")
          );
          const isDocs = files.some((f) =>
            [".md", ".txt", ".rst"].includes(
              path.extname(f.fileName).toLowerCase()
            )
          );
          const isStyle = files.some((f) =>
            [".css", ".scss", ".less"].includes(
              path.extname(f.fileName).toLowerCase()
            )
          );
          const isConfig = files.some((f) =>
            [".json", ".yml", ".yaml", ".eslintrc", ".prettierrc"].includes(
              path.extname(f.fileName).toLowerCase()
            )
          );

          // determine commit type based on file types and paths
          if (isTest) {
            commitType = "test";
            emoji = useEmojis ? "🧪 " : "";
            body = `Added or updated tests in ${moduleName}.`;
          } else if (isDocs) {
            commitType = "docs";
            emoji = useEmojis ? "📝 " : "";
            body = `Updated documentation in ${moduleName}.`;
          } else if (isStyle) {
            commitType = "style";
            emoji = useEmojis ? "🎨 " : "";
            body = `Applied styling changes in ${moduleName}.`;
          } else if (isConfig) {
            commitType = "chore";
            emoji = useEmojis ? "🔧 " : "";
            body = `Updated configuration in ${moduleName}.`;
          } else if (
            uniqueExtensions.every((ext) =>
              [".js", ".jsx", ".ts", ".tsx"].includes(ext)
            )
          ) {
            const statuses = files.map((f) => f.status);
            const uniqueStatuses = [...new Set(statuses)];
            if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 1) {
              commitType = "feat";
              emoji = useEmojis ? "✨ " : "";
              body = `Added new functionality to ${moduleName}.`;
            } else {
              commitType = "fix";
              emoji = useEmojis ? "🐛 " : "";
              body = `Fixed issues in ${moduleName} module.`;
            }
          }

          let subject = `${commitType}: modify ${moduleName}`;
          if (files.length === 1) {
            subject = `${commitType}: ${
              commitType === "docs" ? "update" : "modify"
            } ${files[0].fileName}`;
          } else if (commitType === "feat" || commitType === "fix") {
            subject = `${commitType}: add ${moduleName} ${
              commitType === "feat" ? "feature" : "fixes"
            }`;
          }

          commitMessage = `${emoji}${subject}\n\n${body}`.trim();
        }

        const userInput = await promptForCommit(
          commitMessage,
          repo.rootUri.fsPath
        );

        // confirm if user provided message
        if (userInput) {
          try {
            await repo.commit(userInput);
            vscode.window.showInformationMessage(
              `Committed with message: ${userInput.split("\n")[0]}`
            );
          } catch (commitError) {
            vscode.window.showErrorMessage(
              `Failed to commit: ${commitError.message}`
            );
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
