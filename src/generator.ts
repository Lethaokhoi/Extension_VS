import * as fs from "fs/promises";
import * as path from "path";
import { HsgConfig, resolveInWorkspace } from "./config";
import {
  nextTestIndex,
  prepareProgram,
  runProgram,
  writeTestPair,
} from "./runner";

/** Cấu hình sinh test (file tùy chọn `hsg-tests.json` trong folder bài) */
export interface TestGenConfig {
  /** Số test random từ gen.cpp (ghi đè số hỏi nếu có) */
  randomCount?: number;
  /** Edge case: input cố định, tự chạy brute → .out */
  edgeCases?: Array<{
    name?: string;
    input: string;
  }>;
}

const DEFAULT_CONFIG: TestGenConfig = {
  edgeCases: [
    { name: "n=1", input: "1\n42\n" },
    { name: "n=0-empty", input: "0\n" },
    { name: "negative", input: "3\n-1 0 1000000000\n" },
  ],
};

export async function loadTestGenConfig(
  workspaceRoot: string
): Promise<TestGenConfig> {
  const configPath = path.join(workspaceRoot, "hsg-tests.json");
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as TestGenConfig;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      edgeCases: parsed.edgeCases ?? DEFAULT_CONFIG.edgeCases,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveDefaultTestGenConfig(
  workspaceRoot: string
): Promise<void> {
  const configPath = path.join(workspaceRoot, "hsg-tests.json");
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          randomCount: 10,
          edgeCases: DEFAULT_CONFIG.edgeCases,
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

export interface GenerateProgress {
  report: (msg: string) => void;
  isCancelled: () => boolean;
}

/** Sinh N test random (gen) + edge cases từ config → ghi tests/*.in, *.out */
export async function generateAllTests(
  cfg: HsgConfig,
  randomCount: number,
  progress: GenerateProgress
): Promise<{ ok: number; failed?: string }> {
  const genCfg = await loadTestGenConfig(cfg.workspaceRoot);

  const gen = await prepareProgram(
    cfg,
    cfg.generatorFile,
    "gen",
    cfg.cppFlags
  );
  if (!gen.ok) {
    return { ok: 0, failed: `gen: ${gen.message}` };
  }

  const brute = await prepareProgram(
    cfg,
    cfg.bruteFile,
    "brute",
    cfg.bruteCppFlags
  );
  if (!brute.ok) {
    return { ok: 0, failed: `brute: ${brute.message}` };
  }

  const dir = resolveInWorkspace(cfg, cfg.testFolder);
  await fs.mkdir(dir, { recursive: true });
  let idx = await nextTestIndex(dir);
  let ok = 0;

  for (let i = 0; i < randomCount; i++) {
    if (progress.isCancelled()) break;
    progress.report(`Test ${idx} — gen (random)…`);

    const genRun = await runProgram(
      gen.runPath,
      gen.runArgs,
      undefined,
      cfg.genTimeLimitMs,
      cfg.workspaceRoot
    );

    if (genRun.timedOut || genRun.exitCode !== 0) {
      return {
        ok,
        failed: `gen lỗi test ${idx}: ${genRun.stderr || "TLE"}`,
      };
    }

    const out = await runBruteOnInput(
      cfg,
      brute.runPath,
      brute.runArgs,
      genRun.stdout
    );
    if (!out.ok) {
      return { ok, failed: out.message };
    }

    await writeTestPair(dir, idx, genRun.stdout, out.stdout);
    ok++;
    idx++;
  }

  const edges = genCfg.edgeCases ?? [];
  for (const edge of edges) {
    if (progress.isCancelled()) break;
    const label = edge.name ?? `edge-${idx}`;
    progress.report(`Test ${idx} — edge: ${label}…`);

    const input = edge.input.endsWith("\n") ? edge.input : edge.input + "\n";
    const out = await runBruteOnInput(cfg, brute.runPath, brute.runArgs, input);
    if (!out.ok) {
      return { ok, failed: `edge ${label}: ${out.message}` };
    }

    await writeTestPair(dir, idx, input, out.stdout);
    ok++;
    idx++;
  }

  return { ok };
}

async function runBruteOnInput(
  cfg: HsgConfig,
  runPath: string,
  runArgs: string[],
  input: string
): Promise<{ ok: boolean; stdout: string; message: string }> {
  const bruteRun = await runProgram(
    runPath,
    runArgs,
    input,
    cfg.bruteTimeLimitMs,
    cfg.workspaceRoot
  );

  if (bruteRun.timedOut) {
    return {
      ok: false,
      stdout: "",
      message: "brute TLE — giảm input hoặc tăng hsg.bruteTimeLimitMs",
    };
  }
  if (bruteRun.exitCode !== 0) {
    return {
      ok: false,
      stdout: "",
      message: bruteRun.stderr || "brute runtime error",
    };
  }
  return { ok: true, stdout: bruteRun.stdout, message: "OK" };
}
