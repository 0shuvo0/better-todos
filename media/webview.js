(() => {
  const vscode = acquireVsCodeApi();
  let currentTab = 'code';
  const todos = {
    code: [],
    local: [],
    global: [],
  };

  const app = document.getElementById('app');

  // Initialize UI
  function initializeUI() {
    app.innerHTML = `
      <div class="tabs">
        <button class="tab-button active" data-tab="code">Code</button>
        <button class="tab-button" data-tab="local">Local</button>
        <button class="tab-button" data-tab="global">Global</button>
      </div>
      
      <div class="tab-content active" data-tab="code" id="code-tab">
        <div class="add-todo-button" style="display: none;">Add TODO</div>
        <div class="todo-list"></div>
        <div class="tab-footer">Code: Automatically imports TODOs from your code comments.</div>
      </div>
      
      <div class="tab-content" data-tab="local" id="local-tab">
        <button class="add-todo-button">+ Add TODO</button>
        <div class="todo-list"></div>
        <div class="tab-footer">Local: Folder-specific TODOs visible in every folder you open.</div>
      </div>
      
      <div class="tab-content" data-tab="global" id="global-tab">
        <button class="add-todo-button">+ Add TODO</button>
        <div class="todo-list"></div>
        <div class="tab-footer">Global: Cross-workspace TODOs accessible from any project.</div>
      </div>
    `;

    // Setup event listeners
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', switchTab);
    });

    document.querySelectorAll('.add-todo-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.closest('.tab-content').dataset.tab;
        addNewTodo(tab);
      });
    });

    // Request initial data
    vscode.postMessage({
      type: 'getTodos',
      tab: 'code',
    });
  }

  function switchTab(e) {
    const tab = e.target.dataset.tab;
    if (!tab) return;

    currentTab = tab;

    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tab);
    });

    // Request todos for this tab
    vscode.postMessage({
      type: 'getTodos',
      tab,
    });
  }

  function renderTodos(tab, todoList) {
    todos[tab] = todoList;
    const content = document.querySelector(`[data-tab="${tab}"] .todo-list`);

    if (!content) return;

    if (todoList.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No ${tab} TODOs yet</p>
          ${tab !== 'code' ? '<p style="font-size: 11px; margin-top: 8px;">Add one using the button above</p>' : ''}
        </div>
      `;
      return;
    }

    content.innerHTML = todoList
      .map(todo => renderTodoItem(todo, tab))
      .join('');

    // Attach event listeners
    content.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.closest('.todo-item').dataset.id;
        vscode.postMessage({
          type: 'completeTodo',
          id,
          tabType: tab,
        });
      });
    });

    content.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.todo-item').dataset.id;
        vscode.postMessage({
          type: 'deleteTodo',
          id,
          tabType: tab,
        });
      });
    });

    content.querySelectorAll('.todo-item').forEach(item => {
      item.addEventListener('click', e => {
        if (tab !== 'code') return;
        const target = e.target;
        if (target.closest('.todo-checkbox') || target.closest('.delete-btn')) return;

        const filePath = item.dataset.filePath;
        const lineNumber = parseInt(item.dataset.lineNumber, 10);
        if (!filePath || Number.isNaN(lineNumber)) return;

        vscode.postMessage({
          type: 'viewCodeTodo',
          filePath,
          lineNumber,
        });
      });
    });
  }
  function renderTodoItem(todo, tab) {
    const priorityClass = todo.priority === 'Important' ? 'important' : 'normal';
    const completedClass = todo.completed ? 'completed' : '';

    let actions = '';
    if (tab === 'code') {
      actions = `
        <div class="todo-actions">
          <button class="action-button delete-btn" title="Delete">✕</button>
        </div>
      `;
    } else {
      actions = `
        <div class="todo-actions">
          <button class="action-button delete-btn" title="Delete">✕</button>
        </div>
      `;
    }

    const meta = tab === 'code' 
      ? `<div class="todo-meta">${todo.filePath}:${todo.lineNumber}</div>`
      : '';

    return `
      <div class="todo-item ${priorityClass}" data-id="${todo.id}" 
           ${tab === 'code' ? `data-file-path="${todo.filePath}" data-line-number="${todo.lineNumber}"` : ''}>
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <div class="todo-content">
          <div class="todo-title ${completedClass}">
            <span>${escapeHtml(todo.title)}</span>
            <span class="priority-badge ${priorityClass}">${todo.priority}</span>
          </div>
          ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
          ${meta}
        </div>
        ${actions}
      </div>
    `;
  }

  async function addNewTodo(tab) {
    if (tab === 'code') return;

    vscode.postMessage({
      type: tab === 'local' ? 'requestAddLocalTodo' : 'requestAddGlobalTodo',
    });
  }

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;
    console.log('Webview received message:', message);

    if (message.type === 'updateTodos') {
      console.log(`Rendering ${message.todos.length} ${message.tab} TODOs`);
      console.log('First TODO:', message.todos[0]);
      renderTodos(message.tab, message.todos);
    } else if (message.type === 'refresh') {
      vscode.postMessage({
        type: 'getTodos',
        tab: currentTab,
      });
    }
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on load
  initializeUI();
})();
