import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const { basename } = path;
import * as xml2js from 'xml2js';

let globalFilePaths: string[] = [];
let globalLabel: string[][] = [];
let globalname: any;
let globalProgram: string;
let globalLabels: string[] = [];

export function activate(context: vscode.ExtensionContext) {    
    globalFilePaths = context.globalState.get<string[]>('globalFilePaths') || [];
    class TreeEntry extends vscode.TreeItem {
        public children: TreeEntry[] = []; // Aggiungi la proprietà children
    
        constructor(
            public readonly label: string,
            public readonly collapsibleState: vscode.TreeItemCollapsibleState,
            public readonly command?: vscode.Command,
            public readonly contextValue?: string // Aggiunto per differenziare i tipi di elementi
        ) {
            super(label, collapsibleState);
        }
    }

    class FormTreeViewProvider implements vscode.TreeDataProvider<TreeEntry> {
        private _onDidChangeTreeData: vscode.EventEmitter<TreeEntry | undefined | null> = new vscode.EventEmitter<TreeEntry | undefined | null>();
        readonly onDidChangeTreeData: vscode.Event<TreeEntry | undefined | null> = this._onDidChangeTreeData.event;

        getTreeItem(element: TreeEntry): vscode.TreeItem {
            return element;
        }
        
        async getChildren(element?: TreeEntry): Promise<TreeEntry[] | undefined> {
            if (element) {
                if (element.contextValue === 'fileContainer') {
                    return this.getContainerChildren('File con le Label');
                } else if (element.contextValue === 'formContainer') {
                    return this.getContainerChildren('Form');
                } else if (element.contextValue === 'programmaContainer') {
                    return this.getContainerChildren('Programma da eseguire');
                }
            } else {
                const programmaDaEseguire = new TreeEntry('Programma da eseguire:', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'programmaContainer');
                const percorsiDeiFile = new TreeEntry('File con le Label', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'fileContainer');
                const fileContainer = new TreeEntry('Percorsi dei File:', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'fileContainer');
                const formContainer = new TreeEntry('Label inserita:', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'formContainer');
                return [fileContainer,programmaDaEseguire, formContainer];
            }
            
            return undefined;
        }

        async getContainerChildren(containerLabel: string): Promise<TreeEntry[]> {
            if (containerLabel === 'File con le Label') {
                return await getFormEntries();
            } else if (containerLabel === 'Programma da eseguire') {
                return await getProgramEntries();
            } else if (containerLabel === 'Form') {
                return await getLabelEntries();
            }
            return [];
        }

        async refresh(): Promise<TreeEntry[]> {
            this._onDidChangeTreeData.fire(null);
            return Promise.resolve([]);
        }
        
    }


    async function getFormEntries(): Promise<TreeEntry[]> {
        return globalFilePaths.map(filePath => {
            const fileName = extractFileNameFromPath(filePath);
            return new TreeEntry(fileName, vscode.TreeItemCollapsibleState.None, {
                command: 'label.removePath',
                title: 'Rimuovi Path',
                arguments: [filePath]
            }, 'fileItem');
        });
    }

   

    async function getProgramEntries(): Promise<TreeEntry[]> {
        const fileName = extractFileNameFromPath(globalProgram);
        const program  : TreeEntry[] = [];
        program.push(new TreeEntry(fileName, vscode.TreeItemCollapsibleState.None, {
            command: 'label.saveProgram',
            title: 'Salva il nuovo programma',
            arguments: [globalProgram]
        }, 'programmaItem'));
        program.push(new TreeEntry('Esegui il programma', vscode.TreeItemCollapsibleState.None, {
            command: 'label.runProgram',
            title: 'Esegui il programma',
            arguments: [globalProgram]
        }, 'programmaItem'));
        
        return program;
    }

    async function getLabelEntries(): Promise<TreeEntry[]> {
        const entries: TreeEntry[] = [];
        var nameL = `Nome: ${globalname}`;
        if(nameL === 'Nome: undefined'){
            return entries;
        }
        else{
        entries.push(new TreeEntry(nameL, vscode.TreeItemCollapsibleState.None,{
            command: 'label.modifyName',
            title: 'Modifica Nome',
            arguments: [globalname]
        }, 'nameItem'));
        }
        for (let i = 0; i < globalFilePaths.length; i++) {
            if(globalLabel.length !== 0){
            const filePath = globalFilePaths[i];
            const labels = globalLabel[i];
            for (let label of labels) {
                var file = path.basename(filePath);
                const entryLabel = `In: ${file} vale: ${label}`;
                entries.push(new TreeEntry(entryLabel, vscode.TreeItemCollapsibleState.None, {
                    command: 'label.modify',
                    title: 'Mostra Nome',
                    arguments: [filePath]
                }, 'nameItem'));
            }
        }
    }
        return entries;
    }

    const formTreeViewProvider = new FormTreeViewProvider();
    vscode.window.registerTreeDataProvider('formTreeView', formTreeViewProvider);

    async function selectFilePath(): Promise<string[]> {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: true,
            openLabel: 'Seleziona i file',
            canSelectFiles: true,
            canSelectFolders: false,
        };

        const fileUris = await vscode.window.showOpenDialog(options);

        globalFilePaths = fileUris ? fileUris.map(uri => uri.fsPath) : [];
        globalLabel = globalFilePaths.map(() => []); // Inizializza globalLabel con array vuoti
        formTreeViewProvider.refresh();
        updateGlobalFilePaths(globalFilePaths);
        return globalFilePaths;
        
    }
    
    async function selectProgram() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Seleziona il programma',
            canSelectFiles: true,
            canSelectFolders: false,
        };
        const fileUris = await vscode.window.showOpenDialog(options);

        globalProgram = fileUris ? fileUris[0].fsPath : '';
        formTreeViewProvider.refresh();
        updateFileProgram(globalProgram);
        return globalProgram;
}
    function extractFileNameFromPath(filePath: string): string {
        if (filePath !== undefined && filePath !== null) {
            return filePath.split(/[/\\]/).pop() || '';;
        }
        return "undefined";
    }

    async function createFile_json(filePath: string, name: any, value: any, sub: boolean) {
        if (!value) {
            return;
        }
        let data: { [key: string]: any } = {};
        try {
            const currentContent_it = fs.readFileSync(filePath, 'utf8');
            if (!currentContent_it.trim()) {
                data = {};
            } else {
                data = JSON.parse(currentContent_it);
            }
            const existingValue = data[name];
            if (existingValue) {
                if (sub) {
                    data[name as string] = value;
                } else {
                    vscode.window.showInformationMessage(`The label '${name}' already exists in the file with the value: '${existingValue}'`);
                    return; // Uscita anticipata se la chiave esiste e sub è false
                }
            } else {
                data[name as string] = value;
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update JSON file: ${error}`);
        }
    }

    function updateGlobalFilePaths(newPaths: string[]) {
        globalFilePaths = newPaths;
        context.globalState.update('globalFilePaths', globalFilePaths);
    }
    function updateFileProgram(newPaths: string) {
        globalProgram = newPaths;
        context.globalState.update('globalProgram', globalProgram);
    }

    async function createFile_xml(filePath: string, name: string, value: string, sub: boolean) {
        if (!value) {
            return;
        }
        let obj;
        if (fs.existsSync(filePath)) {
            const xmlData = fs.readFileSync(filePath, 'utf8');
            if (!xmlData.trim()) {
                // Il file è vuoto, inizializza obj con una struttura XML di base
                obj = { root: { data: [] } };
            } else {
                try {
                    obj = await xml2js.parseStringPromise(xmlData);
                    if (typeof obj === 'string') {
                        obj = { root: { data: [] } }; // Inizializza obj con una struttura XML di base se è una stringa
                    }
                } catch (error) {
                    obj = { root: { data: [] } }; // Inizializza obj con una struttura XML di base in caso di errore
                }
            }
        } else {
            obj = { root: { data: [] } };
        }
    
        const newData = { $: { nome: name, 'xml:space': 'preserve' }, value: value };
        if (!Array.isArray(obj.root.data)) {
            obj.root.data = [];
        }
        const isNamePresent = obj.root.data.some((element: any) => element.$.nome === name);
    
        if (isNamePresent) {
            if (sub) {
                const existingElement = obj.root.data.find((element: any) => element.$.nome === name);
                obj.root.data.push(newData);
            }
        } else {
            obj.root.data.push(newData);
        }
        const builder = new xml2js.Builder();
        const xml = builder.buildObject(obj);
    
        fs.writeFile(filePath, xml, 'utf8', (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`File XML aggiornato con successo in ${filePath}`);
            }
        });
    }
    async function createFile_resx(filePath: string, name: string, value: string, sub: boolean) {
        if (!value) {
            return;
        }
    
        let data: any = { root: { data: [] } };
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();
    
        try {
            if (fs.existsSync(filePath)) {
                const currentContent = fs.readFileSync(filePath, 'utf8');
                data = await parser.parseStringPromise(currentContent);
            }
    
            const existingEntry = data.root.data.find((entry: any) => entry.$.name === name);
            if (existingEntry) {
                if (sub) {
                    existingEntry.value = [value];
                } else {
                    vscode.window.showInformationMessage(`The label '${name}' already exists in the file with the value: '${existingEntry.value[0]}'`);
                    return; // Uscita anticipata se la chiave esiste e sub è false
                }
            } else {
                data.root.data.push({ $: { name: name }, value: [value] });
            }
    
            const xml = builder.buildObject(data);
            fs.writeFileSync(filePath, xml, 'utf8');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update RESX file: ${error}`);
        }
    }


    const dataCollector = vscode.commands.registerCommand('label.collectData', async () => {
        if (globalFilePaths.length === 0) {
            globalFilePaths = await selectFilePath();
        }
        if(globalLabel.length !== 0){
        globalLabel.splice(0, globalLabel.length);}
        if(globalLabels.length !== 0){
        globalLabels.splice(0, globalLabels.length);}

        vscode.window.showInformationMessage('Inserisci i dati per la traduzione.');
        globalname = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
        if(globalname){
        await formTreeViewProvider.refresh();
        for (let i = 0; i < globalFilePaths.length; i++) {
            const nomeFile = extractFileNameFromPath(globalFilePaths[i]);
            let lab=[];
            const filePath = globalFilePaths[i];
            const fileExtension = path.extname(filePath);
            let isLabelPresent = false;
            let fileContent;
                fileContent = fs.readFileSync(filePath, 'utf8');
                if(!(fileContent === null)){
                if (fileExtension === '.json') {
                    const jsonData = JSON.parse(fileContent as string);
                    isLabelPresent = jsonData.hasOwnProperty(globalname);
                } else if (fileExtension === '.xml') {
                    const parsedXml = await xml2js.parseStringPromise(fileContent);
                    if(parsedXml === null){
                        let data;
                        data = { root: { data: [] } };
                        const builder = new xml2js.Builder();
                        const xml = builder.buildObject(data);
                        fs.writeFileSync(filePath, xml, 'utf8');
                    }
                    const elements = parsedXml.root.data;
                    if (elements) {
                        for (const el of elements) {
                            if (el.$ && el.$.nome === globalname) {
                                isLabelPresent = true;
                                break;
                            }
                        }
                    }
                }
            if(isLabelPresent){
                let labelValue;
                if (fileExtension === '.json') {
                    const jsonData = JSON.parse(fileContent as string);
                    labelValue = jsonData[globalname]; // Prendi il valore della label dal JSON
                } else if (fileExtension === '.xml'|| fileExtension === '.resx') {                    // Utilizza xml2js per ottenere il valore della label dall'XML
                    const parsedXml = await xml2js.parseStringPromise(fileContent as string);
                    // Assumi una struttura XML semplice e che globalname sia un attributo di un elemento
                    const elements = parsedXml.root.data;
                    if (elements) {
                        for (const el of elements) {
                            if (el.$ && el.$.nome === globalname) {
                                labelValue = el.value[0]; // Prendi il valore della label dall'elemento XML
                                break;
                            }
                        }
                    }
                }
                globalLabels.push(labelValue);
                globalLabel.push([labelValue]); 
                await formTreeViewProvider.refresh();
            }
        }
            
                const t = await vscode.window.showInputBox({
                    prompt: `Inserisci la traduzione per il file ${path.basename(globalFilePaths[i], path.extname(globalFilePaths[i]))}`,
                });
                globalLabels.push(t as string);
                globalLabel.push(t ? [t] : []);
                await formTreeViewProvider.refresh();
                if (path.extname(globalFilePaths[i]) === '.json') {
                    await createFile_json(globalFilePaths[i], globalname, globalLabels[i] as string, false);
                } else if (path.extname(globalFilePaths[i]) === '.xml'|| path.extname(globalFilePaths[i]) === '.resx') {
                    await createFile_xml(globalFilePaths[i], globalname as string, globalLabels[i] as string, false);
                } else if(path.extname(globalFilePaths[i]) === '.resx'){
                    await createFile_resx(globalFilePaths[i], globalname as string, globalLabels[i] as string, false);
                }
                else {
                    await vscode.window.showErrorMessage('Estensione file non supportata.');
                }
                await formTreeViewProvider.refresh();
        }
        await formTreeViewProvider.refresh();
        // Chiedi all'utente se desidera eseguire uno script personalizzato
        var prog = await vscode.window.showInputBox({
            prompt: `Vuoi eseguire uno script personalizzato? (si/no)`,
        });
        await formTreeViewProvider.refresh();
        // Controlla la risposta dell'utente
        if(prog === 'si' || prog === 'yes' || prog === 'y' || prog === 's' || prog === 'Si' || prog === 'Yes' || prog === 'Y' || prog === 'S' || prog === 'SI' || prog === 'YES' || prog === 'Y' || prog === 'S'){
            if(globalProgram === undefined){
                globalProgram = await selectProgram(); // Seleziona lo script se non è già stato selezionato
            }
            const terminal = vscode.window.createTerminal('Label Generator Terminal');
            terminal.show();
            if(path.extname(globalProgram) === '.js' || path.extname(globalProgram) === '.ts'){
            terminal.sendText(`node "${globalProgram}" `); // Esegui lo script personalizzato
            }
            else{
                terminal.sendText(`${globalProgram}`); // Esegui lo script personalizzato
            }
    }   
    else {
            await vscode.window.showInformationMessage('Script personalizzato non eseguito.');
        }

        await formTreeViewProvider.refresh();

        await vscode.window.showInformationMessage('Traduzioni aggiornate.');

    }

    });
    const removePath = vscode.commands.registerCommand('label.removePath', async (filePath: string) => {
        globalFilePaths = globalFilePaths.filter(path => path !== filePath);
        formTreeViewProvider.refresh();
        updateGlobalFilePaths(globalFilePaths);
        vscode.window.showInformationMessage(`Path rimosso: ${filePath}`);
    });

    const addPath = vscode.commands.registerCommand('label.addPath', async () => {
        await selectFilePath();
        formTreeViewProvider.refresh();
    });

    let runProgram = vscode.commands.registerCommand('label.runProgram', async () => {
        if(globalProgram === undefined){
            globalProgram = await selectProgram(); // Seleziona lo script se non è già stato selezionato
        }
        const terminal = vscode.window.createTerminal('Label Generator Terminal');
        terminal.show();
        if(path.extname(globalProgram) === '.js' || path.extname(globalProgram) === '.ts'){
        terminal.sendText(`node "${globalProgram}" `); // Esegui lo script personalizzato
        }
        else{
            terminal.sendText(`${globalProgram}`); // Esegui lo script personalizzato
        }
});   

    const savePaths = vscode.commands.registerCommand('label.savePaths', async () => {
        const savedPaths = context.workspaceState.get<string[]>('savedPaths') || [];
        const selectedFilePaths = await selectFilePath();
        context.workspaceState.update('savedPaths', [...savedPaths, ...selectedFilePaths]);
        vscode.window.showInformationMessage('Paths salvati correttamente.');
    });

    const saveProgramm = vscode.commands.registerCommand('label.saveProgram', async () => {
        const selectedFilePaths = await selectProgram();
        context.workspaceState.update('globalProgram', [selectedFilePaths]);
        vscode.window.showInformationMessage('Programma salvato correttamente.');
    });

      let disposable = vscode.commands.registerCommand('label.modify',async (filePath) => {
            formTreeViewProvider.refresh();
        for(let i=0; i<globalFilePaths.length; i++){
            if(filePath === globalFilePaths[i]){
                var valueL = await vscode.window.showInputBox({ prompt: 'Inserisci la traduzione' });
                if(!(valueL === undefined || valueL === null || valueL === '')){
                globalLabels[i] = valueL as string;
                globalLabel[i] = [valueL as string];
            if (path.extname(globalFilePaths[i]) === '.json') {
                await createFile_json(globalFilePaths[i], globalname, valueL as string, true);
            } else if (path.extname(globalFilePaths[i]) === '.xml') {
                await createFile_xml(globalFilePaths[i], globalname as string,valueL , true);
            }
        };
    };
    };
        await formTreeViewProvider.refresh();
});

    let modifyN = vscode.commands.registerCommand('label.modifyName',async () => {
            let nome = await vscode.window.showInputBox({ prompt: 'Inserisci il nuovo nome' });
            if(nome){
            for(let i=0; i<globalFilePaths.length; i++){
            const filePath = globalFilePaths[i];
            const fileExtension = path.extname(filePath);
            let isLabelPresent = false;
            let fileContent;
                fileContent = fs.readFileSync(filePath, 'utf8');
                if (fileExtension === '.json') {    
                    const jsonData = JSON.parse(fileContent);
                    // Controlla se la proprietà esiste e cambiala con il nuovo nome
                    if (jsonData.hasOwnProperty(globalname) && !jsonData.hasOwnProperty(nome)) {
                        jsonData[nome as string] = jsonData[globalname];
                        delete jsonData[globalname]; // Rimuovi la vecchia proprietà
                
                        // Converti l'oggetto modificato in una stringa JSON
                        const newFileContent = JSON.stringify(jsonData, null, 2); // Formatta per leggibilità
                
                        // Salva il nuovo contenuto JSON nel file
                        fs.writeFileSync(filePath, newFileContent);
                    }
                    
                } else if (fileExtension === '.xml') {
                    let vari = true;
                        // Leggi il contenuto del file XML
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        // Analizza il contenuto XML in un oggetto JavaScript
                        const parsedXml = await xml2js.parseStringPromise(fileContent);
                        let modified = false;
                
                        // Ottieni gli elementi da modificare (ad esempio, sotto parsedXml.root.data)
                        const elements = parsedXml.root.data;
                        if (elements) {
                            for (const el of elements) {
                                // Controlla se l'elemento ha l'attributo nome da modificare
                                if (el.$ && el.$.nome === nome) {
                                    vari=false;
                                    return;
                            }
                            }
                            if(vari){
                            for (const el of elements) {
                                // Controlla se l'elemento ha l'attributo nome da modificare
                                if (el.$ && el.$.nome === globalname) {
                                    el.$.nome = nome; // Modifica l'attributo nome
                                    modified = true;
                            }
                            }
                        }
                    }
                
                        if (modified) {
                            // Ricostruisci l'XML dal nuovo oggetto JavaScript
                            const builder = new xml2js.Builder();
                            const newXml = builder.buildObject(parsedXml);
                
                            // Salva il nuovo contenuto XML nel file
                            fs.writeFileSync(filePath, newXml);
                        } 
                    }
            }
            globalname = nome;
            formTreeViewProvider.refresh();
        }
    });

    context.subscriptions.push(dataCollector, removePath, addPath, savePaths);
}