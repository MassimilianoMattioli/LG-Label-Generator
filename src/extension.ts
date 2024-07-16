import * as vscode from 'vscode';
import * as fs from 'fs';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {  
	async function selectFilePath(): Promise<string> {
		// Configura le opzioni per lo showOpenDialog
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false, // Permette di selezionare un solo file
			openLabel: 'Seleziona file',
			canSelectFiles: true, // Permette la selezione di file
			canSelectFolders: false, // Non permette la selezione di cartelle
		};

		// Mostra il dialogo di selezione file all'utente
		const fileUri = await vscode.window.showOpenDialog(options);
		
		// Restituisci il path del file selezionato
		return fileUri && fileUri[0]?.fsPath || '';
	}
	// Funzione per creare o aggiornare un file con le traduzioni
	function createFile(filePath: string, value: any, name: any) {
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
	// Acquisci il nome della label e assegna il valore
	var name = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
	// Acquisisci il valore della label in italiano
	var value = await vscode.window.showInputBox({ prompt: 'Inserisci il valore della label in italiano' });
	// Mostra un messaggio all'utente dove si chiede di selezionare il file in cui salvare le traduzioni in italiano
	vscode.window.showInformationMessage('Seleziona il file in cui salvare le traduzioni in italiano.');
	// Acquisisci il percorso del file in italiano
	var filePath = await selectFilePath();
	createFile(filePath, value, name);
	// Acquisisci il valore della label in inglese
	value = await vscode.window.showInputBox({ prompt: 'Inserisci il valore della label in inglese' });
	// Mostra un messaggio all'utente dove si chiede di selezionare il file in cui salvare le traduzioni in inglese
	vscode.window.showInformationMessage('Seleziona il file in cui salvare le traduzioni in inglese.');
	// Acquisisci il percorso del file in inglese
	filePath= await selectFilePath();
	createFile(filePath, value, name);

	// Mostra un messaggio all'utente per confermare che le traduzioni sono state aggiornate
	vscode.window.showInformationMessage('Traduzioni aggiornate.');
    });
	// Aggiungi il comando alla lista dei comandi disponibili
	context.subscriptions.push(dataCollector);
}