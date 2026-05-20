# Hướng dẫn sinh test — HSG Sinh test

Extension giúp tạo file **`.in`** (input) và **`.out`** (đáp án đúng) để luyện đề HSG.

**Không cần AI** — bạn tự viết `gen.cpp` (sinh input) và `brute.cpp` (code trâu, tính đáp án).

---

## Bước 0 — Cài đặt (một lần)

### 0.1 Cài extension

- VS Code → **Extensions** → tìm **HSG Sinh test** → **Install**

### 0.2 Cài trình biên dịch C++

Mở terminal, gõ:

```text
g++ --version
```

- Có hiện version → OK.
- Không có → cài [MSYS2](https://www.msys2.org/) hoặc MinGW, thêm `g++` vào PATH.

---

## Bước 1 — Mở folder bài

1. **File → Open Folder**
2. Chọn folder **một bài** (vd `Bai_tong`, `De_1`) — **không** mở folder `Extension_VS`.

Mỗi đề nên **một folder riêng** (hoặc sửa lại `gen`/`brute` khi đổi đề).

---

## Bước 2 — Khởi tạo file

1. Nhấn **`Ctrl + Shift + P`**
2. Gõ: **`HSG`**
3. Chọn: **`HSG: Khởi tạo gen.cpp + brute.cpp + tests`**

Sẽ có:

```text
folder-bai/
  gen.cpp      ← bạn sửa theo đề (sinh input)
  brute.cpp    ← bạn sửa theo đề (code trâu)
  tests/       ← extension lưu test vào đây
```

File mẫu chỉ là ví dụ tổng mảng — **bắt buộc sửa** cho đúng đề của bạn.

---

## Bước 3 — Viết `gen.cpp` (chỉ in INPUT)

**Quy tắc:** Mỗi lần chạy chương trình → in **một bộ input** ra màn hình (stdout). **Không** in đáp án.

**Ví dụ đề:** Cho `n`, rồi `n` số — in tổng.

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    mt19937 rng((unsigned)chrono::steady_clock::now().time_since_epoch().count());

    int n = uniform_int_distribution<int>(1, 50)(rng);  // nhỏ để brute kịp chạy
    cout << n << "\n";
    for (int i = 0; i < n; i++) {
        int x = uniform_int_distribution<int>(1, 1000)(rng);
        cout << x << (i + 1 == n ? '\n' : ' ');
    }
    return 0;
}
```

**Lưu ý:**

- Random **trong giới hạn đề**, nhưng brute chậm → gen **nhỏ hơn** max đề khi luyện (vd `n ≤ 100` thay vì `10^5`).
- Format in phải **giống hệt** đề thi (số dòng, khoảng trắng, thứ tự).

---

## Bước 4 — Viết `brute.cpp` (code trâu — in ĐÁP ÁN)

**Quy tắc:** Đọc **stdin** (= nội dung file `.in`) → in **đáp án đúng** ra stdout.

Cùng ví dụ tổng mảng:

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

**Lưu ý:**

- Brute **đúng tuyệt đối**, chậm cũng được.
- `gen` và `brute` phải **cùng format** input.

---

## Bước 5 — Sinh test (lệnh extension)

1. **`Ctrl + Shift + P`**
2. Chọn: **`HSG: Sinh test (gen → .in, brute → .out)`**
3. Nhập số test (vd **`10`**) → Enter
4. Đợi thông báo *Đã sinh X cặp test…*

Trong folder **`tests/`**:

```text
1.in   ← output của gen (lần chạy 1)
1.out  ← output của brute khi cho input 1.in
2.in
2.out
...
```

Lần sau sinh thêm → số thứ tự **nối tiếp** (đã có 1–10 thì tạo 11, 12, …).

---

## Bước 6 — Kiểm tra test

1. Mở `tests/1.in` — xem input có hợp lý không.
2. Mở `tests/1.out` — xem đáp án.
3. (Tuỳ chọn) Chạy `main.cpp` của bạn với `1.in`, so với `1.out`.

Nếu brute sai → sửa `brute.cpp` → xóa file `.out` cũ → **Sinh test** lại (hoặc xóa cả thư mục `tests` rồi sinh lại từ đầu).

---

## Tóm tắt lệnh extension

| Thứ tự | Lệnh (`Ctrl+Shift+P` → gõ HSG) |
|--------|--------------------------------|
| 1 | **Khởi tạo gen.cpp + brute.cpp + tests** |
| 2 | *(bạn sửa gen.cpp, brute.cpp)* |
| 3 | **Sinh test (gen → .in, brute → .out)** |
| — | **Mở hướng dẫn sinh test** (file này) |

---

## Mỗi đề mới

**Cách A — Folder mới (khuyên dùng):**

1. Tạo folder `Bai_2` → Open Folder  
2. Khởi tạo → viết gen/brute → Sinh test  

**Cách B — Cùng folder:**

1. Sửa hết `gen.cpp` + `brute.cpp`  
2. Xóa hoặc đổi tên folder `tests` cũ  
3. Sinh test lại  

---

## Lỗi thường gặp

| Báo lỗi | Nguyên nhân | Cách xử lý |
|---------|-------------|------------|
| Mở thư mục bài trước | Chưa Open Folder bài | File → Open Folder |
| gen lỗi / timeout | `gen.cpp` crash hoặc chậm | Chạy tay: `g++ gen.cpp -o gen && ./gen` |
| brute quá thời gian | Input quá lớn | Giảm random trong gen; Settings: `hsg.bruteTimeLimitMs` |
| `.out` sai | Brute sai logic | Sửa `brute.cpp`, sinh test lại |
| Không thấy lệnh HSG | Extension chưa cài / chưa reload | Cài extension, Reload Window |
| `g++: error: ... My: No such file` / đường dẫn bị cắt | Folder có **dấu** hoặc **khoảng trắng** (`Máy tính`) + bản extension cũ | Cập nhật extension **0.4.1+**, hoặc chuyển bài sang `C:\HSG\Bai_1` |

---

## Cấu hình (Settings → `hsg`)

| Mục | Mặc định | Khi nào đổi |
|-----|----------|-------------|
| `hsg.testFolder` | `tests` | Muốn lưu test chỗ khác |
| `hsg.bruteTimeLimitMs` | `60000` | Brute chạy lâu |
| `hsg.defaultTestCount` | `10` | Số test mặc định mỗi lần hỏi |

---

## Quy trình một dòng

```text
Open Folder bài → Khởi tạo → Sửa gen + brute → Sinh test → Kiểm tra tests/
```

Chúc luyện đề hiệu quả.
