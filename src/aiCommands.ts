import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { generateWithAi } from "./ai";
import { HsgConfig, loadConfig, resolveInWorkspace } from "./config";

const SECRET_KEY = "hsg.ai.apiKey";
const PROBLEM_CANDIDATES = ["de.txt", "de.md", "problem.md", "problem.txt", "dethi.txt"];

export async function configureApiKey(
  context: vscode.ExtensionContext
): Promise<void> {
  const existing = await context.secrets.get(SECRET_KEY);
  const key = await vscode.window.showInputBox({
    title: "HSG AI — API Key (OpenAI hoặc tương thích)",
    prompt: "Lưu an toàn trên máy bạn. Lấy tại platform.openai.com hoặc nhà cung cấp API.",
    password: true,
    value: existing ? "••••••••" : "",
    ignoreFocusOut: true,
  });

  if (key === undefined) {
    return;
  }
  if (!key || key === "••••••••") {
    if (existing) {
      vscode.window.showInformationMessage("HSG: Giữ nguyên API key đã lưu.");
    }
    return;
  }

  await context.secrets.store(SECRET_KEY, key.trim());
  vscode.window.showInformationMessage("HSG: Đã lưu API key.");
}

function getAiSettings(): {
  endpoint: string;
  model: string;
  maxTokens: number;
  includeMain: boolean;
} {
  const cfg = vscode.workspace.getConfiguration("hsg");
  return {
    endpoint: cfg.get<string>(
      "ai.endpoint",
      "https://api.openai.com/v1/chat/completions"
    ),
    model: cfg.get<string>("ai.model", "gpt-4o-mini"),
    maxTokens: cfg.get<number>("ai.maxTokens", 8000),
    includeMain: cfg.get<boolean>("ai.includeMainCode", true),
  };
}

async function readProblemText(root: string): Promise<string | undefined> {
  const cfg = vscode.workspace.getConfiguration("hsg");
  const custom = cfg.get<string>("ai.problemFile", "");
  const candidates = custom
    ? [custom, ...PROBLEM_CANDIDATES]
    : PROBLEM_CANDIDATES;

  for (const rel of candidates) {
    const full = path.join(root, rel);
    try {
      const t = await fs.readFile(full, "utf8");
      if (t.trim()) {
        return t.trim();
      }
    } catch {
      /* next */
    }
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const sel = editor.document.getText(editor.selection);
    if (sel.trim()) {
      return sel.trim();
    }
    const name = path.basename(editor.document.fileName).toLowerCase();
    if (/\.(md|txt)$/.test(name) || name.startsWith("de")) {
      const all = editor.document.getText();
      if (all.trim()) {
        return all.trim();
      }
    }
  }

  return undefined;
}

async function readMainCode(cfg: HsgConfig, include: boolean): Promise<string | undefined> {
  if (!include) {
    return undefined;
  }
  const candidates = ["main.cpp", "main.py", "solution.cpp", cfg.generatorFile];
  for (const rel of candidates) {
    if (rel === cfg.generatorFile || rel === cfg.bruteFile) {
      continue;
    }
    try {
      const full = resolveInWorkspace(cfg, rel);
      const t = await fs.readFile(full, "utf8");
      if (t.trim()) {
        return t;
      }
    } catch {
      /* next */
    }
  }
  return undefined;
}

export async function generateCodeFromProblem(
  context: vscode.ExtensionContext
): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    vscode.window.showErrorMessage(
      "HSG: Mở thư mục bài (Open Folder) trước."
    );
    return;
  }

  let apiKey = await context.secrets.get(SECRET_KEY);
  if (!apiKey) {
    const go = await vscode.window.showWarningMessage(
      "HSG: Chưa có API key. Cấu hình AI trước?",
      "Cấu hình API key"
    );
    if (go === "Cấu hình API key") {
      await configureApiKey(context);
    }
    apiKey = await context.secrets.get(SECRET_KEY);
    if (!apiKey) {
      return;
    }
  }

  let problem = await readProblemText(cfg.workspaceRoot);
  if (!problem) {
    problem = await vscode.window.showInputBox({
      title: "HSG AI — Dán đề bài",
      prompt: "Input/output, giới hạn, ví dụ…",
      ignoreFocusOut: true,
    });
  }
  if (!problem?.trim()) {
    return;
  }

  const aiCfg = getAiSettings();
  const mainCode = await readMainCode(cfg, aiCfg.includeMain);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "HSG AI: Đang tạo gen + brute…",
      cancellable: false,
    },
    async () => {
      try {
        const sources = await generateWithAi(
          apiKey,
          {
            endpoint: aiCfg.endpoint,
            model: aiCfg.model,
            maxTokens: aiCfg.maxTokens,
          },
          problem!,
          mainCode,
          cfg.language
        );

        const genPath = resolveInWorkspace(cfg, cfg.generatorFile);
        const brutePath = resolveInWorkspace(cfg, cfg.bruteFile);

        const overwrite = await confirmOverwrite(genPath, brutePath);
        if (!overwrite) {
          return;
        }

        await fs.mkdir(path.dirname(genPath), { recursive: true });
        await fs.writeFile(genPath, sources.gen + "\n", "utf8");
        await fs.writeFile(brutePath, sources.brute + "\n", "utf8");

        const open = await vscode.window.showInformationMessage(
          `HSG AI: Đã ghi ${cfg.generatorFile} và ${cfg.bruteFile}.`,
          "Mở gen",
          "Mở brute",
          "Sinh test luôn"
        );

        if (open === "Mở gen" || open === "Mở brute") {
          const doc = await vscode.workspace.openTextDocument(
            open === "Mở gen" ? genPath : brutePath
          );
          await vscode.window.showTextDocument(doc);
        } else if (open === "Sinh test luôn") {
          await vscode.commands.executeCommand("hsg.generateTests");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`HSG AI: ${msg}`);
      }
    }
  );
}

async function confirmOverwrite(
  genPath: string,
  brutePath: string
): Promise<boolean> {
  let exists = false;
  for (const p of [genPath, brutePath]) {
    try {
      await fs.access(p);
      exists = true;
      break;
    } catch {
      /* ok */
    }
  }
  if (!exists) {
    return true;
  }
  const ch = await vscode.window.showWarningMessage(
    "HSG: Ghi đè gen.cpp / brute.cpp hiện có?",
    { modal: true },
    "Ghi đè"
  );
  return ch === "Ghi đè";
}
