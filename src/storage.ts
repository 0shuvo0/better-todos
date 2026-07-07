import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Todo, LocalTodo } from './types';

export class StorageManager {
  private context: vscode.ExtensionContext;
  private readonly LOCAL_STORAGE_KEY = 'bettertodos.local';
  private readonly GLOBAL_STORAGE_KEY = 'bettertodos.global';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // Local TODOs (workspace-specific)
  getLocalTodos(): LocalTodo[] {
    const workspaceId = this.getWorkspaceId();
    const allLocal = this.context.workspaceState.get<LocalTodo[]>(this.LOCAL_STORAGE_KEY, []);
    return allLocal.filter(todo => todo.workspaceId === workspaceId);
  }

  addLocalTodo(title: string, description?: string, priority: 'Normal' | 'Important' = 'Normal'): LocalTodo {
    const todo: LocalTodo = {
      id: this.generateId(),
      title,
      description,
      completed: false,
      priority,
      createdAt: Date.now(),
      workspaceId: this.getWorkspaceId(),
    };

    const allLocal = this.context.workspaceState.get<LocalTodo[]>(this.LOCAL_STORAGE_KEY, []);
    allLocal.push(todo);
    this.context.workspaceState.update(this.LOCAL_STORAGE_KEY, allLocal);
    return todo;
  }

  updateLocalTodo(id: string, updates: Partial<LocalTodo>): void {
    const allLocal = this.context.workspaceState.get<LocalTodo[]>(this.LOCAL_STORAGE_KEY, []);
    const index = allLocal.findIndex(t => t.id === id);
    if (index !== -1) {
      allLocal[index] = { ...allLocal[index], ...updates };
      this.context.workspaceState.update(this.LOCAL_STORAGE_KEY, allLocal);
    }
  }

  deleteLocalTodo(id: string): void {
    const allLocal = this.context.workspaceState.get<LocalTodo[]>(this.LOCAL_STORAGE_KEY, []);
    const filtered = allLocal.filter(t => t.id !== id);
    this.context.workspaceState.update(this.LOCAL_STORAGE_KEY, filtered);
  }

  // Global TODOs (cross-workspace)
  getGlobalTodos(): Todo[] {
    return this.context.globalState.get<Todo[]>(this.GLOBAL_STORAGE_KEY, []);
  }

  addGlobalTodo(title: string, description?: string, priority: 'Normal' | 'Important' = 'Normal'): Todo {
    const todo: Todo = {
      id: this.generateId(),
      title,
      description,
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    const allGlobal = this.context.globalState.get<Todo[]>(this.GLOBAL_STORAGE_KEY, []);
    allGlobal.push(todo);
    this.context.globalState.update(this.GLOBAL_STORAGE_KEY, allGlobal);
    return todo;
  }

  updateGlobalTodo(id: string, updates: Partial<Todo>): void {
    const allGlobal = this.context.globalState.get<Todo[]>(this.GLOBAL_STORAGE_KEY, []);
    const index = allGlobal.findIndex(t => t.id === id);
    if (index !== -1) {
      allGlobal[index] = { ...allGlobal[index], ...updates };
      this.context.globalState.update(this.GLOBAL_STORAGE_KEY, allGlobal);
    }
  }

  deleteGlobalTodo(id: string): void {
    const allGlobal = this.context.globalState.get<Todo[]>(this.GLOBAL_STORAGE_KEY, []);
    const filtered = allGlobal.filter(t => t.id !== id);
    this.context.globalState.update(this.GLOBAL_STORAGE_KEY, filtered);
  }

  // Utility
  private getWorkspaceId(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.fsPath;
    }
    return 'unknown-workspace';
  }

  private generateId(): string {
    return `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
