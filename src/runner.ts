import { spawn, ChildProcess } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import treeKill from "tree-kill";
import { buildDir, HsgConfig, resolveInWorkspace } from "./config";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

function killProcessTree(pid: number | undefined): void {
  if (pid === undefined || pid <= 0) {
    return;
  }
  try {
    treeKill(pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid);
    } catch {
      /* already dead */
    }
  }
}

async function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string; stdin?: string; timeoutMs: number }
): Promise<RunResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    let child: ChildProcess;
    let settled = false;

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child.pid);
    }, options.timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    if (options.stdin !== undefined) {
      child.stdin?.write(options.stdin);
      child.stdin?.end();
    }

    child.on("close", (code) => {
      finish({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
        durationMs: Date.now() - start,
      });
    });

    child.on("error", (err) => {
      finish({
        stdout,
        stderr: stderr + String(err),
        exitCode: -1,
        timedOut,
        durationMs: Date.now() - start,
      });
    });
  });
}

export async function ensureBuildDir(cfg: HsgConfig): Promise<string> {
  const dir = buildDir(cfg);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function compileCpp(
  cfg: HsgConfig,
  sourceRel: string,
  outName: string,
  flagsStr: string
): Promise<{ ok: boolean; message: string; exePath: string }> {
  const source = resolveInWorkspace(cfg, sourceRel);
  const outDir = await ensureBuildDir(cfg);
  const exePath = path.join(outDir, outName);

  try {
    await fs.access(source);
  } catch {
    return { ok: false, message: `Không tìm thấy file: ${sourceRel}`, exePath };
  }

  const flags = flagsStr.trim().split(/\s+/).filter(Boolean);
  const args = [...flags, source, "-o", exePath];
  const result = await runProcess(cfg.cppCompiler, args, {
    cwd: cfg.workspaceRoot,
    timeoutMs: 60000,
  });

  if (result.exitCode !== 0) {
    return {
      ok: false,
      message: result.stderr || result.stdout || "Biên dịch thất bại",
      exePath,
    };
  }
  return { ok: true, message: "OK", exePath };
}

export async function prepareProgram(
  cfg: HsgConfig,
  sourceRel: string,
  cacheKey: string,
  compileFlags: string
): Promise<{ ok: boolean; message: string; runPath: string; runArgs: string[] }> {
  const source = resolveInWorkspace(cfg, sourceRel);

  try {
    await fs.access(source);
  } catch {
    return {
      ok: false,
      message: `Không tìm thấy: ${sourceRel}`,
      runPath: "",
      runArgs: [],
    };
  }

  if (cfg.language === "python") {
    return {
      ok: true,
      message: "OK",
      runPath: cfg.python,
      runArgs: [source],
    };
  }

  const outName = `${cacheKey}.exe`;
  const compiled = await compileCpp(cfg, sourceRel, outName, compileFlags);
  if (!compiled.ok) {
    return { ok: false, message: compiled.message, runPath: "", runArgs: [] };
  }
  return {
    ok: true,
    message: "OK",
    runPath: compiled.exePath,
    runArgs: [],
  };
}

export async function runProgram(
  runPath: string,
  runArgs: string[],
  input: string | undefined,
  timeoutMs: number,
  cwd: string
): Promise<RunResult> {
  return runProcess(runPath, runArgs, { cwd, stdin: input, timeoutMs });
}

export function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").trimEnd();
}

export function outputsEqual(a: string, b: string): boolean {
  return normalizeOutput(a) === normalizeOutput(b);
}

export async function writeTestPair(
  testDirPath: string,
  index: number,
  input: string,
  output: string
): Promise<void> {
  await fs.mkdir(testDirPath, { recursive: true });
  await fs.writeFile(path.join(testDirPath, `${index}.in`), input, "utf8");
  await fs.writeFile(path.join(testDirPath, `${index}.out`), output, "utf8");
}

export async function nextTestIndex(testDirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(testDirPath);
    let max = 0;
    for (const name of entries) {
      const m = /^(\d+)\.in$/i.exec(name);
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
    return max + 1;
  } catch {
    return 1;
  }
}
