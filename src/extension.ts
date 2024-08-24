import * as vscode from 'vscode';

import { EditorGroupTreeDataProvider } from './editorGroupTreeDataProvider';
import { exportFile, importFile } from './storage';

export function activate(context: vscode.ExtensionContext) {
  const editorGroupTreeDataProvider = new EditorGroupTreeDataProvider(context);
  vscode.window.registerTreeDataProvider('minimizedGroups', editorGroupTreeDataProvider);
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.minimize', () => editorGroupTreeDataProvider.minimize());
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.minimizeAsAdd', () => editorGroupTreeDataProvider.minimizeAsAdd());
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.remove', group => editorGroupTreeDataProvider.remove(group));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.restore', group => editorGroupTreeDataProvider.restore(group));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.rename', group => editorGroupTreeDataProvider.rename(group));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.addToGroup', uri => editorGroupTreeDataProvider.addToGroup(uri));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.removeFromGroup', group => editorGroupTreeDataProvider.removeFromGroup(group));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.saveActiveAndRestore', group => editorGroupTreeDataProvider.saveActiveAndRestore(group));
  vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.clearAllMinimizerGroups', group => editorGroupTreeDataProvider.clearAllMinimizerGroups());

  context.subscriptions.push(editorGroupTreeDataProvider);

  // 导出
  let exportDisposable = vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.exportFile', () => {
    exportFile(() => {
      return editorGroupTreeDataProvider.stringifyGroup();
    });
  });
  // 导入
  let importDisposable = vscode.commands.registerCommand('vscode-editor-group-minimizer-plus.importFile', () => {
    importFile((str) => {
      return editorGroupTreeDataProvider.parseGroup(str);
    });
  });
  context.subscriptions.push(exportDisposable);
  context.subscriptions.push(importDisposable);
}

export function deactivate() {}
