<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Menu, X, ArrowUpRight, CheckCircle2, Factory, Boxes, Wrench,
  ClipboardCheck, MessageCircle, ShieldCheck, Clock3, Search,
  ChevronDown, Send, MoveRight, Layers, HelpCircle, Lock, Sliders
} from 'lucide-vue-next'
import AdminPanel from './components/AdminPanel.vue'
import MoldDetailModal from './components/MoldDetailModal.vue'

const API = import.meta.env.VITE_API_URL || '/api'
const WA_DEFAULT = import.meta.env.VITE_WHATSAPP_NUMBER || '628132207311'

// --- View Mode: 'site' or 'admin' ---
const viewMode = ref('site')
function setViewMode(mode) {
  viewMode.value = mode
  if (mode === 'admin') {
    window.location.hash = 'admin'
  } else {
    if (window.location.hash === '#admin') history.pushState('', document.title, window.location.pathname)
  }
}

function handleHashChange() {
  if (window.location.hash === '#admin' || window.location.hash === '#cms') {
    viewMode.value = 'admin'
  }
}

// --- CMS Data (Dynamic with Robust Defaults) ---
const cms = ref({
  general: {
    siteName: 'iLUFA MOLDING',
    siteTagline: 'INDUSTRIAL MOLD PROCUREMENT',
    topbarNotice: 'Solusi pengadaan molding untuk kebutuhan industri & manufaktur',
    whatsappNumber: WA_DEFAULT,
    whatsappMessage: 'Halo iLUFA Molding, saya ingin konsultasi kebutuhan molding injeksi plastik.',
    email: 'info@ilufamolding.com',
    phone: '+62 813-2207-311',
    address: 'Kawasan Industri Cikarang, Bekasi, Jawa Barat 17530',
    operationalHours: 'Senin - Sabtu: 08.00 - 17.00 WIB'
  },
  hero: {
    eyebrow: 'SOLUSI PENGADAAN MOLDING PLASTIK',
    title: 'Molding yang tepat.\nProduksi lebih siap.',
    subtitle: 'Pemesanan molding injeksi plastik baru, custom, dan second untuk mendukung kebutuhan produksi bisnis Anda melalui sistem PO / indent terpercaya.',
    primaryCtaText: 'Konsultasi & Minta Penawaran',
    secondaryCtaText: 'Jelajahi Katalog',
    imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1300&q=85',
    badges: [
      'Sesuai kebutuhan industri',
      'Proses transparan & terukur',
      'Sistem PO / Indent terpercaya'
    ],
    floatingCardTitle: 'Industrial Mold Solutions',
    floatingCardSubtitle: 'NEW · CUSTOM · SECOND'
  },
  services: [
    {
      num: '01 / PROCUREMENT',
      title: 'Molding Import Baru',
      desc: 'Pengadaan molding baru sesuai spesifikasi dan kebutuhan produksi, dengan proses PO atau indent terpercaya.',
      ctaText: 'Diskusikan kebutuhan',
      type: 'NEW'
    },
    {
      num: '02 / ENGINEERING',
      title: 'Molding Custom',
      desc: 'Pembuatan cetakan berdasarkan gambar teknik, desain 3D, atau sampel produk Anda.',
      ctaText: 'Konsultasi desain',
      type: 'CUSTOM'
    },
    {
      num: '03 / SECONDARY MARKET',
      title: 'Molding Second',
      desc: 'Alternatif molding bekas berkualitas untuk menekan CAPEX. Kondisi dan kelengkapan diverifikasi.',
      ctaText: 'Lihat katalog',
      type: 'USED'
    }
  ],
  process: [
    {
      step: '01',
      title: 'Kirim Kebutuhan & Gambar',
      desc: 'Sampaikan jenis produk, gambar 2D/3D, sampel, atau target produksi Anda.'
    },
    {
      step: '02',
      title: 'Konsultasi Teknis & Mesin',
      desc: 'Diskusikan ukuran, cavity, baja mold, dan tonase mesin injection molding Anda.'
    },
    {
      step: '03',
      title: 'Penawaran & Kesepakatan',
      desc: 'Penawaran harga, estimasi waktu, termin pembayaran PO, dan pengiriman dikonfirmasi.'
    },
    {
      step: '04',
      title: 'Pengadaan, QC, & Pengiriman',
      desc: 'Proses produksi, uji coba cetak (sample test), hingga pengiriman aman ke pabrik Anda.'
    }
  ],
  about: {
    eyebrow: 'TENTANG iLUFA MOLDING',
    title: 'Partner Terpercaya Pengadaan\nMolding Injeksi Plastik',
    p1: 'iLUFA Molding dirancang sebagai titik awal bagi perusahaan manufaktur yang membutuhkan solusi pengadaan molding injeksi plastik—baik untuk kebutuhan baru, pengembangan desain custom, maupun alternatif molding second siap pakai.',
    p2: 'Kami mengutamakan komunikasi teknis, transparansi spesifikasi baja, dan kepastian alur pemesanan sebelum transaksi.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85',
    caption: 'Procurement with Precision & Purpose',
    points: [
      'Fokus kebutuhan spesifik manufaktur lokal',
      'Transparansi spesifikasi baja dan kelengkapan',
      'Dukungan konsultasi teknis sebelum komitmen',
      'Layanan PO / Indent resmi & bergaransi'
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
  ],
  productCategories: [
    'Packaging & Tutup Botol',
    'Peralatan Rumah Tangga (Houseware)',
    'Komponen Industri & Otomotif',
    'Gantungan & Cantolan Plastik'
  ]
})

function onCmsUpdated(newCms) {
  cms.value = { ...cms.value, ...newCms }
}

// --- Molds & Molded Products Catalog Data ---
const menuOpen = ref(false)
const molds = ref([])
const moldedProducts = ref([])
const loadingMolds = ref(true)
const loadError = ref('')
const query = ref('')
const filterType = ref('ALL')
const selectedMold = ref(null)

// --- Molded Products Category Filter ---
const selectedCategory = ref('ALL')
const filteredProducts = computed(() => {
  if (selectedCategory.value === 'ALL') return moldedProducts.value
  return moldedProducts.value.filter(p => p.category === selectedCategory.value)
})

const categoriesList = computed(() => {
  const cats = new Set(moldedProducts.value.map(p => p.category).filter(Boolean))
  return ['ALL', ...Array.from(cats)]
})

// --- FAQ Accordion State ---
const openFaqIndex = ref(0)
function toggleFaq(index) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

// --- RFQ Inquiry Form State ---
const formBusy = ref(false)
const formMessage = ref('')
const formError = ref('')
const form = ref({
  companyName: '', contactName: '', email: '', phone: '', moldType: 'CUSTOM',
  productNeed: '', dimensions: '', cavity: '', machineInfo: '', budget: '', targetDate: '', notes: '', moldId: null
})

const filteredMolds = computed(() => molds.value.filter(m => {
  const matchesType = filterType.value === 'ALL' || m.type === filterType.value
  const search = query.value.toLowerCase()
  const matchesQuery = !search || `${m.name} ${m.code} ${m.category}`.toLowerCase().includes(search)
  return matchesType && matchesQuery
}))

const typeLabel = (type) => ({ NEW: 'Molding Baru', CUSTOM: 'Custom', USED: 'Second / Bekas' }[type] || type)
const statusLabel = (status) => ({ AVAILABLE: 'Tersedia', ON_ORDER: 'PO / Indent', NEGOTIATION: 'Negosiasi', SOLD: 'Terjual' }[status] || status)

const waLink = computed(() => {
  const num = cms.value.general.whatsappNumber || WA_DEFAULT
  const msg = cms.value.general.whatsappMessage || 'Halo iLUFA Molding, saya ingin konsultasi kebutuhan molding injeksi plastik.'
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
})

async function fetchCMS() {
  try {
    const res = await fetch(`${API}/cms`)
    if (res.ok) {
      const data = await res.json()
      if (data.data) cms.value = { ...cms.value, ...data.data }
    }
  } catch {}
}

async function fetchMolds() {
  loadingMolds.value = true
  loadError.value = ''
  try {
    const res = await fetch(`${API}/molds`)
    if (!res.ok) throw new Error('Gagal memuat katalog.')
    const result = await res.json()
    molds.value = result.data || []
  } catch {
    loadError.value = 'Katalog belum dapat dimuat dari database.'
  } finally {
    loadingMolds.value = false
  }
}

async function fetchMoldedProducts() {
  try {
    const res = await fetch(`${API}/molded-products`)
    if (res.ok) {
      const result = await res.json()
      moldedProducts.value = result.data || []
    }
  } catch {}
}

async function submitInquiry() {
  formBusy.value = true; formMessage.value = ''; formError.value = ''
  try {
    const res = await fetch(`${API}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Permintaan gagal dikirim.')
    formMessage.value = `Terima kasih! Permintaan Anda tersimpan dengan nomor tiket #${result.data.id}. Tim teknis iLUFA akan segera menghubungi Anda.`
    form.value = {
      companyName: '', contactName: '', email: '', phone: '', moldType: 'CUSTOM',
      productNeed: '', dimensions: '', cavity: '', machineInfo: '', budget: '', targetDate: '', notes: '', moldId: null
    }
  } catch (error) {
    formError.value = error.message || 'Tidak dapat mengirim permintaan. Coba lagi.'
  } finally {
    formBusy.value = false
  }
}

function handleRequestQuoteFromModal(mold) {
  selectedMold.value = null
  form.value.moldType = mold.type
  form.value.moldId = mold.id
  form.value.productNeed = `Saya tertarik dengan ${mold.name} (Kode: ${mold.code}). Mohon info harga penawaran dan spesifikasi detailnya.`
  jumpTo('rfq')
}

function jumpTo(id) {
  menuOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  handleHashChange()
  window.addEventListener('hashchange', handleHashChange)
  fetchCMS()
  fetchMolds()
  fetchMoldedProducts()
})

onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange)
})
</script>

