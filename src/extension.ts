import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {  
	async function selectFilePath(): Promise<string[]> {
	  // Configura le opzioni per lo showOpenDialog
	  const options: vscode.OpenDialogOptions = {
		canSelectMany: true, // Permette di selezionare più file
		openLabel: 'Seleziona file',
		canSelectFiles: true, // Permette la selezione di file
		canSelectFolders: false, // Non permette la selezione di cartelle
	  };
	
	  // Mostra il dialogo di selezione file all'utente
	  const fileUris = await vscode.window.showOpenDialog(options);
	  
	  // Restituisci i path dei file selezionati
	  return fileUris ? fileUris.map(uri => uri.fsPath) : [];
	}
	function estraiNomeFileDaPath(filePath: string): string {
		// Utilizza il metodo split() per dividere il percorso del file in base al separatore di sistema
		// e poi prendi l'ultimo elemento dell'array risultante, che sarà il nome del file
		return filePath.split(/[/\\]/).pop() || '';
	}
	// Funzione per creare o aggiornare un file con le traduzioni
	async function createFile(filePath: string, name: any) {
		var nomeFile = estraiNomeFileDaPath(filePath);
		var value = await vscode.window.showInputBox({
			prompt: `Inserisci la traduzione per il file ${path.basename(filePath)}`,
		});
		let data: { [key: string]: any } = {};
		try {
		// Leggi il contenuto corrente del file, se esiste
		const currentContent_it = fs.readFileSync(filePath, 'utf8');
		// Converti il contenuto in un oggetto JSON
		data = JSON.parse(currentContent_it);
		} catch (error) {
		// Se il file non esiste o c'è un errore nel parsing, inizia con un oggetto vuoto
		}
		// Aggiungi o aggiorna la traduzione
		data[name as string] = value;
		// Scrivi l'oggetto aggiornato nel file
		fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
	}
  const dataCollector = vscode.commands.registerCommand('label.collectData', async () => {
	// Mostra un messaggio all'utente dove si chiede di inserire i dati
	vscode.window.showInformationMessage('Inserisci i dati per la traduzione.');
	var name = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
	// Acquisisci il valore della label in italiano
	// Chiamata alla funzione selectFilePath e attesa del suo risultato
	var selectedFilePaths = await selectFilePath();
	for(var i=0; i<selectedFilePaths.length; i++){
		await createFile(selectedFilePaths[i], name);
	}
	// Verifica che il risultato sia un array di stringhe
	// Per ogni file selezionato, crea o aggiorna la traduzione
	
	// Mostra un messaggio all'utente per confermare che le traduzioni sono state aggiornate
	await vscode.window.showInformationMessage('Traduzioni aggiornate.');
    });
	// Aggiungi il comando alla lista dei comandi disponibili
	context.subscriptions.push(dataCollector);
}