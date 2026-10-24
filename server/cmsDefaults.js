export const DEFAULT_CATEGORIES = [
  {
    id: 'cat_gantungan',
    name: 'Gantungan & Cantolan',
    slug: 'gantungan-cantolan',
    description: 'Berbagai jenis cetakan hanger pakaian, display hook, dan pengait plastik untuk kebutuhan garment, laundry, dan retail.',
    detailContent: 'Kategori Gantungan & Cantolan mencakup cetakan injeksi plastik berkecepatan tinggi dengan desain ergonomis, konstruksi tulang (rib) yang kuat, serta permukaan bebas burry (flash). Cocok diproduksi menggunakan material PP, HIPS, maupun ABS daur ulang atau murni dengan multi-cavity (2 hingga 8 cavity) untuk efisiensi biaya produksi.',
    imageUrl: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=900&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80'
    ],
    isVisible: true,
    sortOrder: 1
  },
  {
    id: 'cat_packaging',
    name: 'Packaging',
    slug: 'packaging',
    description: 'Cetakan tutup botol (cap), jar kosmetik, segel kemasan, dan wadah tipis (thinwall) presisi tinggi.',
    detailContent: 'Kategori Packaging membutuhkan kepresisian dimensi tinggi pada bagian ulir (thread) dan cincin pengunci (tamper-evident band) agar kedap cairan dan udara. Umumnya menggunakan sistem Hot Runner atau Cold Runner Pin-Point dengan jumlah cavity banyak (8, 16, 24, hingga 32 cavity) serta sistem pendingin (cooling channel) optimal untuk siklus cetak cepat.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=900&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
    ],
    isVisible: true,
    sortOrder: 2
  },
  {
    id: 'cat_houseware',
    name: 'Peralatan Rumah Tangga',
    slug: 'peralatan-rumah-tangga',
    description: 'Cetakan kontainer makanan, keranjang plastik, ember, alat kebersihan, dan perlengkapan dapur harian.',
    detailContent: 'Molding untuk Peralatan Rumah Tangga (Houseware) dirancang dengan ketahanan aus tinggi dan aliran plastik (flow leader) yang seimbang agar dinding produk rata dan tidak melengkung (warping). Tersedia opsi baja P20, 718H, hingga S136 dengan sisipan Beryllium Copper untuk area yang membutuhkan pelepasan panas ekstra cepat.',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80'
    ],
    isVisible: true,
    sortOrder: 3
  },
  {
    id: 'cat_industri',
    name: 'Komponen Industri',
    slug: 'komponen-industri',
    description: 'Cetakan part teknik, roda gigi, casing elektronik, bracket mesin, dan komponen otomotif presisi.',
    detailContent: 'Kategori Komponen Industri ditujukan untuk mencetak plastik teknik (Engineering Plastics) seperti Nylon (PA6/PA66 + GF), POM (Acetal), PC, dan ABS. Desain mold memperhitungkan tingkat penyusutan (shrinkage) yang ketat, mekanisme slider/lifter untuk undercut kompleks, serta ventilasi gas presisi.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=800&q=80'
    ],
    isVisible: true,
    sortOrder: 4
  }
]

