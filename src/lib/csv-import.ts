export type StudentImportRow = {
  name: string;
  email: string;
  parentName: string;
  parentPhone: string;
  monthlyFee: string;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseStudentCsv(csv: string): { rows: StudentImportRow[]; issues: string[] } {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { rows: [], issues: ["The CSV file is empty."] };
  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ""));
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
    const cells = parseCsvLine(lines[index]);
    const value = (key: keyof StudentImportRow) => positions[key] < 0 ? "" : (cells[positions[key]] ?? "").trim();
    const row = { name: value("name"), email: value("email"), parentName: value("parentName"), parentPhone: value("parentPhone"), monthlyFee: value("monthlyFee") };
    if (!row.name) issues.push(`Row ${index + 1}: name is missing.`);
    else rows.push(row);
  }
  return { rows, issues };
}
