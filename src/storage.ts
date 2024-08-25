import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import dayjs from 'dayjs'

// 保存到文件
export async function exportFile(getContent: () => string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let projectName = '';
    if (!workspaceFolders) {
      projectName = ''
    } else {
      const rootPath = workspaceFolders[0].uri.fsPath;
      // 获取项目名称
      projectName = path.basename(rootPath) + '-';
    }
    const fileName = `${projectName}minimizer-group-${dayjs().format('YYYY-MM-DD')}.json`;
    // 选择导出目录
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '', fileName)),
        saveLabel: 'Exporting files'
    });

    if (uri) {
        const exportPath = uri.fsPath;

        // 写入文件到导出目录
        fs.writeFile(exportPath, getContent(), (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to export file: ${err.message}`);
            } else {
                vscode.window.showInformationMessage(`The file has been exported to: ${exportPath}`);
            }
        });
    } else {
        // vscode.window.showWarningMessage('Export directory not selected');
    }
}

// 读取文件
export async function importFile(importContent: (content: string) => void) {
    // 选择导入文件
    const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'JSON': ['json']
        },
        openLabel: 'Importing files'
    });

    if (uri) {
        const importPath = uri[0].fsPath;

        // 读取文件内容
        fs.readFile(importPath, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to import file: ${err.message}`);
            } else {
              importContent(data);
            }
        });
    } else {
        // vscode.window.showWarningMessage('Import file not selected');
    }
}