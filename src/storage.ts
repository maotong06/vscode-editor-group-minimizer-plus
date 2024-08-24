import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import dayjs from 'dayjs'

// 保存到文件
export async function exportFile(getContent: () => string) {
    const fileName = `group-minimizer-plus-${dayjs().format('YYYY-MM-DD')}.json`;
    // 选择导出目录
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || '', fileName)),
        saveLabel: '导出文件'
    });

    if (uri) {
        const exportPath = uri.fsPath;

        // 写入文件到导出目录
        fs.writeFile(exportPath, getContent(), (err) => {
            if (err) {
                vscode.window.showErrorMessage(`导出文件失败: ${err.message}`);
            } else {
                vscode.window.showInformationMessage(`文件已导出到: ${exportPath}`);
            }
        });
    } else {
        // vscode.window.showWarningMessage('未选择导出目录');
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
        openLabel: '导入文件'
    });

    if (uri) {
        const importPath = uri[0].fsPath;

        // 读取文件内容
        fs.readFile(importPath, 'utf8', (err, data) => {
            if (err) {
                vscode.window.showErrorMessage(`导入文件失败: ${err.message}`);
            } else {
              importContent(data);
            }
        });
    } else {
        // vscode.window.showWarningMessage('未选择导入文件');
    }
}