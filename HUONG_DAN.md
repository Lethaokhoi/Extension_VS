# Hướng dẫn sinh test — HSG Sinh test

Extension giúp tạo file **`.in`** (input) và **`.out`** (đáp án đúng) để luyện đề HSG.

Bạn tự viết **`gen.cpp`** (sinh input ngẫu nhiên) và **`brute.cpp`** (code trâu — giải đúng, chậm được). Extension **chỉ chạy** hai file đó, không tự hiểu đề.

Trong VS Code: **`Ctrl+Shift+P`** → gõ **`HSG`** → chọn lệnh.

---

## Extension hoạt động thế nào?

```text
  BẠN VIẾT                    EXTENSION CHẠY GIÚP
  ─────────                   ───────────────────

  gen.cpp  ──chạy 1 lần──►   stdout  ──lưu──►  tests/1.in
       │                                            │
       │         (stdin = nội dung 1.in)            │
       ▼                                            ▼
  brute.cpp ──chạy──►        stdout  ──lưu──►  tests/1.out

  Lặp N lần → có N cặp 1.in/1.out, 2.in/2.out, ...
```

| File | Ai viết? | Làm gì? |
|------|----------|---------|
| `gen.cpp` | Bạn | Mỗi lần chạy **in 1 bộ input** (không in đáp án) |
| `brute.cpp` | Bạn | Đọc input, **in đáp án đúng** (code trâu) |
| `tests/*.in` | Extension | Copy output của `gen` |
| `tests/*.out` | Extension | Copy output của `brute` |
| `main.cpp` | Bạn (tuỳ chọn) | Lời giải nộp thi — extension **không** dùng |

---

## Các lệnh extension (giải thích chi tiết)

Mở Command Palette: **`Ctrl + Shift + P`** → gõ **`HSG`**.

| Lệnh | Tác dụng | Khi nào dùng? |
|------|----------|----------------|
| **HSG: Mở hướng dẫn sinh test** | Mở file này (`HUONG_DAN.md`) | Lần đầu, hoặc quên bước |
| **HSG: Khởi tạo gen.cpp + brute.cpp + tests** | Tạo `gen.cpp`, `brute.cpp`, folder `tests/` (file **mẫu** nếu chưa có) | Mỗi bài mới, folder trống |
| **HSG: Sinh test (gen → .in, brute → .out)** | Biên dịch `gen` + `brute`, chạy `gen` N lần, mỗi lần chạy `brute` → lưu `.in` / `.out` | Đã sửa xong `gen` và `brute` |

### Lệnh «Sinh test» làm từng bước

1. **Biên dịch** `gen.cpp` → chương trình `gen` (trong folder `.hsg-build/`).
2. **Biên dịch** `brute.cpp` → chương trình `brute`.
3. Với `i = 1 … N` (N = số bạn nhập):
   - Chạy `gen` → lấy text in ra → ghi `tests/i.in`.
   - Chạy `brute`, **cho stdin = nội dung `i.in`** → lấy text in ra → ghi `tests/i.out`.

Cần **`g++`** trên máy. Cần **Open Folder** đúng folder bài (không phải folder extension).

---

## Bước 0 — Cài đặt (một lần)

### 0.1 Cài extension

VS Code → **Extensions** (`Ctrl+Shift+X`) → tìm **HSG Sinh test** → **Install**.

### 0.2 Cài trình biên dịch C++

Terminal:

```text
g++ --version
```

