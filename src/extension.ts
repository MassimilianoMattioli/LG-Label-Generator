import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let globalFilePaths: string[] = [];


export function activate(context: vscode.ExtensionContext) {
	async function selectFilePath(): Promise<string[]> {
		const options: vscode.OpenDialogOptions = {
			canSelectMany: true,
			openLabel: 'Seleziona file',
			canSelectFiles: true,
			canSelectFolders: false,
		};

        const fileUris = await vscode.window.showOpenDialog(options);
        
        globalFilePaths = fileUris ? fileUris.map(uri => uri.fsPath) : [];
        
        return globalFilePaths;
	}

	

	function estraiNomeFileDaPath(filePath: string): string {
		return filePath.split(/[/\\]/).pop() || '';
	}

	async function createFile(filePath: string, name: any) {
		const nomeFile = estraiNomeFileDaPath(filePath);
		const value = await vscode.window.showInputBox({
			prompt: `Inserisci la traduzione per il file ${path.basename(filePath)}`,
		});
		let data: { [key: string]: any } = {};
		try {
			const currentContent_it = fs.readFileSync(filePath, 'utf8');
			data = JSON.parse(currentContent_it);
		} catch (error) {
			// If the file doesn't exist or there's an error in parsing, start with an empty object
		}
		data[name as string] = value;
		fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
	}

	const dataCollector = vscode.commands.registerCommand('label.collectData', async () => {

		vscode.window.showInformationMessage('Inserisci i dati per la traduzione.');

		const name = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
		if (globalFilePaths.length === 0) {
			globalFilePaths = await selectFilePath();
		}
		for (var i = 0; i < globalFilePaths.length; i++) {
			await createFile(globalFilePaths[i], name);
		}
		await vscode.window.showInformationMessage('Traduzioni aggiornate.');
	});

	const savePaths = vscode.commands.registerCommand('label.savePaths', async () => {
		const savedPaths = context.workspaceState.get<string[]>('savedPaths') || [];
		const selectedFilePaths = await selectFilePath();
		context.workspaceState.update('savedPaths', [...savedPaths, ...selectedFilePaths]);
		vscode.window.showInformationMessage('Paths salvati correttamente.');
	});

	context.subscriptions.push(dataCollector, savePaths);
}
