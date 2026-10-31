# Scheda Palestra

Web app (PWA) per la scheda in palestra, pensata per iPhone: scheda del giorno, registrazione serie con recuperi, storico/progressi e aiuto sugli esercizi Technogym. Funziona offline e i dati restano sul telefono.

## File

- `scheda.json` — la scheda (giorni, esercizi, serie, recuperi, note e video del coach). **Modifica questo quando il coach cambia programma.**
- `aiuto.json` — consigli tecnici per esercizio (regolazione, errori, problemi, alternative), con lo stesso `id` usato in `scheda.json`.
- `index.html`, `styles.css`, `app.js` — l'app.
- `sw.js`, `manifest.webmanifest`, `icons/` — installazione e funzionamento offline.

## Provarla sul Mac

```bash
python3 -m http.server 8765
```

Poi apri http://localhost:8765

## Metterla sull'iPhone (GitHub Pages, gratis)

1. Crea un repository su GitHub (es. `palestra`) e carica tutti i file di questa cartella.
2. Nel repository: **Settings → Pages → Branch: main / root → Save**.
3. Dopo un minuto l'app è su `https://<tuo-utente>.github.io/palestra/`.
4. Sull'iPhone apri il link con **Safari** → tasto **Condividi** → **Aggiungi alla schermata Home**.

Da lì si apre a schermo intero come un'app e funziona anche senza connessione.

## Aggiornare la scheda

1. Modifica `scheda.json` (e se servono nuovi esercizi, aggiungili in `aiuto.json`).
2. In `sw.js` cambia `VERSION` (es. da `'v1'` a `'v2'`).
3. Ricarica i file su GitHub. Alla successiva apertura con connessione l'app si aggiorna.

Lo storico non si perde: è legato all'`id` degli esercizi, quindi se un esercizio resta uguale tieni lo stesso `id`.

## Backup

I dati sono salvati solo nel telefono. In **Storico → Backup → Esporta** salvi un file JSON (es. su iCloud Drive); con **Importa** lo ripristini.
