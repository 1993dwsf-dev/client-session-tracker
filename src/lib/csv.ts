const BOM = "\uFEFF";

export type CsvCell = string | number | null | undefined;

export function formatCell(cell: CsvCell): string {
  if (cell == null) return "";

  const value = String(cell);

  // Uma string que comece com caracteres de fórmula é tratada como texto.
  // Valores numéricos são preservados como números, inclusive negativos.
  const dangerous =
    /^[\s\uFEFF]*[=+\-@]/.test(value) ||
    /^[\t\r]/.test(value);

  const safe =
    typeof cell === "number"
      ? value
      : dangerous
        ? `'${value}`
        : value;

  const quoted = /[";\n\r]/.test(safe)
    ? `"${safe.replace(/"/g, '""')}"`
    : safe;

  return quoted;
}

/** Formats a number as "1.234,56" so Excel pt-BR parses it as a number. */
export function decimalBR(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Builds a semicolon-delimited CSV (pt-BR Excel default) and triggers a download. */
export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const csv = rows.map((row) => row.map(formatCell).join(";")).join("\r\n");
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
