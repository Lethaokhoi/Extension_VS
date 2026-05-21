import * as vscode from "vscode";
import { TestRunResult, summarizeResults } from "./testRunner";

let panel: vscode.WebviewPanel | undefined;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <style>
    body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); padding: 12px; margin: 0; }
    h2 { margin: 0 0 8px; font-size: 16px; }
    .summary { padding: 10px 12px; border-radius: 6px; background: var(--vscode-editor-inactiveSelectionBackground); margin-bottom: 12px; }
    .bar { height: 8px; background: var(--vscode-progressBar-background); border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .bar-fill { height: 100%; background: var(--vscode-charts-green, #4ec9b0); transition: width 0.3s; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    .ac { color: var(--vscode-charts-green, #4ec9b0); font-weight: 600; }
    .wa { color: var(--vscode-errorForeground, #f48771); font-weight: 600; }
    .tle, .re { color: #cca700; font-weight: 600; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    #detail { margin-top: 16px; display: none; }
    #detail.open { display: block; }
    .cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .col { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; max-height: 280px; overflow: auto; }
    .col h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; opacity: 0.8; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 11px; }
    .diff-box { margin-top: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; max-height: 200px; overflow: auto; font-size: 11px; }
    .line.diff { background: rgba(255, 100, 100, 0.15); }
    .line .ln { opacity: 0.5; margin-right: 6px; }
    .meta { opacity: 0.7; font-size: 12px; }
  </style>
</head>
<body>
  <h2>HSG — Bảng kết quả test</h2>
  <div class="summary">
    <div id="summary-text">Đang chạy…</div>
    <div class="bar"><div class="bar-fill" id="bar-fill" style="width:0%"></div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Trạng thái</th><th>Thời gian</th><th></th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="detail">
    <h3 id="detail-title">Chi tiết</h3>
    <div class="cols">
      <div class="col"><h4>Input (.in)</h4><pre id="col-in"></pre></div>
      <div class="col"><h4>Output của bạn</h4><pre id="col-out"></pre></div>
      <div class="col"><h4>Đáp án chuẩn (.out)</h4><pre id="col-exp"></pre></div>
    </div>
    <p class="meta">So sánh từng dòng (trái: bạn | phải: chuẩn):</p>
    <div class="diff-box" id="diff-box"></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const results = [];
    window.addEventListener('message', e => {
      const m = e.data;
      if (m.type === 'progress') {
        document.getElementById('summary-text').textContent = m.text;
        document.getElementById('bar-fill').style.width = m.percent + '%';
      }
      if (m.type === 'results') {
        results.length = 0;
        results.push(...m.items);
        render(m.summary);
      }
    });
    function verdictClass(v) {
      return { AC:'ac', WA:'wa', TLE:'tle', RE:'re', MISSING:'re' }[v] || '';
    }
    function render(summary) {
      document.getElementById('summary-text').textContent =
        'Đúng: ' + summary.passed + ' / ' + summary.total +
        (summary.failed ? ' — Sai/lỗi: ' + summary.failed : '');
      const pct = summary.total ? Math.round(100 * summary.passed / summary.total) : 0;
      document.getElementById('bar-fill').style.width = pct + '%';
      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      results.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + r.index + '.in</td>' +
          '<td class="' + verdictClass(r.verdict) + '">' + r.verdict + '</td>' +
          '<td>' + r.durationMs + ' ms</td>' +
          '<td><button data-i="' + i + '">Xem</button></td>';
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => showDetail(Number(btn.dataset.i));
      });
    }
    function showDetail(i) {
      const r = results[i];
      document.getElementById('detail').classList.add('open');
      document.getElementById('detail-title').textContent = 'Test ' + r.index + ' — ' + r.verdict;
      document.getElementById('col-in').textContent = r.input;
      document.getElementById('col-out').textContent = r.actual || r.stderr || '(trống)';
      document.getElementById('col-exp').textContent = r.expected;
      document.getElementById('diff-box').innerHTML = r.diffHtml || '';
    }
  </script>
</body>
</html>`;
}

export function showDashboard(context: vscode.ExtensionContext): vscode.WebviewPanel {
  if (panel) {
    panel.reveal();
    return panel;
  }

  panel = vscode.window.createWebviewPanel(
    "hsgDashboard",
    "HSG Kết quả test",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getHtml();

  panel.onDidDispose(() => {
    panel = undefined;
  });

  return panel;
}

export function postProgress(current: number, total: number, name: string): void {
  panel?.webview.postMessage({
    type: "progress",
    text: `Đang chạy ${current}/${total}: ${name}`,
    percent: total ? Math.round((100 * current) / total) : 0,
  });
}

export function postResults(results: TestRunResult[]): void {
  const summary = summarizeResults(results);
  const items = results.map((r) => ({
    index: r.index,
    verdict: r.verdict,
    durationMs: r.durationMs,
    input: r.input,
    expected: r.expected,
    actual: r.actual,
    stderr: r.stderr,
    diffHtml:
      r.verdict === "WA"
        ? buildDiffHtml(r.actual, r.expected)
        : r.verdict === "AC"
          ? "<p class='meta'>Khớp đáp án.</p>"
          : escapeHtml(r.stderr || r.verdict),
  }));

  panel?.webview.postMessage({ type: "results", summary, items });
}

function buildDiffHtml(actual: string, expected: string): string {
  const la = actual.replace(/\r\n/g, "\n").split("\n");
  const lb = expected.replace(/\r\n/g, "\n").split("\n");
  const max = Math.max(la.length, lb.length);
  let html = "";
  for (let i = 0; i < max; i++) {
    const left = la[i] ?? "";
    const right = lb[i] ?? "";
    const cls = left === right ? "same" : "diff";
    html += `<div class="line ${cls}"><span class="ln">${i + 1}</span><code>${escapeHtml(left)}</code> | <code>${escapeHtml(right)}</code></div>`;
  }
  return html || "<p class='meta'>(trống)</p>";
}

export function closeDashboard(): void {
  panel?.dispose();
}
