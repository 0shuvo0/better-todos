# Better Todos

Better Todos is a VS Code extension that centralizes task management by combining code comments, project-specific TODOs, and global TODOs into a single sidebar experience.

## Features

### Code TODOs
Automatically discovers and displays TODO comments in your source files. Navigate directly to the TODO location in your code.

**Supported formats:**
- Single-line comments: `// TODO: Task`, `# TODO: Task`
- Multi-line comments: `/* TODO: ... */`, `''' TODO: ... '''`, `""" TODO: ... """`
- Checkboxes: `// TODO: [x] Completed task`
- Priority: `// !TODO: Important task`

### Local TODOs
Workspace-specific tasks that persist between sessions. Create custom TODOs with:
- Title
- Optional description
- Priority levels (Normal or Important)
- Completion status

### Global TODOs
Cross-workspace tasks accessible from any VS Code project. Same features as Local TODOs but available globally.

## How to Use

1. **Open the sidebar:** Click the Better Todos icon in the Activity Bar
2. **Switch tabs:** Choose between Code, Local, and Global TODOs
3. **Add a TODO:** Click "Add TODO" in Local or Global tabs
4. **Complete a TODO:** Check the checkbox to mark as complete
5. **View Code TODO:** Click the "View" button to navigate to the source
6. **Delete a TODO:** Click the delete button with confirmation

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Better Todos"
4. Click Install

## Extension Settings

No configuration needed! The extension works out of the box.

## Contributing

Feel free to report issues or suggest features on GitHub.

## License

MIT
