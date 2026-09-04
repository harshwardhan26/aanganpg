export type StudentImportRow = {
  name: string;
  email: string;
  parentName: string;
  parentPhone: string;
  monthlyFee: string;
};

/**
 * The whole file into rows of cells.
 *
 * Row splitting happens here rather than before, because a quoted cell may
 * legally contain the line break that would otherwise end the row — a pasted
 * address is the usual way this arrives. Splitting on newlines first and
 * parsing quotes afterwards tears exactly those rows in half, and the halves
 * still parse, so the import succeeds and silently files two broken students.
 */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;

  const endCell = () => { cells.push(cell.trim()); cell = ""; };
  const endRow = () => {
    endCell();
    // A trailing newline produces one empty cell, which is not a row.
    if (cells.some((value) => value !== "")) rows.push(cells);
    cells = [];
  };

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];

    if (character === '"' && quoted && csv[index + 1] === '"') {
      cell += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      endCell();
    } else if ((character === "\n" || character === "\r") && !quoted) {
      // Swallow the second half of a CRLF so it does not open an empty row.
      if (character === "\r" && csv[index + 1] === "\n") index++;
      endRow();
    } else {
      cell += character;
    }
  }
  // Whatever is still in hand when the file ends is the last row, with or
  // without a trailing newline.
  endRow();

  return rows;
}

export function parseStudentCsv(csv: string): { rows: StudentImportRow[]; issues: string[] } {
  const lines = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (lines.length === 0) return { rows: [], issues: ["The CSV file is empty."] };
  const header = lines[0].map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ""));
  const aliases: Record<keyof StudentImportRow, string[]> = {
    name: ["name", "studentname"],
    email: ["email", "studentemail"],
    parentName: ["parentname", "guardianname"],
    parentPhone: ["parentphone", "guardianphone", "phone"],
    monthlyFee: ["monthlyfee", "fee", "amount"],
  };
  const positions = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [key, header.findIndex((cell) => names.includes(cell))]),
  ) as Record<keyof StudentImportRow, number>;
  if (positions.name < 0) return { rows: [], issues: ["The CSV needs a Name or Student Name column."] };

  const rows: StudentImportRow[] = [];
  const issues: string[] = [];
  for (let index = 1; index < lines.length; index++) {
    const cells = lines[index];
    const value = (key: keyof StudentImportRow) => positions[key] < 0 ? "" : (cells[positions[key]] ?? "").trim();
    const row = { name: value("name"), email: value("email"), parentName: value("parentName"), parentPhone: value("parentPhone"), monthlyFee: value("monthlyFee") };
    if (!row.name) issues.push(`Row ${index + 1}: name is missing.`);
    else rows.push(row);
  }
  return { rows, issues };
}
