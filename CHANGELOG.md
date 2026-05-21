# Changelog

## 0.5.0

- Module `generator.ts`: sinh test random + edge cases từ `hsg-tests.json`
- Timeout: `tree-kill` dừng tiến trình con khi TLE (gen/brute/main)
- Webview Dashboard: chấm `main.cpp`, bảng AC/WA/TLE, diff 3 cột

## 0.4.4

- Bỏ `activationEvents` thừa — VS Code tự kích hoạt từ `contributes.commands`

## 0.4.3

- Sửa lỗi không thấy lệnh HSG: `activationEvents` rỗng khiến extension không kích hoạt

## 0.4.2

- Mở rộng HUONG_DAN.md: giải thích lệnh extension, gen/brute, mt19937, stdin/stdout

## 0.4.1

- Sửa lỗi g++ trên Windows khi đường dẫn có dấu / khoảng trắng (vd `Máy tính`)

## 0.4.0

- Hướng dẫn từng bước (HUONG_DAN.md), lệnh mở hướng dẫn
- Bỏ tính năng AI — chỉ sinh test bằng gen + brute

## 0.3.0

- Thêm **HUONG_DAN.md** — hướng dẫn từng bước sinh test (tiếng Việt)
- Lệnh **HSG: Mở hướng dẫn sinh test**
- Tập trung gen + brute thủ công (không dùng AI trong extension)

## 0.2.0

- Sinh cặp `.in` / `.out`: `gen.cpp` tạo input, `brute.cpp` tạo đáp án
- Lệnh khởi tạo workspace và sinh test
