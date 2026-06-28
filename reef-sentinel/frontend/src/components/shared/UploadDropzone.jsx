import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileCheck2, X } from "lucide-react";

export default function UploadDropzone({
  accept = ".csv",
  fileTypeLabel = "fichier CSV",
  file,
  onFileSelected,
  onClear,
  previewSlot,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      if (files && files[0]) onFileSelected(files[0]);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  if (file) {
    return (
      <div className="rounded-xl border border-line bg-mist p-4 flex items-center gap-4">
        {previewSlot ? (
          previewSlot
        ) : (
          <div className="w-10 h-10 rounded-lg bg-turquoise-soft flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5 text-turquoise" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{file.name}</p>
          <p className="text-xs text-ink-soft">{(file.size / 1024).toFixed(1)} Ko</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-line/60 transition-colors shrink-0"
          aria-label="Retirer le fichier"
        >
          <X className="w-4 h-4 text-ink-soft" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
        isDragging ? "border-turquoise bg-turquoise-soft" : "border-line hover:border-azure-light hover:bg-mist"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <UploadCloud className="w-8 h-8 text-azure mx-auto mb-3" />
      <p className="text-sm font-medium text-ink">
        Déposez votre {fileTypeLabel} ici, ou{" "}
        <span className="text-azure underline">parcourir</span>
      </p>
      <p className="text-xs text-ink-soft mt-1">Format accepté : {accept}</p>
    </div>
  );
}
