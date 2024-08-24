import * as vscode from 'vscode';
import * as path from 'path';

export const getRootSepPath = (root: string) => {
  // 获取当前系统的文件分隔符
  // const sep = require('path').sep;
  return `${root}/`
}

// 返回文档文件名，在当前项目下的相对文件夹
export const getDocumentPathObj = (document: vscode.TextDocument) => {
  let relativePath = '';
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const filePath = document.uri.fsPath;
  if (workspaceFolder) {
    relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
  } else {
    relativePath = document?.fileName
  }
  const fileName = path.basename(filePath);
  const relativeDir = path.dirname(relativePath);
  return {
    relativePath,
    relativeDir,
    fileName
  }
}