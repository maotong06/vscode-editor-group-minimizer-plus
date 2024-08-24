import * as vscode from 'vscode';

let _channel: vscode.OutputChannel;
export function getChannel() {
  if (_channel) {
    return _channel;
  } else {
    _channel = vscode.window.createOutputChannel("minimized-groups");
    return _channel;
  }
}

export const minimizedGroupChannel = getChannel();