<template>
  <div>
    <!-- ADMIN PANEL VIEW -->
    <div v-if="viewMode === 'admin'">
      <AdminPanel
        :api="API"
        :initial-cms="cms"
        @close="setViewMode('site')"
        @cms-updated="onCmsUpdated"
      />
    </div>

    <!-- PUBLIC WEBSITE VIEW -->
    <div v-else>
      <!-- TOPBAR -->
      <div class="topbar">
        <div class="container topbar-inner">
          <span>{{ cms.general.topbarNotice }}</span>
          <div style="display: flex; align-items: center; gap: 16px;">
            <a :href="waLink" target="_blank" rel="noreferrer">
              <MessageCircle :size="15" /> Konsultasi WhatsApp
            </a>
            <button class="admin-link-btn" @click="setViewMode('admin')">
              <Lock :size="12" /> Admin & CMS Portal
            </button>
          </div>
        </div>
      </div>

      <!-- HEADER NAVIGATION -->
      <header class="header">
        <div class="container nav">
          <a href="#" class="brand" aria-label="iLUFA Molding beranda">
            <span class="brand-mark">i</span>
            <span>
              {{ cms.general.siteName || 'iLUFA MOLDING' }}
              <small>{{ cms.general.siteTagline || 'INDUSTRIAL MOLD PROCUREMENT' }}</small>
            </span>
          </a>

          <button class="mobile-toggle" @click="menuOpen = !menuOpen" aria-label="Buka menu">
            <X v-if="menuOpen" />
            <Menu v-else />
          </button>

          <nav :class="{ 'nav-open': menuOpen }">
            <a href="#layanan" @click="menuOpen = false">Layanan</a>
            <a href="#katalog" @click="menuOpen = false">Katalog Molding</a>
            <a href="#hasil-cetakan" @click="menuOpen = false">Contoh Hasil Cetak</a>
            <a href="#proses" @click="menuOpen = false">Cara Pemesanan</a>
            <a href="#faq" @click="menuOpen = false">FAQ</a>
            <a href="#tentang" @click="menuOpen = false">Tentang Kami</a>
            <button class="btn btn-primary nav-cta" @click="jumpTo('rfq')">
              Minta Penawaran <ArrowUpRight :size="16" />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <!-- HERO SECTION -->
        <section class="hero">
          <div class="hero-grid"></div>
          <div class="container hero-content">
            <div class="hero-copy">
              <div class="eyebrow">
                <span class="eyebrow-line"></span>
                {{ cms.hero.eyebrow }}
              </div>
              <h1 style="white-space: pre-line;">{{ cms.hero.title }}</h1>
              <p class="hero-desc">{{ cms.hero.subtitle }}</p>
              
              <div class="hero-actions">
                <button class="btn btn-gold" @click="jumpTo('rfq')">
                  {{ cms.hero.primaryCtaText }} <MoveRight :size="18" />
                </button>
                <button class="btn btn-outline-light" @click="jumpTo('katalog')">
                  {{ cms.hero.secondaryCtaText }}
                </button>
              </div>

              <div class="hero-points">
                <span v-for="(badge, bIdx) in cms.hero.badges" :key="bIdx">
                  <CheckCircle2 :size="16" /> {{ badge }}
                </span>
              </div>
            </div>

            <div class="hero-visual">
              <img :src="cms.hero.imageUrl" alt="Industrial Mold Engineering" />
              <div class="visual-shade"></div>
              <div class="hero-label">
                <span class="label-icon"><Factory :size="22" /></span>
                <div>
                  <b>{{ cms.hero.floatingCardTitle || 'Industrial Mold Solutions' }}</b>
                  <small>{{ cms.hero.floatingCardSubtitle || 'NEW · CUSTOM · SECOND' }}</small>
                </div>
              </div>
              <div class="visual-number">
                <b>01</b>
                <span>ENGINEERING<br />YOUR NEXT STEP</span>
              </div>
            </div>

            <div class="hero-side-note">PRECISION · PROCUREMENT · PARTNERSHIP</div>
          </div>
        </section>

        <!-- TRUST STRIP -->
        <section class="trust-strip">
          <div class="container trust-grid">
            <div>
              <Factory />
              <span><b>Solusi Industri</b><small>Fokus pada kebutuhan produksi</small></span>
            </div>
            <div>
              <Boxes />
              <span><b>3 Pilihan Layanan</b><small>Baru, custom, dan second</small></span>
            </div>
            <div>
              <ClipboardCheck />
              <span><b>Proses Terarah</b><small>Spesifikasi hingga pengiriman</small></span>
            </div>
            <div>
              <ShieldCheck />
              <span><b>Informasi Transparan</b><small>Konfirmasi sebelum transaksi</small></span>
            </div>
          </div>
        </section>

        <!-- 3 PILAR LAYANAN -->
        <section id="layanan" class="section services-section">
          <div class="container">
            <div class="section-heading">
              <div>
                <div class="eyebrow dark"><span class="eyebrow-line"></span> LAYANAN KAMI</div>
                <h2>Satu partner untuk<br /><span>berbagai kebutuhan mold.</span></h2>
              </div>
              <p>Mulai dari mencari molding siap pakai hingga membuat cetakan berdasarkan desain produk Anda. Spesifikasi dan estimasi dikonfirmasi melalui konsultasi teknis.</p>
            </div>

            <div class="service-grid">
              <article
                v-for="(srv, sIdx) in cms.services"
                :key="sIdx"
                class="service-card"
                :class="{ 'featured-service': srv.type === 'CUSTOM' }"
              >
                <div class="service-icon">
                  <Boxes v-if="srv.type === 'NEW'" />
                  <Wrench v-else-if="srv.type === 'CUSTOM'" />
                  <Factory v-else />
                </div>
                <div class="service-num">{{ srv.num }}</div>
                <h3>{{ srv.title }}</h3>
                <p>{{ srv.desc }}</p>
                <a
                  :href="srv.type === 'USED' ? '#katalog' : '#rfq'"
                  @click="srv.type !== 'USED' ? form.moldType = srv.type : null"
                >
                  {{ srv.ctaText }} <ArrowUpRight :size="16" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <!-- KATALOG MOLDING (BARU, CUSTOM, SECOND) -->
        <section id="katalog" class="section catalog-section">
          <div class="container">
            <div class="section-heading catalog-heading">
              <div>
                <div class="eyebrow dark"><span class="eyebrow-line"></span> KATALOG MOLDING</div>
                <h2>Temukan opsi yang<br /><span>sesuai kebutuhan Anda.</span></h2>
              </div>
              <p>Klik salah satu molding untuk melihat spesifikasi detail (cavity, berat, dimensi base, tonase mesin) dan meminta penawaran resmi.</p>
            </div>

            <div class="catalog-tools">
              <div class="search-box">
                <Search :size="18" />
                <input v-model="query" placeholder="Cari nama, kode, kategori..." aria-label="Cari katalog" />
              </div>
              <div class="filter-tabs">
                <button
                  v-for="f in [{label:'Semua',value:'ALL'},{label:'Baru',value:'NEW'},{label:'Custom',value:'CUSTOM'},{label:'Second',value:'USED'}]"
                  :key="f.value"
                  :class="{ active: filterType === f.value }"
                  @click="filterType = f.value"
                >
                  {{ f.label }}
                </button>
              </div>
            </div>

            <div v-if="loadingMolds" class="empty-state">Memuat katalog molding...</div>
            <div v-else-if="loadError" class="empty-state error-state">
              {{ loadError }} <button class="text-button" @click="fetchMolds">Coba lagi</button>
            </div>
            <div v-else-if="filteredMolds.length" class="mold-grid">
              <article
                class="mold-card"
                v-for="mold in filteredMolds"
                :key="mold.id"
                @click="selectedMold = mold"
                style="cursor: pointer;"
              >
                <div class="mold-image">
                  <img :src="mold.imageUrl || 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=900&q=80'" :alt="mold.name" loading="lazy" />
                  <span class="type-tag">{{ typeLabel(mold.type) }}</span>
                  <span class="status-tag" :class="'status-' + mold.status.toLowerCase()">{{ statusLabel(mold.status) }}</span>
                </div>
                <div class="mold-body">
                  <div class="mold-code">{{ mold.code }} <span>{{ mold.category }}</span></div>
                  <h3>{{ mold.name }}</h3>
                  <p>{{ mold.description }}</p>
                  <div class="spec-row">
                    <span v-if="mold.cavity"><b>{{ mold.cavity }}</b> cavity</span>
                    <span v-if="mold.dimensions"><b>{{ mold.dimensions }}</b></span>
                    <span v-if="mold.condition"><b>{{ mold.condition }}</b></span>
                  </div>
                  <div class="mold-footer">
                    <div>
                      <small>HARGA</small>
                      <b>{{ mold.priceLabel || 'Minta penawaran' }}</b>
                    </div>
                    <button class="icon-btn" :aria-label="`Detail ${mold.name}`">
                      <ArrowUpRight />
                    </button>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">
              Belum ada item yang cocok dengan pencarian. Coba kata kunci lain atau hubungi admin.
            </div>

            <div class="catalog-footnote">
              <ShieldCheck :size="17" />
              Katalog ini diperbarui secara berkala. Pastikan ketersediaan, kondisi fisik, dan kesesuaian clamping mesin telah dikonfirmasi sebelum proses PO.
            </div>
          </div>
        </section>

        <!-- KATALOG PRODUK HASIL CETAKAN PLASTIK (SHOWCASE) -->
        <section id="hasil-cetakan" class="products-showcase-section">
          <div class="container">
            <div class="section-heading">
              <div>
                <div class="eyebrow dark"><span class="eyebrow-line"></span> HASIL CETAKAN PLASTIK</div>
                <h2>Contoh produk yang<br /><span>dapat diproduksi.</span></h2>
              </div>
              <p>Mulai dari peralatan rumah tangga, packaging botol, gantungan, hingga komponen industri berkekuatan tinggi.</p>
            </div>

            <div class="catalog-tools mb-6">
              <div class="filter-tabs">
                <button
                  v-for="cat in categoriesList"
                  :key="cat"
                  :class="{ active: selectedCategory === cat }"
                  @click="selectedCategory = cat"
                >
                  {{ cat === 'ALL' ? 'Semua Kategori' : cat }}
                </button>
              </div>
            </div>

            <div v-if="filteredProducts.length === 0" class="empty-state">
              Belum ada contoh produk hasil cetakan pada kategori ini.
            </div>
            <div v-else class="showcase-grid">
              <div v-for="prod in filteredProducts" :key="prod.id" class="showcase-card">
                <div class="showcase-img">
                  <img :src="prod.imageUrl || 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80'" :alt="prod.name" loading="lazy" />
                  <span class="showcase-cat">{{ prod.category }}</span>
                </div>
                <div class="showcase-body">
                  <h3>{{ prod.name }}</h3>
                  <p>{{ prod.description }}</p>
                  <div class="showcase-specs">
                    <span v-if="prod.weightEst">Perkiraan Berat: <b>{{ prod.weightEst }}</b></span>
                    <span v-if="prod.dimensions">Dimensi Produk: <b>{{ prod.dimensions }}</b></span>
                    <span v-if="prod.moldInfo">Spesifikasi Mold: <b>{{ prod.moldInfo }}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CARA PEMESANAN (PO / INDENT) -->
        <section class="process-section" id="proses">
          <div class="container process-layout">
            <div class="process-intro">
              <div class="eyebrow"><span class="eyebrow-line"></span> CARA PEMESANAN</div>
              <h2>Jelas dari awal.<br /><span>Terarah sampai kirim.</span></h2>
              <p>Setiap kebutuhan mold memiliki karakter tersendiri. Kami memastikan setiap spesifikasi dan biaya terkonfirmasi secara transparan sebelum pembayaran.</p>
              <button class="btn btn-gold" @click="jumpTo('rfq')">
                Mulai Konsultasi <MoveRight :size="18" />
              </button>
            </div>

            <div class="process-list">
              <div v-for="(st, idx) in cms.process" :key="idx" class="process-item">
                <span>{{ st.step }}</span>
                <div>
                  <h3>{{ st.title }}</h3>
                  <p>{{ st.desc }}</p>
                </div>
                <CheckCircle2 />
              </div>
            </div>
          </div>
        </section>

        <!-- RFQ (REQUEST FOR QUOTATION) FORM -->
        <section class="rfq-section" id="rfq">
          <div class="container rfq-layout">
            <div class="rfq-copy">
              <div class="eyebrow"><span class="eyebrow-line"></span> REQUEST FOR QUOTATION</div>
              <h2>Ceritakan kebutuhan<br /><span>molding Anda.</span></h2>
              <p>Lengkapi informasi kebutuhan cetakan di samping. Tim teknis iLUFA akan menggunakan detail ini untuk menyiapkan kalkulasi penawaran resmi.</p>
              
              <div class="rfq-note">
                <div><Clock3 /></div>
                <span>
                  <b>Belum punya spesifikasi lengkap?</b>
                  <small>Tidak masalah. Isi informasi yang sudah Anda ketahui, lalu diskusikan sisanya bersama tim kami.</small>
                </span>
              </div>

              <a class="rfq-wa" :href="waLink" target="_blank" rel="noreferrer">
                <MessageCircle /> Konsultasi Langsung via WhatsApp <ArrowUpRight />
              </a>
            </div>

            <form class="rfq-form" @submit.prevent="submitInquiry">
              <div class="form-heading">
                <div>
                  <span>FORMULIR RFQ RESMI</span>
                  <h3>Permintaan Penawaran</h3>
                </div>
                <span class="required-note">* Wajib diisi</span>
              </div>

              <div class="form-grid">
                <label>
                  Nama perusahaan / Pabrik *
                  <input v-model.trim="form.companyName" required placeholder="PT / CV / Nama Usaha" />
                </label>
                <label>
                  Nama PIC Kontak *
                  <input v-model.trim="form.contactName" required placeholder="Nama lengkap Anda" />
                </label>
                <label>
                  Email Resmi
                  <input v-model.trim="form.email" type="email" placeholder="nama@perusahaan.com" />
                </label>
                <label>
                  Nomor WhatsApp / HP *
                  <input v-model.trim="form.phone" required placeholder="Contoh: 08123456789" />
                </label>
                <label>
                  Jenis Kebutuhan Mold *
                  <select v-model="form.moldType" required>
                    <option value="NEW">Molding Import Baru</option>
                    <option value="CUSTOM">Molding Custom Sesuai Desain</option>
                    <option value="USED">Molding Second / Bekas</option>
                  </select>
                </label>
                <label>
                  Target Jadwal Produksi
                  <input v-model="form.targetDate" placeholder="Contoh: Segera / 2 Bulan ke depan" />
                </label>
                <label class="full-field">
                  Deskripsi Kebutuhan Cetakan / Produk *
                  <textarea v-model.trim="form.productNeed" required rows="3" placeholder="Jelaskan jenis produk plastik yang akan dicetak, estimasi berat, atau referensi mold..."></textarea>
                </label>
                <label>
                  Dimensi Produk / Mold (jika ada)
                  <input v-model="form.dimensions" placeholder="Contoh: 15 x 10 cm" />
                </label>
                <label>
                  Rencana Jumlah Cavity
                  <input v-model="form.cavity" placeholder="Contoh: 2, 4, 8, 16 Cavity" />
                </label>
                <label class="full-field">
                  Informasi Mesin Injection Molding
                  <input v-model="form.machineInfo" placeholder="Merek dan Tonase mesin (misal: Haitian 180T, Toyo 250T)" />
                </label>
                <label>
                  Estimasi Budget Pengadaan
                  <input v-model="form.budget" placeholder="Opsional" />
                </label>
                <label class="full-field">
                  Catatan Khusus
                  <textarea v-model="form.notes" rows="2" placeholder="Informasi file gambar 3D CAD (STEP), sampel fisik, atau persyaratan baja mold"></textarea>
                </label>
              </div>

              <p v-if="formError" class="form-alert form-alert-error">{{ formError }}</p>
              <p v-if="formMessage" class="form-alert form-alert-success">
                <CheckCircle2 :size="18" /> {{ formMessage }}
              </p>

              <div class="form-bottom">
                <small>Informasi kebutuhan Anda dijaga kerahasiaannya dan hanya digunakan untuk menyusun penawaran teknis.</small>
                <button class="btn btn-primary" type="submit" :disabled="formBusy">
                  {{ formBusy ? 'Mengirim...' : 'Kirim Permintaan Penawaran' }} <Send :size="16" />
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- FAQ SECTION ACCORDION -->
        <section class="faq-section" id="faq">
          <div class="container">
            <div class="section-heading" style="text-align: center; display: block; margin-bottom: 40px;">
              <div class="eyebrow dark" style="justify-content: center;">
                <span class="eyebrow-line"></span> FAQ & TANYA JAWAB
              </div>
              <h2>Pertanyaan yang sering<br /><span>diajukan pelanggan.</span></h2>
              <p style="margin: 12px auto 0; max-width: 540px;">
                Semua kejelasan seputar garansi, inspeksi fisik mold second, dan sistem pembayaran termin PO dijelaskan secara terbuka.
              </p>
            </div>

            <div class="faq-accordion">
              <div
                v-for="(faq, fIdx) in cms.faqs"
                :key="fIdx"
                class="faq-card"
                :class="{ open: openFaqIndex === fIdx }"
              >
                <div class="faq-question" @click="toggleFaq(fIdx)">
                  <h3>{{ faq.q }}</h3>
                  <div class="faq-icon"><ChevronDown :size="16" /></div>
                </div>
                <div v-if="openFaqIndex === fIdx" class="faq-answer">
                  <p>{{ faq.a }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- TENTANG KAMI -->
        <section class="about-section" id="tentang">
          <div class="container about-layout">
            <div class="about-visual">
              <img :src="cms.about.imageUrl" alt="Tim teknis iLUFA Molding" loading="lazy" />
              <div class="about-caption">
                <span>iLUFA</span>
                <b>{{ cms.about.caption }}</b>
              </div>
            </div>
            <div class="about-copy">
              <div class="eyebrow dark"><span class="eyebrow-line"></span> {{ cms.about.eyebrow }}</div>
              <h2 style="white-space: pre-line;">{{ cms.about.title }}</h2>
              <p>{{ cms.about.p1 }}</p>
              <p>{{ cms.about.p2 }}</p>
              <div class="about-points">
                <span v-for="(point, pIdx) in cms.about.points" :key="pIdx">
                  <CheckCircle2 /> {{ point }}
                </span>
              </div>
              <button class="btn btn-primary" @click="jumpTo('rfq')">
                Diskusikan Proyek Anda <ArrowUpRight :size="16" />
              </button>
            </div>
          </div>
        </section>

        <!-- CTA BAND -->
        <section class="cta-band">
          <div class="container cta-inner">
            <div>
              <span>KONSULTASI PENGADAAN MOLDING</span>
              <h2>Punya kebutuhan cetakan plastik spesifik?</h2>
              <p>Mulai diskusi bersama tim teknis kami. Gambar teknik dan spesifikasi mesin dapat disesuaikan.</p>
            </div>
            <button class="btn btn-gold" @click="jumpTo('rfq')">
              Minta Penawaran Sekarang <MoveRight :size="18" />
            </button>
          </div>
        </section>
      </main>

      <!-- FOOTER -->
      <footer class="footer">
        <div class="container footer-main">
          <div class="brand footer-brand">
            <span class="brand-mark">i</span>
            <span>
              {{ cms.general.siteName || 'iLUFA MOLDING' }}
              <small>{{ cms.general.siteTagline || 'INDUSTRIAL MOLD PROCUREMENT' }}</small>
            </span>
          </div>
          <p>{{ cms.general.address }}<br />Email: {{ cms.general.email }}<br />Telp: {{ cms.general.phone }}</p>
          <div class="footer-links">
            <a href="#layanan">Layanan</a>
            <a href="#katalog">Katalog Molding</a>
            <a href="#hasil-cetakan">Contoh Hasil Cetak</a>
            <a href="#proses">Cara Pemesanan</a>
            <a href="#faq">FAQ</a>
            <a href="#rfq">Minta Penawaran</a>
            <button class="text-button" style="color: #d9aa52; font-size: 11px;" @click="setViewMode('admin')">
              🔐 CMS & Admin Portal
            </button>
          </div>
          <a class="footer-wa" :href="waLink" target="_blank" rel="noreferrer">
            <MessageCircle /> Hubungi via WhatsApp
          </a>
        </div>
        <div class="container footer-bottom">
          <span>© {{ new Date().getFullYear() }} {{ cms.general.siteName }}. All rights reserved.</span>
          <span>Sistem Pengadaan Molding Injeksi Plastik PO/Indent Terpercaya.</span>
        </div>
      </footer>

      <!-- MOLD DETAIL MODAL -->
      <MoldDetailModal
        v-if="selectedMold"
        :mold="selectedMold"
        :whatsapp="cms.general.whatsappNumber"
        @close="selectedMold = null"
        @request-quote="handleRequestQuoteFromModal"
      />
    </div>
  </div>
</template>
