import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { StorageManager } from './storage';
import { TodoParser } from './parser';
import { CodeTodo } from './types';

let storageManager: StorageManager;
let todoParser: TodoParser;
let viewProvider: BetterTodosViewProvider | undefined;
let importantDecoration: vscode.TextEditorDecorationType;
let normalDecoration: vscode.TextEditorDecorationType;
let importantCompletedDecoration: vscode.TextEditorDecorationType;
let normalCompletedDecoration: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
  console.log('Better Todos extension activated');

  storageManager = new StorageManager(context);
  todoParser = new TodoParser();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('bettertodos.addLocalTodo', addLocalTodo),
    vscode.commands.registerCommand('bettertodos.addGlobalTodo', addGlobalTodo),
    vscode.commands.registerCommand('bettertodos.refreshCodeTodos', refreshCodeTodos),
    vscode.commands.registerCommand('bettertodos.completeTodo', completeTodo),
    vscode.commands.registerCommand('bettertodos.deleteTodo', deleteTodo),
    vscode.commands.registerCommand('bettertodos.viewCodeTodo', viewCodeTodo)
  );

  // Create webview provider
  viewProvider = new BetterTodosViewProvider(context, todoParser);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('better-todos-panel', viewProvider)
  );

  // Watch for file changes and refresh view
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    fileWatcher.onDidChange(() => viewProvider?.refresh()),
    fileWatcher.onDidCreate(() => viewProvider?.refresh()),
    fileWatcher.onDidDelete(() => viewProvider?.refresh())
  );

  // Create decoration types for highlighting TODOs
  importantDecoration = vscode.window.createTextEditorDecorationType({
    color: 'rgb(218, 0, 0)',
  });

  normalDecoration = vscode.window.createTextEditorDecorationType({
    color: 'rgb(228, 168, 1)',
  });

  importantCompletedDecoration = vscode.window.createTextEditorDecorationType({
    color: 'rgba(255, 15, 15, 0.88)',
    textDecoration: 'line-through',
  });

  normalCompletedDecoration = vscode.window.createTextEditorDecorationType({
    color: 'rgba(252, 185, 0, 0.85)',
    textDecoration: 'line-through',
  });

  // Update decorations for visible editors
  const updateAllDecorations = () => {
    vscode.window.visibleTextEditors.forEach(editor => {
      try {
        updateTodoDecorations(editor);
      } catch (err) {
        console.error('Error updating decorations:', err);
      }
    });
  };

  // Listen to editor/document changes to refresh decorations
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateAllDecorations),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.visibleTextEditors.find(ed => ed.document === e.document);
      if (editor) updateTodoDecorations(editor);
    }),
    vscode.window.onDidChangeVisibleTextEditors(updateAllDecorations)
  );

  // Initial decoration pass
  updateAllDecorations();

  console.log('Better Todos extension setup complete');
}

async function addLocalTodo() {
  const title = await vscode.window.showInputBox({ prompt: 'Enter TODO title', placeHolder: 'Task description' });
  if (!title) return;
  const description = await vscode.window.showInputBox({ prompt: 'Enter TODO description (optional)', placeHolder: 'Additional details' });
  const priority = await vscode.window.showQuickPick(['Normal', 'Important'], { placeHolder: 'Select priority' });
  if (priority) {
    storageManager.addLocalTodo(title, description, priority as 'Normal' | 'Important');
    viewProvider?.refresh();
    vscode.commands.executeCommand('better-todos-panel.focus');
  }
}

async function addGlobalTodo() {
  const title = await vscode.window.showInputBox({ prompt: 'Enter global TODO title', placeHolder: 'Task description' });
  if (!title) return;
  const description = await vscode.window.showInputBox({ prompt: 'Enter TODO description (optional)', placeHolder: 'Additional details' });
  const priority = await vscode.window.showQuickPick(['Normal', 'Important'], { placeHolder: 'Select priority' });
  if (priority) {
    storageManager.addGlobalTodo(title, description, priority as 'Normal' | 'Important');
    viewProvider?.refresh();
    vscode.commands.executeCommand('better-todos-panel.focus');
  }
}

