# HSG Sinh test

Extension VS Code **sinh bộ test** (`.in` + `.out`) cho luyện thi **HSG / Olympic tin học** — C++ hoặc Python.

- **`gen.cpp`** — mỗi lần chạy in **một input** (stdout)
- **`brute.cpp`** — **code trâu** đọc input, in **đáp án đúng** → file `.out`

Đáp án luôn từ **brute**, không từ lời giải nhanh → test đáng tin khi code trâu đúng.

## Cài đặt

### Từ Marketplace (sau khi tác giả publish)

1. Mở VS Code / Cursor → **Extensions** (`Ctrl+Shift+X`)
2. Tìm: **HSG Sinh test**
3. **Install**

### Từ file .vsix (tự build)

```bash
git clone https://github.com/YOUR_GITHUB/hsg-test-gen.git
cd hsg-test-gen
npm install && npm run compile
npx vsce package
```

Trong VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX** → chọn file `.vsix`.

## Yêu cầu

- **g++** trên PATH (hoặc cấu hình `hsg.cppCompiler`)
- Mở **một folder bài** (không phải folder extension)

## Dùng nhanh

1. `Ctrl+Shift+P` → **HSG: Khởi tạo gen.cpp + brute.cpp + tests**
2. Sửa `gen.cpp` / `brute.cpp` theo đề
3. `Ctrl+Shift+P` → **HSG: Sinh test (gen → .in, brute → .out)** → nhập số test

```
gen.cpp  ──►  tests/N.in
brute.cpp ──►  tests/N.out
```

## Lệnh

| Lệnh | Mô tả |
|------|--------|
| **HSG: Cấu hình API key (AI)** | Lưu key OpenAI / API tương thích (một lần) |
| **HSG: AI tạo gen.cpp + brute.cpp từ đề bài** | Đọc đề → AI viết gen + code trâu |
| **HSG: Khởi tạo gen.cpp + brute.cpp + tests** | Tạo file mẫu + thư mục `tests/` |
| **HSG: Sinh test (gen → .in, brute → .out)** | Sinh N cặp test (nối tiếp số thứ tự) |

## AI — tạo gen + brute từ đề

1. **Cấu hình API key** (Settings hoặc lệnh trên) — key lưu an toàn trên máy bạn.
2. Để đề trong một trong các file: `de.txt`, `de.md`, `problem.md` — hoặc mở file đó / bôi đen đoạn đề.
3. Chạy **HSG: AI tạo gen.cpp + brute.cpp từ đề bài**.
4. Kiểm tra code → **HSG: Sinh test**.

Cấu hình thêm (`hsg.ai.*`):

| Key | Mặc định |
|-----|----------|
| `hsg.ai.endpoint` | OpenAI Chat Completions |
| `hsg.ai.model` | `gpt-4o-mini` |
| `hsg.ai.includeMainCode` | `true` — gửi kèm `main.cpp` nếu có |

Dùng **OpenRouter / Groq**: đổi `hsg.ai.endpoint` + `hsg.ai.model` theo tài liệu nhà cung cấp.

**Lưu ý:** Cần API key riêng (trả phí theo nhà cung cấp). Extension không gửi đề lên server của tác giả extension — chỉ gọi API bạn cấu hình.

## Cấu hình (`hsg.*`)

| Key | Mặc định |
|-----|----------|
| `hsg.generatorFile` | `gen.cpp` |
| `hsg.bruteFile` | `brute.cpp` |
| `hsg.testFolder` | `tests` |
| `hsg.defaultTestCount` | `10` |
| `hsg.genTimeLimitMs` | `3000` |
| `hsg.bruteTimeLimitMs` | `60000` |

## Cấu trúc thư mục bài

```
bai/
  gen.cpp
  brute.cpp
  tests/
    1.in  1.out
  main.cpp   # tự viết — extension không dùng
```

## Viết `gen.cpp`

- Mỗi lần chạy = **một** input hoàn chỉnh, **không** in đáp án
- Random trong giới hạn đề; với brute chậm nên gen **nhỏ** để kịp timeout

## Đăng bản mới / đóng góp

Xem [PUBLISH.md](./PUBLISH.md). Issue và PR welcome trên GitHub.

## Lưu ý pháp lý / thi cử

Công cụ hỗ trợ **luyện tập tại nhà / trường**. Khi thi chính thức, tuân thủ quy chế BTC (một số kỳ không cho phép phần mềm tự sinh test).

## License

MIT — xem [LICENSE](./LICENSE).
