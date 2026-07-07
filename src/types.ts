export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'Normal' | 'Important';
  createdAt: number;
}

export interface LocalTodo extends Todo {
  workspaceId: string;
}

export interface CodeTodo extends Todo {
  filePath: string;
  lineNumber: number;
  originalText: string;
}

export interface Message {
  type: 'addTodo' | 'updateTodo' | 'deleteTodo' | 'getTodos' | 'toggleComplete';
  payload?: any;
}