async function refreshCodeTodos() {
  viewProvider?.refresh();
}

async function completeTodo(todoId: string, type: 'local' | 'global' | 'code') {
  if (type === 'local') {
    const todo = storageManager.getLocalTodos().find(t => t.id === todoId);
    if (todo) {
      storageManager.updateLocalTodo(todoId, { completed: !todo.completed });
      viewProvider?.refresh();
    }
  } else if (type === 'global') {
    const todo = storageManager.getGlobalTodos().find(t => t.id === todoId);
    if (todo) {
      storageManager.updateGlobalTodo(todoId, { completed: !todo.completed });
      viewProvider?.refresh();
    }
  }
}

async function deleteTodo(todoId: string, type: 'local' | 'global' | 'code') {
  const confirmed = await vscode.window.showWarningMessage('Delete this TODO?', { modal: true }, 'Delete');
  if (confirmed !== 'Delete') return;
  if (type === 'local') storageManager.deleteLocalTodo(todoId);
  else if (type === 'global') storageManager.deleteGlobalTodo(todoId);
}

async function viewCodeTodo(filePath: string, lineNumber: number) {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }
    const fullPath = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, filePath));
    const document = await vscode.workspace.openTextDocument(fullPath);
    const editor = await vscode.window.showTextDocument(document);
    const line = Math.max(0, lineNumber - 1);
    editor.selection = new vscode.Selection(line, 0, line, 0);
    editor.revealRange(new vscode.Range(line, 0, line, 0));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error viewing code TODO:', errorMsg);
    vscode.window.showErrorMessage(`Failed to open file: ${errorMsg}`);
  }
}

function updateTodoDecorations(editor: vscode.TextEditor) {
  const doc = editor.document;
  const text = doc.getText();

  const importantDecs: vscode.DecorationOptions[] = [];
  const normalDecs: vscode.DecorationOptions[] = [];
  const importantCompletedDecs: vscode.DecorationOptions[] = [];
  const normalCompletedDecs: vscode.DecorationOptions[] = [];

  // Scan single-line comments (# and //)
  // Scan single-line comments (//, #, --)
  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i).text;

    // Matches:
    // // TODO
    // //! TODO
    // // !TODO
    // # TODO
    // #! TODO
    // # !TODO
    // -- TODO
    // --! TODO
    // -- !TODO
    const match = line.match(/(\/\/|#|--)\s*(!)?\s*TODO\b(.*)/i);

    if (!match) continue;

    const start = match.index!;
    const end = line.length;
    const isCompleted = /\[x\]/i.test(match[3]);
    const decoration = {
      range: new vscode.Range(i, start, i, end),
    };

    if (match[2]) {
      if (isCompleted) {
        importantCompletedDecs.push(decoration);
      } else {
        importantDecs.push(decoration);
      }
    } else {
      if (isCompleted) {
        normalCompletedDecs.push(decoration);
      } else {
        normalDecs.push(decoration);
      }
    }
  }

  // Scan block comments and highlight first TODO line inside block
  const blockRegex = /\/\*[\s\S]*?\*\//g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null) {
    const blockStartIndex = m.index;
    const block = m[0];
    const inner = block.replace(/^\/\*/, '').replace(/\*\/$/, '');
    const innerLines = inner.split(/\r?\n/);
    for (let j = 0; j < innerLines.length; j++) {
      const raw = innerLines[j].replace(/^\s*\*?\s*/, '');
      if (!raw.trim()) continue;
      const upper = raw.toUpperCase();
      const tIdx = upper.indexOf('TODO');
      if (tIdx === -1) break; // only consider first meaningful line

      const blockStartLine = doc.positionAt(blockStartIndex).line;
      const targetLine = blockStartLine + j;
      if (targetLine >= doc.lineCount) break;
      const lineText = doc.lineAt(targetLine).text;
      const todoPos = lineText.toUpperCase().indexOf('TODO');
      if (todoPos === -1) break;

      // determine importance (if raw starts with '!')
      const completed = /\[x\]/i.test(raw);
      const range = new vscode.Range(targetLine, todoPos, targetLine, lineText.length);
      if (/^\s*!/.test(raw)) {
        if (completed) {
          importantCompletedDecs.push({ range });
        } else {
          importantDecs.push({ range });
        }
      } else {
        if (completed) {
          normalCompletedDecs.push({ range });
        } else {
          normalDecs.push({ range });
        }
      }
      break;
    }
  }

  editor.setDecorations(importantDecoration, importantDecs);
  editor.setDecorations(normalDecoration, normalDecs);
  editor.setDecorations(importantCompletedDecoration, importantCompletedDecs);
  editor.setDecorations(normalCompletedDecoration, normalCompletedDecs);
}

class BetterTodosViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private context: vscode.ExtensionContext;
  private todoParser: TodoParser;
  private codeTodos: CodeTodo[] = [];

  constructor(context: vscode.ExtensionContext, todoParser: TodoParser) {
    this.context = context;
    this.todoParser = todoParser;
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // initial parse
    this.codeTodos = await this.todoParser.findTodosInWorkspace();

    this.updateViewBadge();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case 'getTodos':
            if (message.tab === 'code') this.codeTodos = await this.todoParser.findTodosInWorkspace();
            this.sendTodos(webviewView.webview, message.tab);
            break;

          case 'requestAddLocalTodo':
            await this.promptAndAddTodo('local');
            this.sendTodos(webviewView.webview, 'local');
            break;

          case 'requestAddGlobalTodo':
            await this.promptAndAddTodo('global');
            this.sendTodos(webviewView.webview, 'global');
            break;

          case 'addLocalTodo':
            storageManager.addLocalTodo(message.title, message.description, message.priority);
            this.sendTodos(webviewView.webview, 'local');
            break;

          case 'addGlobalTodo':
            storageManager.addGlobalTodo(message.title, message.description, message.priority);
            this.sendTodos(webviewView.webview, 'global');
            break;

          case 'completeTodo':
            if (message.tabType === 'code') {
              await this.handleCompleteCodeTodo(message.id);
              this.sendTodos(webviewView.webview, 'code');
            } else {
              await completeTodo(message.id, message.tabType);
              this.sendTodos(webviewView.webview, message.tabType);
            }
            break;

          case 'deleteTodo':
            if (message.tabType === 'code') {
              await this.confirmAndDeleteCodeTodo(message.id);
              this.sendTodos(webviewView.webview, 'code');
            } else {
              await deleteTodo(message.id, message.tabType);
              this.sendTodos(webviewView.webview, message.tabType);
            }
            break;

          case 'viewCodeTodo':
            await viewCodeTodo(message.filePath, message.lineNumber);
            break;
        }
      } catch (err) {
        console.error('Error handling webview message:', err);
      }
    });

    // send initial code todos
    this.sendTodos(webviewView.webview, 'code');
  }

  private async handleCompleteCodeTodo(id: string) {
    try {
      this.codeTodos = await this.todoParser.findTodosInWorkspace();
      const todo = this.codeTodos.find(t => t.id === id);
      if (!todo) return;

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      const fullPath = path.join(workspaceFolders[0].uri.fsPath, todo.filePath);
      let content = fs.readFileSync(fullPath, 'utf8');

      const toggleCheckbox = (text: string) => {
        if (/\[x\]|\[X\]/.test(text)) {
          return text.replace(/\[x\]|\[X\]/g, '[ ]');
        }
        if (/\[ \]/.test(text)) {
          return text.replace(/\[ \]/g, '[x]');
        }
        return text.replace(/(\bTODO\b\s*[:#-]?\s*)/i, '$1[x] ');
      };

      if (todo.originalText.includes('\n')) {
        const idx = content.indexOf(todo.originalText);
        if (idx !== -1) {
          const updated = toggleCheckbox(todo.originalText);
          content = content.slice(0, idx) + updated + content.slice(idx + todo.originalText.length);
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      } else {
        const lines = content.split('\n');
        const li = Math.max(0, todo.lineNumber - 1);
        if (li < lines.length) {
          lines[li] = toggleCheckbox(lines[li]);
          fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        }
      }

      this.codeTodos = await this.todoParser.findTodosInWorkspace();
    } catch (err) {
      console.error('Error toggling code TODO:', err);
    }
  }

  private async handleDeleteCodeTodo(id: string) {
    try {
      this.codeTodos = await this.todoParser.findTodosInWorkspace();
      const todo = this.codeTodos.find(t => t.id === id);
      if (!todo) return;

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      const fullPath = path.join(workspaceFolders[0].uri.fsPath, todo.filePath);
      let content = fs.readFileSync(fullPath, 'utf8');

      const idx = content.indexOf(todo.originalText);
      if (idx !== -1) {
        const before = content.slice(0, idx);
        const after = content.slice(idx + todo.originalText.length);
        const merged = (before + after).replace(/\n{3,}/g, '\n\n');
        fs.writeFileSync(fullPath, merged, 'utf8');
      } else {
        const lines = content.split('\n');
        const li = Math.max(0, todo.lineNumber - 1);
        if (li < lines.length) {
          lines.splice(li, 1);
          fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        }
      }

      this.codeTodos = await this.todoParser.findTodosInWorkspace();
    } catch (err) {
      console.error('Error deleting code TODO:', err);
    }
  }

  private async confirmAndDeleteCodeTodo(id: string) {
    const confirmed = await vscode.window.showWarningMessage('Delete this TODO?', { modal: true }, 'Delete');
    if (confirmed !== 'Delete') return;
    await this.handleDeleteCodeTodo(id);
  }

  private async promptAndAddTodo(tab: 'local' | 'global') {
    const title = await vscode.window.showInputBox({ prompt: `Enter ${tab} TODO title`, placeHolder: 'Task description' });
    if (!title) return;

    const description = await vscode.window.showInputBox({ prompt: 'Enter TODO description (optional)', placeHolder: 'Additional details' });
    const priority = await vscode.window.showQuickPick(['Normal', 'Important'], { placeHolder: 'Select priority' });
    if (!priority) return;

    if (tab === 'local') {
      storageManager.addLocalTodo(title, description, priority as 'Normal' | 'Important');
    } else {
      storageManager.addGlobalTodo(title, description, priority as 'Normal' | 'Important');
    }
  }

  private getIncompleteCount(): number {
    const localIncomplete = storageManager.getLocalTodos().filter(todo => !todo.completed).length;
    const globalIncomplete = storageManager.getGlobalTodos().filter(todo => !todo.completed).length;
    const codeIncomplete = this.codeTodos.filter(todo => !todo.completed).length;
    return localIncomplete + globalIncomplete + codeIncomplete;
  }

  private updateViewBadge() {
    if (!this.view) return;

    const count = this.getIncompleteCount();
    if (count === 0) {
      this.view.badge = undefined;
      return;
    }

    const badgeText = count > 9 ? 9 : count;
    this.view.badge = {
      value: badgeText,
      tooltip: `${count} incomplete TODO${count === 1 ? '' : 's'}`,
    };
  }

  private sendTodos(webview: vscode.Webview, tab: string) {
    let todos: any[] = [];

    if (tab === 'local') todos = storageManager.getLocalTodos();
    else if (tab === 'global') todos = storageManager.getGlobalTodos();
    else if (tab === 'code') todos = this.codeTodos;

    webview.postMessage({ type: 'updateTodos', tab, todos });
    this.updateViewBadge();
  }

  public async refresh() {
    if (!this.view) return;

    this.codeTodos = await this.todoParser.findTodosInWorkspace();
    this.updateViewBadge();
    this.view.webview.postMessage({ type: 'refresh' });
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Better Todos</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

export function deactivate() {
  try {
    importantDecoration?.dispose();
    normalDecoration?.dispose();
  } catch (err) {
    // ignore
  }
}
