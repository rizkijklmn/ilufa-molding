import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const molds = [
  {
    code: 'ILF-USED-001', name: 'Molding Tutup Botol', slug: 'molding-tutup-botol',
    type: 'USED', category: 'Packaging', description: 'Contoh listing molding tutup botol. Spesifikasi aktual perlu dikonfirmasi sebelum transaksi.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=80',
    dimensions: 'Perlu konfirmasi', weightKg: null, cavity: 8, material: 'Perlu konfirmasi',
    machineTonnage: 'Perlu konfirmasi', condition: 'Bekas — perlu inspeksi', priceLabel: 'Minta penawaran',
    status: 'AVAILABLE', featured: true
  },
  {
    code: 'ILF-NEW-002', name: 'Molding Komponen Industri', slug: 'molding-komponen-industri',
    type: 'NEW', category: 'Komponen industri', description: 'Pengadaan molding baru berdasarkan spesifikasi, gambar teknik, atau sampel produk.',
    imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1000&q=80',
    dimensions: 'Sesuai desain', cavity: 1, material: 'P20 / sesuai kebutuhan',
    machineTonnage: 'Ditentukan saat konsultasi', priceLabel: 'Minta penawaran',
    status: 'ON_ORDER', featured: true
  },
  {
    code: 'ILF-CUS-003', name: 'Molding Produk Custom', slug: 'molding-produk-custom',
    type: 'CUSTOM', category: 'Custom', description: 'Solusi pembuatan cetakan sesuai bentuk produk, target produksi, dan kebutuhan mesin injection molding.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=80',
    dimensions: 'Sesuai desain', cavity: 1, material: 'Konsultasi',
    machineTonnage: 'Ditentukan saat konsultasi', priceLabel: 'Minta penawaran',
    status: 'ON_ORDER', featured: true
  },
  {
    code: 'ILF-USED-004', name: 'Molding Peralatan Rumah Tangga', slug: 'molding-peralatan-rumah-tangga',
    type: 'USED', category: 'Household', description: 'Contoh katalog molding second untuk kategori peralatan rumah tangga. Kondisi dan kompatibilitas wajib diverifikasi.',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80',
    dimensions: 'Perlu konfirmasi', cavity: 2, condition: 'Bekas — perlu inspeksi',
    priceLabel: 'Minta penawaran', status: 'NEGOTIATION', featured: false
  }
]
for (const mold of molds) {
  await prisma.mold.upsert({ where: { code: mold.code }, update: mold, create: mold })
}
console.log(`Seed selesai: ${molds.length} contoh molding.`)
await prisma.$disconnect()
