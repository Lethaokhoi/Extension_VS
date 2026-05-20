import * as https from "https";
import * as http from "http";

export interface AiSettings {
  endpoint: string;
  model: string;
  maxTokens: number;
}

export interface GeneratedSources {
  gen: string;
  brute: string;
  raw: string;
}

function postJson(
  url: string,
  apiKey: string,
  body: object,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("AI request timeout"));
    });
    req.write(data);
    req.end();
  });
}

function buildSystemPrompt(lang: "cpp" | "python"): string {
  const ext = lang === "python" ? "py" : "cpp";
  return `Bạn là chuyên gia lập trình thi HSG Việt Nam.
Nhiệm vụ: viết ĐÚNG HAI file theo đề bài:
1) gen.${ext} — mỗi lần chạy in MỘT bộ input ra stdout (KHÔNG in đáp án). Dùng random trong giới hạn đề; với brute chậm nên gen case VỪA PHẢI (n nhỏ hơn max đề nếu cần).
2) brute.${ext} — code trâu: đọc stdin (input từ gen), in đáp án ĐÚNG ra stdout. Ưu tiên đúng tuyệt đối, chấp nhận chậm O(n^2), quy hoạch động đầy đủ nếu cần.

Quy tắc:
- Hai file cùng format input/output của đề.
- C++: #include <bits/stdc++.h>, using namespace std; ios::sync_with_stdio(false); cin.tie(nullptr);
- Chỉ trả nội dung theo format sau, KHÔNG giải thích thêm:

===GEN===
<mã nguồn gen>
===BRUTE===
<mã nguồn brute>`;
}

export function buildUserPrompt(
  problem: string,
  mainCode?: string,
  lang: "cpp" | "python" = "cpp"
): string {
  let text = `## ĐỀ BÀI\n${problem.trim()}\n\n## NGÔN NGỮ\n${lang}\n`;
  if (mainCode?.trim()) {
    text += `\n## GỢI Ý TỪ LỜI GIẢI (main — tham khảo, brute phải đúng độc lập)\n\`\`\`\n${mainCode.trim()}\n\`\`\`\n`;
  }
  return text;
}

export function parseGeneratedSources(raw: string): GeneratedSources | null {
  const genMatch = raw.match(/===GEN===\s*([\s\S]*?)\s*===BRUTE===/i);
  const bruteMatch = raw.match(/===BRUTE===\s*([\s\S]*?)$/i);
  if (genMatch && bruteMatch) {
    return {
      gen: stripCodeFences(genMatch[1].trim()),
      brute: stripCodeFences(bruteMatch[1].trim()),
      raw,
    };
  }

  const labeled = [...raw.matchAll(/```(?:gen|generator)\s*([\s\S]*?)```/gi)];
  const labeledBrute = [...raw.matchAll(/```(?:brute|trau)\s*([\s\S]*?)```/gi)];
  if (labeled.length && labeledBrute.length) {
    return {
      gen: labeled[0][1].trim(),
      brute: labeledBrute[0][1].trim(),
      raw,
    };
  }

  const cppBlocks = [...raw.matchAll(/```(?:cpp|c\+\+|python|py)?\s*([\s\S]*?)```/gi)].map(
    (m) => m[1].trim()
  );
  if (cppBlocks.length >= 2) {
    return { gen: cppBlocks[0], brute: cppBlocks[1], raw };
  }

  return null;
}

function stripCodeFences(s: string): string {
  const m = s.match(/^```[\w]*\s*([\s\S]*?)```$/);
  return m ? m[1].trim() : s.trim();
}

export async function generateWithAi(
  apiKey: string,
  settings: AiSettings,
  problem: string,
  mainCode?: string,
  lang: "cpp" | "python" = "cpp"
): Promise<GeneratedSources> {
  const body = {
    model: settings.model,
    max_tokens: settings.maxTokens,
    temperature: 0.2,
    messages: [
      { role: "system", content: buildSystemPrompt(lang) },
      { role: "user", content: buildUserPrompt(problem, mainCode, lang) },
    ],
  };

  const { status, text } = await postJson(
    settings.endpoint,
    apiKey,
    body,
    120000
  );

  if (status < 200 || status >= 300) {
    let msg = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      msg = j.error?.message ?? msg;
    } catch {
      /* keep raw */
    }
    throw new Error(`AI API lỗi (${status}): ${msg}`);
  }

  const parsed = JSON.parse(text) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI không trả nội dung");
  }

  const sources = parseGeneratedSources(content);
  if (!sources) {
    throw new Error(
      "Không tách được gen/brute từ AI. Thử chạy lại hoặc đổi model."
    );
  }

  if (!sources.gen || !sources.brute) {
    throw new Error("gen hoặc brute trống");
  }

  return sources;
}
