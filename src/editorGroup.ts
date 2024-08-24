import * as vscode from 'vscode';

import { EditorDocument } from './editorDocument';
import { getDocumentPathObj } from './utils';

export class EditorGroup extends vscode.TreeItem {
  contextValue: string;
  description: string;

  _parent?: EditorGroup = undefined;

  constructor(
    public label: string,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
    public readonly documents?: EditorDocument[],
    public readonly resourceUri?: vscode.Uri,  // 文件的 URI
    public readonly customDesc?: string,
  ) {
    super(label, collapsibleState);
    this.contextValue = collapsibleState && documents ? 'editorGroup' : 'editorDocument';

    this.description = this.getDesc()
    if (this.contextValue === 'editorGroup') {
      this.tooltip = this._descriptionAndTooltip.tooltip;
    }
    if (this.contextValue === 'editorDocument') {
      this.command = {
          command: 'vscode.open',  // 使用 vscode.open 命令打开文件
          title: 'Open File',  // 命令的标题
          arguments: [this.resourceUri],  // 命令的参数，这里是文件的 URI
      };
    }
  }

  private getDesc() {
    if (this.customDesc) {
      return this.customDesc;
    } else {
      return this._descriptionAndTooltip.desc;
    }
  }

  private get _descriptionAndTooltip(): { desc: string, tooltip: string } {
    if (!this?.documents?.length) {
      return {
        desc: '',
        tooltip: ''
      }
    }
    // 获取公共最长路径
    let commonPath = ''
    const relativeDirList: string[] = [];
    const relativePathList: string[] = [];
    (this.documents || []).forEach(({ document }) => {
      const { relativePath, relativeDir } = getDocumentPathObj(document);
      relativeDirList.push(relativeDir);
      relativePathList.push(relativePath);
    })
    const firstLen = relativeDirList[0]?.length || 0;
    for (let i = 0; i < firstLen; i++) {
      const char = relativeDirList[0][i];
      if (relativeDirList.some((dir) => dir[i] !== char)) {
        break;
      }
      commonPath += char;
    }
    commonPath  = commonPath.length > 30 ? `${commonPath.substr(0, 30)}...` : `${commonPath}...` 
    return {
      desc: `${commonPath}`,
      tooltip: relativePathList.join(', ')
    };
  }

  get parent(): EditorGroup | undefined {
    return this._parent;
  }

  set parent(value: EditorGroup | undefined) {
    this._parent = value;
  }

  refresh() {
    this.description = this.getDesc();
    if (this.contextValue === 'editorGroup') {
      this.tooltip = this._descriptionAndTooltip.tooltip;
    }
  }
}