export const DEFAULT_CMS = {
  seo: {
    metaTitle: 'iLUFA Molding — Jual Molding Injeksi Plastik Bekas, Jasa Pemesanan Molding Import & Pembuatan Molding Plastik Custom',
    metaDescription: 'iLUFA Molding melayani jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D & sampel, serta jual molding injeksi plastik bekas (second) siap pakai untuk pabrik manufaktur plastik di Indonesia.',
    metaKeywords: 'jual molding injeksi plastik bekas, jasa pemesanan molding import, pembuatan molding plastik custom, cetakan injeksi plastik, jual mold plastik second, pabrik molding plastik indonesia, harga molding injeksi plastik, pengadaan cetakan plastik bekasi cikarang',
    canonicalUrl: 'https://ilufamolding.com/'
  },
  general: {
    siteName: 'iLUFA MOLDING',
    siteTagline: 'Industrial Mold Procurement',
    logoUrl: '',
    themeColors: {
      primaryNavy: '#0b1f33',
      secondaryNavy: '#122e47',
      accentGold: '#d9aa52'
    },
    topbarNotice: 'Jasa Pemesanan Molding Import, Pembuatan Molding Plastik Custom & Jual Molding Injeksi Plastik Bekas',
    whatsappNumber: '628132207311',
    whatsappMessage: 'Halo iLUFA Molding, saya ingin konsultasi kebutuhan molding injeksi plastik.',
    email: 'info@ilufamolding.com',
    phone: '+62 813-2207-311',
    address: 'Kawasan Industri Cikarang, Bekasi, Jawa Barat 17530',
    operationalHours: 'Senin - Sabtu: 08.00 - 17.00 WIB'
  },
  hero: {
    eyebrow: 'SOLUSI PENGADAAN MOLDING INJEKSI PLASTIK',
    title: 'Molding yang tepat.\nProduksi lebih siap.',
    subtitle: 'Solusi lengkap jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D, serta jual molding injeksi plastik bekas (second) berkualitas melalui sistem PO / indent terpercaya.',
    primaryCtaText: 'Konsultasi & Minta Penawaran',
    secondaryCtaText: 'Jelajahi Katalog',
    imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1300&q=85',
    badges: [
      'Jasa pemesanan molding import',
      'Pembuatan molding plastik custom',
      'Jual molding injeksi plastik bekas'
    ],
    floatingCardTitle: 'Industrial Mold Solutions',
    floatingCardSubtitle: 'IMPORT BARU · CUSTOM · SECOND'
  },
  services: [
    {
      num: '01 / PROCUREMENT',
      title: 'Jasa Pemesanan Molding Import Baru',
      desc: 'Layanan jasa pemesanan molding import baru langsung dari workshop spesialis luar negeri sesuai standar industri. Pilihan multi-cavity, steel grade (P20, 718H, NAK80, S136), dan hot/cold runner system terkalibrasi.',
      ctaText: 'Pesan Molding Import',
      type: 'NEW'
    },
    {
      num: '02 / ENGINEERING',
      title: 'Pembuatan Molding Plastik Custom',
      desc: 'Jasa pembuatan molding plastik custom berdasarkan gambar teknik 2D/3D (CAD/STEP) atau sampel fisik produk Anda. Konsultasi ketebalan dinding, shrinkage, parting line, dan kecocokan tonase mesin injeksi.',
      ctaText: 'Konsultasi Desain (RFQ)',
      type: 'CUSTOM'
    },
    {
      num: '03 / SECONDARY MARKET',
      title: 'Jual Molding Injeksi Plastik Bekas / Second',
      desc: 'Pusat jual molding injeksi plastik bekas (second) berkualitas untuk pabrik yang ingin menghemat biaya investasi cetakan (CAPEX). Setiap unit telah diverifikasi ukuran, cavity, runner, dan kelayakan cetaknya.',
      ctaText: 'Lihat Katalog Second',
      type: 'USED'
    }
  ],
  process: [
    {
      step: '01',
      title: 'Kirim Kebutuhan & Gambar',
      desc: 'Sampaikan jenis produk yang ingin dicetak, gambar teknik (2D/3D), sampel produk, atau target kapasitas produksi Anda.'
    },
    {
      step: '02',
      title: 'Konsultasi Teknis & Mesin',
      desc: 'Tim kami menganalisis jumlah cavity, material mold, dimensi mold base, serta kompatibilitas clamping force tonase mesin Anda.'
    },
    {
      step: '03',
      title: 'Penawaran Harga & Estimasi Waktu',
      desc: 'Pemberian penawaran resmi (RFQ) mencakup harga cetakan, biaya pengiriman/impor, timeline pengerjaan (lead time), dan skema termin pembayaran.'
    },
    {
      step: '04',
      title: 'Produksi, QC, & Pengiriman',
      desc: 'Pengerjaan mold, uji coba cetak (sample test T0/T1), inspeksi kualitas, hingga pengiriman aman sampai ke pabrik Anda.'
    }
  ],
  about: {
    eyebrow: 'TENTANG iLUFA MOLDING',
    title: 'Partner Terpercaya Pengadaan\nMolding Injeksi Plastik',
    p1: 'iLUFA Molding hadir sebagai mitra strategis bagi pemilik pabrik plastik dan industri manufaktur di Indonesia yang membutuhkan jasa pemesanan molding import, pembuatan molding plastik custom, maupun tempat jual molding injeksi plastik bekas yang transparan dan terukur.',
    p2: 'Kami tidak sekadar menjual cetakan, melainkan memberikan solusi teknis menyeluruh: mulai dari seleksi baja mold terbaik, rekayasa desain produk 2D/3D, verifikasi kelayakan molding second siap pakai, hingga pengurusan importasi molding sampai ke pabrik Anda.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85',
    caption: 'Procurement with Precision & Purpose',
    points: [
      'Jasa pemesanan molding import baru bergaransi spesifikasi',
      'Pembuatan molding plastik custom presisi sesuai mesin Anda',
      'Jual molding injeksi plastik bekas yang sudah diinspeksi',
      'Layanan PO / Indent resmi dengan kontrak & QC transparan'
    ]
  },
  faqs: [
    {
      q: 'Bagaimana sistem pembayaran untuk pemesanan molding baru / custom?',
      a: 'Pemesanan molding baru atau custom menggunakan sistem termin (PO/Indent), umumnya Down Payment (DP) saat kontrak disepakati, termin setelah video trial cetak (T1) disetujui, dan pelunasan sebelum pengiriman ke pabrik Anda.'
    },
    {
      q: 'Berapa lama estimasi waktu pembuatan dan pengiriman molding import?',
      a: 'Waktu pengerjaan (lead time) umumnya berkisar 25–45 hari kerja tergantung kompleksitas desain, ukuran, dan jumlah cavity. Estimasi pengiriman dikonfirmasi secara transparan saat penawaran.'
    },
    {
      q: 'Bagaimana memastikan molding second / bekas masih layak pakai?',
      a: 'Setiap molding second di katalog kami telah melewati pemeriksaan fisik awal: kondisi core & cavity, keausan slider/pin ejector, serta kelengkapan runner system. Calon pembeli juga dipersilakan melakukan inspeksi fisik langsung.'
    },
    {
      q: 'Jika saya hanya punya sampel produk fisik tanpa file 3D, apakah bisa?',
      a: 'Bisa. Kami dapat membantu proses reverse engineering melalui 3D scanning produk dan pembuatan gambar kerja 3D CAD untuk disetujui sebelum mold dibuat.'
    },
    {
      q: 'Apakah iLUFA Molding bisa mencocokkan molding dengan tonase mesin kami?',
      a: 'Ya, Anda cukup memberikan informasi tonase mesin injeksi (misal: 120T, 250T, 450T) dan jarak tie bar. Tim kami akan memastikan dimensi mold base muat dan kapasitas tembak (shot weight) sesuai.'
    }
  ]
}

