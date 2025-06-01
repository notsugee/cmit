# CMIT: Git Commit Message Generator

**CMIT** is a Visual Studio Code extension that generates concise Git commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) format. It supports AI-generated messages using OpenAI (`gpt-4o-mini`) or Google Gemini (`gemini-1.5-flash`), as well as rule-based messages with optional emoji support. The extension provides a Webview interface for editing multi-line commit messages and integrates seamlessly with VS Code’s Git extension.

## Features

- **AI-Generated Commit Messages**: Use OpenAI (`gpt-4o-mini`) or Google Gemini (`gemini-1.5-flash`) to generate commit messages based on staged changes and Git diff.
- **Rule-Based Fallback**: Generates Conventional Commits messages based on file types, paths, and statuses when AI is disabled or fails.
- **Webview Interface**: Edit multi-line commit messages in a customizable Webview with a textarea, “Commit” and “Cancel” buttons, and keyboard shortcuts (`Ctrl+Enter` to commit, `Escape` to cancel).
- **Emoji Support**: Optionally include emojis in rule-based messages (e.g., ✨ for `feat`, 🐛 for `fix`).
- **Module Naming**: Derives module names from the last directory of staged files (e.g., `auth` for `src/auth/login.js`).
- **Comment Ignoring**: Lines starting with `#` in the commit message are ignored in the final commit.
- **No Length Limits**: Supports commit messages of any length, with AI messages capped at 100 tokens for brevity.

## Installation

1. **Install from VS Code Marketplace**:
   - Search for “CMIT” in the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Click “Install” to add the extension.
2. **Manual Installation** (if not published yet):
   - Clone or download the extension repository.
   - Run `npm install` in the project directory to install dependencies.
   - Package the extension: `vsce package`.
   - Install the `.vsix` file in VS Code via “Install from VSIX” in the Extensions view.

## Usage

1. **Stage Files**:
   - Use `git add` to stage changes in your Git repository (e.g., `git add src/auth/login.js`).
2. **Run the Command**:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
   - Select `cmit: Generate Commit Message`.
3. **Edit the Commit Message**:
   - A Webview appears with a generated commit message (AI or rule-based).
   - Edit the message in the textarea.
   - Click “Commit” or press `Ctrl+Enter` to commit the changes.
   - Click “Cancel” or press `Escape` to abort.
4. **Verify the Commit**:
   - Check the commit history (`git log`) to confirm the message.

## Configuration

Configure the extension in VS Code’s settings (`Ctrl+,` or `Cmd+,` on macOS) under `Extensions > CMIT`. Available settings:

- **cmit.useEmojis**:
  - Type: `boolean`
  - Default: `true`
  - Description: Enable or disable emojis in rule-based commit messages (e.g., ✨ for `feat`, 🐛 for `fix`).
- **cmit.aiProvider**:
  - Type: `string`
  - Options: `none`, `gpt-4o-mini`, `gemini-1.5-flash`
  - Default: `none`
  - Description: Select the AI provider for generating commit messages. Choose `none` for rule-based messages.
- **cmit.apiKey**:
  - Type: `string`
  - Default: `""`
  - Description: API key for the selected AI provider. Obtain from [OpenAI](https://platform.openai.com) for `gpt-4o-mini` or [Google AI Studio](https://ai.google.dev) for `gemini-1.5-flash`.

**Example Settings** (in `settings.json`):

```json
{
  "cmit.useEmojis": true,
  "cmit.aiProvider": "gpt-4o-mini",
  "cmit.apiKey": "your-openai-api-key"
}
```

## Examples

### AI-Generated Message (gpt-4o-mini)

**Staged Files**: `src/auth/login.js`, `src/auth/auth.js`
**Output** (in Webview):

```
feat: add auth module

Added login and auth functions for user authentication.
```

### Rule-Based Message (none)

**Staged Files**: `docs/guide.md`
**Output** (in Webview):

```
📝 docs: update guide.md

Updated documentation in docs.
```

### Rule-Based Message with Multiple Files

**Staged Files**: `src/auth/login.js`, `src/auth/auth.js`
**Output** (in Webview):

```
✨ feat: add auth feature

Added new functionality to auth.
```

## Requirements

- **VS Code Version**: 1.100.0 or higher.
- **Git Extension**: The built-in VS Code Git extension must be enabled.
- **Git Repository**: A Git repository must be initialized and open in the workspace.
- **API Keys** (for AI):
  - OpenAI API key for `gpt-4o-mini` (from [platform.openai.com](https://platform.openai.com)).
  - Gemini API key for `gemini-1.5-flash` (from [ai.google.dev](https://ai.google.dev)).
- **Node.js**: Version 20.x for development and testing.

## Troubleshooting

- **Webview Stuck at “Loading commit message…”**:
  - Ensure a Git repository is open and files are staged.
  - Check the Output panel (`Ctrl+Shift+U`, select “Extension Host”) for errors like `error getting staged diff:` or `CMIT: error calling ... API:`.
  - Verify `cmit.aiProvider` and `cmit.apiKey` in settings.
- **No Commit Message Generated**:
  - Confirm the VS Code Git extension is enabled.
  - Stage files with `git add`.
  - Check for error messages in the VS Code notification area.
- **AI Message Not Generated**:
  - Verify the API key is valid and matches the provider.
  - Set `cmit.aiProvider` to `none` to use rule-based messages as a fallback.
- **Emojis Not Showing**:
  - Ensure `cmit.useEmojis` is `true` in settings.

## Development

To contribute or modify the extension:

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd cmit
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Tests**:
   ```bash
   npm test
   ```
4. **Lint Code**:
   ```bash
   npm run lint
   ```
5. **Launch Extension**:
   - Open the project in VS Code.
   - Press `F5` to start the Extension Development Host.
6. **Package and Publish**:
   - Install `vsce`: `npm install -g vsce`.
   - Package: `vsce package`.
   - Publish: `vsce publish` (requires Azure DevOps account).

## License

MIT

## Acknowledgments

- Built with the [VS Code Extension API](https://code.visualstudio.com/api).
- Uses [Conventional Commits](https://www.conventionalcommits.org/) for standardized commit messages.
- Powered by [OpenAI](https://openai.com) and [Google Gemini](https://ai.google.dev) for AI features.
