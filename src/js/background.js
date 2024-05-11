const DOWNLOAD_DIR = 'krok-po-kroku';
const ANKI_URL = 'http://127.0.0.1:8765';

let notes = [];

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (!sender.tab || sender.origin !== 'https://e-polish.eu') {
        return;
    }

    const iconName = msg.iconUrl?.slice(
        msg.iconUrl?.lastIndexOf('/') + 1,
        msg.iconUrl?.length
    );

    let note = Object.assign({}, msg);
    note.iconName = iconName;
    note.audioName = `${Date.now()}.mp3`;
    notes.push(note);

    chrome.downloads.download({
        url: note.audioUrl,
        filename: `${DOWNLOAD_DIR}/${note.audioName}`,
    });
});

chrome.downloads.onChanged.addListener((delta) => {
    if (delta.filename && delta.id) {
        const filename = delta.filename.current;
        const name = filename.slice(
            filename.lastIndexOf('\\') + 1,
            filename.length
        );

        notes
            .filter((note) => note.audioName === name)
            .forEach((note) => {
                note.audioId = delta.id;
                note.audioPath = delta.filename.current;
            });
    }

    if (delta.state?.current === 'complete') {
        const index = notes.findIndex((note) => note.audioId === delta.id);
        if (index === -1) {
            return;
        }
        const note = notes[index];
        const ankiNote = assembleAnkiNote(note);
        postAnkiNote(ankiNote, note);

        notes = notes.splice(index, 1);
    }
});

function assembleAnkiNote(note) {
    return {
        action: 'addNote',
        params: {
            note: {
                deckName: 'Słownictwo',
                modelName: 'Basic With Transcription (and reversed card)',
                fields: {
                    Example: note.example ? note.example : note.term,
                    Term: note.term,
                },
                options: {
                    allowDuplicate: false,
                    duplicateScope: 'deck',
                    duplicateScopeOptions: {
                        deckName: 'Słownictwo',
                        checkChildren: false,
                        checkAllModels: false,
                    },
                },
                tags: ['Auto-anki'],
                audio: [
                    {
                        path: note.audioPath,
                        filename: note.audioName,
                        fields: ['Sound'],
                    },
                ],
                picture: [
                    {
                        url: note.iconUrl,
                        filename: note.iconName,
                        fields: ['Icon'],
                    },
                ],
            },
        },
    };
}

async function postAnkiNote(ankiNote, generalNote) {
    const data = {
        action: 'multi',
        version: 6,
        params: {
            actions: [ankiNote],
        },
    };

    const response = await fetch(ANKI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.result?.[0]?.error) {
        console.error(`ERROR: ${result.result?.[0]?.error}`);
    } else {
        console.info(
            `INFO: New anki-note ${ankiNote.params.note.fields.Term} was added`
        );
    }

    chrome.downloads.removeFile(generalNote.audioId);
}
