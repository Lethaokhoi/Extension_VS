import * as path from "path";
import * as vscode from "vscode";

export type Lang = "cpp" | "python";

export interface HsgConfig {
  workspaceRoot: string;
  cppCompiler: string;
  cppFlags: string;
  bruteCppFlags: string;
  python: string;
  testFolder: string;
  generatorFile: string;
  bruteFile: string;
  defaultTestCount: number;
  genTimeLimitMs: number;
  bruteTimeLimitMs: number;
  language: Lang;
}

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}

export function loadConfig(): HsgConfig | undefined {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return undefined;
  }
  const cfg = vscode.workspace.getConfiguration("hsg");
  return {
    workspaceRoot,
    cppCompiler: cfg.get<string>("cppCompiler", "g++"),
    cppFlags: cfg.get<string>("cppFlags", "-O2 -std=c++17"),
    bruteCppFlags: cfg.get<string>("bruteCppFlags", "-O2 -std=c++17"),
    python: cfg.get<string>("python", "python"),
    testFolder: cfg.get<string>("testFolder", "tests"),
    generatorFile: cfg.get<string>("generatorFile", "gen.cpp"),
    bruteFile: cfg.get<string>("bruteFile", "brute.cpp"),
    defaultTestCount: cfg.get<number>("defaultTestCount", 10),
    genTimeLimitMs: cfg.get<number>("genTimeLimitMs", 3000),
    bruteTimeLimitMs: cfg.get<number>("bruteTimeLimitMs", 60000),
    language: cfg.get<Lang>("language", "cpp"),
  };
}

export function resolveInWorkspace(cfg: HsgConfig, relative: string): string {
  return path.join(cfg.workspaceRoot, relative);
}

export function testDir(cfg: HsgConfig): string {
  return resolveInWorkspace(cfg, cfg.testFolder);
}

export function buildDir(cfg: HsgConfig): string {
  return path.join(cfg.workspaceRoot, ".hsg-build");
}
