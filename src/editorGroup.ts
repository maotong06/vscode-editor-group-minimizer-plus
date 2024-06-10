import * as vscode from 'vscode';

import { EditorDocument } from './editorDocument';
import { getRootSepPath } from './utils';

export class EditorGroup extends vscode.TreeItem {
  contextValue: string;
  description: string;

  _parent?: EditorGroup = undefined;

  constructor(
    public label: string,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
    public readonly documents?: EditorDocument[],
    public readonly resourceUri?: vscode.Uri,  // 文件的 URI
  ) {
    super(label, collapsibleState);
    this.contextValue = collapsibleState && documents ? 'editorGroup' : 'editorDocument';

    const des = this._description;
    this.description = des.length > 0 ? `${des.join(', ').substr(0, 30)}...` : '';
    this.tooltip = `${this._description.join(', ')}`;
    if (this.contextValue === 'editorDocument') {
      this.command = {
          command: 'vscode.open',  // 使用 vscode.open 命令打开文件
          title: 'Open File',  // 命令的标题
          arguments: [this.resourceUri],  // 命令的参数，这里是文件的 URI
      };
    }
  }

  private get _description(): string[] {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri?.path ?? '';
    return (this.documents || []).map(({ document }) => document?.fileName.replace(getRootSepPath(root), ''));
  }

  get parent(): EditorGroup | undefined {
    return this._parent;
  }

  set parent(value: EditorGroup | undefined) {
    this._parent = value;
  }

  refresh() {
    const des = this._description;
    this.description = des.length > 0 ? `${des.join(', ').substr(0, 30)}...` : '';
    this.tooltip = `${this._description.join(', ')}`;
  }
}
