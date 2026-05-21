import * as fs from "fs/promises";
import * as path from "path";
import { HsgConfig, testDir } from "./config";
import { normalizeOutput, outputsEqual, prepareProgram, runProgram } from "./runner";

export type TestVerdict = "AC" | "WA" | "TLE" | "RE" | "MISSING";

export interface TestRunResult {
  id: string;
  index: number;
  input: string;
  expected: string;
  actual: string;
  verdict: TestVerdict;
  durationMs: number;
  stderr: string;
}

export async function listTestCases(
  cfg: HsgConfig
): Promise<{ index: number; inPath: string }[]> {
  const dir = testDir(cfg);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".in"))
      .map((f) => ({
        index: Number(/^(\d+)\.in$/i.exec(f)?.[1] ?? 0),
        inPath: path.join(dir, f),
      }))
      .filter((x) => x.index > 0)
      .sort((a, b) => a.index - b.index);
  } catch {
    return [];
  }
}

export async function runSolutionOnAllTests(
  cfg: HsgConfig,
  solutionRel: string,
  runTimeLimitMs: number,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{
  results: TestRunResult[];
  compileError?: string;
}> {
  const sol = await prepareProgram(
    cfg,
    solutionRel,
    "main",
    cfg.cppFlags
  );
  if (!sol.ok) {
    return { results: [], compileError: sol.message };
  }

  const cases = await listTestCases(cfg);
  const results: TestRunResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const { index, inPath } = cases[i];
    const id = String(index);
    onProgress?.(i + 1, cases.length, `${index}.in`);

    const input = await fs.readFile(inPath, "utf8");
    const outPath = inPath.replace(/\.in$/i, ".out");

    let expected = "";
    try {
      expected = await fs.readFile(outPath, "utf8");
    } catch {
      results.push({
        id,
        index,
        input,
        expected: "",
        actual: "",
        verdict: "MISSING",
        durationMs: 0,
        stderr: "Thiếu file .out",
      });
      continue;
    }

    const run = await runProgram(
      sol.runPath,
      sol.runArgs,
      input,
      runTimeLimitMs,
      cfg.workspaceRoot
    );

    let verdict: TestVerdict;
    if (run.timedOut) {
      verdict = "TLE";
    } else if (run.exitCode !== 0) {
      verdict = "RE";
    } else if (outputsEqual(run.stdout, expected)) {
      verdict = "AC";
    } else {
      verdict = "WA";
    }

    results.push({
      id,
      index,
      input,
      expected,
      actual: run.stdout,
      verdict,
      durationMs: run.durationMs,
      stderr: run.stderr,
    });
  }

  return { results };
}

export function summarizeResults(results: TestRunResult[]): {
  total: number;
  passed: number;
  failed: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.verdict === "AC").length;
  return { total, passed, failed: total - passed };
}

