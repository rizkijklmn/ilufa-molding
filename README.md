# iLUFA Molding — Vue + Express + PostgreSQL + Prisma

Website katalog dan permintaan penawaran (RFQ) untuk pengadaan molding injeksi plastik. Frontend Vue 3/Vite dan backend Express berada dalam **satu repository/source code**, dengan PostgreSQL sebagai database dan Prisma ORM.

## Fitur yang tersedia

- **Landing Page Responsif Berstandar Industri**:
  - Banner Hero dengan pesan terarah untuk manufaktur plastik & tombol CTA.
  - 3 Pilar Layanan: Molding Import Baru, Molding Custom Desain, dan Molding Siap Pakai.
  - Katalog Molding (Tersedia, PO/Indent, Negosiasi, Terjual) dengan modal detail spesifikasi teknis lengkap (cavity, berat, dimensi base, baja mold, tonase mesin).
  - Katalog Contoh Hasil Cetakan Plastik (Gantungan, Packaging Tutup Botol, Wadah Makanan, Part Otomotif) dengan filter kategori.
  - Alur & Cara Pemesanan Sistem PO/Indent 4 langkah terarah.
  - Formulir Permintaan Penawaran Resmi (RFQ) yang tersimpan ke database & terhubung ke WhatsApp.
  - Seksi FAQ (Tanya Jawab) accordion interaktif.
  - Profil Tentang Kami & Keunggulan.
- **Admin Dashboard & CMS Lengkap**:
  - Akses Admin via tombol di topbar / footer atau URL hash `http://localhost:5173/#admin`.
  - Autentikasi Admin dengan password aman (default: `admin123`).
  - **Manajemen Katalog Molding**: Tambah mold baru, edit spesifikasi & harga, upload foto langsung dari komputer atau via URL, filter & hapus.
  - **Manajemen Contoh Hasil Cetakan Plastik**: Tambah, edit, dan hapus foto serta spesifikasi produk cetakan untuk meyakinkan calon pembeli.
  - **CMS Konten Website Live**: Klien dapat mengubah teks Beranda, Hero, Kontak & WhatsApp, 3 Pilar Layanan, 4 Langkah Cara Pemesanan, dan Profil Tentang Kami tanpa menyentuh kode.
  - **CMS FAQ**: Tambah, edit, dan hapus pertanyaan & jawaban umum.
  - **Inbox RFQ**: Kelola calon prospek penawaran masuk, update status tindak lanjut (Baru, Dihubungi, Penawaran Diberikan, Deal, Batal), dan 1-klik "Chat WhatsApp PIC".
- **Database & Penyimpanan**: PostgreSQL via Prisma ORM dengan fallback lokal yang aman.

> **Penting:** katalog seed adalah data demonstrasi. Ganti foto, kondisi, status, kode, dan spesifikasi dengan data aktual sebelum website dipublikasikan. Nomor WhatsApp dan informasi perusahaan juga perlu disesuaikan. Endpoint `/api/inquiries` untuk membaca RFQ belum memiliki login admin bawaan; atur `ADMIN_KEY` atau tambahkan autentikasi/otorisasi sebelum production.

## Persyaratan

- Node.js 20+
- PostgreSQL 14+
- npm

## Instalasi lokal

1. Buat database PostgreSQL, misalnya `ilufa_molding`.
2. Salin `.env.example` menjadi `.env`.
3. Sesuaikan `DATABASE_URL` dengan kredensial PostgreSQL Anda.
4. Install dependensi dan buat tabel database:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

5. Jalankan frontend dan backend bersama-sama:

```bash
npm run dev
```

- Vue/Vite: http://localhost:5173
- API Express: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

## Mode production

```bash
npm run build
npm start
```

Buka http://localhost:3000. Express melayani file Vue hasil build dari folder `dist` sekaligus endpoint API.

## Environment variables

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | URL koneksi PostgreSQL |
| `PORT` | Port Express, default `3000` |
| `CLIENT_ORIGIN` | Origin frontend yang diizinkan CORS |
| `VITE_API_URL` | URL API untuk frontend; saat dev dapat menggunakan `/api` karena proxy Vite |
| `VITE_WHATSAPP_NUMBER` | Nomor WhatsApp format internasional tanpa `+`, misalnya `62812...` |
| `ADMIN_KEY` | Opsional untuk melindungi endpoint GET `/api/inquiries` dengan header `x-admin-key` |

Untuk development, `VITE_API_URL=/api` biasanya paling mudah karena Vite sudah mem-proxy `/api` ke `localhost:3000`. Variabel `VITE_*` dibaca saat build frontend.

## API

- `GET /api/health` — status server.
- `GET /api/molds` — katalog; query opsional `type=USED|NEW|CUSTOM`, `q=kata`, `status=AVAILABLE|ON_ORDER|NEGOTIATION|SOLD`, `featured=true`.
- `GET /api/molds/:slug` — detail mold.
- `POST /api/inquiries` — simpan RFQ. Kolom wajib: `companyName`, `contactName`, `phone`, `moldType`, `productNeed`.
- `GET /api/inquiries` — daftar RFQ; jika `ADMIN_KEY` diset, kirim header `x-admin-key`.

## Mengelola data

Gunakan Prisma Studio untuk mengelola katalog dan RFQ:

```bash
npx prisma studio
```

Schema utama ada di `prisma/schema.prisma`. Setelah mengubah schema, jalankan migrasi:

```bash
npx prisma migrate dev --name nama_perubahan
```

## Catatan sebelum production

- Tambahkan login admin dan role-based access control.
- Jangan mengekspos daftar RFQ kepada publik; lindungi endpoint dengan autentikasi.
- Tambahkan rate limiting, validasi input lanjutan, logging, backup database, dan HTTPS.
- Simpan foto katalog di object storage/CDN; jangan bergantung pada URL gambar contoh.
- Tambahkan halaman privasi serta persetujuan pemrosesan data kontak.
- Verifikasi seluruh klaim perusahaan, pengalaman, stok, harga, spesifikasi, dan garansi.
