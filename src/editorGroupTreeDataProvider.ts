import * as vscode from 'vscode';

import { EditorDocument } from './editorDocument';
import { EditorGroup } from './editorGroup';
import { getRootSepPath } from './utils';

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
      const root = vscode.workspace.workspaceFolders?.[0]?.uri?.path ?? '';
      const documents = (element.documents || []).map(({ document }) => {
        const groupMember = new EditorGroup(document?.fileName.replace(
          getRootSepPath(root), ''),
          undefined,
          undefined,
          document?.uri
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
            const hasCurrentDocIndex = documents.findIndex(doc => doc.document.uri.toString() === closingEditor.document.uri.toString());
            if (hasCurrentDocIndex > -1) {
              documents[hasCurrentDocIndex] = new EditorDocument(closingEditor.document, closingEditor.viewColumn);
            } else {
              documents.push(new EditorDocument(closingEditor.document, closingEditor.viewColumn));
            }
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
        documents.push(new EditorDocument(closingEditor.document, closingEditor.viewColumn));
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
                picked.documents?.push(new EditorDocument(document));
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

        const i = oldGroup?.documents?.findIndex((doc) => doc.documentName === group.label) ?? -1;
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
}
