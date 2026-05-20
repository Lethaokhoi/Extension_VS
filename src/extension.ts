import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { getWorkspaceRoot, loadConfig, testDir } from "./config";
import { configureApiKey, generateCodeFromProblem } from "./aiCommands";
import {
  nextTestIndex,
  prepareProgram,
  runProgram,
  writeTestPair,
} from "./runner";

function requireConfig(): ReturnType<typeof loadConfig> {
  const cfg = loadConfig();
  if (!cfg) {
    vscode.window.showErrorMessage(
      "HSG: Mở thư mục bài (File → Open Folder) trước."
    );
    return undefined;
  }
  return cfg;
}

async function askCount(defaultValue: number): Promise<number | undefined> {
  const raw = await vscode.window.showInputBox({
    prompt: "Số cặp test (.in + .out) cần sinh",
    value: String(defaultValue),
    validateInput: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) {
        return "Nhập số nguyên dương";
      }
      return null;
    },
  });
  if (raw === undefined) {
    return undefined;
  }
  return Number(raw);
}

const SAMPLE_GEN = `// Sinh MỘT bộ input — in ra stdout (không in đáp án).
// Extension gọi chương trình này nhiều lần; mỗi lần một input khác nhau.
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  mt19937 rng((unsigned)chrono::steady_clock::now().time_since_epoch().count());
  int n = uniform_int_distribution<int>(1, 10)(rng);
  cout << n << "\\n";
  for (int i = 0; i < n; i++) {
    cout << uniform_int_distribution<int>(1, 100)(rng) << (i + 1 == n ? "" : " ");
  }
  cout << "\\n";
  return 0;
}
`;

const SAMPLE_BRUTE = `// Code trâu — đọc stdin (bộ input từ gen), in đáp án ĐÚNG ra stdout.
// File .out sinh bởi extension = output của chương trình này.
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  long long s = 0, x;
  int n;
  if (!(cin >> n)) return 0;
  while (n--) {
    cin >> x;
    s += x;
  }
  cout << s << "\\n";
  return 0;
}
`;

async function initWorkspace(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("HSG: Mở một thư mục trước.");
    return;
  }

  for (const f of [
    { rel: "gen.cpp", content: SAMPLE_GEN },
    { rel: "brute.cpp", content: SAMPLE_BRUTE },
  ]) {
    const full = path.join(root, f.rel);
    try {
      await fs.access(full);
    } catch {
      await fs.writeFile(full, f.content, "utf8");
    }
  }

  await fs.mkdir(path.join(root, "tests"), { recursive: true });

  const settings = path.join(root, ".vscode", "settings.json");
  try {
    await fs.access(settings);
  } catch {
    await fs.mkdir(path.join(root, ".vscode"), { recursive: true });
    await fs.writeFile(
      settings,
      JSON.stringify(
        {
          "hsg.generatorFile": "gen.cpp",
          "hsg.bruteFile": "brute.cpp",
          "hsg.testFolder": "tests",
          "hsg.bruteTimeLimitMs": 60000,
        },
        null,
        2
      ),
      "utf8"
    );
  }

  vscode.window.showInformationMessage(
    "HSG: Đã tạo gen.cpp (sinh input), brute.cpp (code trâu → đáp án) và tests/."
  );
}

async function generateTests(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const count = await askCount(cfg.defaultTestCount);
  if (count === undefined) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `HSG: Sinh ${count} test (brute → .out)`,
      cancellable: true,
    },
    async (progress, token) => {
      const gen = await prepareProgram(
        cfg,
        cfg.generatorFile,
        "gen",
        cfg.cppFlags
      );
      if (!gen.ok) {
        vscode.window.showErrorMessage(`HSG gen: ${gen.message}`);
        return;
      }

      const brute = await prepareProgram(
        cfg,
        cfg.bruteFile,
        "brute",
        cfg.bruteCppFlags
      );
      if (!brute.ok) {
        vscode.window.showErrorMessage(`HSG brute: ${brute.message}`);
        return;
      }

      const dir = testDir(cfg);
      let startIdx = await nextTestIndex(dir);
      let ok = 0;

      for (let i = 0; i < count; i++) {
        if (token.isCancellationRequested) break;

        const idx = startIdx + i;
        progress.report({ message: `Test ${idx} — gen…` });

        const genRun = await runProgram(
          gen.runPath,
          gen.runArgs,
          undefined,
          cfg.genTimeLimitMs,
          cfg.workspaceRoot
        );

        if (genRun.timedOut || genRun.exitCode !== 0) {
          vscode.window.showErrorMessage(
            `HSG: gen lỗi (test ${idx}): ${genRun.stderr || "timeout"}`
          );
          break;
        }

        const input = genRun.stdout;
        progress.report({ message: `Test ${idx} — brute (code trâu)…` });

        const bruteRun = await runProgram(
          brute.runPath,
          brute.runArgs,
          input,
          cfg.bruteTimeLimitMs,
          cfg.workspaceRoot
        );

        if (bruteRun.timedOut) {
          vscode.window.showErrorMessage(
            `HSG: brute quá thời gian ở test ${idx}. Tăng hsg.bruteTimeLimitMs hoặc giảm input trong gen.`
          );
          break;
        }
        if (bruteRun.exitCode !== 0) {
          vscode.window.showErrorMessage(
            `HSG: brute lỗi ở test ${idx}:\n${bruteRun.stderr || "runtime error"}`
          );
          break;
        }

        await writeTestPair(dir, idx, input, bruteRun.stdout);
        ok++;
      }

      if (ok > 0) {
        vscode.window.showInformationMessage(
          `HSG: Đã sinh ${ok} cặp test trong ${cfg.testFolder}/ (.in từ gen, .out từ brute).`
        );
      }
    }
  );
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("hsg.initWorkspace", initWorkspace),
    vscode.commands.registerCommand("hsg.generateTests", generateTests),
    vscode.commands.registerCommand("hsg.configureApiKey", () =>
      configureApiKey(context)
    ),
    vscode.commands.registerCommand("hsg.generateCodeAi", () =>
      generateCodeFromProblem(context)
    )
  );
}

export function deactivate(): void {}
