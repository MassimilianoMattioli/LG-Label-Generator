import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
const { basename } = path;
import * as xml2js from 'xml2js';

let globalFilePaths: string[] = [];
let globalLabel: string[][] = [];
let globalname: any;


export function activate(context: vscode.ExtensionContext) {    
    class TreeEntry extends vscode.TreeItem {
        public children: TreeEntry[] = []; // Add the children property
    
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
        
        async getChildren(element?: TreeEntry): Promise<TreeEntry[]> {
            if (element) {
                if (element.contextValue === 'fileContainer') {
                    return this.getContainerChildren('Percorsi dei File');
                } else if (element.contextValue === 'formContainer') {
                    return this.getContainerChildren('Form');
                }
                return [];
            } else {
                const fileContainer = new TreeEntry('Percorsi dei File', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'fileContainer');
                const formContainer = new TreeEntry('Riassunto del form', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'formContainer');
                return [fileContainer, formContainer];
            }
        }

        async getContainerChildren(containerLabel: string): Promise<TreeEntry[]> {
            if (containerLabel === 'Percorsi dei File') {
                return getFormEntries();
            } else if (containerLabel === 'Form') {
                return await getLabelEntries();
           }
            return [];
        }

        refresh(): void {
            this._onDidChangeTreeData.fire(null);
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

    async function getLabelEntries(): Promise<TreeEntry[]> {
        const entries: TreeEntry[] = [];
        var nameL = `Nome: ${globalname}`;
        entries.push(new TreeEntry(nameL, vscode.TreeItemCollapsibleState.None,undefined, 'nameItem'));
        for (let i = 0; i < globalFilePaths.length; i++) {
            const filePath = globalFilePaths[i];
            const labels = globalLabel[i];
            for (const label of labels) {
                var file= path.basename(filePath);
                const entryLabel = `Nel percorso: ${file} vale: ${label}`;
                entries.push(new TreeEntry(entryLabel, vscode.TreeItemCollapsibleState.None, {
                    command: 'label.modify',
                    title: 'Mostra Nome',
                    arguments: [filePath]
                }, 'nameItem'));
            }
        }

        return entries;
    }

    const formTreeViewProvider = new FormTreeViewProvider();
    vscode.window.registerTreeDataProvider('formTreeView', formTreeViewProvider);

    async function selectFilePath(): Promise<string[]> {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: true,
            openLabel: 'Select file',
            canSelectFiles: true,
            canSelectFolders: false,
        };

        const fileUris = await vscode.window.showOpenDialog(options);

        globalFilePaths = fileUris ? fileUris.map(uri => uri.fsPath) : [];
        globalLabel = globalFilePaths.map(() => []); // Inizializza globalLabel con array vuoti
        formTreeViewProvider.refresh();
        return globalFilePaths;
        
    }

    function extractFileNameFromPath(filePath: string): string {
        return filePath.split(/[/\\]/).pop() || '';
    }

    async function createFile_json(filePath: string, name: any, value: any, sub: boolean) {
        if (!value) {
            return;
        }
        let data: { [key: string]: any } = {};
        try {
            const currentContent_it = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(currentContent_it);
            const existingValue = data[name];
            if (existingValue ) {
                if(sub){
                data[name as string] = value;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
                }
                else{
                vscode.window.showInformationMessage(`The label '${name}' already exists in the file with the value: '${existingValue}'`);}
            } else {
                data[name as string] = value;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
            }
        } catch (error) {
            data[name as string] = value;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        }
    }

    async function createFile_xml(filePath: string, name: string, value: any, sub: boolean) {
        if (!value) {
            return;
        }
        let obj;
        if (fs.existsSync(filePath)) {
            const xmlData = fs.readFileSync(filePath, 'utf8');
            if (!xmlData.trim()) {
                // The file is empty, initialize obj with a basic XML structure
                obj = { root: { data: [] } };
            } else {
                try {
                    obj = await xml2js.parseStringPromise(xmlData);
                } catch (error) {
                    console.error("Error parsing existing XML file:", error);
                    return;
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
            if(sub){
            const existingElement = obj.root.data.find((element: any) => element.$.nome === name);
            obj.root.data.push(newData);}
            else{
                vscode.window.showInformationMessage(`The label '${name}' already exists in the file with the value: '${value}'`);
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

    const dataCollector = vscode.commands.registerCommand('label.collectData', async () => {
       
        formTreeViewProvider.refresh();
        vscode.window.showInformationMessage('Inserisci i dati per la traduzione.');
        globalname = await vscode.window.showInputBox({ prompt: 'Inserisci la label' });
        
        let globalLabels: string[] = [];
        if (globalFilePaths.length === 0) {
            globalFilePaths = await selectFilePath();
        }
        for (let i = 0; i < globalFilePaths.length; i++) {
            const nomeFile = extractFileNameFromPath(globalFilePaths[i]);
            const t = await vscode.window.showInputBox({
                prompt: `Inserisci la traduzione per il file ${path.basename(globalFilePaths[i], path.extname(globalFilePaths[i]))}`,
                
            });
            globalLabels.push(t as string);
            globalLabel[i].push(t as string);
            formTreeViewProvider.refresh();
            if (path.extname(globalFilePaths[i]) === '.json') {
                await createFile_json(globalFilePaths[i], globalname, globalLabels[i] as string, false);
            } else if (path.extname(globalFilePaths[i]) === '.xml') {
                await createFile_xml(globalFilePaths[i], globalname as string, globalLabels[i] as string, false);
            } else {
                await vscode.window.showErrorMessage('Estensione file non supportata.');
            }
        }
        await vscode.window.showInformationMessage('Traduzioni aggiornate.');
    });
    const removePath = vscode.commands.registerCommand('label.removePath', async (filePath: string) => {
        globalFilePaths = globalFilePaths.filter(path => path !== filePath);
        formTreeViewProvider.refresh();
        vscode.window.showInformationMessage(`Path rimosso: ${filePath}`);
    });

    const addPath = vscode.commands.registerCommand('label.addPath', async () => {
        await selectFilePath();
        formTreeViewProvider.refresh();
    });

    const savePaths = vscode.commands.registerCommand('label.savePaths', async () => {
        const savedPaths = context.workspaceState.get<string[]>('savedPaths') || [];
        const selectedFilePaths = await selectFilePath();
        context.workspaceState.update('savedPaths', [...savedPaths, ...selectedFilePaths]);
        vscode.window.showInformationMessage('Paths salvati correttamente.');
    });

      let disposable = vscode.commands.registerCommand('label.modify',async (filePath) => {
            formTreeViewProvider.refresh();
        for(let i=0; i<globalFilePaths.length; i++){
            if(filePath === globalFilePaths[i]){
                var valueL = await vscode.window.showInputBox({ prompt: 'Inserisci la traduzione' });
            if (path.extname(globalFilePaths[i]) === '.json') {
                await createFile_json(globalFilePaths[i], globalname, valueL as string, true);
            } else if (path.extname(globalFilePaths[i]) === '.xml') {
                await createFile_xml(globalFilePaths[i], globalname as string,valueL , true);
            }
        };
    };
});
    context.subscriptions.push(dataCollector, removePath, addPath, savePaths);
}