- Có version → OK.
- Không có → cài [MSYS2](https://www.msys2.org/) hoặc MinGW, thêm `g++` vào PATH.

### 0.3 Đường dẫn folder (Windows)

Tránh lỗi biên dịch: nên đặt bài ở đường dẫn **không dấu, ít khoảng trắng**, vd `C:\HSG\Bai_1`.  
Nếu dùng `OneDrive\Máy tính\...` → cần extension **bản 0.4.1 trở lên**.

---

## Bước 1 — Mở folder bài

**File → Open Folder** → chọn folder **một đề** (vd `Bai_tong`).

Mỗi đề một folder riêng, hoặc sửa lại `gen`/`brute` khi đổi đề.

---

## Bước 2 — Khởi tạo file

`Ctrl+Shift+P` → **HSG: Khởi tạo gen.cpp + brute.cpp + tests**

```text
folder-bai/
  gen.cpp
  brute.cpp
  tests/
```

File mẫu = ví dụ **tổng mảng** → **bắt buộc sửa** theo đề thật.

---

## Bước 3 — Viết `gen.cpp` (chỉ in INPUT)

### Quy tắc bắt buộc

| Đúng | Sai |
|------|-----|
| Mỗi lần chạy in **một** input hoàn chỉnh | In nhiều test trong một lần (trừ đề yêu cầu T test) |
| Chỉ `cout` input | In luôn đáp án |
| Format **giống đề thi** (số dòng, thứ tự, khoảng trắng) | Khác format → brute đọc sai |

### Code mẫu (đề: cho `n`, rồi `n` số — tính tổng)

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    mt19937 rng((unsigned)chrono::steady_clock::now().time_since_epoch().count());

    int n = uniform_int_distribution<int>(1, 50)(rng);
    cout << n << "\n";
    for (int i = 0; i < n; i++) {
        int x = uniform_int_distribution<int>(1, 1000)(rng);
        cout << x << (i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

### Giải thích từng phần code `gen.cpp`

| Dòng / đoạn | Ý nghĩa |
|-------------|---------|
| `#include <bits/stdc++.h>` | Gộp thư viện C++ thường dùng khi thi (GCC). |
| `ios::sync_with_stdio(false);` | Tắt đồng bộ với C — **in/cout nhanh hơn**. |
| `cin.tie(nullptr);` | `cin` không chờ `cout` — cũng để nhanh. |
| **`mt19937 rng(...)`** | Tạo **bộ sinh số ngẫu nhiên** (tên thường gọi: Mersenne Twister). |
| `chrono::steady_clock::now()...` | Lấy **thời gian hiện tại** làm **seed** (hạt giống). |
| **Tại sao cần seed?** | Mỗi lần chạy `gen` seed khác → bộ input khác → nhiều file `.in` khác nhau. |
| **`uniform_int_distribution<int>(1, 50)(rng)`** | Random **số nguyên đều** từ **1 đến 50** (ở đây là `n`). |
| `(1, 1000)(rng)` trong vòng `for` | Random từng phần tử từ 1 đến 1000. |
| `cout << n << "\n"` | In `n` rồi xuống dòng — **dòng 1 của input**. |
| Vòng `for` + `cout << x << ...` | In `n` số trên **một dòng** (cách in phải khớp đề). |
| `i + 1 == n ? '\n' : ' '` | Số cuối không thêm space thừa (tuỳ format đề). |

### Công cụ random hay dùng (tham khảo)

| Cú pháp | Dùng để |
|---------|---------|
| `mt19937 rng(seed);` | Bộ random chính (nên dùng khi thi) |
| `uniform_int_distribution<int>(lo, hi)(rng)` | Số nguyên từ `lo` đến `hi` |
| `uniform_real_distribution<double>(lo, hi)(rng)` | Số thực (ít dùng hơn) |
| `shuffle(v.begin(), v.end(), rng)` | Trộn hoán vị mảng / hoán vị |
| `rand() % k + 1` | Cách cũ — dùng được nhưng kém kiểm soát hơn `mt19937` |

### Gợi ý chọn giới hạn random

- Đúng **giới hạn đề** khi nộp test chính thức.
- Khi **luyện + brute chậm**: gen **nhỏ hơn** (vd `n ≤ 100` thay vì `10^5`) để không timeout.
- Có thể trộn test nhỏ + vài test lớn (if trong `gen`).

---

## Bước 4 — Viết `brute.cpp` (code trâu — in ĐÁP ÁN)

### Quy tắc bắt buộc

- Đọc **stdin** = đúng nội dung file `.in` (do `gen` tạo).
- In **đáp án đúng** ra stdout (extension lưu thành `.out`).
- **Đúng tuyệt đối** quan trọng hơn tốc độ.

### Code mẫu (cùng đề tổng mảng)

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long s = 0, x;
    while (n--) {
        cin >> x;
        s += x;
    }
    cout << s << "\n";
    return 0;
}
```

### Giải thích từng phần code `brute.cpp`

| Dòng / đoạn | Ý nghĩa |
|-------------|---------|
| `cin >> n` | Đọc `n` — **khớp dòng 1** mà `gen` đã in. |
| `while (n--)` + `cin >> x` | Đọc đủ `n` số — **khớp dòng 2** của `gen`. |
| `long long s` | Tổng có thể lớn — tránh tràn `int`. |
| `cout << s << "\n"` | In **một dòng đáp án** (khớp format output đề). |

**stdin / stdout là gì?**

| Khái niệm | Trong luyện test |
|----------|------------------|
| **stdin** | Dữ liệu “đưa vào” chương trình — khi sinh test, extension gửi **nội dung file `.in`** vào stdin của `brute`. |
| **stdout** | Dữ liệu chương trình **in ra** — extension lấy stdout của `brute` → lưu `.out`. |

Khi chấm tay: `brute.exe < 1.in` nghĩa là lấy file `1.in` làm stdin.

---

## Bước 5 — Sinh test

`Ctrl+Shift+P` → **HSG: Sinh test (gen → .in, brute → .out)** → nhập số test (vd `10`).

Kết quả trong `tests/`:

```text
1.in   ← gen in ra (lần 1)
1.out  ← brute in ra khi đọc 1.in
2.in
2.out
...
```

Sinh thêm lần nữa → số file **nối tiếp** (đã có 1–10 → tạo 11, 12, …).

---

## Bước 6 — Kiểm tra test

1. Mở `tests/1.in` — input có hợp lý không?
2. Mở `tests/1.out` — đáp án có đúng không (tự tính tay vài case)?
3. (Tuỳ chọn) Chạy `main.cpp` với `1.in`, so với `1.out`.

Brute sai → sửa `brute.cpp` → xóa `tests/` hoặc file `.out` cũ → **Sinh test** lại.

---

## Quy trình từng bước (tóm tắt)

```text
1. Cài extension + g++
2. Open Folder bài
3. HSG: Khởi tạo
4. Sửa gen.cpp  (chỉ input, có random nếu cần)
5. Sửa brute.cpp (đọc stdin, in đáp án đúng)
6. HSG: Sinh test
7. Kiểm tra tests/*.in và *.out
8. Viết / debug main.cpp bằng bộ test đó
```

---

## Mỗi đề mới

**Cách A — Folder mới (khuyên dùng):** `Bai_2` → Khởi tạo → sửa gen/brute → Sinh test.

**Cách B — Cùng folder:** Sửa gen + brute → xóa/đổi tên `tests` → Sinh test lại.

---

## Lỗi thường gặp

| Báo lỗi | Nguyên nhân | Cách xử lý |
|---------|-------------|------------|
| Mở thư mục bài trước | Chưa Open Folder | File → Open Folder |
| `HSG gen: g++: error: ... My:` | Đường dẫn `Máy tính` bị cắt | Extension **0.4.1+** hoặc chuyển sang `C:\HSG\...` |
| gen lỗi / timeout | `gen.cpp` sai hoặc chậm | Sửa code; chạy tay: `g++ gen.cpp -o gen.exe` rồi `./gen` |
| brute quá thời gian | Input quá lớn | Giảm random trong `gen`; Settings `hsg.bruteTimeLimitMs` |
| `.out` sai | `brute` sai logic | Sửa `brute.cpp`, sinh test lại |
| Không thấy lệnh HSG | Chưa cài / chưa reload | Install extension → Reload Window |

---

## Cấu hình (Settings → `hsg`)

| Mục | Mặc định | Ý nghĩa |
|-----|----------|---------|
| `hsg.testFolder` | `tests` | Thư mục lưu `.in` / `.out` |
| `hsg.generatorFile` | `gen.cpp` | File sinh input |
| `hsg.bruteFile` | `brute.cpp` | File code trâu |
| `hsg.defaultTestCount` | `10` | Số test mặc định khi hỏi |
| `hsg.genTimeLimitMs` | `3000` | Timeout mỗi lần chạy `gen` |
| `hsg.bruteTimeLimitMs` | `60000` | Timeout mỗi lần chạy `brute` |
| `hsg.cppCompiler` | `g++` | Trình biên dịch |

---

## Checklist trước khi «Sinh test»

- [ ] Đã Open Folder đúng bài
- [ ] `gen.cpp` chỉ in input, format đúng đề
- [ ] `brute.cpp` đọc đúng format đó, in đúng output đề
- [ ] Đã thử compile: `g++ gen.cpp -o gen.exe` và `g++ brute.cpp -o brute.exe`
- [ ] Random trong `gen` không quá lớn (brute kịp chạy)

Chúc luyện đề hiệu quả.
