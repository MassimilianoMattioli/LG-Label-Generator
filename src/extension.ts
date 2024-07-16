import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import {  Builder } from 'xml2js';
import { create } from 'xmlbuilder2';
import * as xml2js from 'xml2js';

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

	async function createFile_json(filePath: string, name: any) {
		const nomeFile = estraiNomeFileDaPath(filePath);
		const value = await vscode.window.showInputBox({
			prompt: `Inserisci la traduzione per il file ${path.basename(filePath, path.extname(filePath))}`,
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

	async function createFile_xml(filePath: string, name: string) {
		const nomeFile = estraiNomeFileDaPath(filePath);
		const value = await vscode.window.showInputBox({
			prompt: `Inserisci la traduzione per il file ${path.basename(filePath, path.extname(filePath))}`,
		});
	
		let obj;
		// Verifica se il file esiste
		if (fs.existsSync(filePath)) {
			// Leggi il contenuto esistente
			const xmlData = fs.readFileSync(filePath, 'utf8');
			try {
				// Analizza il contenuto esistente
				obj = await xml2js.parseStringPromise(xmlData);
			} catch (error) {
				console.error("Errore nell'analisi del file XML esistente:", error);
				return;
			}
		} else {
			// Inizia con un oggetto vuoto se il file non esiste
			obj = { root: { data: [] } };
		}
	
		// Aggiungi o modifica i dati
		const newData = { $: { nome: name, 'xml:space': 'preserve' }, value: value };
		// Assumi che `data` sia un array, aggiungi il nuovo dato
		if (!Array.isArray(obj.root.data)) {
			obj.root.data = [];
		}
		obj.root.data.push(newData);
	
		// Crea una nuova istanza di Builder per convertire l'oggetto JS in XML
		const builder = new xml2js.Builder();
		const xml = builder.buildObject(obj);
	
		// Scrivi l'XML modificato nel file specificato
		fs.writeFile(filePath, xml, 'utf8', (err) => {
			if (err) {
				console.error(err);
			} else {
				console.log(`File XML aggiornato con successo in ${filePath}`);
			}
		});
	}
	const dataCollector = vscode.commands.registerCommand('label.collectData', async () => {
		vscode.window.showInformationMessage('Inserisci i dati per la traduzione.');
		var name = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
		if (globalFilePaths.length === 0) {
			globalFilePaths = await selectFilePath();
		}
		for (var i = 0; i < globalFilePaths.length; i++) {
			if (path.extname(globalFilePaths[i]) === '.json') {
				await createFile_json(globalFilePaths[i], name);
			} 
			else if (path.extname(globalFilePaths[i]) === '.xml') {
				await createFile_xml(globalFilePaths[i], name as string);
			} 
			else {
				await vscode.window.showErrorMessage('Estensione file non supportata.');
			}
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