export const DEFAULT_MOLDED_PRODUCTS = [
  {
    id: 'prod_hanger_01',
    name: 'Gantungan Baju Plastik Premium',
    category: 'Gantungan & Cantolan',
    description: 'Produk gantungan baju anti slip dengan konstruksi kokoh dan finishing halus, cocok untuk retail pakaian.',
    detailContent: 'Gantungan baju plastik dewasa dengan desain bahu melebar dan pengait samping untuk tali pakaian. Dirancang untuk diproduksi massal menggunakan resin PP Copolymer atau HIPS. Struktur rusuk (rib) diperkuat agar tidak mudah patah saat menahan pakaian berat seperti jaket atau jas.',
    imageUrl: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80'
    ],
    weightEst: '42 gram',
    dimensions: '42 x 20 x 0.8 cm',
    moldInfo: 'Mold 4-Cavity Hot Runner',
    materialType: 'PP / HIPS / ABS',
    cycleTime: '18 - 22 detik',
    minMachineTonnage: '250 - 320 Ton',
    featured: true,
    isVisible: true
  },
  {
    id: 'prod_cap_02',
    name: 'Tutup Botol Ulir 28mm (HDPE/PP)',
    category: 'Packaging',
    description: 'Tutup botol air mineral / minuman bersegel tamper-evident ring dengan ulir presisi bebas bocor.',
    detailContent: 'Produk closure/tutup botol leher standar 28mm PCO1810 / 1881 lengkap dengan ring segel keamanan. Cetakan menggunakan baja S136 hardened dengan sistem stripper plate dan hot runner tanpa runner waste, menghasilkan siklus produksi sangat cepat dan konsisten.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
    ],
    weightEst: '2.8 gram',
    dimensions: 'Dia 28 mm, H 15 mm',
    moldInfo: 'Mold 16 / 32-Cavity High Speed',
    materialType: 'HDPE / PP Food Grade',
    cycleTime: '6 - 9 detik',
    minMachineTonnage: '160 - 220 Ton',
    featured: true,
    isVisible: true
  },
  {
    id: 'prod_container_03',
    name: 'Kontainer Penyimpanan Makanan 1000ml',
    category: 'Peralatan Rumah Tangga',
    description: 'Thinwall food container berbahan PP food-grade microwave & freezer safe, transparan dan kedap udara.',
    detailContent: 'Wadah makanan dünnwand (thinwall) ketebalan dinding 0.55 mm dengan presisi bibir penutup snap-fit anti tumpah. Cetakan dilengkapi sirkulasi air pendingin intensif dan sisipan Beryllium Copper untuk mempercepat pelepasan panas pada siklus high-speed.',
    imageUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80'
    ],
    weightEst: '35 gram',
    dimensions: '17 x 12 x 7 cm',
    moldInfo: 'Mold 2-Cavity Beryllium Copper Inserts',
    materialType: 'PP Random Copolymer (High MFI)',
    cycleTime: '7 - 10 detik',
    minMachineTonnage: '200 - 280 Ton High Speed',
    featured: true,
    isVisible: true
  },
  {
    id: 'prod_bracket_04',
    name: 'Bracket & Spacer Komponen Industri',
    category: 'Komponen Industri',
    description: 'Part plastik engineering (PA66 / POM) berkekuatan mekanik tinggi untuk dudukan dinamo dan part mesin.',
    detailContent: 'Komponen fungsional teknik dengan toleransi dimensi ketat (±0.05 mm) dan ketahanan panas serta gesekan tinggi. Menggunakan mekanisme side-core slider hidrolik/mekanik untuk membentuk lubang pengunci samping secara otomatis saat injeksi.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=800&q=80'
    ],
    weightEst: '68 gram',
    dimensions: '8 x 6 x 3 cm',
    moldInfo: 'Mold 2-Cavity Slider System',
    materialType: 'Nylon PA66 + 30% GF / POM',
    cycleTime: '22 - 28 detik',
    minMachineTonnage: '120 - 160 Ton',
    featured: false,
    isVisible: true
  }
]

