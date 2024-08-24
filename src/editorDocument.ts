import * as vscode from 'vscode';
import { getRootSepPath } from './utils';

export class EditorDocument {
  contextValue: string;

  constructor(
    public readonly document: vscode.TextDocument,
    public readonly viewColumn?: vscode.ViewColumn,
    public label?: string,
  ) {
    this.viewColumn = viewColumn || vscode.ViewColumn.One;
    this.label = label ?? document?.fileName ?? '';
    this.contextValue = 'editorDocument';
  }

  get documentName(): string {
    return this.label || ''
  }
}
