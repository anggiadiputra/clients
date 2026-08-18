# Security Remediation Task Checklist (`todofix.md`)

Daftar tugas perbaikan keamanan (security hardening) berdasarkan hasil security audit, diurutkan berdasarkan tingkat urgensi (Severity).

---

## 🔴 Priority 0: Critical (Immediate Fix)

- [x] **SEC-01: Perbaiki Kelemahan OTP & Rate Limiting Brute-Force**
  - [x] Ganti generator OTP di `backend/src/routes/auth.ts` dari `Math.random()` ke `crypto.randomInt(100000, 1000000)` (CSPRNG).
  - [x] Tambahkan rate limiter `otpVerifyLimiter` (maks 10 percobaan / 15 menit) pada endpoint:
    - `POST /api/auth/otp/verify`
    - `POST /api/auth/reset-password`
  - [x] Batasi masa berlaku dan percobaan gagal per alamat email.

---

## 🟠 Priority 1: High Severity

- [x] **SEC-02: Perbaiki Broken Object-Level Authorization (BOLA/IDOR) & RBAC pada Proyek**
  - [x] `DELETE /api/projects/:id`: Batasi hanya untuk role `ADMIN`.
  - [x] `DELETE /api/projects/:id/comments/:commentId`: Validasi bahwa komentar terkait benar milik `:id` dan user adalah pembuat komentar atau `ADMIN`.
  - [x] `DELETE /api/projects/:id/attachments/:attId`: Validasi bahwa lampiran terkait benar milik `:id` dan user adalah pengunggah lampiran atau `ADMIN`.
  - [x] `GET /api/projects/by-client/:clientId`: Terapkan filter `assigneeId = req.authUser.id` jika role adalah `STAFF` agar isolasi data proyek staf tidak bocor.

- [x] **SEC-03: Lindungi Rahasia & Kunci API di Settings (Data Masking & RBAC)**
  - [x] Ubah routing `/api/settings` agar hanya dapat diakses oleh role `ADMIN` (`requireRole('ADMIN')`).
  - [x] Masking nilai sensitif (`s3SecretAccessKey`, `brevoApiKey`, `kirisanToken`, `turnstileSecretKey`, `fonnteToken`) menjadi `••••••••••••••••` pada `GET /api/settings`.
  - [x] Tangani `handleSaveSettings` agar tidak menimpa kredensial asli jika nilai yang dikirim frontend adalah string masking (`••••••••••••••••`).

- [x] **SEC-04: Perketat Validasi Upload File & Mitigasi Stored XSS**
  - [x] Di `backend/src/routes/projects.ts` (upload lampiran), tambahkan whitelist ekstensi file (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.zip`, `.txt`).
  - [x] Tolak ekstensi berbahaya (`.html`, `.htm`, `.svg`, `.xhtml`, `.js`, `.php`, `.sh`, `.exe`).
  - [x] Di `backend/src/lib/s3.ts`, tambahkan header `ContentDisposition: 'attachment'` dan `X-Content-Type-Options: nosniff` pada `PutObjectCommand`.

---

## 🟡 Priority 2: Medium Severity

- [x] **SEC-05: Cegah Formula Injection (CSV/Excel Injection) pada Ekspor Data**
  - [x] Di `backend/src/routes/export.ts`, tambahkan fungsi sanitasi `sanitizeFormula()` yang menambahkan prefix tanda petik tunggal (`'`) pada data yang diawali karakter formula (`=`, `+`, `-`, `@`, `\t`, `\r`).

- [x] **SEC-06: Implementasi Token Versioning / Invalidation Pasca Reset Password**
  - [x] Tambahkan field `tokenVersion Int @default(0)` pada model `User` di `prisma/schema.prisma`.
  - [x] Update `generateToken()` untuk menyertakan `tokenVersion` ke dalam payload JWT.
  - [x] Di `backend/src/middleware/auth.ts`, verifikasi kecocokan `payload.tokenVersion === user.tokenVersion`.
  - [x] Increment `tokenVersion` saat:
    - User mengubah password (`PUT /api/auth/change-password`)
    - User mereset password via OTP (`POST /api/auth/reset-password`)
    - Admin mereset password user (`POST /api/users/:id/reset-password`)
    - Admin mengubah role user (`PUT /api/users/:id/role`)

- [x] **SEC-07: Batasi Rate Limit pada Integrasi Pihak Ketiga & Pembuatan PDF (Anti-DoS)**
  - [x] Buat limiter `integrationLimiter` (maks 5 request / 10 menit) dan pasang di:
    - `POST /api/settings/test-kirisan`
    - `POST /api/settings/test-brevo`
    - `POST /api/clients/:id/validate-wa`
  - [x] Buat limiter `pdfLimiter` (maks 30 request / 1 menit) dan pasang di `GET /api/invoices/:id/pdf`.

---

## 🔵 Priority 3: Low Severity & Konfigurasi

- [x] **SEC-08: Validasi Ketat `JWT_SECRET` di Production**
  - [x] Di `backend/src/lib/config.ts`, lempar error fatal saat startup production jika `JWT_SECRET` kosong, menggunakan default `'dev-secret-change-me'`, atau memiliki panjang kurang dari 32 karakter.

---

## 📋 Verifikasi & Pengujian

- [x] Jalankan build TypeScript: `cd backend && npm run build`
- [x] Uji simulasi brute force OTP pada `/api/auth/otp/verify` (harus mendapat response 429 setelah 10 percobaan).
- [x] Uji akses staf pada endpoint hapus proyek / komentar / lampiran (harus mendapat 403 Forbidden).
- [x] Uji ekspor Excel dengan nama klien `=1+1` (harus tersimpan sebagai text biasa `'=1+1`).
- [x] Uji pergantian password dan pastikan token JWT lama langsung invalid (401 Unauthorized).
