# HSG Sinh test

Extension VS Code sinh bộ test **`.in`** + **`.out`** cho luyện thi HSG / Olympic tin học.

- **`gen.cpp`** — sinh input (stdout)
- **`brute.cpp`** — code trâu, in đáp án đúng → file `.out`

📖 **Hướng dẫn từng bước (tiếng Việt):** [HUONG_DAN.md](./HUONG_DAN.md)

Trong VS Code: `Ctrl+Shift+P` → **HSG: Mở hướng dẫn sinh test**

## Cài đặt

Extensions → tìm **HSG Sinh test** → Install.

Cần **g++** trên máy (`g++ --version`).

## Lệnh nhanh

| Lệnh | Việc làm |
|------|----------|
| **HSG: Mở hướng dẫn sinh test** | Đọc hướng dẫn chi tiết |
| **HSG: Khởi tạo gen.cpp + brute.cpp + tests** | Tạo file mẫu |
| **HSG: Sinh test (gen → .in, brute → .out)** | Tạo N cặp test |

## Luồng hoạt động

```
gen.cpp  →  tests/N.in
brute.cpp  →  tests/N.out
```

## Yêu cầu & lưu ý

- Tuân thủ quy chế khi thi chính thức.
- Brute phải đúng — `.out` mới đáng tin.

## License

MIT — [LICENSE](./LICENSE)