export const DEFAULT_MOLDS = [
  {
    id: 'mold_used_001',
    code: 'ILF-USED-001',
    name: 'Molding Tutup Botol Ulir 28mm',
    slug: 'molding-tutup-botol-ulir-28mm',
    type: 'USED',
    category: 'Packaging',
    description: 'Jual molding injeksi plastik bekas untuk tutup botol ulir 28mm. Kondisi core & cavity terawat dan siap inspeksi.',
    detailContent: 'Molding second berkualitas untuk produksi tutup botol air mineral / minuman kemasan leher standar 28mm. Sistem runner dan saluran pendingin berfungsi normal. Spesifikasi aktual dan uji fungsi dikonfirmasi sebelum transaksi.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [],
    dimensions: '420 x 380 x 360 mm',
    weightKg: 380,
    cavity: 8,
    material: 'P20 / S136 Insert',
    machineTonnage: '160 - 220 Ton',
    condition: 'Bekas — siap inspeksi',
    priceLabel: 'Minta penawaran',
    status: 'AVAILABLE',
    featured: true,
    isVisible: true
  },
  {
    id: 'mold_new_002',
    code: 'ILF-NEW-002',
    name: 'Molding Import Komponen Industri Presisi',
    slug: 'molding-import-komponen-industri',
    type: 'NEW',
    category: 'Komponen Industri',
    description: 'Jasa pemesanan molding import baru berdasarkan spesifikasi gambar teknik 2D/3D atau sampel produk pabrik Anda.',
    detailContent: 'Layanan pengadaan molding import baru langsung dari pabrik mold maker rekanan luar negeri dengan standar kepresisian tinggi. Termasuk laporan DFM (Design for Manufacturing), pemilihan grade baja mold (718H / NAK80 / S136), dan video trial T1 sebelum pengiriman.',
    imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [],
    dimensions: 'Sesuai desain',
    weightKg: null,
    cavity: 4,
    material: '718H / S136 Hardened',
    machineTonnage: '180 - 320 Ton',
    condition: 'Baru — Garansi T1',
    priceLabel: 'Minta penawaran',
    status: 'ON_ORDER',
    featured: true,
    isVisible: true
  },
  {
    id: 'mold_cus_003',
    code: 'ILF-CUS-003',
    name: 'Pembuatan Molding Plastik Custom Sesuai Sampel',
    slug: 'pembuatan-molding-plastik-custom',
    type: 'CUSTOM',
    category: 'Gantungan & Cantolan',
    description: 'Solusi pembuatan molding plastik custom sesuai bentuk produk, target kapasitas produksi, dan tonase mesin injeksi Anda.',
    detailContent: 'Menerima pembuatan molding plastik custom mulai dari tahap 3D CAD modeling / reverse engineering sampel produk fisik, penentuan jumlah cavity paling ekonomis, hingga penyesuaian ukuran mold base dengan tie-bar mesin injection molding Anda.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [],
    dimensions: 'Sesuai desain',
    weightKg: null,
    cavity: 4,
    material: 'P20 / 718H / H13',
    machineTonnage: 'Disesuaikan mesin pabrik',
    condition: 'Custom Baru (PO/Indent)',
    priceLabel: 'Minta penawaran',
    status: 'ON_ORDER',
    featured: true,
    isVisible: true
  },
  {
    id: 'mold_used_004',
    code: 'ILF-USED-004',
    name: 'Molding Kontainer & Peralatan Rumah Tangga',
    slug: 'molding-peralatan-rumah-tangga',
    type: 'USED',
    category: 'Peralatan Rumah Tangga',
    description: 'Katalog jual molding injeksi plastik bekas untuk kategori peralatan rumah tangga (houseware). Hemat biaya investasi.',
    detailContent: 'Cetakan bekas layak pakai untuk produk keranjang/kontainer rumah tangga. Cocok untuk pabrik plastik yang ingin menambah lini produk baru dengan cepat tanpa menunggu waktu pembuatan mold dari nol.',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [],
    dimensions: '550 x 480 x 450 mm',
    weightKg: 620,
    cavity: 2,
    material: 'P20 Pre-hardened',
    machineTonnage: '250 - 350 Ton',
    condition: 'Bekas — kondisi terawat',
    priceLabel: 'Minta penawaran',
    status: 'NEGOTIATION',
    featured: false,
    isVisible: true
  }
]
