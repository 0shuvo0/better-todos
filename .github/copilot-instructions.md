# Better Todos - VS Code Extension Development

## Project Overview
Better Todos is a VS Code extension that centralizes task management by combining:
- Code TODOs (automatically discovered from source files)
- Local TODOs (workspace-specific tasks)
- Global TODOs (cross-workspace tasks)

All managed through a unified sidebar interface with real-time synchronization.

## Project Structure

```
bettertodos/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── storage.ts        # Local and global TODO storage management
│   ├── parser.ts         # TODO comment parser for source files
│   ├── types.ts          # TypeScript interface definitions
├── media/
│   ├── webview.js        # Webview UI logic
│   ├── webview.css       # Webview UI styles
│   ├── icon.png          # Activity bar icon
│   ├── icon-activity.svg # Activity bar icon (SVG)
├── .vscode/
│   └── launch.json       # Debug configuration
├── package.json          # Extension manifest and dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # User-facing documentation
└── out/                  # Compiled JavaScript (generated)
```

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- VS Code 1.75+

### Installation
All dependencies have been installed. If needed, run:
```bash
npm install
```

### Compilation
Compile TypeScript to JavaScript:
```bash
npm run compile
```

Watch mode for development:
```bash
npm run watch
```

## Running the Extension

### Debug Mode
1. Press `F5` in VS Code or go to Run → Start Debugging
2. VS Code will open a new window with the extension loaded
3. Open the Activity Bar and click the Better Todos icon
4. The sidebar will display three tabs: Code, Local, Global

### Building for Release
```bash
npm run vscode:prepublish
```

## Key Features

### Code TODOs
- Automatic discovery of TODO comments in supported file types
- Supports multiple comment syntaxes across 30+ languages
- Single-line: `// TODO: Task`, `# TODO: Task`
- Multi-line: `/* TODO: ... */`, `''' TODO: ... '''`, `""" TODO: ... """`
- Checkbox support: `// TODO: [] Task`, `// TODO: [x] Completed`
- Priority support: `// !TODO: Important task`
- Direct navigation to source file

### Local TODOs
- Workspace-specific task management
- Create, edit, complete, and delete tasks
- Support for title, description, and priority
- Persist between VS Code sessions

### Global TODOs
- Cross-workspace task management
- Same features as local TODOs
- Accessible from any VS Code project

## Code Architecture

### Extension (`src/extension.ts`)
- Manages extension lifecycle
- Handles webview creation and communication
- Registers VS Code commands
- Manages file system watchers

### Storage (`src/storage.ts`)
- StorageManager class handles all data persistence
- Separates local (workspace) and global (cross-workspace) storage
- Uses VS Code context APIs for storage

### Parser (`src/parser.ts`)
- TodoParser class scans workspace for TODO comments
- Supports 30+ file types
- Handles single-line and multi-line comment formats
- Extracts title, description, and priority from comments

### Webview (`media/webview.js`)
- Tab-based UI for Code, Local, and Global TODOs
- Bidirectional communication with extension
- CRUD operations for tasks
- Real-time UI updates

## File Synchronization

When a code TODO is completed in the UI:
1. Extension updates the source file
2. Checkbox is modified: `// TODO: [] Task` → `// TODO: [x] Task`
3. File system watcher triggers refresh
4. UI updates automatically

## Configuration

No configuration needed! The extension works out of the box.

## Debugging

- Use VS Code's debugger (F5) to debug the extension
- View extension logs in the Debug Console
- Set breakpoints in TypeScript files
- Extension source maps enable debugging in original TS

## Common Commands

- `bettertodos.addLocalTodo` - Add a local TODO
- `bettertodos.addGlobalTodo` - Add a global TODO
- `bettertodos.refreshCodeTodos` - Refresh code TODOs
- `bettertodos.completeTodo` - Mark TODO complete/pending
- `bettertodos.deleteTodo` - Delete a TODO
- `bettertodos.viewCodeTodo` - Navigate to code TODO location

## Testing

Currently no automated tests. To add tests:
1. Create test files in `src/test/`
2. Run `npm run test`

## Publishing

To publish to VS Code Marketplace:
```bash
vsce publish
```

First, install vsce:
```bash
npm install -g vsce
```

## Support

For issues or feature requests, please refer to the main project repository.

## License

MIT
