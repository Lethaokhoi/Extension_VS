# Đăng extension công khai (VS Code Marketplace)

Hướng dẫn từng bước — lần đầu khoảng 30–45 phút.

---

## Tổng quan

1. Đưa code lên **GitHub** (công khai, miễn phí)
2. Tạo **Publisher** trên Visual Studio Marketplace
3. Sửa `package.json` (publisher + link GitHub thật)
4. Đăng nhập `vsce` và chạy **`vsce publish`**
5. Mọi người cài: Extensions → tìm **HSG Sinh test**

Extension ID trên Marketplace sẽ là: **`{publisher}.hsg-test-gen`**

Ví dụ publisher là `chutu` → `chutu.hsg-test-gen`.

---

## Bước 1 — GitHub (open source)

1. Tạo tài khoản GitHub (nếu chưa có): https://github.com/signup
2. Tạo repository mới: **New repository**
   - Name: `hsg-test-gen` (hoặc tên khác)
   - **Public**
   - Không bắt buộc README (đã có trong project)
3. Trong folder `Extension_VS`, mở terminal:

```powershell
git init
git add .
git commit -m "Initial release: HSG Sinh test extension"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB/hsg-test-gen.git
git push -u origin main
```

Thay `TEN_GITHUB` bằng username GitHub của bạn.

4. Mở `package.json`, sửa `repository.url` cho khớp repo thật:

```json
"url": "https://github.com/TEN_GITHUB/hsg-test-gen.git"
```

Có thể thêm `homepage` và `bugs` cùng repo đó.

---

## Bước 2 — Tạo Publisher (Marketplace)

1. Vào: https://marketplace.visualstudio.com/manage
2. Đăng nhập bằng **Microsoft** hoặc **GitHub**
3. **Create publisher**
   - Publisher ID: viết thường, không dấu, ví dụ `chutu` hoặc `ten-lop-hsg`
   - Display name: tên hiển thị, ví dụ `Chu Tu`
4. Ghi nhớ **Publisher ID** — dùng trong `package.json`:

```json
"publisher": "chutu"
```

**Quan trọng:** `"publisher": "local"` không đăng Marketplace được — phải đổi thành ID vừa tạo.

---

## Bước 3 — Personal Access Token (PAT)

1. Mở: https://dev.azure.com → hoặc trực tiếp tạo PAT cho Marketplace:
   https://marketplace.visualstudio.com/manage → **Access Tokens** / hướng dẫn “Get Personal Access Token”
2. Tạo token:
   - Organization: **All accessible organizations**
   - Scopes: **Marketplace** → **Manage** (hoặc Full access cho Marketplace)
   - Expiration: 90 ngày hoặc custom
3. **Copy token** (chỉ hiện một lần) — lưu Notepad tạm.

---

## Bước 4 — Đăng nhập và publish

Trong terminal, folder `Extension_VS`:

```powershell
npm run compile
vsce login TEN_PUBLISHER
```

Khi hỏi PAT → dán token vừa tạo.

Kiểm tra `package.json`:

- `"publisher": "TEN_PUBLISHER"` (trùng Marketplace)
- `"version": "0.2.0"` (mỗi lần đăng bản mới phải tăng: 0.2.1, 0.3.0…)
- Có file `LICENSE`, `README.md`

Đăng extension:

```powershell
vsce publish
```

Hoặc publish kèm tag version:

```powershell
vsce publish minor
```

Thành công sẽ thấy link dạng:

`https://marketplace.visualstudio.com/items?itemName=TEN_PUBLISHER.hsg-test-gen`

Duyệt listing thường **vài phút đến ~30 phút**.

---

## Bước 5 — Cho mọi người cài

Trong VS Code / Cursor:

1. **Extensions** (`Ctrl+Shift+X`)
2. Tìm: `HSG Sinh test` hoặc `hsg-test-gen`
3. **Install**

Hoặc gửi link Marketplace ở trên.

---

## Cập nhật bản mới sau này

1. Sửa code
2. Tăng `"version"` trong `package.json` (semver)
3. Ghi thay đổi vào `CHANGELOG.md`
4. `git commit` + `git push`
5. `npm run compile` → `vsce publish`

---

## Tùy chọn — Icon đẹp hơn trên Marketplace

Thêm file `images/icon.png` kích thước **128×128** PNG, rồi trong `package.json`:

```json
"icon": "images/icon.png"
```

Không có icon vẫn publish được.

---

## Checklist trước khi publish

- [ ] `publisher` ≠ `local`
- [ ] `repository.url` trỏ repo GitHub thật
- [ ] Có `LICENSE`
- [ ] `README.md` mô tả rõ cách dùng (tiếng Việt OK)
- [ ] `npm run compile` không lỗi
- [ ] Đã test extension trên máy (sinh test OK)
- [ ] README có dòng cảnh báo quy chế thi HSG (tùy chọn nhưng nên có)

---

## Chỉ GitHub, chưa Marketplace?

Vẫn có thể:

- Public repo → người khác clone, `vsce package`, cài VSIX
- Hoặc bạn build VSIX, đính kèm **Releases** trên GitHub

Marketplace tiện hơn vì cài một click trong Extensions.

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| `publisher 'local' is not valid` | Đổi `publisher` trong package.json |
| `You must be logged in` | `vsce login <publisher>` |
| `Extension version already exists` | Tăng `version` trong package.json |
| `LICENSE not found` | Đã có file `LICENSE` ở root project |
| PAT hết hạn | Tạo PAT mới, `vsce login` lại |

---

## Liên hệ / branding

Trong README có thể thêm:

- Tên tác giả / lớp / trường
- Link GitHub Issues để báo lỗi

Sau khi có repo, gửi link GitHub cho bạn bè clone hoặc cài từ Marketplace.
