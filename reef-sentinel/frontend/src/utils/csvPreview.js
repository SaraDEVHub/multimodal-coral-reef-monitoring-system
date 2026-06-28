// Aperçu léger d'un CSV côté client (sans dépendance externe) : on ne lit
// que les premières lignes pour afficher un tableau d'aperçu. Le traitement
// scientifique réel (sélection spectrale, SNV, inférence) est entièrement
// délégué au backend FastAPI — ce parseur ne sert qu'à l'UI.
export function parseCsvPreview(file, { maxRows = 6, maxCols = 8 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r\n|\n/).filter((l) => l.length > 0);
        const totalRows = Math.max(lines.length - 1, 0);
        const rows = lines.slice(0, maxRows + 1).map((line) => line.split(","));
        const header = rows[0] || [];
        const body = rows.slice(1);
        const truncatedCols = header.length > maxCols;
        resolve({
          header: header.slice(0, maxCols),
          rows: body.map((r) => r.slice(0, maxCols)),
          totalColumns: header.length,
          totalRows,
          truncatedCols,
        });
      } catch (err) {
        reject(err);
      }
    };
    // On ne lit qu'un fragment du fichier pour rester rapide même sur de
    // gros exports spectraux (plusieurs Mo).
    const blobSlice = file.slice(0, 200_000);
    reader.readAsText(blobSlice);
  });
}
