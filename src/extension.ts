import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { getWorkspaceRoot, loadConfig } from "./config";
import {
  generateAllTests,
  loadTestGenConfig,
  saveDefaultTestGenConfig,
} from "./generator";
import { runSolutionOnAllTests } from "./testRunner";
import { closeDashboard, postProgress, postResults, showDashboard } from "./webviewPanel";

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
    prompt: "Số test random từ gen.cpp (edge case lấy từ hsg-tests.json)",
    value: String(defaultValue),
    validateInput: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        return "Nhập số nguyên ≥ 0";
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

const SAMPLE_BRUTE = `// Code trâu — đọc stdin, in đáp án ĐÚNG ra stdout.
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  long long s = 0, x;
  int n;
  if (!(cin >> n)) return 0;
  while (n--) { cin >> x; s += x; }
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
  await saveDefaultTestGenConfig(root);

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
          "hsg.solutionFile": "main.cpp",
          "hsg.testFolder": "tests",
          "hsg.bruteTimeLimitMs": 60000,
          "hsg.runTimeLimitMs": 2000,
        },
        null,
        2
      ),
      "utf8"
    );
  }

  vscode.window.showInformationMessage(
    "HSG: Đã tạo gen, brute, tests/, hsg-tests.json (edge cases)."
  );
}

async function generateTests(): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  const genCfg = await loadTestGenConfig(cfg.workspaceRoot);
  const defaultCount = genCfg.randomCount ?? cfg.defaultTestCount;
  const count = await askCount(defaultCount);
  if (count === undefined) return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `HSG: Sinh test (gen + edge cases)`,
      cancellable: true,
    },
    async (_progress, token) => {
      const result = await generateAllTests(cfg, count, {
        report: (msg) => _progress.report({ message: msg }),
        isCancelled: () => token.isCancellationRequested,
      });

      if (result.failed) {
        vscode.window.showErrorMessage(`HSG: ${result.failed}`);
        return;
      }
      if (result.ok > 0) {
        vscode.window.showInformationMessage(
          `HSG: Đã sinh ${result.ok} cặp test trong ${cfg.testFolder}/ (random + edge).`
        );
      }
    }
  );
}

async function runTestsDashboard(context: vscode.ExtensionContext): Promise<void> {
  const cfg = requireConfig();
  if (!cfg) return;

  showDashboard(context);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "HSG: Chạy test trên main.cpp",
      cancellable: false,
    },
    async () => {
      const { results, compileError } = await runSolutionOnAllTests(
        cfg,
        cfg.solutionFile,
        cfg.runTimeLimitMs,
        (cur, total, name) => postProgress(cur, total, name)
      );

      if (compileError) {
        vscode.window.showErrorMessage(`HSG: ${compileError}`);
        closeDashboard();
        return;
      }

      if (!results.length) {
        vscode.window.showWarningMessage(
          `HSG: Không có file .in trong ${cfg.testFolder}/. Hãy Sinh test trước.`
        );
      }

      postResults(results);
    }
  );
}

async function openGuide(context: vscode.ExtensionContext): Promise<void> {
  const guidePath = path.join(context.extensionPath, "HUONG_DAN.md");
  try {
    const doc = await vscode.workspace.openTextDocument(guidePath);
    await vscode.window.showTextDocument(doc, { preview: false });
  } catch {
    vscode.window.showErrorMessage(
      "HSG: Không tìm thấy HUONG_DAN.md trong extension."
    );
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("hsg.initWorkspace", initWorkspace),
    vscode.commands.registerCommand("hsg.generateTests", generateTests),
    vscode.commands.registerCommand("hsg.runTestsDashboard", () =>
      runTestsDashboard(context)
    ),
    vscode.commands.registerCommand("hsg.openGuide", () => openGuide(context))
  );
}

export function deactivate(): void {
  closeDashboard();
}
