import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import XLSX from "xlsx";

const testdataDir = path.dirname(fileURLToPath(import.meta.url));

export type LoginTestRow = {
  sheetRowIndex: number;
  email: string | number | null;
  password: string | number | null;
  otp: string | number | null;
  message: string | number | null;
};

export type SignupTestRow = {
  sheetRowIndex: number;
  firstName: string | number | null;
  lastName: string | number | null;
  email: string | number | null;
  password: string | number | null;
  otp: string | number | null;
  message: string | number | null;
};

export function cellStr(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value);
}

function loadSheetMatrix(fileName: string): (string | number | null)[][] {
  const filePath = path.join(testdataDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing test data file: ${filePath}`);
  }
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
}

function isBlankRowLogin(cols: (string | number | null)[]): boolean {
  return (
    cols[0] == null &&
    cols[1] == null &&
    cols[2] == null &&
    (cols[3] == null || cols[3] === "")
  );
}

export function readLoginTestRows(): LoginTestRow[] {
  const matrix = loadSheetMatrix("data_test_login.xlsx");
  const out: LoginTestRow[] = [];
  const minRow = 2;
  const maxRow = 13;
  for (let sheetRow = minRow; sheetRow <= maxRow; sheetRow += 1) {
    const cols = matrix[sheetRow - 1];
    if (!cols || isBlankRowLogin(cols)) {
      continue;
    }
    out.push({
      sheetRowIndex: sheetRow,
      email: cols[0] ?? null,
      password: cols[1] ?? null,
      otp: cols[2] ?? null,
      message: cols[3] ?? null,
    });
  }
  return out;
}

function isBlankRowSignup(cols: (string | number | null)[]): boolean {
  return (
    cols[0] == null &&
    cols[1] == null &&
    cols[2] == null &&
    cols[3] == null &&
    cols[4] == null &&
    (cols[5] == null || cols[5] === "")
  );
}

export function readSignupTestRows(): SignupTestRow[] {
  const matrix = loadSheetMatrix("data_test_signup.xlsx");
  const out: SignupTestRow[] = [];
  const minRow = 2;
  const maxRow = 35;
  for (let sheetRow = minRow; sheetRow <= maxRow; sheetRow += 1) {
    const cols = matrix[sheetRow - 1];
    if (!cols || isBlankRowSignup(cols)) {
      continue;
    }
    out.push({
      sheetRowIndex: sheetRow,
      firstName: cols[0] ?? null,
      lastName: cols[1] ?? null,
      email: cols[2] ?? null,
      password: cols[3] ?? null,
      otp: cols[4] ?? null,
      message: cols[5] ?? null,
    });
  }
  return out;
}

export type ExcelClerkTestUserRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  otp: string;
  storageStatePath: string;
};

export function readClerkTestUserRows(): ExcelClerkTestUserRow[] {
  const matrix = loadSheetMatrix("data_test_users.xlsx");
  const out: ExcelClerkTestUserRow[] = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cols = matrix[i];
    if (!cols || cols[0] == null || cellStr(cols[0]) === "") {
      continue;
    }
    const first = cellStr(cols[1]);
    const last = cellStr(cols[2]);
    const row: ExcelClerkTestUserRow = {
      id: cellStr(cols[0]),
      email: cellStr(cols[3]),
      password: cellStr(cols[4]),
      otp: cellStr(cols[5]),
      storageStatePath: cellStr(cols[6]),
    };
    if (first) {
      row.firstName = first;
    }
    if (last) {
      row.lastName = last;
    }
    out.push(row);
  }
  return out;
}
