<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  LayoutDashboard, Layers, Boxes, FileText, HelpCircle, Mail,
  Plus, Edit3, Trash2, Save, RotateCcw, Upload, ExternalLink,
  Lock, LogOut, CheckCircle2, Factory, Wrench, ShieldCheck,
  Search, ArrowUpRight, X, Eye, Phone, MapPin, MessageCircle, Clock3
} from 'lucide-vue-next'

const props = defineProps({
  api: { type: String, required: true },
  initialCms: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'cms-updated'])

// --- Auth State ---
const token = ref(localStorage.getItem('ilufa_admin_token') || '')
const isLoggedIn = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const loginBusy = ref(false)

// --- Active Tab ---
const activeTab = ref('dashboard') // 'dashboard' | 'molds' | 'products' | 'cms' | 'faqs' | 'inquiries'
const cmsSubTab = ref('general') // 'general' | 'hero' | 'services' | 'process' | 'about'

// --- Data States ---
const stats = ref({
  totalMolds: 0, newMolds: 0, customMolds: 0, usedMolds: 0,
  totalInquiries: 0, newInquiries: 0, moldedProducts: 0
})
const molds = ref([])
const products = ref([])
const inquiries = ref([])
const cms = ref(JSON.parse(JSON.stringify(props.initialCms || {})))

// --- Loading & Notification States ---
const loading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => { toast.value.show = false }, 3500)
}

// --- Mold Modal Form State ---
const moldModalOpen = ref(false)
const isEditingMold = ref(false)
const moldForm = ref({
  id: '', code: '', name: '', slug: '', type: 'USED', category: 'Packaging',
  description: '', imageUrl: '', dimensions: '', weightKg: '', cavity: '',
  material: '', machineTonnage: '', condition: 'Bekas — kondisi terawat',
  priceLabel: 'Minta penawaran', status: 'AVAILABLE', featured: false
})
const moldSearch = ref('')
const moldTypeFilter = ref('ALL')
const moldStatusFilter = ref('ALL')

// --- Molded Product Modal Form State ---
const productModalOpen = ref(false)
const isEditingProduct = ref(false)
const productForm = ref({
  id: '', name: '', category: 'Packaging', description: '',
  imageUrl: '', weightEst: '', dimensions: '', moldInfo: '', featured: false
})

// --- Image Upload State ---
const uploadBusy = ref(false)

// --- Auth Functions ---
async function verifyToken() {
  if (!token.value) { isLoggedIn.value = false; return }
  try {
    const res = await fetch(`${props.api}/admin/verify`, {
      headers: { 'Authorization': `Bearer ${token.value}` }
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      isLoggedIn.value = true
      fetchDashboardData()
    } else {
      token.value = ''
      localStorage.removeItem('ilufa_admin_token')
      isLoggedIn.value = false
    }
  } catch {
    // If offline/error, allow session if token exists
    if (token.value) { isLoggedIn.value = true; fetchDashboardData() }
  }
}

async function handleLogin() {
  loginBusy.value = true
  loginError.value = ''
  try {
    const res = await fetch(`${props.api}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Password salah.')
    token.value = data.token
    localStorage.setItem('ilufa_admin_token', data.token)
    isLoggedIn.value = true
    loginPassword.value = ''
    showToast('Selamat datang di Admin Panel iLUFA Molding!')
    fetchDashboardData()
  } catch (err) {
    loginError.value = err.message || 'Gagal login.'
  } finally {
    loginBusy.value = false
  }
}

function handleLogout() {
  token.value = ''
  localStorage.removeItem('ilufa_admin_token')
  isLoggedIn.value = false
  showToast('Anda telah keluar dari sesi admin.', 'info')
}

// --- API Helpers with Auth Header ---
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.value}`
  }
}

// --- Fetch All Data ---
async function fetchDashboardData() {
  loading.value = true
  try {
    await Promise.all([
      fetchStats(),
      fetchMolds(),
      fetchProducts(),
      fetchInquiries(),
      fetchCMS()
    ])
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${props.api}/admin/stats`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      stats.value = data.data || stats.value
    }
  } catch {}
}

async function fetchMolds() {
  try {
    const res = await fetch(`${props.api}/molds`)
    if (res.ok) {
      const data = await res.json()
      molds.value = data.data || []
    }
  } catch {}
}

async function fetchProducts() {
  try {
    const res = await fetch(`${props.api}/molded-products`)
    if (res.ok) {
      const data = await res.json()
      products.value = data.data || []
    }
  } catch {}
}

async function fetchInquiries() {
  try {
    const res = await fetch(`${props.api}/inquiries`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      inquiries.value = data.data || []
    }
  } catch {}
}

async function fetchCMS() {
  try {
    const res = await fetch(`${props.api}/cms`)
    if (res.ok) {
      const data = await res.json()
      if (data.data) {
        cms.value = data.data
        emit('cms-updated', data.data)
      }
    }
  } catch {}
}

// --- Image Uploader ---
async function handleFileUpload(event, targetObject, fieldName = 'imageUrl') {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('File harus berupa gambar (PNG, JPG, WEBP, dll)')
    return
  }

  uploadBusy.value = true
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const res = await fetch(`${props.api}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ dataUrl: reader.result, filename: file.name })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal mengunggah gambar.')
      targetObject[fieldName] = result.url
      showToast('Gambar berhasil diunggah!')
    } catch (err) {
      showToast(err.message || 'Gagal mengunggah gambar.', 'error')
    } finally {
      uploadBusy.value = false
    }
  }
  reader.readAsDataURL(file)
}

// --- Mold Actions ---
const filteredMolds = computed(() => {
  return molds.value.filter(m => {
    const matchType = moldTypeFilter.value === 'ALL' || m.type === moldTypeFilter.value
    const matchStatus = moldStatusFilter.value === 'ALL' || m.status === moldStatusFilter.value
    const q = moldSearch.value.toLowerCase()
    const matchSearch = !q || `${m.name} ${m.code} ${m.category}`.toLowerCase().includes(q)
    return matchType && matchStatus && matchSearch
  })
})

function openAddMoldModal() {
  isEditingMold.value = false
  moldForm.value = {
    id: '', code: `ILF-${Date.now().toString().slice(-4)}`, name: '', slug: '',
    type: 'USED', category: 'Packaging', description: '',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=80',
    dimensions: '', weightKg: '', cavity: '', material: 'P20 / 718',
    machineTonnage: '120 - 250 Ton', condition: 'Bekas — siap pakai',
    priceLabel: 'Minta penawaran', status: 'AVAILABLE', featured: false
  }
  moldModalOpen.value = true
}

function openEditMoldModal(mold) {
  isEditingMold.value = true
  moldForm.value = { ...mold }
  moldModalOpen.value = true
}

