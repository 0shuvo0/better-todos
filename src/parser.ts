import * as fs from 'fs';
import * as vscode from 'vscode';
import { CodeTodo } from './types';

export interface ParsedTodo {
  title: string;
  description?: string;
  completed: boolean;
  priority: 'Normal' | 'Important';
  lineNumber: number;
  originalText: string;
}

export class TodoParser {
  private singleLinePatterns = [
    // Single-line comments
    /^\s*\/\/+\s*(!)?\s*TODO\b\s*[:#-]?\s*(\[.\])?\s*(.*)$/i,
    /^\s*#\s*(!)?\s*TODO\b\s*[:#-]?\s*(\[.\])?\s*(.*)$/i,
    /^\s*--\s*(!)?\s*TODO\b\s*[:#-]?\s*(\[.\])?\s*(.*)$/i,
  ];

  private multiLinePatterns = [
    { start: /\/\*/, end: /\*\// },
    { start: /'''/, end: /'''/ },
    { start: /"""/, end: /"""/ },
  ];

  async findTodosInWorkspace(): Promise<CodeTodo[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }

    const todos: CodeTodo[] = [];
    const rootPath = workspaceFolders[0].uri.fsPath;
    console.log('Scanning for TODOs in:', rootPath);

    // Exclude patterns
    const excludePatterns = ['node_modules', '.git', 'dist', 'out', '.vscode'];

    const files = await this.walkDirectory(rootPath, excludePatterns);
    console.log('Found files to scan:', files.length);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileTodos = this.parseTodosInFile(content, filePath, rootPath);
      if (fileTodos.length > 0) {
        console.log(`Found ${fileTodos.length} TODOs in ${filePath}`);
        console.log('TODOs:', JSON.stringify(fileTodos, null, 2));
      }
      todos.push(...fileTodos);
    }

    console.log('Total TODOs found:', todos.length);
    return todos;
  }

  private parseTodosInFile(content: string, filePath: string, rootPath: string): CodeTodo[] {
    const todos: CodeTodo[] = [];
    const lines = content.split('\n');
    const relativePath = this.getRelativePath(filePath, rootPath);

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Try single-line patterns
      for (const pattern of this.singleLinePatterns) {
        const match = line.match(pattern);
        if (match) {
          const isImportant = !!match[1];
          const checkboxChar = match[2]?.[1] || ' ';
          const title = match[3].trim();

          const todo: CodeTodo = {
            id: `code-${filePath}-${i}`,
            title: title || 'Untitled',
            completed: checkboxChar === 'x',
            priority: isImportant ? 'Important' : 'Normal',
            filePath: relativePath,
            lineNumber: i + 1,
            createdAt: Date.now(),
            originalText: line,
          };

          todos.push(todo);
          console.log('Found single-line TODO:', { relativePath, lineNumber: i + 1, title });
          break;
        }
      }

      // Try multi-line patterns
      for (const pattern of this.multiLinePatterns) {
        if (line.match(pattern.start) && !line.match(pattern.end)) {
          const commentBlock = [line];
          let j = i + 1;

          while (j < lines.length && !lines[j].match(pattern.end)) {
            commentBlock.push(lines[j]);
            j++;
          }

          if (j < lines.length) {
            commentBlock.push(lines[j]);
          }

          const blockContent = commentBlock.join('\n');
          const todoMatch = blockContent.match(/(!)?\s*TODO\b\s*[:#-]?\s*(\[[ xX]\])?\s*(.*?)(?:\n|$)/i);

          if (todoMatch) {
              const hasBang = !!todoMatch[1];
              const checkboxText = todoMatch[2] || '';
              const rawTodoText = todoMatch[3].trim();
              const title = rawTodoText.replace(/\[[ xX]\]/, '').trim();

              // Build description: skip the TODO header line and keep the
              // remaining lines inside the comment block.
              const blockLines = blockContent.split('\n');
              let headerIndex = blockLines.findIndex(l => /(!)?\s*TODO\b/i.test(l));
              if (headerIndex === -1) {
                headerIndex = blockLines.findIndex(l => l.includes(rawTodoText));
              }
              const description = (headerIndex === -1 ? blockLines.slice(1) : blockLines.slice(headerIndex + 1))
                .map(l => l.replace(/^\s*\*\s?/, '').trim())
                .filter(l => l && !l.match(/\*\//))
                .join('\n')
                .trim();

              const isImportant = hasBang || /!\s*TODO/i.test(blockContent);
              const completed = /\[[xX]\]/.test(checkboxText || rawTodoText);

            const todo: CodeTodo = {
              id: `code-${filePath}-${i}`,
              title: title || 'Untitled',
              description: description || undefined,
              completed,
              priority: isImportant ? 'Important' : 'Normal',
              filePath: relativePath,
              lineNumber: i + 1,
              createdAt: Date.now(),
              originalText: blockContent,
            };

            todos.push(todo);
            console.log('Found multi-line TODO:', { relativePath, lineNumber: i + 1, title });
            i = j;
            break;
          }
        }
      }

      i++;
    }

    return todos;
  }

  private getRelativePath(filePath: string, rootPath: string): string {
    if (filePath.startsWith(rootPath)) {
      return filePath.substring(rootPath.length + 1);
    }
    return filePath;
  }

  private async walkDirectory(dirPath: string, excludePatterns: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry.name}`;

        // Skip excluded patterns
        if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.walkDirectory(fullPath, excludePatterns);
          files.push(...subFiles);
        } else if (this.isSupportedFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors reading directories
    }

    return files;
  }

  private isSupportedFile(fileName: string): boolean {
    const supportedExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
      '.html', '.css', '.scss', '.json', '.yaml', '.yml', '.xml', '.sql',
      '.r', '.m', '.mm', '.pl', '.groovy', '.lua', '.vim', '.el', '.clj',
    ];

    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }
}
