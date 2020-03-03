import { promises as fs, statSync } from "fs";
import crypto from "crypto";
import * as path from "path";

export function pathExistsSync(filepath: string): boolean {
  try {
    statSync(filepath);
    return true;
  } catch (err) {
    return false;
  }
}

export async function pathExists(filepath: string): Promise<boolean> {
  try {
    await fs.stat(filepath);
    return true;
  } catch (err) {
    return false;
  }
}

export function normalizeFilepath(filepath: string): string {
  return path.normalize(
    filepath
      // in Windows, filepath maybe `c:\foo\bar` tut the legal path should be `C:\foo\bar`
      .replace(/^([a-z]):\\/, (_, $1) => $1.toUpperCase() + ":\\")
      // There are some paths which are unix style, this style does not work on win32 systems
      .replace(/\//gm, path.sep)
  );
}

// cover filepath string to regexp string
// Because the `\` string is included in the path to Windows
// So we need to translate it once
// `/^C:\Users\runneradmin\AppData\Local\deno\deps\/` -> `/^C:\\Users\\runneradmin\\AppData\\Local\\deno\\deps\\/`
export function str2regexpStr(filepath: string): string {
  filepath = normalizeFilepath(filepath);
  return filepath.replace(/\\/gm, "\\\\");
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function isHttpURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// hash a URL with it's pathname and search
export function hashURL(url: URL): string {
  return crypto
    .createHash("sha256")
    .update(url.pathname + url.search)
    .digest("hex");
}
