import * as vscode from 'vscode';

import { EditorGroupTreeDataProvider } from './editorGroupTreeDataProvider';

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

  context.subscriptions.push(editorGroupTreeDataProvider);
}

export function deactivate() {}
