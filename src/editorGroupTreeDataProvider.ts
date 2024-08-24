import * as vscode from 'vscode';
import * as path from 'path';

import { EditorDocument } from './editorDocument';
import { EditorGroup } from './editorGroup';
import { getDocumentPathObj } from './utils';
import { minimizedGroupChannel } from './channel';

const CANCEL = 'CANCEL';
export class EditorGroupTreeDataProvider implements vscode.TreeDataProvider<EditorGroup> {
	private _onDidChangeTreeData: vscode.EventEmitter<EditorGroup | undefined> = new vscode.EventEmitter<EditorGroup | undefined>();
  readonly onDidChangeTreeData: vscode.Event<EditorGroup | undefined> = this._onDidChangeTreeData.event;
  
  context: vscode.ExtensionContext;

  constructor(cont: vscode.ExtensionContext) {
    this.context = cont;
  }

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: EditorGroup): vscode.TreeItem {
    return element;
  }

	getChildren(element?: EditorGroup): Thenable<EditorGroup[] | undefined> {
    if (element) {
      const documents = (element.documents || []).map(({ document }) => {
        const { fileName, relativeDir } = getDocumentPathObj(document);
        const groupMember = new EditorGroup(fileName,
          undefined,
          undefined,
          document?.uri,
          relativeDir,
        );
        groupMember.parent = element;
        return groupMember;
      });
      return Promise.resolve(documents);
    }
    
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups');
    const primed = minimizedGroups?.map((group) => {
      const documents = group.documents?.map(({ document, viewColumn }) => new EditorDocument(document, viewColumn));
      return new EditorGroup(
        group.label, 
        vscode.TreeItemCollapsibleState.Collapsed, 
        documents,
      );
    });
  
    return this.context.workspaceState.update('minimizedGroups', primed)
      .then(() => primed);
  }

  restore(group: EditorGroup) {
    return (group.documents || []).map(({ document, viewColumn }) => {
      return vscode.window.showTextDocument(document, {
        preserveFocus: true,
        preview: false,
        viewColumn: viewColumn ?? vscode.ViewColumn.One
      });
    });
  }


  remove(group: EditorGroup): Thenable<void> {
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    const remaining = minimizedGroups.filter((mGroup) => mGroup !== group);
    return this.context.workspaceState.update('minimizedGroups', remaining)
      .then(() => this.refresh());
  }
  /** 将当前所有文件添加进组 */
  async minimizeAsAdd(): Promise<any> {
    const minimizedGroups: any = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    let activeTextEditor = vscode.window.activeTextEditor;
    let pinnedCheck = activeTextEditor;
    const userCustomOption = 'CUSTOM INPUT...';
    // 增加自定义输入选项
    const minimizedGroupsOptions = minimizedGroups.concat([{
      label: userCustomOption,
      documents: [],
    }]);

    return vscode.window.showQuickPick(minimizedGroupsOptions as any[], {
      placeHolder: 'Please select a group or customize a new group'
    })
    .then(async (picked: any) => {
      if (!picked) {
        return Promise.resolve(CANCEL);
      }
      if (picked.label === userCustomOption) {
        return await this.minimize();
      } else 
      if (picked) {
        const documents: EditorDocument[] = picked.documents || [];
        while (activeTextEditor !== undefined) {

          const closingEditor = activeTextEditor;
          await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    
          if (!vscode.window.activeTextEditor) {
            await vscode.commands.executeCommand('workbench.action.nextEditor');
          }
    
          activeTextEditor = vscode.window.activeTextEditor;
          if (activeTextEditor === pinnedCheck) {
            break; // We may have hit a pinned editor since it didn't close
          }
    
          if (closingEditor.document.uri.scheme === 'file') {
            pushDocumentsToArrayAsUniq(documents,new EditorDocument(closingEditor.document, closingEditor.viewColumn))
          }
    
          if (!vscode.window.activeTextEditor) { // Sometimes the timing is off between opening the next editor and checking if there are more to minimize
            await vscode.commands.executeCommand('workbench.action.nextEditor');
            activeTextEditor = vscode.window.activeTextEditor;
          }
    
          pinnedCheck = activeTextEditor;
        }

        vscode.window.showInformationMessage(`Added to ${picked.label}`);
        picked.refresh();
        await this.context.workspaceState.update('minimizedGroups', minimizedGroups);
        return this.refresh();
      }
    });
  }

  async minimize(): Promise<any> {
    const groupName = await vscode.window.showInputBox({
      prompt: 'Please enter a group name'
    });
    if (groupName === undefined) {
      return Promise.resolve(CANCEL);
    }
    const documents: EditorDocument[] = [];
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    let activeTextEditor = vscode.window.activeTextEditor;
    let pinnedCheck = activeTextEditor;

    while (activeTextEditor !== undefined) {
      const closingEditor = activeTextEditor;
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      if (!vscode.window.activeTextEditor) {
        await vscode.commands.executeCommand('workbench.action.nextEditor');
      }

      activeTextEditor = vscode.window.activeTextEditor;
      if (activeTextEditor === pinnedCheck) {
        break; // We may have hit a pinned editor since it didn't close
      }

      if (closingEditor.document.uri.scheme === 'file') {
        pushDocumentsToArrayAsUniq(documents, new EditorDocument(closingEditor.document, closingEditor.viewColumn))
      }

      if (!vscode.window.activeTextEditor) { // Sometimes the timing is off between opening the next editor and checking if there are more to minimize
        await vscode.commands.executeCommand('workbench.action.nextEditor');
        activeTextEditor = vscode.window.activeTextEditor;
      }

      pinnedCheck = activeTextEditor;
    }

    const label = groupName || `Group ${minimizedGroups.length + 1}`;
    // const label = `Group ${minimizedGroups.length + 1}`;
    minimizedGroups.push(new EditorGroup(
      label, 
      vscode.TreeItemCollapsibleState.Collapsed, 
      documents,
    ));

    return this.context.workspaceState.update('minimizedGroups', minimizedGroups)
      .then(() => {
        vscode.window.showInformationMessage(`Minimized as: ${label}`);
        this.refresh();
      });
  }

  dispose(): Thenable<void> {
    return this.clear();
  }

  clear(): Thenable<void> {
    return this.context.workspaceState.update('minimizedGroups', undefined);
  }

  rename(group: EditorGroup): Thenable<void> {
    return vscode.window.showInputBox({
      prompt: 'Please enter a group name'
    })
      .then((value) => {
        const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
        const oldGroup = minimizedGroups.find((mGroup) => mGroup === group);

        if (oldGroup) {
          oldGroup.label = value || oldGroup.label;
        }

        return this.context.workspaceState.update('minimizedGroups', minimizedGroups);
      })
      .then(() => this.refresh());
  }

  /** 将当前文件添加进组 */
  addToGroup(uri: vscode.Uri): Thenable<void> {
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    return vscode.window.showQuickPick(minimizedGroups as any[], {
      placeHolder: 'Please select a group'
    })
      .then((picked) => {
        if (picked) {
          return vscode.workspace.openTextDocument(uri)
            .then((document) => {
              if (document) {
                pushDocumentsToArrayAsUniq(picked.documents, new EditorDocument(document));
                vscode.window.showInformationMessage(`Added to ${picked.label}`);
              }
              picked.refresh();
              return this.context.workspaceState.update('minimizedGroups', minimizedGroups);
            });
        }
      })
      .then(() => this.refresh());
  }

  removeFromGroup(group: EditorGroup): Thenable<void> {
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];

    if (group.parent) {
      const oldGroupIdx = minimizedGroups.findIndex((mGroup) => mGroup === group.parent);

      if (oldGroupIdx >= 0) {
        const oldGroup = minimizedGroups[oldGroupIdx];

        const i = oldGroup?.documents?.findIndex((doc) => doc.document.uri === group.resourceUri) ?? -1;
        if (i >= 0) {
          oldGroup?.documents?.splice(i, 1);
        }

        if (oldGroup?.documents?.length === 0) {
          minimizedGroups.splice(oldGroupIdx, 1);
        } else {
          oldGroup?.refresh();
        }
      }
    }

    return this.context.workspaceState.update('minimizedGroups', minimizedGroups)
      .then(() => this.refresh());
  }

  async saveActiveAndRestore(group: EditorGroup) {
    const res = await this.minimizeAsAdd();
    if (res === CANCEL) {
      return;
    }
    return this.restore(group);
  }

  clearAllMinimizerGroups() {
    return this.clear().then(() => this.refresh());
  }

  /** 序列化 */
  stringifyGroup() {
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    const res: IStorageGroup = []
    minimizedGroups.forEach(group => {
      res.push({
        label: group.label,
        documents: group.documents?.map(({ document }) => ({
          relativePath: path.posix.join(...(getDocumentPathObj(document).relativePath.split(path.sep)))
        })) || []
      });
    })
    return JSON.stringify(res, null, 2);
  }

  private hasFileError = false
  /** 解析导入文件 */
  async parseGroup(str: string) {
    if (!str) {
      return;
    }
    const newGroups: IStorageGroup = JSON.parse(str);
    const minimizedGroups = this.context.workspaceState.get<Array<EditorGroup>>('minimizedGroups') || [];
    this.hasFileError = false
    let isAlwaysMerge = false
    let isAlwaysCreate = false
    for (const group of newGroups) {
      const newGroupLabel = group.label;
      const oldGroup = minimizedGroups.find(mGroup => mGroup.label === newGroupLabel);
      if (oldGroup) {
        let mergeType = {} as (typeof mergeTypes[0] | undefined);
        if (!isAlwaysMerge && !isAlwaysCreate) {
          mergeType = await vscode.window.showQuickPick(mergeTypes, {
            title: `Group ${newGroupLabel} already exists, please select the merge type`
          });
        }
        if (!mergeType) {
          continue;
        }
        if (mergeType.label === EMergeType.MERGE_TO_OLD_GROUP_ALWAYS) {
          isAlwaysMerge = true
        }
        if (mergeType.label === EMergeType.CREATE_NEW_GROUP_ALWAYS) {
          isAlwaysCreate = true
        }
        if (isAlwaysMerge || mergeType.label === EMergeType.MERGE_TO_OLD_GROUP) {
          await this.pushDocumentsByRelativePathDocuments(oldGroup, group.documents);
          oldGroup.refresh();
        }
        if (isAlwaysCreate || mergeType.label === EMergeType.CREATE_NEW_GROUP) {
          const newGroupObj = new EditorGroup(newGroupLabel, vscode.TreeItemCollapsibleState.Collapsed, []);
          await this.pushDocumentsByRelativePathDocuments(newGroupObj, group.documents);
          minimizedGroups.push(newGroupObj);
        }
      } else {
        const newGroupObj = new EditorGroup(newGroupLabel, vscode.TreeItemCollapsibleState.Collapsed, []);
        await this.pushDocumentsByRelativePathDocuments(newGroupObj, group.documents);
        minimizedGroups.push(newGroupObj);
      }
    }

    vscode.window.showInformationMessage(`Import file completed\n Group: ${newGroups.map(group => group.label).join(', ')}`);

    if (this.hasFileError) {
      // 消息中增加链接，点击直接打开输出面板
      vscode.window
        .showErrorMessage(
          `Import file failed Please click to view output panel`,
          "view"
        )
        .then((selection) => {
          if (selection) {
            minimizedGroupChannel.show();
          }
        });
    }

    return this.context.workspaceState.update('minimizedGroups', minimizedGroups)
      .then(() => this.refresh());
  }

  // 根据相对路径导入docments, 并记录错误
  private async pushDocumentsByRelativePathDocuments(group: EditorGroup, relativePathDocuments: { relativePath: string }[]) {
    for (const { relativePath } of relativePathDocuments) {
      const uri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '', relativePath));
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        pushDocumentsToArrayAsUniq(group.documents!, new EditorDocument(document));
      } catch (error: any) {
        // 在输出面板中打印错误
        minimizedGroupChannel.appendLine(`import File error, Group: ${group.label}
path: ${relativePath}
error: ${error.message}\n`);
          this.hasFileError = true
      }
    }
  }

}

type IStorageGroup = {
  label: string;
  documents: {
    relativePath: string;
  }[]
}[]

// 将文档添加到数组中，如果已存在则替换
function pushDocumentsToArrayAsUniq(documents: EditorDocument[], document: EditorDocument) {
  const hasCurrentDocIndex = documents.findIndex(doc => {
    return doc.document.uri.fsPath === document.document.uri.fsPath
  });
  if (hasCurrentDocIndex > -1) {
    documents[hasCurrentDocIndex] = document;
  } else {
    documents.push(document);
  }
}

enum EMergeType {
  MERGE_TO_OLD_GROUP = 'Merge To Old Group',
  CREATE_NEW_GROUP = 'Create New Group',
  MERGE_TO_OLD_GROUP_ALWAYS = 'Merge To Old Group (always)',
  CREATE_NEW_GROUP_ALWAYS = 'Create New Group (always)',
}

const mergeTypes = [
  {
    label: EMergeType.MERGE_TO_OLD_GROUP_ALWAYS,
  },
  {
    label: EMergeType.CREATE_NEW_GROUP_ALWAYS,
  },
  {
    label: EMergeType.MERGE_TO_OLD_GROUP,
  },
  {
    label: EMergeType.CREATE_NEW_GROUP,
  },
]