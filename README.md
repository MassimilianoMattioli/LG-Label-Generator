# Label Generator README

Questo è il README per la tua estensione "Label Generator". Dopo aver scritto una breve descrizione, ti consigliamo di includere le seguenti sezioni.

## Requisiti

- Visual Studio Code
- Node.js e npm (per lo sviluppo e il testing)


## Funzionalità

- **Visualizzazione ad albero**: Visualizza i percorsi dei file e le etichette in una vista ad albero nella barra laterale di VS code.
- **Gestione etichette**: Aggiungi, cerca e modifica etichette nei file JSON e XML.
- **Esecuzione script**: Esegui script personalizzati per elaborare le etichette.


## Comandi Disponibili

- **label.collectData**: Gestisce la raccolta dati e la ricerca delle etichette per la traduzione delle etichette.
- **label.savePaths**: Salva i percorsi dei file selezionati.
- **label.saveProgram**: Salva il percorso di uno script personalizzato.


## Shortcut disponibili

- **label.collectData**: shift+alt+l.
- **label.savePaths**:shift+alt+s .
- **label.saveProgram**: shift+alt+p .


## Utilizzo

- **label.collectData**:
    Questo è il comando principale su cui si basa l'estensione. Appena utilizzato chiederà il nome che si vuole associare alla label, successivamente verranno memorizzati i percorsi.
    Successivamente verifica la presenza dell'etichetta all'interno del file selezionato. Se è presente riporta il valore, se assente chiederà 
    quale valore associare alla label. Acquisito il valore verifica la tipologia di file: 
        - se XML o JSON creerà la label, 
        - se diverso restituirà un errore e interromperà l'esecuzione del comando.
    Inoltre fornisce la possibilità di eseguire script personalizzati.
    Tutte le informazioni immesse saranno disponibili nel contenitore: "Label inserita:"
    E' disponibile tra i comandi di VS code con il nome di: "Collect Data"
    **N.B: Se non sono presenti i percorsi del file dove si vuole aggiungere la label o quello dello script personalizzato, il comando chiederà  
    di inserli.
    Nel caso i file non siano configurati, il programma eseguirà questa operazione in automatico.

- **label.savePath**:
    Questo comando si occupa di selezionare i percorsi dei file in cui si vuole inserire la label, facendo riselezionare tutti i percorsi file  
    che si vogliono utilizare. Si esegue in automantico quando non sono presenti file selezionati.
    E' disponibile tra i comandi di VS code con il nome di: "Salva percorsi"

- **label.saveProgram**:
    Questo comando si occupa di selezionare il percorso del file in cui è presente lo script personalizzato.Si esegue in automantico quando si  
    vuole eseguire uno script ma non si è selezionato. 
    E' disponibile tra i comandi di VS code con il nome di: "Salva programma"

- **Altri comandi**:
    Sono presenti 3 comandi grafici:
        - se si clicca su un percorso dei file, presenti nella barra laterale, si andrà a deselezionare ed eliminare dall'utilizzo              
          dell'estensione il percorso,
        - se si clicca sul percorso del file dello script personalizzato, si andrà ad attivare il comando label.saveProgram
        - se si clicca sul valore di una label presente all'interno della sezione "Label inserita:", potro modificare il valore dell'etichetà   
          nel file corrispondente.

## Note sulla versione

### 1.0.0

Prima versione di Label Generator


## Seguire le linee guida per le estensioni
* [Linee guida per le estensioni](https://code.visualstudio.com/api/references/extension-guidelines)