async function saveMold() {
  if (!moldForm.value.name || !moldForm.value.category) {
    alert('Nama mold dan kategori wajib diisi.')
    return
  }
  loading.value = true
  try {
    const url = isEditingMold.value ? `${props.api}/molds/${moldForm.value.id}` : `${props.api}/molds`
    const method = isEditingMold.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(moldForm.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data molding.')
    showToast(isEditingMold.value ? 'Molding berhasil diperbarui!' : 'Molding baru berhasil ditambahkan!')
    moldModalOpen.value = false
    await fetchMolds()
    await fetchStats()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

async function deleteMold(mold) {
  if (!confirm(`Hapus molding "${mold.name}" (${mold.code})? Tindakan ini tidak dapat dibatalkan.`)) return
  loading.value = true
  try {
    const res = await fetch(`${props.api}/molds/${mold.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus molding.')
    showToast('Molding berhasil dihapus.')
    await fetchMolds()
    await fetchStats()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

// --- Molded Product Actions ---
function openAddProductModal() {
  isEditingProduct.value = false
  productForm.value = {
    id: '', name: '', category: 'Packaging', description: '',
    imageUrl: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80',
    weightEst: '35 gram', dimensions: '15 x 10 x 5 cm', moldInfo: 'Mold 4-Cavity Hot Runner', featured: true
  }
  productModalOpen.value = true
}

function openEditProductModal(prod) {
  isEditingProduct.value = true
  productForm.value = { ...prod }
  productModalOpen.value = true
}

async function saveProduct() {
  if (!productForm.value.name || !productForm.value.category) {
    alert('Nama produk dan kategori wajib diisi.')
    return
  }
  loading.value = true
  try {
    const url = isEditingProduct.value ? `${props.api}/molded-products/${productForm.value.id}` : `${props.api}/molded-products`
    const method = isEditingProduct.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(productForm.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan contoh produk cetakan.')
    showToast(isEditingProduct.value ? 'Produk hasil cetakan diperbarui!' : 'Produk hasil cetakan ditambahkan!')
    productModalOpen.value = false
    await fetchProducts()
    await fetchStats()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

async function deleteProduct(prod) {
  if (!confirm(`Hapus contoh hasil cetakan "${prod.name}"?`)) return
  loading.value = true
  try {
    const res = await fetch(`${props.api}/molded-products/${prod.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus produk.')
    showToast('Produk hasil cetakan berhasil dihapus.')
    await fetchProducts()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

// --- CMS Actions ---
async function saveCMS() {
  loading.value = true
  try {
    const res = await fetch(`${props.api}/cms`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(cms.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan CMS.')
    showToast('Semua perubahan konten website berhasil disimpan!')
    emit('cms-updated', data.data)
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

async function resetCMS() {
  if (!confirm('Kembalikan semua teks konten website ke pengaturan standar bawaan? Semua perubahan kustom Anda akan direset.')) return
  loading.value = true
  try {
    const res = await fetch(`${props.api}/cms/reset`, {
      method: 'POST',
      headers: authHeaders()
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal mereset CMS.')
    cms.value = data.data
    showToast('Konten website berhasil direset ke standar.')
    emit('cms-updated', data.data)
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

// --- FAQ Actions ---
function addFaqItem() {
  if (!cms.value.faqs) cms.value.faqs = []
  cms.value.faqs.push({
    q: 'Pertanyaan baru tentang molding plastik',
    a: 'Jawaban detail penjelasan teknis atau prosedur di iLUFA Molding.'
  })
}

function removeFaqItem(index) {
  cms.value.faqs.splice(index, 1)
}

// --- Inquiry (RFQ) Actions ---
async function updateInquiryStatus(inquiry, newStatus) {
  try {
    const res = await fetch(`${props.api}/inquiries/${inquiry.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) {
      inquiry.status = newStatus
      showToast(`Status penawaran diperbarui: ${newStatus}`)
      await fetchStats()
    }
  } catch (err) {
    showToast('Gagal memperbarui status.', 'error')
  }
}

async function deleteInquiry(inquiry) {
  if (!confirm(`Hapus data penawaran dari "${inquiry.companyName}"?`)) return
  try {
    const res = await fetch(`${props.api}/inquiries/${inquiry.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (res.ok) {
      showToast('Penawaran berhasil dihapus.')
      await fetchInquiries()
      await fetchStats()
    }
  } catch (err) {
    showToast('Gagal menghapus penawaran.', 'error')
  }
}

function waInquiryLink(inquiry) {
  const cleanPhone = inquiry.phone.replace(/[^0-9]/g, '')
  const formatted = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
  const msg = `Halo ${inquiry.contactName} (${inquiry.companyName}), kami dari tim iLUFA Molding ingin menindaklanjuti permintaan penawaran molding Anda (${inquiry.moldType}).`
  return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`
}

onMounted(() => {
  verifyToken()
})
</script>

<template>
  <div class="admin-wrapper">
    <!-- TOAST NOTIFICATION -->
    <transition name="fade">
      <div v-if="toast.show" class="admin-toast" :class="'toast-' + toast.type">
        <CheckCircle2 v-if="toast.type==='success'" :size="18" />
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <!-- LOGIN SCREEN IF NOT AUTHENTICATED -->
    <div v-if="!isLoggedIn" class="admin-login-screen">
      <div class="login-card">
        <div class="login-brand">
          <span class="brand-mark">i</span>
          <div>
            <b>iLUFA MOLDING</b>
            <small>ADMINISTRATOR & CMS PORTAL</small>
          </div>
        </div>
        <p class="login-desc">Masukkan password administrator untuk mengelola produk molding, katalog hasil cetakan, CMS konten, dan penawaran masuk.</p>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <label>
            <span>Password Admin</span>
            <div class="input-with-icon">
              <Lock :size="16" />
              <input v-model="loginPassword" type="password" required placeholder="Masukkan password (default: admin123)" />
            </div>
          </label>
          <p v-if="loginError" class="login-error">{{ loginError }}</p>
          <div class="login-actions">
            <button type="submit" class="btn btn-gold w-full" :disabled="loginBusy">
              {{ loginBusy ? 'Memverifikasi...' : 'Masuk ke Dashboard Admin' }}
            </button>
            <button type="button" class="btn btn-outline-light w-full" @click="emit('close')">
              ← Kembali ke Website Live
            </button>
          </div>
        </form>
        <div class="login-hint">
          <small>💡 Password bawaan untuk testing adalah: <code>admin123</code></small>
        </div>
      </div>
    </div>

    <!-- MAIN ADMIN DASHBOARD -->
    <div v-else class="admin-layout">
      <!-- SIDEBAR -->
      <aside class="admin-sidebar">
        <div class="sidebar-header">
          <div class="brand">
            <span class="brand-mark">i</span>
            <div>
              <b>iLUFA CMS</b>
              <small>PORTAL PENGADAAN MOLD</small>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <button :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <LayoutDashboard :size="18" />
            <span>Dashboard & Metrik</span>
          </button>
          <button :class="{ active: activeTab === 'molds' }" @click="activeTab = 'molds'">
            <Boxes :size="18" />
            <span>Katalog Molding</span>
            <span class="badge">{{ molds.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">
            <Layers :size="18" />
            <span>Hasil Cetakan Plastik</span>
            <span class="badge">{{ products.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'cms' }" @click="activeTab = 'cms'">
            <FileText :size="18" />
            <span>CMS Konten Website</span>
          </button>
          <button :class="{ active: activeTab === 'faqs' }" @click="activeTab = 'faqs'">
            <HelpCircle :size="18" />
            <span>CMS Tanya Jawab (FAQ)</span>
          </button>
          <button :class="{ active: activeTab === 'inquiries' }" @click="activeTab = 'inquiries'">
            <Mail :size="18" />
            <span>Permintaan Penawaran (RFQ)</span>
            <span v-if="stats.newInquiries > 0" class="badge badge-gold">{{ stats.newInquiries }} BARU</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="admin-user-pill">
            <span class="status-dot"></span>
            <div>
              <b>Admin Aktif</b>
              <small>Administrator</small>
            </div>
          </div>
          <div class="sidebar-buttons">
            <button class="btn btn-outline-light btn-sm" @click="emit('close')">
              <Eye :size="14" /> Lihat Web Live
            </button>
            <button class="btn btn-danger-soft btn-sm" @click="handleLogout">
              <LogOut :size="14" /> Keluar
            </button>
          </div>
        </div>
      </aside>

      <!-- CONTENT AREA -->
      <main class="admin-main">
        <!-- TOPBAR -->
        <header class="admin-topbar">
          <div class="topbar-title">
            <h1 v-if="activeTab === 'dashboard'">Dashboard & Ringkasan</h1>
            <h1 v-else-if="activeTab === 'molds'">Manajemen Katalog Molding</h1>
            <h1 v-else-if="activeTab === 'products'">Katalog Contoh Hasil Cetakan Plastik</h1>
            <h1 v-else-if="activeTab === 'cms'">CMS Kustomisasi Konten Website</h1>
            <h1 v-else-if="activeTab === 'faqs'">Manajemen FAQ (Tanya Jawab)</h1>
            <h1 v-else-if="activeTab === 'inquiries'">Inbox Permintaan Penawaran (RFQ)</h1>
          </div>
          <div class="topbar-actions">
            <button class="btn btn-outline-dark btn-sm" @click="emit('close')">
              <ExternalLink :size="14" /> Buka Halaman Pengunjung
            </button>
          </div>
        </header>

        <!-- TAB 1: DASHBOARD OVERVIEW -->
        <div v-if="activeTab === 'dashboard'" class="tab-pane">
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon gold"><Boxes /></div>
              <div>
                <small>TOTAL MOLDING AKTIF</small>
                <h3>{{ molds.length }}</h3>
                <span>{{ stats.newMolds }} Baru · {{ stats.customMolds }} Custom · {{ stats.usedMolds }} Second</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon blue"><Layers /></div>
              <div>
                <small>SAMPEL HASIL CETAKAN</small>
                <h3>{{ products.length }}</h3>
                <span>Peralatan, packaging, otomotif</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon green"><Mail /></div>
              <div>
                <small>PERMINTAAN PENAWARAN (RFQ)</small>
                <h3>{{ inquiries.length }}</h3>
                <span class="text-gold font-bold">{{ stats.newInquiries }} belum diproses</span>
              </div>
            </div>
          </div>

          <div class="dashboard-split">
            <!-- QUICK SHORTCUTS -->
            <div class="panel">
              <div class="panel-header">
                <h3>Aksi Cepat Admin</h3>
              </div>
              <div class="quick-actions-grid">
                <button class="quick-card" @click="openAddMoldModal">
                  <Plus :size="24" />
                  <b>Tambah Molding Baru</b>
                  <small>Daftarkan mold baru, custom, atau second</small>
                </button>
                <button class="quick-card" @click="openAddProductModal">
                  <Layers :size="24" />
                  <b>Tambah Contoh Hasil Cetak</b>
                  <small>Showcase produk plastik untuk meyakinkan pembeli</small>
                </button>
                <button class="quick-card" @click="activeTab = 'cms'; cmsSubTab = 'hero'">
                  <FileText :size="24" />
                  <b>Kustomisasi Teks Hero</b>
                  <small>Ubah judul, slogan, dan foto beranda</small>
                </button>
                <button class="quick-card" @click="activeTab = 'cms'; cmsSubTab = 'general'">
                  <Phone :size="24" />
                  <b>Atur Kontak & WhatsApp</b>
                  <small>Perbarui nomor WA dan alamat kantor</small>
                </button>
              </div>
            </div>

            <!-- LATEST RFQ INQUIRIES -->
            <div class="panel">
              <div class="panel-header">
                <h3>Penawaran Terbaru Masuk</h3>
                <button class="text-button" @click="activeTab = 'inquiries'">Lihat Semua →</button>
              </div>
              <div v-if="inquiries.length === 0" class="empty-box">
                Belum ada permintaan penawaran dari formulir website.
              </div>
              <div v-else class="recent-inquiries-list">
                <div v-for="inq in inquiries.slice(0, 4)" :key="inq.id" class="recent-inquiry-item">
                  <div class="inq-info">
                    <b>{{ inq.companyName }}</b>
                    <small>PIC: {{ inq.contactName }} · {{ inq.moldType }}</small>
                    <p>{{ inq.productNeed }}</p>
                  </div>
                  <div class="inq-actions">
                    <span class="status-pill" :class="'status-' + inq.status.toLowerCase()">{{ inq.status }}</span>
                    <a :href="waInquiryLink(inq)" target="_blank" class="btn btn-wa-sm">
                      <MessageCircle :size="13" /> WA
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: MOLDS MANAGEMENT -->
        <div v-if="activeTab === 'molds'" class="tab-pane">
          <div class="toolbar">
            <div class="toolbar-left">
              <div class="search-input">
                <Search :size="16" />
                <input v-model="moldSearch" placeholder="Cari nama, kode mold, atau kategori..." />
              </div>
              <select v-model="moldTypeFilter" class="select-filter">
                <option value="ALL">Semua Tipe Mold</option>
                <option value="NEW">Molding Import Baru</option>
                <option value="CUSTOM">Molding Custom</option>
                <option value="USED">Molding Second / Bekas</option>
              </select>
              <select v-model="moldStatusFilter" class="select-filter">
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="ON_ORDER">PO / Indent</option>
                <option value="NEGOTIATION">Negosiasi</option>
                <option value="SOLD">Terjual</option>
              </select>
            </div>
            <button class="btn btn-gold" @click="openAddMoldModal">
              <Plus :size="16" /> Tambah Molding Baru
            </button>
          </div>

          <!-- MOLDS TABLE -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="80">Foto</th>
                  <th>Kode & Nama Mold</th>
                  <th>Tipe</th>
                  <th>Kategori</th>
                  <th>Spesifikasi</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th width="120">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredMolds.length === 0">
                  <td colspan="8" class="text-center py-8 text-muted">
                    Tidak ada listing molding yang sesuai filter.
                  </td>
                </tr>
                <tr v-for="mold in filteredMolds" :key="mold.id">
                  <td>
                    <img :src="mold.imageUrl || 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=200&q=80'" class="thumb-img" />
                  </td>
                  <td>
                    <b class="font-bold text-navy">{{ mold.name }}</b>
                    <div class="sub-text">Kode: <code>{{ mold.code }}</code></div>
                    <small v-if="mold.featured" class="badge-featured">⭐ Unggulan Beranda</small>
                  </td>
                  <td>
                    <span class="pill-type" :class="'type-' + mold.type.toLowerCase()">{{ mold.type }}</span>
                  </td>
                  <td>{{ mold.category }}</td>
                  <td>
                    <small class="block">Cavity: <b>{{ mold.cavity || '-' }}</b></small>
                    <small class="block">Dimensi: {{ mold.dimensions || '-' }}</small>
                    <small class="block">Mesin: {{ mold.machineTonnage || '-' }}</small>
                  </td>
                  <td>
                    <b>{{ mold.priceLabel || 'Minta penawaran' }}</b>
                  </td>
                  <td>
                    <span class="status-pill" :class="'status-' + mold.status.toLowerCase()">{{ mold.status }}</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon" title="Edit" @click="openEditMoldModal(mold)">
                        <Edit3 :size="15" />
                      </button>
                      <button class="btn-icon danger" title="Hapus" @click="deleteMold(mold)">
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 3: MOLDED PLASTIC PRODUCTS -->
        <div v-if="activeTab === 'products'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2>Katalog Contoh Hasil Cetakan Plastik</h2>
              <p class="section-sub">Tampilkan contoh produk plastik jadi (Gantungan, Tutup Botol, Wadah Makanan, Part Otomotif) agar pembeli yakin terhadap kapabilitas molding.</p>
            </div>
            <button class="btn btn-gold" @click="openAddProductModal">
              <Plus :size="16" /> Tambah Contoh Produk
            </button>
          </div>

          <div class="products-grid">
            <div v-for="prod in products" :key="prod.id" class="product-admin-card">
              <img :src="prod.imageUrl || 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=600&q=80'" />
              <div class="card-content">
                <span class="badge-cat">{{ prod.category }}</span>
                <h4>{{ prod.name }}</h4>
                <p>{{ prod.description }}</p>
                <div class="prod-specs">
                  <span v-if="prod.weightEst">Berat: <b>{{ prod.weightEst }}</b></span>
                  <span v-if="prod.dimensions">Dimensi: <b>{{ prod.dimensions }}</b></span>
                  <span v-if="prod.moldInfo">Mold: <b>{{ prod.moldInfo }}</b></span>
                </div>
                <div class="card-actions">
                  <button class="btn btn-outline-dark btn-sm" @click="openEditProductModal(prod)">
                    <Edit3 :size="13" /> Edit
                  </button>
                  <button class="btn btn-danger-soft btn-sm" @click="deleteProduct(prod)">
                    <Trash2 :size="13" /> Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: CMS WEBSITE CONTENT -->
        <div v-if="activeTab === 'cms'" class="tab-pane">
          <!-- CMS SUB-NAVIGATION -->
          <div class="cms-subtabs">
            <button :class="{ active: cmsSubTab === 'general' }" @click="cmsSubTab = 'general'">
              1. Kontak & Perusahaan
            </button>
            <button :class="{ active: cmsSubTab === 'hero' }" @click="cmsSubTab = 'hero'">
              2. Banner Utama (Hero)
            </button>
            <button :class="{ active: cmsSubTab === 'services' }" @click="cmsSubTab = 'services'">
              3. Layanan (3 Pilar)
            </button>
            <button :class="{ active: cmsSubTab === 'process' }" @click="cmsSubTab = 'process'">
              4. Cara Pemesanan (PO/Indent)
            </button>
            <button :class="{ active: cmsSubTab === 'about' }" @click="cmsSubTab = 'about'">
              5. Profil Tentang Kami
            </button>
          </div>

          <!-- CMS FORM CONTAINER -->
          <div class="cms-form-card" v-if="cms && cms.general">
            <!-- SUBTAB: GENERAL & CONTACT -->
            <div v-if="cmsSubTab === 'general'" class="form-section">
              <h3 class="form-title">Informasi Usaha & Kontak Resmi</h3>
              <p class="form-help">Informasi ini akan otomatis diperbarui di header, footer, topbar pengumuman, dan tombol konsultasi WhatsApp di seluruh website.</p>

              <div class="grid-2">
                <label>
                  <span>Nama Usaha / Website</span>
                  <input v-model="cms.general.siteName" placeholder="Contoh: iLUFA MOLDING" />
                </label>
                <label>
                  <span>Tagline Resmi</span>
                  <input v-model="cms.general.siteTagline" placeholder="Contoh: Industrial Mold Procurement" />
                </label>
                <label>
                  <span>Nomor WhatsApp (Aktif) *</span>
                  <input v-model="cms.general.whatsappNumber" placeholder="Contoh: 628132207311 (awali kode negara 62)" />
                  <small>Gunakan format tanpa tanda plus atau spasi, contoh: 628132207311</small>
                </label>
                <label>
                  <span>Nomor Telepon Kantor</span>
                  <input v-model="cms.general.phone" placeholder="+62 813-2207-311" />
                </label>
                <label>
                  <span>Email Resmi</span>
                  <input v-model="cms.general.email" placeholder="info@ilufamolding.com" />
                </label>
                <label>
                  <span>Jam Operasional</span>
                  <input v-model="cms.general.operationalHours" placeholder="Senin - Sabtu: 08.00 - 17.00 WIB" />
                </label>
                <label class="col-span-2">
                  <span>Alamat Pabrik / Kantor</span>
                  <textarea v-model="cms.general.address" rows="2" placeholder="Alamat lengkap bengkel / kantor operasional"></textarea>
                </label>
                <label class="col-span-2">
                  <span>Teks Pengumuman Topbar (Paling Atas Website)</span>
                  <input v-model="cms.general.topbarNotice" placeholder="Contoh: Solusi pengadaan molding untuk kebutuhan industri..." />
                </label>
                <label class="col-span-2">
                  <span>Pesan Pembuka WhatsApp Otomatis</span>
                  <input v-model="cms.general.whatsappMessage" placeholder="Pesan template saat pengunjung menekan tombol WhatsApp" />
                </label>
              </div>
            </div>

            <!-- SUBTAB: HERO SECTION -->
            <div v-if="cmsSubTab === 'hero'" class="form-section">
              <h3 class="form-title">Banner Utama Halaman Depan (Hero Section)</h3>
              <p class="form-help">Pengunjung pertama kali akan melihat teks dan gambar ini. Buat pesan yang tegas dan menarik bagi pabrik plastik.</p>

              <div class="grid-2">
                <label class="col-span-2">
                  <span>Label Atas (Eyebrow Tag)</span>
                  <input v-model="cms.hero.eyebrow" placeholder="SOLUSI PENGADAAN MOLDING PLASTIK" />
                </label>
                <label class="col-span-2">
                  <span>Judul Utama (Headline Besar)</span>
                  <textarea v-model="cms.hero.title" rows="2" placeholder="Molding yang tepat.&#10;Produksi lebih siap."></textarea>
                  <small>Gunakan Enter untuk baris baru.</small>
                </label>
                <label class="col-span-2">
                  <span>Subjudul / Deskripsi Singkat</span>
                  <textarea v-model="cms.hero.subtitle" rows="3" placeholder="Pemesanan molding injeksi plastik baru, custom, dan second..."></textarea>
                </label>
                <label>
                  <span>Teks Tombol Utama</span>
                  <input v-model="cms.hero.primaryCtaText" placeholder="Konsultasi & Minta Penawaran" />
                </label>
                <label>
                  <span>Teks Tombol Kedua</span>
                  <input v-model="cms.hero.secondaryCtaText" placeholder="Jelajahi Katalog" />
                </label>
                <label class="col-span-2">
                  <span>URL Gambar Banner Hero</span>
                  <div class="input-with-upload">
                    <input v-model="cms.hero.imageUrl" placeholder="https://..." />
                    <label class="btn-upload">
                      <Upload :size="14" /> Unggah Foto
                      <input type="file" accept="image/*" @change="e => handleFileUpload(e, cms.hero, 'imageUrl')" />
                    </label>
                  </div>
                  <div v-if="cms.hero.imageUrl" class="preview-img-box">
                    <img :src="cms.hero.imageUrl" />
                  </div>
                </label>
                <div class="col-span-2">
                  <span>3 Poin Keunggulan Utama (Checklist di Hero)</span>
                  <div class="grid-3 mt-2">
                    <input v-model="cms.hero.badges[0]" placeholder="Keunggulan 1" />
                    <input v-model="cms.hero.badges[1]" placeholder="Keunggulan 2" />
                    <input v-model="cms.hero.badges[2]" placeholder="Keunggulan 3" />
                  </div>
                </div>
              </div>
            </div>

            <!-- SUBTAB: SERVICES (3 PILAR) -->
            <div v-if="cmsSubTab === 'services'" class="form-section">
              <h3 class="form-title">3 Pilar Layanan iLUFA Molding</h3>
              <p class="form-help">Sesuaikan judul, deskripsi, dan teks tombol untuk 3 layanan: Import Baru, Custom, dan Second.</p>

              <div class="services-edit-list">
                <div v-for="(srv, idx) in cms.services" :key="idx" class="service-edit-box">
                  <div class="service-edit-header">
                    <b>Layanan {{ idx + 1 }}: {{ srv.title }}</b>
                    <span class="badge">{{ srv.num }}</span>
                  </div>
                  <div class="grid-2 mt-2">
                    <label>
                      <span>Judul Layanan</span>
                      <input v-model="srv.title" />
                    </label>
                    <label>
                      <span>Teks Tombol Aksi</span>
                      <input v-model="srv.ctaText" />
                    </label>
                    <label class="col-span-2">
                      <span>Penjelasan Layanan</span>
                      <textarea v-model="srv.desc" rows="3"></textarea>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUBTAB: PROCESS (4 LANGKAH PO) -->
            <div v-if="cmsSubTab === 'process'" class="form-section">
              <h3 class="form-title">Alur & Cara Pemesanan (Sistem PO / Indent)</h3>
              <p class="form-help">Beri pemahaman yang jelas kepada pabrik/pembeli mengenai 4 tahapan transaksi dari spesifikasi hingga pengiriman.</p>

              <div class="process-edit-list">
                <div v-for="(st, idx) in cms.process" :key="idx" class="process-edit-box">
                  <span class="step-num">{{ st.step }}</span>
                  <div class="step-inputs">
                    <label>
                      <span>Judul Langkah {{ st.step }}</span>
                      <input v-model="st.title" />
                    </label>
                    <label class="mt-2">
                      <span>Keterangan Alur</span>
                      <textarea v-model="st.desc" rows="2"></textarea>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- SUBTAB: ABOUT -->
            <div v-if="cmsSubTab === 'about'" class="form-section">
              <h3 class="form-title">Profil Tentang Kami (About Us)</h3>
              <p class="form-help">Bangun kredibilitas perusahaan dengan latar belakang, komitmen transparansi, dan dokumentasi foto.</p>

              <div class="grid-2">
                <label class="col-span-2">
                  <span>Judul Seksi Tentang Kami</span>
                  <textarea v-model="cms.about.title" rows="2"></textarea>
                </label>
                <label class="col-span-2">
                  <span>Paragraf Penjelasan 1</span>
                  <textarea v-model="cms.about.p1" rows="3"></textarea>
                </label>
                <label class="col-span-2">
                  <span>Paragraf Penjelasan 2</span>
                  <textarea v-model="cms.about.p2" rows="3"></textarea>
                </label>
                <label class="col-span-2">
                  <span>URL Gambar Profil / Fasilitas</span>
                  <div class="input-with-upload">
                    <input v-model="cms.about.imageUrl" />
                    <label class="btn-upload">
                      <Upload :size="14" /> Unggah Foto
                      <input type="file" accept="image/*" @change="e => handleFileUpload(e, cms.about, 'imageUrl')" />
                    </label>
                  </div>
                  <div v-if="cms.about.imageUrl" class="preview-img-box">
                    <img :src="cms.about.imageUrl" />
                  </div>
                </label>
              </div>
            </div>

            <!-- CMS ACTION BAR -->
            <div class="cms-save-bar">
              <button class="btn btn-outline-danger" @click="resetCMS">
                <RotateCcw :size="15" /> Reset ke Default
              </button>
              <button class="btn btn-gold" @click="saveCMS" :disabled="loading">
                <Save :size="16" /> {{ loading ? 'Menyimpan...' : 'Simpan Semua Perubahan CMS' }}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 5: CMS FAQS -->
        <div v-if="activeTab === 'faqs'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2>Kelola Tanya Jawab (FAQ)</h2>
              <p class="section-sub">Daftar pertanyaan umum yang ditampilkan di halaman beranda untuk meyakinkan calon pelanggan sebelum menghubungi tim.</p>
            </div>
            <button class="btn btn-gold" @click="addFaqItem">
              <Plus :size="16" /> Tambah FAQ Baru
            </button>
          </div>

          <div class="faq-admin-list">
            <div v-for="(faq, idx) in cms.faqs" :key="idx" class="faq-admin-item">
              <div class="faq-item-header">
                <b>Pertanyaan {{ idx + 1 }}</b>
                <button class="btn-icon danger" @click="removeFaqItem(idx)" title="Hapus Pertanyaan">
                  <Trash2 :size="15" />
                </button>
              </div>
              <label>
                <span>Pertanyaan</span>
                <input v-model="faq.q" placeholder="Pertanyaan..." />
              </label>
              <label class="mt-2">
                <span>Jawaban</span>
                <textarea v-model="faq.a" rows="3" placeholder="Jawaban lengkap..."></textarea>
              </label>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button class="btn btn-gold" @click="saveCMS">
              <Save :size="16" /> Simpan Perubahan FAQ
            </button>
          </div>
        </div>

        <!-- TAB 6: INQUIRIES (RFQ LEADS) -->
        <div v-if="activeTab === 'inquiries'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2>Permintaan Penawaran Masuk (RFQ)</h2>
              <p class="section-sub">Daftar calon pelanggan pabrik yang telah mengirim form kebutuhan molding.</p>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Perusahaan & Kontak</th>
                  <th>Jenis Kebutuhan</th>
                  <th>Detail Produk / Cetakan</th>
                  <th>Spesifikasi Mesin / Cavity</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="inquiries.length === 0">
                  <td colspan="7" class="text-center py-8 text-muted">
                    Belum ada penawaran masuk dari form RFQ.
                  </td>
                </tr>
                <tr v-for="inq in inquiries" :key="inq.id">
                  <td>
                    <small>{{ new Date(inq.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</small>
                  </td>
                  <td>
                    <b class="text-navy">{{ inq.companyName }}</b>
                    <div>PIC: {{ inq.contactName }}</div>
                    <small class="text-muted block">Telp: {{ inq.phone }}</small>
                    <small v-if="inq.email" class="text-muted block">Email: {{ inq.email }}</small>
                  </td>
                  <td>
                    <span class="pill-type" :class="'type-' + inq.moldType.toLowerCase()">{{ inq.moldType }}</span>
                    <div v-if="inq.targetDate" class="text-xs text-muted mt-1">Target: {{ inq.targetDate }}</div>
                  </td>
                  <td>
                    <div class="text-sm font-medium">{{ inq.productNeed }}</div>
                    <small v-if="inq.notes" class="text-muted italic block mt-1">Catatan: {{ inq.notes }}</small>
                  </td>
                  <td>
                    <div class="text-xs">Cavity: {{ inq.cavity || '-' }}</div>
                    <div class="text-xs">Dimensi: {{ inq.dimensions || '-' }}</div>
                    <div class="text-xs">Mesin: {{ inq.machineInfo || '-' }}</div>
                    <div class="text-xs text-gold font-bold" v-if="inq.budget">Budget: {{ inq.budget }}</div>
                  </td>
                  <td>
                    <select :value="inq.status" @change="e => updateInquiryStatus(inq, e.target.value)" class="status-select">
                      <option value="NEW">BARU</option>
                      <option value="CONTACTED">DIHUBUNGI</option>
                      <option value="QUOTED">PENAWARAN DIBERIKAN</option>
                      <option value="DEAL">DEAL / PO</option>
                      <option value="REJECTED">BATAL / REJECT</option>
                    </select>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <a :href="waInquiryLink(inq)" target="_blank" class="btn btn-wa-sm" title="Hubungi via WhatsApp">
                        <MessageCircle :size="14" /> Chat PIC
                      </a>
                      <button class="btn-icon danger" @click="deleteInquiry(inq)" title="Hapus">
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL FORM: TAMBAH / EDIT MOLDING -->
    <div v-if="moldModalOpen" class="modal-backdrop" @click.self="moldModalOpen = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditingMold ? 'Edit Data Molding' : 'Tambah Molding Baru' }}</h3>
          <button class="close-btn" @click="moldModalOpen = false"><X :size="18" /></button>
        </div>
        <form @submit.prevent="saveMold" class="modal-body">
          <div class="grid-2">
            <label>
              <span>Nama Molding *</span>
              <input v-model="moldForm.name" required placeholder="Contoh: Mold Tutup Botol 28mm" />
            </label>
            <label>
              <span>Kode Cetakan</span>
              <input v-model="moldForm.code" placeholder="Contoh: ILF-USD-005" />
            </label>
            <label>
              <span>Tipe Kategori Pengadaan *</span>
              <select v-model="moldForm.type" required>
                <option value="NEW">Molding Import Baru</option>
                <option value="CUSTOM">Molding Custom Sesuai Desain</option>
                <option value="USED">Molding Second / Bekas</option>
              </select>
            </label>
            <label>
              <span>Kategori Produk *</span>
              <input v-model="moldForm.category" required placeholder="Packaging, Household, Otomotif, dll" />
            </label>
            <label class="col-span-2">
              <span>Deskripsi Lengkap</span>
              <textarea v-model="moldForm.description" rows="3" placeholder="Jelaskan kondisi mold, fitur pendingin, hot/cold runner, dan kompatibilitas"></textarea>
            </label>
            <label class="col-span-2">
              <span>Foto Molding</span>
              <div class="input-with-upload">
                <input v-model="moldForm.imageUrl" placeholder="URL Gambar atau klik Unggah..." />
                <label class="btn-upload">
                  <Upload :size="14" /> Unggah Foto
                  <input type="file" accept="image/*" @change="e => handleFileUpload(e, moldForm, 'imageUrl')" />
                </label>
              </div>
              <div v-if="moldForm.imageUrl" class="thumb-preview">
                <img :src="moldForm.imageUrl" />
              </div>
            </label>
            <label>
              <span>Jumlah Cavity</span>
              <input v-model="moldForm.cavity" type="number" placeholder="Contoh: 4, 8, 16" />
            </label>
            <label>
              <span>Dimensi Mold Base</span>
              <input v-model="moldForm.dimensions" placeholder="Contoh: 450 x 380 x 420 mm" />
            </label>
            <label>
              <span>Estimasi Berat (Kg)</span>
              <input v-model="moldForm.weightKg" type="number" step="0.1" placeholder="Contoh: 450" />
            </label>
            <label>
              <span>Material / Baja Mold</span>
              <input v-model="moldForm.material" placeholder="Contoh: P20, 718H, S136, NAK80" />
            </label>
            <label>
              <span>Rekomendasi Tonase Mesin</span>
              <input v-model="moldForm.machineTonnage" placeholder="Contoh: 180 - 250 Ton" />
            </label>
            <label>
              <span>Kondisi & Kelengkapan</span>
              <input v-model="moldForm.condition" placeholder="Contoh: Baru / Siap pakai uji coba" />
            </label>
            <label>
              <span>Label Harga</span>
              <input v-model="moldForm.priceLabel" placeholder="Minta penawaran atau Rp XX.XXX.XXX" />
            </label>
            <label>
              <span>Status Ketersediaan</span>
              <select v-model="moldForm.status">
                <option value="AVAILABLE">Tersedia (Ready)</option>
                <option value="ON_ORDER">PO / Indent</option>
                <option value="NEGOTIATION">Sedang Negosiasi</option>
                <option value="SOLD">Terjual</option>
              </select>
            </label>
            <label class="checkbox-label col-span-2">
              <input type="checkbox" v-model="moldForm.featured" />
              <span>⭐ Tampilkan sebagai produk unggulan di halaman utama</span>
            </label>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-dark" @click="moldModalOpen = false">Batal</button>
            <button type="submit" class="btn btn-gold" :disabled="loading">
              <Save :size="15" /> {{ isEditingMold ? 'Simpan Perubahan' : 'Tambahkan Molding' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL FORM: TAMBAH / EDIT PRODUK CETAKAN -->
    <div v-if="productModalOpen" class="modal-backdrop" @click.self="productModalOpen = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditingProduct ? 'Edit Contoh Produk Hasil Cetakan' : 'Tambah Contoh Hasil Cetakan' }}</h3>
          <button class="close-btn" @click="productModalOpen = false"><X :size="18" /></button>
        </div>
        <form @submit.prevent="saveProduct" class="modal-body">
          <div class="grid-2">
            <label>
              <span>Nama Produk Plastik *</span>
              <input v-model="productForm.name" required placeholder="Contoh: Gantungan Baju Anti Slip" />
            </label>
            <label>
              <span>Kategori Produk *</span>
              <input v-model="productForm.category" required placeholder="Packaging, Houseware, Industri" />
            </label>
            <label class="col-span-2">
              <span>Deskripsi Singkat</span>
              <textarea v-model="productForm.description" rows="2" placeholder="Uraian produk dan material plastik (PP, HDPE, ABS, dsb)"></textarea>
            </label>
            <label class="col-span-2">
              <span>Foto Produk Plastik Jadi</span>
              <div class="input-with-upload">
                <input v-model="productForm.imageUrl" placeholder="URL Foto atau unggah..." />
                <label class="btn-upload">
                  <Upload :size="14" /> Unggah Foto
                  <input type="file" accept="image/*" @change="e => handleFileUpload(e, productForm, 'imageUrl')" />
                </label>
              </div>
              <div v-if="productForm.imageUrl" class="thumb-preview">
                <img :src="productForm.imageUrl" />
              </div>
            </label>
            <label>
              <span>Perkiraan Berat Produk</span>
              <input v-model="productForm.weightEst" placeholder="Contoh: 42 gram" />
            </label>
            <label>
              <span>Ukuran / Dimensi Produk</span>
              <input v-model="productForm.dimensions" placeholder="Contoh: 42 x 20 x 0.8 cm" />
            </label>
            <label class="col-span-2">
              <span>Informasi Mold Terkait</span>
              <input v-model="productForm.moldInfo" placeholder="Contoh: Mold 4-Cavity Hot Runner System" />
            </label>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-dark" @click="productModalOpen = false">Batal</button>
            <button type="submit" class="btn btn-gold" :disabled="loading">
              <Save :size="15" /> Simpan Data Produk
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-wrapper {
  min-height: 100vh;
  background: #f0f3f6;
  color: #14283b;
  font-family: 'DM Sans', sans-serif;
}

/* LOGIN SCREEN */
.admin-login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top right, #193853, #0b1f33);
}
.login-card {
  background: white;
  width: 100%;
  max-width: 440px;
  padding: 38px 34px;
  border-radius: 4px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: #0b1f33;
  color: #d9aa52;
  font-family: 'Manrope', sans-serif;
  font-size: 26px;
  font-weight: 800;
  font-style: italic;
  border-radius: 3px;
}
.login-brand b {
  display: block;
  font-size: 19px;
  color: #0b1f33;
  font-family: 'Manrope', sans-serif;
}
.login-brand small {
  display: block;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #687989;
  font-weight: 700;
}
.login-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #55697a;
  margin-bottom: 24px;
}
.input-with-icon {
  display: flex;
  align-items: center;
  background: #f6f8fa;
  border: 1px solid #dbe2e8;
  padding: 0 12px;
  gap: 10px;
  margin-top: 6px;
}
.input-with-icon svg {
  color: #8394a2;
}
.input-with-icon input {
  border: 0;
  background: transparent;
  padding: 12px 0;
  width: 100%;
  outline: 0;
  font-size: 13px;
}
.login-error {
  color: #c93b2b;
  font-size: 12px;
  margin-top: 10px;
}
.login-actions {
  display: grid;
  gap: 10px;
  margin-top: 22px;
}
.login-hint {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed #dce2e8;
  text-align: center;
  color: #6d7e8e;
}
.login-hint code {
  background: #f0f4f8;
  padding: 2px 6px;
  font-weight: bold;
  color: #0b1f33;
}

/* LAYOUT */
.admin-layout {
  display: flex;
  min-height: 100vh;
}
.admin-sidebar {
  width: 270px;
  background: #0b1f33;
  color: #dce5ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #1c364e;
}
.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #16324a;
}
.sidebar-header .brand {
  display: flex;
  align-items: center;
  gap: 11px;
}
.sidebar-header b {
  font-size: 16px;
  color: white;
}
.sidebar-header small {
  font-size: 8px;
  letter-spacing: 1.4px;
  color: #d9aa52;
  display: block;
}
.sidebar-nav {
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: #a6b7c5;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  width: 100%;
}
.sidebar-nav button:hover {
  background: #15324b;
  color: white;
}
.sidebar-nav button.active {
  background: #d9aa52;
  color: #0b1f33;
  font-weight: 700;
}
.sidebar-nav .badge {
  margin-left: auto;
  background: #1c3d5a;
  color: #d1dde6;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
}
.sidebar-nav button.active .badge {
  background: #0b1f33;
  color: #d9aa52;
}
.badge-gold {
  background: #d9aa52 !important;
  color: #0b1f33 !important;
  font-weight: 800;
}
.sidebar-footer {
  padding: 18px 16px;
  border-top: 1px solid #16324a;
  background: #081726;
}
.admin-user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ecc71;
  box-shadow: 0 0 8px #2ecc71;
}
.admin-user-pill b {
  font-size: 12px;
  color: white;
  display: block;
}
.admin-user-pill small {
  font-size: 10px;
  color: #8b9baa;
  display: block;
}
.sidebar-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* MAIN CONTENT */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}
.admin-topbar {
  background: white;
  height: 70px;
  border-bottom: 1px solid #e1e6eb;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.topbar-title h1 {
  font-size: 20px;
  font-family: 'Manrope', sans-serif;
  margin: 0;
  color: #0b1f33;
}
.tab-pane {
  padding: 32px;
  flex: 1;
}

/* METRICS */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}
.metric-card {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 22px 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-radius: 3px;
}
.metric-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 4px;
}
.metric-icon.gold { background: #fbf2e2; color: #b78732; }
.metric-icon.blue { background: #e6eef6; color: #1e4a73; }
.metric-icon.green { background: #e8f5ec; color: #2e7d4a; }
.metric-card small {
  font-size: 10px;
  font-weight: 700;
  color: #7b8b98;
  letter-spacing: 1px;
}
.metric-card h3 {
  font-family: 'Manrope', sans-serif;
  font-size: 28px;
  margin: 3px 0 2px;
  color: #0b1f33;
}
.metric-card span {
  font-size: 11px;
  color: #5c6e7e;
}

/* SPLIT PANELS */
.dashboard-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.panel {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 24px;
  border-radius: 3px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #edf1f4;
  padding-bottom: 12px;
}
.panel-header h3 {
  font-size: 16px;
  font-family: 'Manrope', sans-serif;
  margin: 0;
  color: #0b1f33;
}
.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.quick-card {
  background: #f7fafc;
  border: 1px solid #e1e7eb;
  padding: 18px;
  text-align: left;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.quick-card:hover {
  background: white;
  border-color: #d9aa52;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.quick-card svg {
  color: #0b1f33;
}
.quick-card b {
  font-size: 13px;
  color: #0b1f33;
}
.quick-card small {
  font-size: 11px;
  color: #778897;
  line-height: 1.4;
}

/* INQUIRIES LIST */
.recent-inquiry-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid #f0f3f6;
}
.recent-inquiry-item:last-child {
  border-bottom: 0;
}
.inq-info b {
  font-size: 13px;
  color: #0b1f33;
  display: block;
}
.inq-info small {
  font-size: 11px;
  color: #7b8c9a;
  display: block;
}
.inq-info p {
  font-size: 11px;
  color: #435565;
  margin: 4px 0 0;
  max-width: 320px;
  line-height: 1.4;
}
.inq-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* TOOLBAR & SEARCH */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.search-input {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #dce2e8;
  padding: 0 12px;
  height: 40px;
  width: 320px;
  border-radius: 2px;
}
.search-input input {
  border: 0;
  outline: 0;
  font-size: 12px;
  width: 100%;
}
.select-filter {
  background: white;
  border: 1px solid #dce2e8;
  padding: 0 10px;
  height: 40px;
  font-size: 12px;
  border-radius: 2px;
  color: #3b4e60;
  outline: 0;
}

/* DATA TABLE */
.table-container {
  background: white;
  border: 1px solid #e1e7ec;
  border-radius: 3px;
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th {
  background: #f7f9fa;
  padding: 13px 16px;
  text-align: left;
  font-weight: 700;
  color: #556879;
  border-bottom: 1px solid #e2e8ed;
}
.data-table td {
  padding: 13px 16px;
  border-bottom: 1px solid #edf1f4;
  vertical-align: middle;
}
.thumb-img {
  width: 58px;
  height: 42px;
  object-fit: cover;
  border-radius: 2px;
  background: #eaeff2;
}
.pill-type {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 7px;
  border-radius: 2px;
}
.type-new { background: #e8f4fc; color: #165688; }
.type-custom { background: #fdf3e2; color: #94651a; }
.type-used { background: #ebf5ee; color: #2d6e42; }

.status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 7px;
  border-radius: 2px;
}
.status-available { background: #e8f5ec; color: #236c3c; }
.status-on_order { background: #fff3db; color: #875c12; }
.status-negotiation { background: #ebf0f8; color: #2c4b75; }
.status-sold { background: #eaeaea; color: #666; }
.status-new { background: #fbeee6; color: #b1481d; }

.badge-featured {
  display: inline-block;
  font-size: 9px;
  color: #b78732;
  font-weight: bold;
  margin-top: 4px;
}
.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}
.btn-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid #dce2e7;
  background: white;
  border-radius: 2px;
  cursor: pointer;
  color: #4b5d6e;
  transition: all 0.2s;
}
.btn-icon:hover {
  background: #f2f5f8;
  color: #0b1f33;
}
.btn-icon.danger:hover {
  background: #feecef;
  color: #c93b2b;
  border-color: #f7b2bc;
}
.status-select {
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #dbe2e8;
  border-radius: 2px;
  background: white;
  outline: 0;
}
.btn-wa-sm {
  background: #25d366;
  color: white;
  font-size: 11px;
  padding: 6px 9px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 2px;
  font-weight: 600;
}

/* PRODUCTS GRID */
.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.product-admin-card {
  background: white;
  border: 1px solid #e1e7ec;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.product-admin-card img {
  height: 180px;
  width: 100%;
  object-fit: cover;
  background: #eef2f5;
}
.card-content {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.badge-cat {
  font-size: 9px;
  color: #b78732;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.card-content h4 {
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  margin: 6px 0 8px;
  color: #0b1f33;
}
.card-content p {
  font-size: 12px;
  line-height: 1.6;
  color: #647585;
  margin: 0 0 14px;
  flex: 1;
}
.prod-specs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #556777;
  padding: 10px;
  background: #f7f9fb;
  border-radius: 2px;
  margin-bottom: 14px;
}
.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* CMS STYLING */
.cms-subtabs {
  display: flex;
  gap: 6px;
  border-bottom: 2px solid #e2e8ee;
  margin-bottom: 24px;
  overflow-x: auto;
}
.cms-subtabs button {
  padding: 12px 18px;
  border: 0;
  background: transparent;
  color: #6a7c8d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
}
.cms-subtabs button.active {
  color: #0b1f33;
  border-bottom-color: #d9aa52;
  font-weight: 700;
}
.cms-form-card {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 30px;
  border-radius: 3px;
}
.form-title {
  font-family: 'Manrope', sans-serif;
  font-size: 18px;
  color: #0b1f33;
  margin: 0 0 6px;
}
.form-help {
  font-size: 12px;
  color: #728292;
  margin: 0 0 24px;
  line-height: 1.6;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 16px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.col-span-2 {
  grid-column: 1 / -1;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #3b4e60;
}
label input, label select, label textarea {
  border: 1px solid #dce2e8;
  padding: 11px 12px;
  font-size: 12px;
  outline: 0;
  border-radius: 2px;
  background: #fdfdfd;
  color: #14283b;
}
label input:focus, label select:focus, label textarea:focus {
  border-color: #d9aa52;
  background: white;
}
label small {
  font-size: 10px;
  color: #8899a8;
  font-weight: 400;
}
.input-with-upload {
  display: flex;
  gap: 8px;
}
.input-with-upload input {
  flex: 1;
}
.btn-upload {
  background: #0b1f33;
  color: white;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 2px;
  white-space: nowrap;
}
.btn-upload input {
  display: none;
}
.preview-img-box {
  margin-top: 10px;
  height: 140px;
  border: 1px solid #e1e7eb;
  border-radius: 2px;
  overflow: hidden;
  max-width: 320px;
}
.preview-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-preview {
  margin-top: 8px;
  height: 100px;
  max-width: 160px;
  border: 1px solid #e1e7eb;
  overflow: hidden;
}
.thumb-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.services-edit-list {
  display: grid;
  gap: 18px;
}
.service-edit-box {
  border: 1px solid #e3e8ed;
  background: #f8fafb;
  padding: 20px;
  border-radius: 3px;
}
.service-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e7ecf0;
  padding-bottom: 10px;
}
.process-edit-list {
  display: grid;
  gap: 16px;
}
.process-edit-box {
  display: flex;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e3e8ed;
  background: #f8fafb;
  border-radius: 3px;
}
.step-num {
  font-family: 'Manrope', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #d9aa52;
}
.step-inputs {
  flex: 1;
}
.cms-save-bar {
  border-top: 1px solid #e8edf1;
  margin-top: 32px;
  padding-top: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* FAQ STYLES */
.faq-admin-list {
  display: grid;
  gap: 16px;
}
.faq-admin-item {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 22px;
  border-radius: 3px;
}
.faq-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* MODAL STYLES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 31, 51, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}
.modal-dialog {
  background: white;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.3);
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e6ebf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 18px;
  color: #0b1f33;
}
.close-btn {
  border: 0;
  background: none;
  cursor: pointer;
  color: #718292;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  padding: 18px 24px;
  border-top: 1px solid #e6ebf0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #f8fafc;
}
.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* TOAST */
.admin-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  padding: 14px 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0,0,0,0.18);
}
.toast-success { background: #1b5e35; color: white; }
.toast-error { background: #b03224; color: white; }
.toast-info { background: #13395d; color: white; }

/* UTILITY BUTTONS */
.btn-sm {
  padding: 8px 12px;
  font-size: 11px;
}
.btn-outline-dark {
  border: 1px solid #344a5e;
  background: transparent;
  color: #0b1f33;
}
.btn-outline-dark:hover {
  background: #0b1f33;
  color: white;
}
.btn-danger-soft {
  background: #fce8e6;
  color: #b73223;
  border: 0;
}
.btn-danger-soft:hover {
  background: #f8d2cf;
}
.btn-outline-danger {
  border: 1px solid #d9534f;
  background: transparent;
  color: #c93b2b;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.w-full {
  width: 100%;
}

@media (max-width: 900px) {
  .admin-layout { flex-direction: column; }
  .admin-sidebar { width: 100%; }
  .metrics-grid { grid-template-columns: 1fr; }
  .dashboard-split { grid-template-columns: 1fr; }
  .products-grid { grid-template-columns: 1fr; }
}
</style>

