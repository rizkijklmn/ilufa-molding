<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { applyThemeVariables } from "../utils/themeContrast.js";
import {
  LayoutDashboard,
  Layers,
  Boxes,
  FileText,
  HelpCircle,
  Mail,
  Plus,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  Upload,
  ExternalLink,
  Lock,
  LogOut,
  CheckCircle2,
  Search,
  X,
  Eye,
  EyeOff,
  Phone,
  MessageCircle,
  FolderKanban,
  Image as ImageIcon,
  Menu,
  Tags,
} from "lucide-vue-next";

const props = defineProps({
  api: { type: String, required: true },
  initialCms: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["close", "cms-updated", "data-updated"]);

// --- Auth State ---
const token = ref(localStorage.getItem("ilufa_admin_token") || "");
const isLoggedIn = ref(false);
const loginPassword = ref("");
const loginError = ref("");
const loginBusy = ref(false);

// --- Active Tab & Mobile Sidebar Drawer ---
const activeTab = ref("dashboard"); // 'dashboard' | 'categories' | 'molds' | 'products' | 'cms' | 'faqs' | 'inquiries'
const cmsSubTab = ref("general"); // 'general' | 'hero' | 'services' | 'process' | 'about'
const sidebarOpen = ref(false);

function selectAdminTab(tab) {
  activeTab.value = tab;
  sidebarOpen.value = false;
}

// --- Data States ---
const stats = ref({
  totalMolds: 0,
  newMolds: 0,
  customMolds: 0,
  usedMolds: 0,
  totalInquiries: 0,
  newInquiries: 0,
  moldedProducts: 0,
  totalCategories: 0,
});
const categories = ref([]);
const molds = ref([]);
const products = ref([]);
const inquiries = ref([]);
const cms = ref(JSON.parse(JSON.stringify(props.initialCms || {})));

// --- Loading & Notification States ---
const loading = ref(false);
const toast = ref({ show: false, message: "", type: "success" });
function showToast(msg, type = "success") {
  toast.value = { show: true, message: msg, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3500);
}

function normalizeGallerySlots(arr) {
  const clean = Array.isArray(arr) ? arr.filter(Boolean).slice(0, 3) : [];
  while (clean.length < 3) clean.push("");
  return clean;
}

// --- Category Modal Form State ---
// --- Master Data Tipe Kategori Pengadaan ---
const defaultProcurementTypes = [
  {
    code: 'NEW',
    name: 'Molding Import Baru',
    shortLabel: 'Import Baru',
    badge: 'Import Baru',
    description: 'Pengadaan mold injeksi presisi tinggi dari manufaktur rekanan terpercaya di luar negeri dengan jaminan spesifikasi dan masa garansi.',
    ctaText: 'Konsultasi Import'
  },
  {
    code: 'CUSTOM',
    name: 'Molding Custom Sesuai Desain',
    shortLabel: 'Custom Desain',
    badge: 'Custom Desain',
    description: 'Fabrikasi mold baru dari nol sesuai gambar teknik 2D/3D (CAD/CAM/IGES/STEP) atau sampel fisik produk Anda.',
    ctaText: 'Buat Mold Custom'
  },
  {
    code: 'USED',
    name: 'Molding Siap Pakai',
    shortLabel: 'Siap Pakai',
    badge: 'Siap Pakai',
    description: 'Pilihan mold teruji yang siap pakai langsung di mesin injeksi Anda dengan harga ekonomis dan ketersediaan cepat.',
    ctaText: 'Cek Mold Siap Pakai'
  }
];

const availableProcurementTypes = computed(() => {
  if (Array.isArray(cms.value?.procurementTypes) && cms.value.procurementTypes.length > 0) {
    return cms.value.procurementTypes;
  }
  return defaultProcurementTypes;
});

function getProcurementTypeLabel(code) {
  const found = availableProcurementTypes.value.find((pt) => pt.code === code);
  if (found) return found.name;
  if (code === 'NEW') return 'Molding Import Baru';
  if (code === 'CUSTOM') return 'Molding Custom Sesuai Desain';
  if (code === 'USED') return 'Molding Siap Pakai';
  return code || '-';
}

const procurementTypeModalOpen = ref(false);
const isEditingProcurementType = ref(false);
const editingProcurementTypeIndex = ref(-1);
const procurementTypeForm = ref({
  code: '',
  name: '',
  shortLabel: '',
  badge: '',
  description: '',
  ctaText: ''
});

function openAddProcurementTypeModal() {
  isEditingProcurementType.value = false;
  editingProcurementTypeIndex.value = -1;
  procurementTypeForm.value = {
    code: '',
    name: '',
    shortLabel: '',
    badge: '',
    description: '',
    ctaText: 'Konsultasi'
  };
  procurementTypeModalOpen.value = true;
}

function openEditProcurementTypeModal(item, index) {
  isEditingProcurementType.value = true;
  editingProcurementTypeIndex.value = index;
  procurementTypeForm.value = {
    code: item.code || '',
    name: item.name || '',
    shortLabel: item.shortLabel || item.name || '',
    badge: item.badge || item.shortLabel || item.name || '',
    description: item.description || '',
    ctaText: item.ctaText || 'Konsultasi'
  };
  procurementTypeModalOpen.value = true;
}

async function saveProcurementType() {
  if (!procurementTypeForm.value.name.trim()) {
    showToast('Nama tipe pengadaan wajib diisi!', 'error');
    return;
  }
  let code = (procurementTypeForm.value.code || '').trim().toUpperCase();
  if (!code) {
    code = procurementTypeForm.value.name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase();
  }

  if (!Array.isArray(cms.value.procurementTypes)) {
    cms.value.procurementTypes = JSON.parse(JSON.stringify(defaultProcurementTypes));
  }

  const payload = {
    code,
    name: procurementTypeForm.value.name.trim(),
    shortLabel: (procurementTypeForm.value.shortLabel || procurementTypeForm.value.name).trim(),
    badge: (procurementTypeForm.value.badge || procurementTypeForm.value.shortLabel || procurementTypeForm.value.name).trim(),
    description: (procurementTypeForm.value.description || '').trim(),
    ctaText: (procurementTypeForm.value.ctaText || 'Konsultasi').trim()
  };

  if (isEditingProcurementType.value && editingProcurementTypeIndex.value >= 0) {
    cms.value.procurementTypes[editingProcurementTypeIndex.value] = payload;
  } else {
    const existingIndex = cms.value.procurementTypes.findIndex((p) => p.code === code);
    if (existingIndex >= 0) {
      cms.value.procurementTypes[existingIndex] = payload;
    } else {
      cms.value.procurementTypes.push(payload);
    }
  }

  procurementTypeModalOpen.value = false;
  await saveCMS();
}

async function deleteProcurementType(index) {
  const item = availableProcurementTypes.value[index];
  if (!item) return;
  if (!confirm(`Hapus tipe pengadaan "${item.name}"?`)) return;

  if (!Array.isArray(cms.value.procurementTypes)) {
    cms.value.procurementTypes = JSON.parse(JSON.stringify(defaultProcurementTypes));
  }
  cms.value.procurementTypes.splice(index, 1);
  await saveCMS();
}

async function resetProcurementTypesToDefault() {
  if (!confirm('Kembalikan daftar tipe kategori pengadaan ke 3 tipe standar (Import Baru, Custom Desain, Siap Pakai)?')) return;
  cms.value.procurementTypes = JSON.parse(JSON.stringify(defaultProcurementTypes));
  await saveCMS();
}

const categoryModalOpen = ref(false);
const isEditingCategory = ref(false);
const categoryForm = ref({
  id: "",
  name: "",
  description: "",
  detailContent: "",
  imageUrl: "",
  gallerySlots: ["", "", ""],
  isVisible: true,
  sortOrder: 1,
});

// --- Mold Modal Form State ---
const moldModalOpen = ref(false);
const isEditingMold = ref(false);
const moldForm = ref({
  id: "",
  code: "",
  name: "",
  slug: "",
  type: "USED",
  category: "Packaging",
  description: "",
  detailContent: "",
  imageUrl: "",
  gallerySlots: ["", "", ""],
  dimensions: "",
  weightKg: "",
  cavity: "",
  material: "",
  machineTonnage: "",
  condition: "Siap Pakai — siap inspeksi",
  priceLabel: "Minta penawaran",
  status: "AVAILABLE",
  featured: false,
  isVisible: true,
});
const moldSearch = ref("");
const moldTypeFilter = ref("ALL");
const moldStatusFilter = ref("ALL");
const moldVisibilityFilter = ref("ALL");

// --- Molded Product Modal Form State ---
const productModalOpen = ref(false);
const isEditingProduct = ref(false);
const productForm = ref({
  id: "",
  name: "",
  category: "Packaging",
  description: "",
  detailContent: "",
  imageUrl: "",
  gallerySlots: ["", "", ""],
  weightEst: "",
  dimensions: "",
  moldInfo: "",
  materialType: "",
  cycleTime: "",
  minMachineTonnage: "",
  featured: false,
  isVisible: true,
});
const productCategoryFilter = ref("ALL");
const productVisibilityFilter = ref("ALL");

// --- Image Upload State ---
const uploadBusy = ref(false);

// --- Auth Functions ---
async function verifyToken() {
  if (!token.value) {
    isLoggedIn.value = false;
    return;
  }
  try {
    const res = await fetch(`${props.api}/admin/verify`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      isLoggedIn.value = true;
      fetchDashboardData();
    } else {
      token.value = "";
      localStorage.removeItem("ilufa_admin_token");
      isLoggedIn.value = false;
    }
  } catch {
    if (token.value) {
      isLoggedIn.value = true;
      fetchDashboardData();
    }
  }
}

async function handleLogin() {
  loginBusy.value = true;
  loginError.value = "";
  try {
    const res = await fetch(`${props.api}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Password salah.");
    token.value = data.token;
    localStorage.setItem("ilufa_admin_token", data.token);
    isLoggedIn.value = true;
    loginPassword.value = "";
    showToast("Selamat datang di Admin Panel iLUFA Molding!");
    fetchDashboardData();
  } catch (err) {
    loginError.value = err.message || "Gagal login.";
  } finally {
    loginBusy.value = false;
  }
}

function handleLogout() {
  token.value = "";
  localStorage.removeItem("ilufa_admin_token");
  isLoggedIn.value = false;
  showToast("Anda telah keluar dari sesi admin.", "info");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token.value}`,
  };
}

// --- Fetch All Data ---
async function fetchDashboardData() {
  loading.value = true;
  try {
    await Promise.all([
      fetchStats(),
      fetchCategories(),
      fetchMolds(),
      fetchProducts(),
      fetchInquiries(),
      fetchCMS(),
    ]);
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    const res = await fetch(`${props.api}/admin/stats`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      stats.value = data.data || stats.value;
    }
  } catch {}
}

async function fetchCategories() {
  try {
    const res = await fetch(`${props.api}/categories`);
    if (res.ok) {
      const data = await res.json();
      categories.value = data.data || [];
    }
  } catch {}
}

async function fetchMolds() {
  try {
    const res = await fetch(`${props.api}/molds`);
    if (res.ok) {
      const data = await res.json();
      molds.value = data.data || [];
    }
  } catch {}
}

async function fetchProducts() {
  try {
    const res = await fetch(`${props.api}/molded-products`);
    if (res.ok) {
      const data = await res.json();
      products.value = data.data || [];
    }
  } catch {}
}

async function fetchInquiries() {
  try {
    const res = await fetch(`${props.api}/inquiries`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      inquiries.value = data.data || [];
    }
  } catch {}
}

async function fetchCMS() {
  try {
    const res = await fetch(`${props.api}/cms`);
    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        if (!data.data.seo) {
          data.data.seo = {
            metaTitle:
              "iLUFA Molding — Jual Molding Injeksi Plastik Siap Pakai, Jasa Pemesanan Molding Import & Pembuatan Molding Plastik Custom",
            metaDescription:
              "iLUFA Molding melayani jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D & sampel, serta jual molding injeksi plastik siap pakai untuk pabrik manufaktur plastik di Indonesia.",
            metaKeywords:
              "jual molding injeksi plastik siap pakai, jasa pemesanan molding import, pembuatan molding plastik custom, cetakan injeksi plastik, jual mold plastik siap pakai, pabrik molding plastik indonesia",
            canonicalUrl: "https://ilufamolding.com/",
          };
        }
        cms.value = data.data;
        emit("cms-updated", data.data);
      }
    }
  } catch {}
}

// --- Image Uploader (Auto-compresses image on client so it stays fast & fits Firestore/Serverless limits) ---
function compressImageFileToDataUrl(file, maxWidth = 1000, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFileUpload(event, targetObject, fieldName = "imageUrl") {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("File harus berupa gambar (PNG, JPG, WEBP, dll)");
    return;
  }

  uploadBusy.value = true;
  try {
    const compressedDataUrl = await compressImageFileToDataUrl(file);
    const res = await fetch(`${props.api}/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ dataUrl: compressedDataUrl, filename: file.name }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Gagal mengunggah gambar.");
    targetObject[fieldName] = result.url;
    showToast("Gambar berhasil diunggah!");
  } catch (err) {
    showToast(err.message || "Gagal mengunggah gambar.", "error");
  } finally {
    uploadBusy.value = false;
  }
}

async function handleGallerySlotUpload(event, slotsArray, index) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("File harus berupa gambar (PNG, JPG, WEBP, dll)");
    return;
  }

  uploadBusy.value = true;
  try {
    const compressedDataUrl = await compressImageFileToDataUrl(file);
    const res = await fetch(`${props.api}/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ dataUrl: compressedDataUrl, filename: file.name }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Gagal mengunggah gambar.");
    slotsArray[index] = result.url;
    showToast(`Gambar detail ${index + 1} berhasil diunggah!`);
  } catch (err) {
    showToast(err.message || "Gagal mengunggah gambar.", "error");
  } finally {
    uploadBusy.value = false;
  }
}

// --- Category CRUD & Visibility Toggle ---
function countCategoryUsage(catName) {
  const mCount = molds.value.filter((m) => m.category === catName).length;
  const pCount = products.value.filter((p) => p.category === catName).length;
  return { molds: mCount, products: pCount };
}

function openAddCategoryModal() {
  isEditingCategory.value = false;
  categoryForm.value = {
    id: "",
    name: "",
    description: "",
    detailContent: "",
    imageUrl:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
    gallerySlots: ["", "", ""],
    isVisible: true,
    sortOrder: categories.value.length + 1,
  };
  categoryModalOpen.value = true;
}

function openEditCategoryModal(cat) {
  isEditingCategory.value = true;
  categoryForm.value = {
    id: cat.id,
    name: cat.name,
    description: cat.description || "",
    detailContent: cat.detailContent || "",
    imageUrl: cat.imageUrl || "",
    gallerySlots: normalizeGallerySlots(cat.galleryImages),
    isVisible: cat.isVisible !== false,
    sortOrder: cat.sortOrder || 1,
  };
  categoryModalOpen.value = true;
}

async function saveCategory() {
  if (!categoryForm.value.name.trim()) {
    alert("Nama kategori wajib diisi.");
    return;
  }
  loading.value = true;
  const payload = {
    ...categoryForm.value,
    galleryImages: categoryForm.value.gallerySlots
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
  try {
    const url = isEditingCategory.value
      ? `${props.api}/categories/${categoryForm.value.id}`
      : `${props.api}/categories`;
    const method = isEditingCategory.value ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyimpan kategori.");
    showToast(
      isEditingCategory.value
        ? "Kategori & detail berhasil diperbarui!"
        : "Kategori baru berhasil ditambahkan!",
    );
    categoryModalOpen.value = false;
    await fetchCategories();
    await fetchMolds();
    await fetchProducts();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function toggleCategoryVisibility(cat) {
  const nextVal = !cat.isVisible;
  try {
    const res = await fetch(`${props.api}/categories/${cat.id}/visibility`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isVisible: nextVal }),
    });
    if (!res.ok) throw new Error("Gagal mengubah status tampil kategori.");
    cat.isVisible = nextVal;
    showToast(
      nextVal
        ? `Kategori "${cat.name}" sekarang DITAMPILKAN di website.`
        : `Kategori "${cat.name}" sekarang DISEMBUNYIKAN dari website.`,
    );
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteCategory(cat) {
  if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/categories/${cat.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Gagal menghapus kategori.");
    showToast("Kategori berhasil dihapus.");
    await fetchCategories();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

// --- Mold Actions & Visibility Toggle ---
const filteredMolds = computed(() => {
  return molds.value.filter((m) => {
    const matchType =
      moldTypeFilter.value === "ALL" || m.type === moldTypeFilter.value;
    const matchStatus =
      moldStatusFilter.value === "ALL" || m.status === moldStatusFilter.value;
    const isVis = m.isVisible !== false;
    const matchVis =
      moldVisibilityFilter.value === "ALL" ||
      (moldVisibilityFilter.value === "VISIBLE" && isVis) ||
      (moldVisibilityFilter.value === "HIDDEN" && !isVis);
    const q = moldSearch.value.toLowerCase();
    const matchSearch =
      !q || `${m.name} ${m.code} ${m.category}`.toLowerCase().includes(q);
    return matchType && matchStatus && matchVis && matchSearch;
  });
});

function openAddMoldModal() {
  isEditingMold.value = false;
  const defaultCat = categories.value[0]?.name || "Packaging";
  moldForm.value = {
    id: "",
    code: `ILF-${Date.now().toString().slice(-4)}`,
    name: "",
    slug: "",
    type: "USED",
    category: defaultCat,
    description: "",
    detailContent: "",
    imageUrl:
      "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1000&q=80",
    gallerySlots: ["", "", ""],
    dimensions: "",
    weightKg: "",
    cavity: "",
    material: "P20 / 718",
    machineTonnage: "120 - 250 Ton",
    condition: "Siap Pakai — siap inspeksi",
    priceLabel: "Minta penawaran",
    status: "AVAILABLE",
    featured: false,
    isVisible: true,
  };
  moldModalOpen.value = true;
}

function openEditMoldModal(mold) {
  isEditingMold.value = true;
  moldForm.value = {
    ...mold,
    detailContent: mold.detailContent || "",
    gallerySlots: normalizeGallerySlots(mold.galleryImages),
    isVisible: mold.isVisible !== false,
  };
  moldModalOpen.value = true;
}

async function saveMold() {
  if (!moldForm.value.name || !moldForm.value.category) {
    alert("Nama mold dan kategori wajib diisi.");
    return;
  }
  loading.value = true;
  const payload = {
    ...moldForm.value,
    galleryImages: moldForm.value.gallerySlots
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
  try {
    const url = isEditingMold.value
      ? `${props.api}/molds/${moldForm.value.id}`
      : `${props.api}/molds`;
    const method = isEditingMold.value ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyimpan data molding.");
    showToast(
      isEditingMold.value
        ? "Molding berhasil diperbarui!"
        : "Molding baru berhasil ditambahkan!",
    );
    moldModalOpen.value = false;
    await fetchMolds();
    await fetchStats();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function toggleMoldVisibility(mold) {
  const nextVal = !(mold.isVisible !== false);
  try {
    const res = await fetch(`${props.api}/molds/${mold.id}/visibility`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isVisible: nextVal }),
    });
    if (!res.ok) throw new Error("Gagal mengubah status tampil molding.");
    mold.isVisible = nextVal;
    showToast(
      nextVal
        ? `Molding "${mold.name}" sekarang DITAMPILKAN di website.`
        : `Molding "${mold.name}" sekarang DISEMBUNYIKAN dari website.`,
    );
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteMold(mold) {
  if (
    !confirm(
      `Hapus molding "${mold.name}" (${mold.code})? Tindakan ini tidak dapat dibatalkan.`,
    )
  )
    return;
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/molds/${mold.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menghapus molding.");
    showToast("Molding berhasil dihapus.");
    await fetchMolds();
    await fetchStats();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

// --- Molded Product Actions & Visibility Toggle ---
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchCat =
      productCategoryFilter.value === "ALL" ||
      p.category === productCategoryFilter.value;
    const isVis = p.isVisible !== false;
    const matchVis =
      productVisibilityFilter.value === "ALL" ||
      (productVisibilityFilter.value === "VISIBLE" && isVis) ||
      (productVisibilityFilter.value === "HIDDEN" && !isVis);
    return matchCat && matchVis;
  });
});

function openAddProductModal() {
  isEditingProduct.value = false;
  const defaultCat = categories.value[0]?.name || "Packaging";
  productForm.value = {
    id: "",
    name: "",
    category: defaultCat,
    description: "",
    detailContent: "",
    imageUrl:
      "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80",
    gallerySlots: ["", "", ""],
    weightEst: "35 gram",
    dimensions: "15 x 10 x 5 cm",
    moldInfo: "Mold 4-Cavity Hot Runner",
    materialType: "PP / HDPE / ABS",
    cycleTime: "12 - 16 detik",
    minMachineTonnage: "180 Ton",
    featured: true,
    isVisible: true,
  };
  productModalOpen.value = true;
}

function openEditProductModal(prod) {
  isEditingProduct.value = true;
  productForm.value = {
    ...prod,
    detailContent: prod.detailContent || "",
    materialType: prod.materialType || "",
    cycleTime: prod.cycleTime || "",
    minMachineTonnage: prod.minMachineTonnage || "",
    gallerySlots: normalizeGallerySlots(prod.galleryImages),
    isVisible: prod.isVisible !== false,
  };
  productModalOpen.value = true;
}

async function saveProduct() {
  if (!productForm.value.name || !productForm.value.category) {
    alert("Nama produk dan kategori wajib diisi.");
    return;
  }
  loading.value = true;
  const payload = {
    ...productForm.value,
    galleryImages: productForm.value.gallerySlots
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
  try {
    const url = isEditingProduct.value
      ? `${props.api}/molded-products/${productForm.value.id}`
      : `${props.api}/molded-products`;
    const method = isEditingProduct.value ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Gagal menyimpan contoh produk cetakan.");
    showToast(
      isEditingProduct.value
        ? "Produk hasil cetakan diperbarui!"
        : "Produk hasil cetakan ditambahkan!",
    );
    productModalOpen.value = false;
    await fetchProducts();
    await fetchStats();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function toggleProductVisibility(prod) {
  const nextVal = !(prod.isVisible !== false);
  try {
    const res = await fetch(
      `${props.api}/molded-products/${prod.id}/visibility`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isVisible: nextVal }),
      },
    );
    if (!res.ok) throw new Error("Gagal mengubah status tampil produk.");
    prod.isVisible = nextVal;
    showToast(
      nextVal
        ? `Produk "${prod.name}" sekarang DITAMPILKAN di website.`
        : `Produk "${prod.name}" sekarang DISEMBUNYIKAN dari website.`,
    );
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteProduct(prod) {
  if (!confirm(`Hapus contoh hasil cetakan "${prod.name}"?`)) return;
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/molded-products/${prod.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menghapus produk.");
    showToast("Produk hasil cetakan berhasil dihapus.");
    await fetchProducts();
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

// --- CMS Actions ---
async function saveCMS() {
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/cms`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(cms.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyimpan CMS.");
    showToast("Semua perubahan konten website berhasil disimpan!");
    emit("cms-updated", data.data);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function resetCMS() {
  if (
    !confirm(
      "Kembalikan semua teks konten website ke pengaturan standar bawaan?",
    )
  )
    return;
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/cms/reset`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mereset CMS.");
    cms.value = data.data;
    showToast("Konten website berhasil direset ke standar.");
    emit("cms-updated", data.data);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

async function resetDemoCatalog() {
  if (
    !confirm(
      "PERHATIAN: Apakah Anda yakin ingin memulihkan seluruh data contoh bawaan (molds, produk cetak, dan kategori)?\n\nCatatan: Data yang Anda buat sendiri saat ini akan ditimpa dengan data contoh."
    )
  )
    return;
  loading.value = true;
  try {
    const res = await fetch(`${props.api}/admin/reset-data`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memulihkan data contoh.");
    showToast(data.message || "Data contoh berhasil dipulihkan!");
    await Promise.all([
      fetchCategories(),
      fetchMolds(),
      fetchProducts(),
      fetchStats(),
    ]);
    emit("data-updated");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    loading.value = false;
  }
}

function ensureThemeColors() {
  if (!cms.value.general) cms.value.general = {};
  if (!cms.value.general.themeColors) {
    cms.value.general.themeColors = {
      primaryNavy: "#0b1f33",
      secondaryNavy: "#122e47",
      accentGold: "#d9aa52",
    };
  }
}

function applyColorPreset(primary, secondary, gold) {
  ensureThemeColors();
  cms.value.general.themeColors.primaryNavy = primary;
  cms.value.general.themeColors.secondaryNavy = secondary;
  cms.value.general.themeColors.accentGold = gold;
  applyThemeVariables(cms.value.general.themeColors, document.documentElement);
  showToast("Palet tema diterapkan, klik Simpan untuk memperbarui website.");
}

watch(
  () => cms.value?.general?.themeColors,
  (colors) => {
    if (!colors) return;
    applyThemeVariables(colors, document.documentElement);
  },
  { deep: true }
);

// --- FAQ Actions ---
function addFaqItem() {
  if (!cms.value.faqs) cms.value.faqs = [];
  cms.value.faqs.push({
    q: "Pertanyaan baru tentang molding plastik",
    a: "Jawaban detail penjelasan teknis atau prosedur di iLUFA Molding.",
  });
}

function removeFaqItem(index) {
  cms.value.faqs.splice(index, 1);
}

// --- Inquiry (RFQ) Actions ---
async function updateInquiryStatus(inquiry, newStatus) {
  try {
    const res = await fetch(`${props.api}/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      inquiry.status = newStatus;
      showToast(`Status penawaran diperbarui: ${newStatus}`);
      await fetchStats();
    }
  } catch {
    showToast("Gagal memperbarui status.", "error");
  }
}

async function deleteInquiry(inquiry) {
  if (!confirm(`Hapus data penawaran dari "${inquiry.companyName}"?`)) return;
  try {
    const res = await fetch(`${props.api}/inquiries/${inquiry.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      showToast("Penawaran berhasil dihapus.");
      await fetchInquiries();
      await fetchStats();
    }
  } catch {
    showToast("Gagal menghapus penawaran.", "error");
  }
}

function waInquiryLink(inquiry) {
  const cleanPhone = inquiry.phone.replace(/[^0-9]/g, "");
  const formatted = cleanPhone.startsWith("0")
    ? "62" + cleanPhone.slice(1)
    : cleanPhone;
  const msg = `Halo ${inquiry.contactName} (${inquiry.companyName}), kami dari tim iLUFA Molding ingin menindaklanjuti permintaan penawaran molding Anda (${inquiry.moldType}).`;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`;
}

onMounted(() => {
  verifyToken();
});
</script>

<template>
  <div class="admin-wrapper">
    <!-- TOAST NOTIFICATION -->
    <transition name="fade">
      <div v-if="toast.show" class="admin-toast" :class="'toast-' + toast.type">
        <CheckCircle2 v-if="toast.type === 'success'" :size="18" />
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
        <p class="login-desc">
          Masukkan password administrator untuk mengelola kategori, produk
          molding, katalog hasil cetakan, CMS konten, dan penawaran masuk.
        </p>

        <form @submit.prevent="handleLogin" class="login-form">
          <label class="field-label">
            <span>Password Admin</span>
            <div class="input-with-icon">
              <Lock :size="16" />
              <input
                v-model="loginPassword"
                type="password"
                required
                placeholder="Masukkan password administrator"
              />
            </div>
          </label>
          <p v-if="loginError" class="login-error">{{ loginError }}</p>
          <div class="login-actions">
            <button
              type="submit"
              class="btn btn-gold w-full"
              :disabled="loginBusy"
            >
              {{ loginBusy ? "Memverifikasi..." : "Masuk ke Dashboard Admin" }}
            </button>
            <button
              type="button"
              class="btn btn-outline-dark w-full"
              @click="emit('close')"
            >
              ← Kembali ke Website Live
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MAIN ADMIN DASHBOARD -->
    <div v-else class="admin-layout">
      <!-- MOBILE/TABLET SIDEBAR BACKDROP -->
      <transition name="fade">
        <div
          v-if="sidebarOpen"
          class="admin-sidebar-backdrop"
          @click="sidebarOpen = false"
        ></div>
      </transition>

      <!-- SIDEBAR (DRAWER ON TABLET & MOBILE) -->
      <aside class="admin-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <div class="brand">
            <span class="brand-mark">i</span>
            <div>
              <b>iLUFA CMS</b>
              <small>PORTAL PENGADAAN MOLD</small>
            </div>
          </div>
          <button
            type="button"
            class="sidebar-close-btn"
            aria-label="Tutup Menu Sidebar"
            @click="sidebarOpen = false"
          >
            <X :size="20" />
          </button>
        </div>

        <nav class="sidebar-nav">
          <button
            :class="{ active: activeTab === 'dashboard' }"
            @click="selectAdminTab('dashboard')"
          >
            <LayoutDashboard :size="18" />
            <span>Dashboard & Metrik</span>
          </button>
          <button
            :class="{ active: activeTab === 'categories' }"
            @click="selectAdminTab('categories')"
          >
            <FolderKanban :size="18" />
            <span>Kelola Kategori & Detail</span>
            <span class="badge">{{ categories.length }}</span>
          </button>
          <button
            :class="{ active: activeTab === 'procurementTypes' }"
            @click="selectAdminTab('procurementTypes')"
          >
            <Tags :size="18" />
            <span>Master Tipe Pengadaan</span>
            <span class="badge">{{ availableProcurementTypes.length }}</span>
          </button>
          <button
            :class="{ active: activeTab === 'molds' }"
            @click="selectAdminTab('molds')"
          >
            <Boxes :size="18" />
            <span>Katalog Molding</span>
            <span class="badge">{{ molds.length }}</span>
          </button>
          <button
            :class="{ active: activeTab === 'products' }"
            @click="selectAdminTab('products')"
          >
            <Layers :size="18" />
            <span>Hasil Cetakan Plastik</span>
            <span class="badge">{{ products.length }}</span>
          </button>
          <button
            :class="{ active: activeTab === 'cms' }"
            @click="selectAdminTab('cms')"
          >
            <FileText :size="18" />
            <span>CMS Konten Website</span>
          </button>
          <button
            :class="{ active: activeTab === 'faqs' }"
            @click="selectAdminTab('faqs')"
          >
            <HelpCircle :size="18" />
            <span>CMS Tanya Jawab (FAQ)</span>
          </button>
          <button
            :class="{ active: activeTab === 'inquiries' }"
            @click="selectAdminTab('inquiries')"
          >
            <Mail :size="18" />
            <span>Permintaan Penawaran (RFQ)</span>
            <span v-if="stats.newInquiries > 0" class="badge badge-gold"
              >{{ stats.newInquiries }} BARU</span
            >
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
          <div class="topbar-left-group">
            <button
              type="button"
              class="sidebar-toggle-btn"
              aria-label="Buka Menu Admin"
              @click="sidebarOpen = !sidebarOpen"
            >
              <Menu :size="20" />
            </button>
            <div class="topbar-title">
              <h1 v-if="activeTab === 'dashboard'">Dashboard & Ringkasan</h1>
                            <h1 v-else-if="activeTab === 'procurementTypes'">
                Data Master Tipe Kategori Pengadaan
              </h1>
              <h1 v-else-if="activeTab === 'categories'">
                Manajemen Kategori & Detail Kategori
              </h1>
              <h1 v-else-if="activeTab === 'molds'">
                Manajemen Katalog Molding
              </h1>
              <h1 v-else-if="activeTab === 'products'">
                Katalog Contoh Hasil Cetakan Plastik
              </h1>
              <h1 v-else-if="activeTab === 'cms'">
                CMS Kustomisasi Konten Website
              </h1>
              <h1 v-else-if="activeTab === 'faqs'">
                Manajemen FAQ (Tanya Jawab)
              </h1>
              <h1 v-else-if="activeTab === 'inquiries'">
                Inbox Permintaan Penawaran (RFQ)
              </h1>
            </div>
          </div>
          <div class="topbar-actions">
            <button class="btn btn-outline-dark btn-sm" @click="emit('close')">
              <ExternalLink :size="14" />
              <span class="hide-xs">Buka Halaman Pengunjung</span>
            </button>
          </div>
        </header>

        <!-- TAB 1: DASHBOARD OVERVIEW -->
        <div v-if="activeTab === 'dashboard'" class="tab-pane">
          <div class="metrics-grid-4">
            <div
              class="metric-card"
              @click="activeTab = 'categories'"
              style="cursor: pointer"
            >
              <div class="metric-icon purple"><FolderKanban /></div>
              <div>
                <small>KATEGORI PRODUK</small>
                <h3>{{ categories.length }}</h3>
                <span
                  >{{
                    categories.filter((c) => c.isVisible !== false).length
                  }}
                  Ditampilkan di Web</span
                >
              </div>
            </div>
            <div
              class="metric-card"
              @click="activeTab = 'molds'"
              style="cursor: pointer"
            >
              <div class="metric-icon gold"><Boxes /></div>
              <div>
                <small>KATALOG MOLDING</small>
                <h3>{{ molds.length }}</h3>
                <span
                  >{{
                    molds.filter((m) => m.isVisible !== false).length
                  }}
                  Ditampilkan di Web</span
                >
              </div>
            </div>
            <div
              class="metric-card"
              @click="activeTab = 'products'"
              style="cursor: pointer"
            >
              <div class="metric-icon blue"><Layers /></div>
              <div>
                <small>CONTOH HASIL CETAKAN</small>
                <h3>{{ products.length }}</h3>
                <span
                  >{{
                    products.filter((p) => p.isVisible !== false).length
                  }}
                  Ditampilkan di Web</span
                >
              </div>
            </div>
            <div
              class="metric-card"
              @click="activeTab = 'inquiries'"
              style="cursor: pointer"
            >
              <div class="metric-icon green"><Mail /></div>
              <div>
                <small>PERMINTAAN PENAWARAN (RFQ)</small>
                <h3>{{ inquiries.length }}</h3>
                <span class="text-gold font-bold"
                  >{{ stats.newInquiries }} belum diproses</span
                >
              </div>
            </div>
          </div>

          <div class="dashboard-split">
            <div class="panel">
              <div class="panel-header">
                <h3>Aksi Cepat Admin</h3>
              </div>
              <div class="quick-actions-grid">
                <button class="quick-card" @click="openAddCategoryModal">
                  <FolderKanban :size="24" />
                  <b>Tambah Kategori Baru</b>
                  <small
                    >Buat kategori lengkap dengan penjelasan & 3 foto
                    detail</small
                  >
                </button>
                <button class="quick-card" @click="openAddMoldModal">
                  <Plus :size="24" />
                  <b>Tambah Molding Baru</b>
                  <small>Daftarkan mold baru, custom, atau siap pakai</small>
                </button>
                <button class="quick-card" @click="openAddProductModal">
                  <Layers :size="24" />
                  <b>Tambah Contoh Hasil Cetak</b>
                  <small>Showcase produk plastik & galeri detailnya</small>
                </button>
                <button
                  class="quick-card"
                  @click="
                    activeTab = 'cms';
                    cmsSubTab = 'general';
                  "
                >
                  <Phone :size="24" />
                  <b>Edit Isi Website & Kontak</b>
                  <small>Ubah teks halaman, nomor WA, dan alamat pabrik</small>
                </button>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h3>Penawaran Terbaru Masuk</h3>
                <button class="text-button" @click="activeTab = 'inquiries'">
                  Lihat Semua →
                </button>
              </div>
              <div v-if="inquiries.length === 0" class="empty-box">
                Belum ada permintaan penawaran dari formulir website.
              </div>
              <div v-else class="recent-inquiries-list">
                <div
                  v-for="inq in inquiries.slice(0, 4)"
                  :key="inq.id"
                  class="recent-inquiry-item"
                >
                  <div class="inq-info">
                    <b>{{ inq.companyName }}</b>
                    <small
                      >PIC: {{ inq.contactName }} · {{ inq.moldType }}</small
                    >
                    <p>{{ inq.productNeed }}</p>
                  </div>
                  <div class="inq-actions">
                    <span
                      class="status-pill"
                      :class="'status-' + inq.status.toLowerCase()"
                      >{{ inq.status }}</span
                    >
                    <a
                      :href="waInquiryLink(inq)"
                      target="_blank"
                      class="btn btn-wa-sm"
                    >
                      <MessageCircle :size="13" /> WA
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: CATEGORIES MANAGEMENT -->
                <!-- TAB MASTER TIPE PENGADAAN -->
        <div v-if="activeTab === 'procurementTypes'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2 style="margin: 0 0 4px">Data Master Tipe Kategori Pengadaan</h2>
              <p class="section-sub" style="margin: 0">
                Pilihan tipe pengadaan ini terhubung langsung ke dropdown pilihan kategori pengadaan saat input cetakan mold, filter katalog publik, dan form penawaran (RFQ).
              </p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline-dark" @click="resetProcurementTypesToDefault" title="Reset ke tipe standar">
                <RotateCcw :size="15" /> Reset Standar
              </button>
              <button class="btn btn-gold" @click="openAddProcurementTypeModal">
                <Plus :size="16" /> Tambah Tipe Pengadaan
              </button>
            </div>
          </div>

          <div class="categories-admin-grid">
            <div
              v-if="!availableProcurementTypes.length"
              style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;"
            >
              Belum ada tipe pengadaan. Klik "+ Tambah Tipe Pengadaan" untuk membuat baru.
            </div>
            <div
              v-for="(pt, idx) in availableProcurementTypes"
              :key="pt.code || idx"
              class="category-admin-card"
              style="display: flex; flex-direction: column;"
            >
              <div class="cat-card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="cat-card-top" style="align-items: flex-start; margin-bottom: 12px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span class="pill-type" :class="'type-' + (pt.code || '').toLowerCase()">{{ pt.code }}</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; font-size: 11px; padding: 2px 8px; border-radius: 4px;">{{ pt.badge || pt.shortLabel || pt.name }}</span>
                      </div>
                      <h3 style="font-size: 16px; font-weight: 700; color: #0b1f33; margin: 0;">{{ pt.name }}</h3>
                    </div>
                  </div>

                  <p class="cat-short-desc" style="color: #475569; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
                    {{ pt.description || 'Tidak ada deskripsi.' }}
                  </p>

                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #64748b;">
                    <div><strong>Label Singkat (Filter Tab):</strong> {{ pt.shortLabel || pt.name }}</div>
                    <div style="margin-top: 4px;"><strong>Teks Tombol (CTA):</strong> {{ pt.ctaText || '-' }}</div>
                  </div>
                </div>

                <div class="cat-card-footer" style="margin-top: auto; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px;">
                  <button
                    class="btn btn-outline-dark btn-sm"
                    @click="openEditProcurementTypeModal(pt, idx)"
                  >
                    <Edit3 :size="13" /> Edit
                  </button>
                  <button
                    class="btn btn-danger-soft btn-sm"
                    @click="deleteProcurementType(idx)"
                    :disabled="availableProcurementTypes.length <= 1"
                    title="Minimal harus tersisa 1 tipe pengadaan"
                  >
                    <Trash2 :size="13" /> Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'categories'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2 style="margin: 0 0 4px">Daftar Kategori Produk & Molding</h2>
              <p class="section-sub" style="margin: 0">
                Atur kategori yang tampil di website, lengkapi penjelasan detail
                tiap kategori, dan tambahkan maksimal 3 gambar detail tambahan.
              </p>
            </div>
            <button class="btn btn-gold" @click="openAddCategoryModal">
              <Plus :size="16" /> Tambah Kategori Baru
            </button>
          </div>

          <div class="categories-admin-grid">
            <div
              v-if="!categories.length"
              style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;"
            >
              Belum ada kategori yang tersimpan. Klik "+ Tambah Kategori Baru" untuk membuat baru.
            </div>
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="category-admin-card"
              :class="{ 'is-hidden-item': cat.isVisible === false }"
            >
              <div class="cat-card-media">
                <img
                  :src="
                    cat.imageUrl ||
                    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=80'
                  "
                  :alt="cat.name"
                />
                <div
                  class="cat-gallery-strip"
                  v-if="cat.galleryImages && cat.galleryImages.length"
                >
                  <img
                    v-for="(gImg, gIdx) in cat.galleryImages.slice(0, 3)"
                    :key="gIdx"
                    :src="gImg"
                    :title="`Gambar detail ${gIdx + 1}`"
                  />
                  <span class="gallery-count"
                    >+{{ cat.galleryImages.length }} foto detail</span
                  >
                </div>
              </div>

              <div class="cat-card-body">
                <div class="cat-card-top">
                  <div>
                    <h3>{{ cat.name }}</h3>
                    <small class="usage-meta">
                      {{ countCategoryUsage(cat.name).products }} produk cetakan
                      · {{ countCategoryUsage(cat.name).molds }} molding
                    </small>
                  </div>

                  <button
                    type="button"
                    class="visibility-toggle-btn"
                    :class="cat.isVisible !== false ? 'vis-on' : 'vis-off'"
                    @click="toggleCategoryVisibility(cat)"
                  >
                    <Eye v-if="cat.isVisible !== false" :size="14" />
                    <EyeOff v-else :size="14" />
                    <span>{{
                      cat.isVisible !== false
                        ? "Ditampilkan di Website"
                        : "Tidak Ditampilkan"
                    }}</span>
                  </button>
                </div>

                <p class="cat-short-desc">
                  {{ cat.description || "Belum ada deskripsi singkat." }}
                </p>

                <div v-if="cat.detailContent" class="cat-detail-preview">
                  <b>Detail Kategori:</b>
                  <p>{{ cat.detailContent }}</p>
                </div>

                <div class="cat-card-footer">
                  <span class="img-count-tag">
                    <ImageIcon :size="13" />
                    {{ cat.galleryImages ? cat.galleryImages.length : 0 }} / 3
                    Gambar Detail
                  </span>
                  <div class="card-actions">
                    <button
                      class="btn btn-outline-dark btn-sm"
                      @click="openEditCategoryModal(cat)"
                    >
                      <Edit3 :size="13" /> Edit Detail & Gambar
                    </button>
                    <button
                      class="btn btn-danger-soft btn-sm"
                      @click="deleteCategory(cat)"
                    >
                      <Trash2 :size="13" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: MOLDS MANAGEMENT -->
        <div v-if="activeTab === 'molds'" class="tab-pane">
          <div class="toolbar">
            <div class="toolbar-left">
              <div class="search-input">
                <Search :size="16" />
                <input
                  v-model="moldSearch"
                  placeholder="Cari nama, kode mold, atau kategori..."
                />
              </div>
              <select v-model="moldTypeFilter" class="select-filter">
                <option value="ALL">Semua Tipe Mold</option>
                <option
                  v-for="pt in availableProcurementTypes"
                  :key="pt.code"
                  :value="pt.code"
                >
                  {{ pt.name }}
                </option>
              </select>
              <select v-model="moldStatusFilter" class="select-filter">
                <option value="ALL">Semua Status Stok</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="ON_ORDER">PO / Indent</option>
                <option value="NEGOTIATION">Negosiasi</option>
                <option value="SOLD">Terjual</option>
              </select>
              <select v-model="moldVisibilityFilter" class="select-filter">
                <option value="ALL">Semua Status Tampil</option>
                <option value="VISIBLE">Ditampilkan di Website</option>
                <option value="HIDDEN">Tidak Ditampilkan (Draft)</option>
              </select>
            </div>
            <button class="btn btn-gold" @click="openAddMoldModal">
              <Plus :size="16" /> Tambah Molding Baru
            </button>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="90">Foto & Galeri</th>
                  <th>Kode & Nama Mold</th>
                  <th>Tipe & Kategori</th>
                  <th>Spesifikasi</th>
                  <th>Harga & Stok</th>
                  <th>Tampil di Website?</th>
                  <th width="110">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredMolds.length === 0">
                  <td colspan="7" class="text-center py-8 text-muted">
                    Tidak ada listing molding yang sesuai filter.
                  </td>
                </tr>
                <tr
                  v-for="mold in filteredMolds"
                  :key="mold.id"
                  :class="{ 'row-hidden': mold.isVisible === false }"
                >
                  <td>
                    <div class="table-media-wrap">
                      <img
                        :src="
                          mold.imageUrl ||
                          'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=200&q=80'
                        "
                        class="thumb-img"
                      />
                      <small
                        v-if="mold.galleryImages && mold.galleryImages.length"
                        class="extra-img-badge"
                      >
                        +{{ mold.galleryImages.length }} foto
                      </small>
                    </div>
                  </td>
                  <td>
                    <b class="font-bold text-navy">{{ mold.name }}</b>
                    <div class="sub-text">
                      Kode: <code>{{ mold.code }}</code>
                    </div>
                    <small v-if="mold.featured" class="badge-featured"
                      >⭐ Unggulan Beranda</small
                    >
                  </td>
                  <td>
                    <span
                      class="pill-type"
                      :class="'type-' + mold.type.toLowerCase()"
                      >{{ getProcurementTypeLabel(mold.type) }}</span
                    >
                    <div class="mt-1 text-xs font-semibold">
                      {{ mold.category }}
                    </div>
                  </td>
                  <td>
                    <small class="block"
                      >Cavity: <b>{{ mold.cavity || "-" }}</b></small
                    >
                    <small class="block"
                      >Dimensi: {{ mold.dimensions || "-" }}</small
                    >
                    <small class="block"
                      >Mesin: {{ mold.machineTonnage || "-" }}</small
                    >
                  </td>
                  <td>
                    <b class="block mb-1">{{
                      mold.priceLabel || "Minta penawaran"
                    }}</b>
                    <span
                      class="status-pill"
                      :class="'status-' + mold.status.toLowerCase()"
                      >{{ mold.status }}</span
                    >
                  </td>
                  <td>
                    <button
                      type="button"
                      class="visibility-toggle-btn"
                      :class="mold.isVisible !== false ? 'vis-on' : 'vis-off'"
                      @click="toggleMoldVisibility(mold)"
                    >
                      <Eye v-if="mold.isVisible !== false" :size="14" />
                      <EyeOff v-else :size="14" />
                      <span>{{
                        mold.isVisible !== false
                          ? "Ditampilkan di Website"
                          : "Tidak Ditampilkan"
                      }}</span>
                    </button>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button
                        class="btn-icon"
                        title="Edit Molding & Galeri Detail"
                        @click="openEditMoldModal(mold)"
                      >
                        <Edit3 :size="15" />
                      </button>
                      <button
                        class="btn-icon danger"
                        title="Hapus"
                        @click="deleteMold(mold)"
                      >
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filteredMolds.length">
                  <td colspan="7" style="text-align: center; padding: 48px 16px; color: #64748b;">
                    Belum ada data molding yang tersedia. Klik "+ Tambah Molding Baru" untuk membuat baru.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 4: MOLDED PLASTIC PRODUCTS -->
        <div v-if="activeTab === 'products'" class="tab-pane">
          <div class="toolbar">
            <div class="toolbar-left">
              <div>
                <h2 style="margin: 0 0 4px">
                  Katalog Contoh Hasil Cetakan Plastik
                </h2>
                <p class="section-sub" style="margin: 0">
                  Kelola contoh produk plastik yang dapat diproduksi beserta
                  detail dan maksimal 3 gambar tambahan.
                </p>
              </div>
            </div>
            <div class="toolbar-filters">
              <select v-model="productCategoryFilter" class="select-filter">
                <option value="ALL">Semua Kategori</option>
                <option v-for="c in categories" :key="c.id" :value="c.name">
                  {{ c.name }}
                </option>
              </select>
              <select v-model="productVisibilityFilter" class="select-filter">
                <option value="ALL">Semua Status Tampil</option>
                <option value="VISIBLE">Ditampilkan di Website</option>
                <option value="HIDDEN">Tidak Ditampilkan</option>
              </select>
              <button class="btn btn-gold" @click="openAddProductModal">
                <Plus :size="16" /> Tambah Contoh Produk
              </button>
            </div>
          </div>

          <div class="products-grid">
            <div
              v-if="!filteredProducts.length"
              style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;"
            >
              Belum ada contoh produk hasil cetakan. Klik "+ Tambah Contoh Produk" untuk membuat baru.
            </div>
            <div
              v-for="prod in filteredProducts"
              :key="prod.id"
              class="product-admin-card"
              :class="{ 'is-hidden-item': prod.isVisible === false }"
            >
              <div class="prod-card-img-wrap">
                <img
                  :src="
                    prod.imageUrl ||
                    'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=600&q=80'
                  "
                />
                <div
                  v-if="prod.galleryImages && prod.galleryImages.length"
                  class="mini-thumbs"
                >
                  <img
                    v-for="(gUrl, idx) in prod.galleryImages.slice(0, 3)"
                    :key="idx"
                    :src="gUrl"
                  />
                  <span>+{{ prod.galleryImages.length }} detail</span>
                </div>
              </div>
              <div class="card-content">
                <div class="card-top-row">
                  <span class="badge-cat">{{ prod.category }}</span>
                  <button
                    type="button"
                    class="visibility-toggle-btn btn-xs"
                    :class="prod.isVisible !== false ? 'vis-on' : 'vis-off'"
                    @click="toggleProductVisibility(prod)"
                  >
                    <Eye v-if="prod.isVisible !== false" :size="12" />
                    <EyeOff v-else :size="12" />
                    <span>{{
                      prod.isVisible !== false
                        ? "Ditampilkan di Website"
                        : "Tidak Ditampilkan"
                    }}</span>
                  </button>
                </div>

                <h4>{{ prod.name }}</h4>
                <p>{{ prod.description }}</p>
                <div class="prod-specs">
                  <span v-if="prod.weightEst"
                    >Berat: <b>{{ prod.weightEst }}</b></span
                  >
                  <span v-if="prod.dimensions"
                    >Dimensi: <b>{{ prod.dimensions }}</b></span
                  >
                  <span v-if="prod.moldInfo"
                    >Mold: <b>{{ prod.moldInfo }}</b></span
                  >
                  <span v-if="prod.materialType"
                    >Material: <b>{{ prod.materialType }}</b></span
                  >
                </div>
                <div class="card-actions">
                  <button
                    class="btn btn-outline-dark btn-sm"
                    @click="openEditProductModal(prod)"
                  >
                    <Edit3 :size="13" /> Edit Detail & Galeri
                  </button>
                  <button
                    class="btn btn-danger-soft btn-sm"
                    @click="deleteProduct(prod)"
                  >
                    <Trash2 :size="13" /> Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 5: CMS WEBSITE CONTENT -->
        <div v-if="activeTab === 'cms'" class="tab-pane">
          <div class="cms-subtabs">
            <button
              :class="{ active: cmsSubTab === 'general' }"
              @click="cmsSubTab = 'general'"
            >
              1. Kontak & Perusahaan
            </button>
            <button
              :class="{ active: cmsSubTab === 'hero' }"
              @click="cmsSubTab = 'hero'"
            >
              2. Banner Utama (Hero)
            </button>
            <button
              :class="{ active: cmsSubTab === 'services' }"
              @click="cmsSubTab = 'services'"
            >
              3. Layanan (3 Pilar)
            </button>
            <button
              :class="{ active: cmsSubTab === 'process' }"
              @click="cmsSubTab = 'process'"
            >
              4. Cara Pemesanan (PO/Indent)
            </button>
            <button
              :class="{ active: cmsSubTab === 'about' }"
              @click="cmsSubTab = 'about'"
            >
              5. Profil Tentang Kami
            </button>
            <button
              :class="{ active: cmsSubTab === 'seo' }"
              @click="cmsSubTab = 'seo'"
            >
              6. SEO & Kata Kunci Google
            </button>
            <button
              :class="{ active: cmsSubTab === 'theme' }"
              @click="
                cmsSubTab = 'theme';
                ensureThemeColors();
              "
            >
              7. Logo & Warna Tema
            </button>
          </div>

          <div class="cms-form-card" v-if="cms && cms.general">
            <div v-if="cmsSubTab === 'general'" class="form-section">
              <h3 class="form-title">Informasi Usaha & Kontak Resmi</h3>
              <p class="form-help">
                Informasi ini akan otomatis diperbarui di header, footer, topbar
                pengumuman, dan tombol konsultasi WhatsApp di seluruh website.
              </p>

              <div class="grid-2">
                <label class="field-label">
                  <span>Nama Usaha / Website</span>
                  <input
                    v-model="cms.general.siteName"
                    placeholder="Contoh: iLUFA MOLDING"
                  />
                </label>
                <label class="field-label">
                  <span>Tagline Resmi</span>
                  <input
                    v-model="cms.general.siteTagline"
                    placeholder="Contoh: Industrial Mold Procurement"
                  />
                </label>
                <label class="field-label">
                  <span>Nomor WhatsApp (Aktif) *</span>
                  <input
                    v-model="cms.general.whatsappNumber"
                    placeholder="Contoh: 6289676181754 (awali kode negara 62)"
                  />
                  <small
                    >Gunakan format tanpa tanda plus atau spasi, contoh:
                    6289676181754</small
                  >
                </label>
                <label class="field-label">
                  <span>Nomor Telepon Kantor</span>
                  <input
                    v-model="cms.general.phone"
                    placeholder="+6289676181754"
                  />
                </label>
                <label class="field-label">
                  <span>Email Resmi</span>
                  <input
                    v-model="cms.general.email"
                    placeholder="info@ilufamolding.com"
                  />
                </label>
                <label class="field-label">
                  <span>Jam Operasional</span>
                  <input
                    v-model="cms.general.operationalHours"
                    placeholder="Senin - Sabtu: 08.00 - 17.00 WIB"
                  />
                </label>
                <label class="field-label col-span-2">
                  <span>Alamat Pabrik / Kantor</span>
                  <textarea
                    v-model="cms.general.address"
                    rows="2"
                    placeholder="Alamat lengkap bengkel / kantor operasional"
                  ></textarea>
                </label>
                <label class="field-label col-span-2">
                  <span>Teks Pengumuman Topbar (Paling Atas Website)</span>
                  <input
                    v-model="cms.general.topbarNotice"
                    placeholder="Contoh: Solusi pengadaan molding untuk kebutuhan industri..."
                  />
                </label>
                <label class="field-label col-span-2">
                  <span>Pesan Pembuka WhatsApp Otomatis</span>
                  <input
                    v-model="cms.general.whatsappMessage"
                    placeholder="Pesan template saat pengunjung menekan tombol WhatsApp"
                  />
                </label>
              </div>
            </div>

            <div v-if="cmsSubTab === 'hero'" class="form-section">
              <h3 class="form-title">
                Banner Utama Halaman Depan (Hero Section)
              </h3>
              <p class="form-help">
                Pengunjung pertama kali akan melihat teks dan gambar ini. Buat
                pesan yang tegas dan menarik bagi pabrik plastik.
              </p>

              <div class="grid-2">
                <label class="field-label col-span-2">
                  <span>Label Atas (Eyebrow Tag)</span>
                  <input
                    v-model="cms.hero.eyebrow"
                    placeholder="SOLUSI PENGADAAN MOLDING PLASTIK"
                  />
                </label>
                <label class="field-label col-span-2">
                  <span>Judul Utama (Headline Besar)</span>
                  <textarea
                    v-model="cms.hero.title"
                    rows="2"
                    placeholder="Molding yang tepat.&#10;Produksi lebih siap."
                  ></textarea>
                  <small>Gunakan Enter untuk baris baru.</small>
                </label>
                <label class="field-label col-span-2">
                  <span>Subjudul / Deskripsi Singkat</span>
                  <textarea
                    v-model="cms.hero.subtitle"
                    rows="3"
                    placeholder="Pemesanan molding injeksi plastik baru, custom, dan siap pakai..."
                  ></textarea>
                </label>
                <label class="field-label">
                  <span>Teks Tombol Utama</span>
                  <input
                    v-model="cms.hero.primaryCtaText"
                    placeholder="Konsultasi & Minta Penawaran"
                  />
                </label>
                <label class="field-label">
                  <span>Teks Tombol Kedua</span>
                  <input
                    v-model="cms.hero.secondaryCtaText"
                    placeholder="Jelajahi Katalog"
                  />
                </label>
                <div class="field-label col-span-2">
                  <span>URL Gambar Banner Hero</span>
                  <div class="input-with-upload">
                    <input
                      v-model="cms.hero.imageUrl"
                      placeholder="https://..."
                    />
                    <label class="btn-upload">
                      <Upload :size="14" /> Unggah Foto
                      <input
                        type="file"
                        accept="image/*"
                        @change="
                          (e) => handleFileUpload(e, cms.hero, 'imageUrl')
                        "
                      />
                    </label>
                  </div>
                  <div v-if="cms.hero.imageUrl" class="preview-img-box">
                    <img :src="cms.hero.imageUrl" />
                  </div>
                </div>
                <div class="field-label col-span-2">
                  <span>3 Poin Keunggulan Utama (Checklist di Hero)</span>
                  <div class="grid-3 mt-2">
                    <input
                      v-model="cms.hero.badges[0]"
                      placeholder="Keunggulan 1"
                    />
                    <input
                      v-model="cms.hero.badges[1]"
                      placeholder="Keunggulan 2"
                    />
                    <input
                      v-model="cms.hero.badges[2]"
                      placeholder="Keunggulan 3"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="cmsSubTab === 'services'" class="form-section">
              <h3 class="form-title">3 Pilar Layanan iLUFA Molding</h3>
              <p class="form-help">
                Sesuaikan judul, deskripsi, dan teks tombol untuk 3 layanan:
                Import Baru, Custom, dan Siap Pakai.
              </p>

              <div class="services-edit-list">
                <div
                  v-for="(srv, idx) in cms.services"
                  :key="idx"
                  class="service-edit-box"
                >
                  <div class="service-edit-header">
                    <b>Layanan {{ idx + 1 }}: {{ srv.title }}</b>
                    <span class="badge">{{ srv.num }}</span>
                  </div>
                  <div class="grid-2 mt-2">
                    <label class="field-label">
                      <span>Judul Layanan</span>
                      <input v-model="srv.title" />
                    </label>
                    <label class="field-label">
                      <span>Teks Tombol Aksi</span>
                      <input v-model="srv.ctaText" />
                    </label>
                    <label class="field-label col-span-2">
                      <span>Penjelasan Layanan</span>
                      <textarea v-model="srv.desc" rows="3"></textarea>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="cmsSubTab === 'process'" class="form-section">
              <h3 class="form-title">
                Alur & Cara Pemesanan (Sistem PO / Indent)
              </h3>
              <p class="form-help">
                Beri pemahaman yang jelas kepada pabrik/pembeli mengenai 4
                tahapan transaksi dari spesifikasi hingga pengiriman.
              </p>

              <div class="process-edit-list">
                <div
                  v-for="(st, idx) in cms.process"
                  :key="idx"
                  class="process-edit-box"
                >
                  <span class="step-num">{{ st.step }}</span>
                  <div class="step-inputs">
                    <label class="field-label">
                      <span>Judul Langkah {{ st.step }}</span>
                      <input v-model="st.title" />
                    </label>
                    <label class="field-label mt-2">
                      <span>Keterangan Alur</span>
                      <textarea v-model="st.desc" rows="2"></textarea>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="cmsSubTab === 'about'" class="form-section">
              <h3 class="form-title">Profil Tentang Kami (About Us)</h3>
              <p class="form-help">
                Bangun kredibilitas perusahaan dengan latar belakang, komitmen
                transparansi, dan dokumentasi foto.
              </p>

              <div class="grid-2">
                <label class="field-label col-span-2">
                  <span>Judul Seksi Tentang Kami</span>
                  <textarea v-model="cms.about.title" rows="2"></textarea>
                </label>
                <label class="field-label col-span-2">
                  <span>Paragraf Penjelasan 1</span>
                  <textarea v-model="cms.about.p1" rows="3"></textarea>
                </label>
                <label class="field-label col-span-2">
                  <span>Paragraf Penjelasan 2</span>
                  <textarea v-model="cms.about.p2" rows="3"></textarea>
                </label>
                <div class="field-label col-span-2">
                  <span>URL Gambar Profil / Fasilitas</span>
                  <div class="input-with-upload">
                    <input v-model="cms.about.imageUrl" />
                    <label class="btn-upload">
                      <Upload :size="14" /> Unggah Foto
                      <input
                        type="file"
                        accept="image/*"
                        @change="
                          (e) => handleFileUpload(e, cms.about, 'imageUrl')
                        "
                      />
                    </label>
                  </div>
                  <div v-if="cms.about.imageUrl" class="preview-img-box">
                    <img :src="cms.about.imageUrl" />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="cmsSubTab === 'seo' && cms.seo" class="form-section">
              <h3 class="form-title">Optimasi Mesin Pencari Google (SEO)</h3>
              <p class="form-help">
                Atur judul halaman (Meta Title), deskripsi (Meta Description),
                dan kata kunci utama seperti
                <strong>jual molding injeksi plastik siap pakai</strong>,
                <strong>jasa pemesanan molding import</strong>, dan
                <strong>pembuatan molding plastik custom</strong> agar website
                mudah ditemukan oleh pabrik plastik di Google.
              </p>

              <div class="grid-2">
                <label class="field-label col-span-2">
                  <span>Judul Halaman Google (Meta Title) *</span>
                  <input
                    v-model="cms.seo.metaTitle"
                    placeholder="iLUFA Molding — Jual Molding Injeksi Plastik Siap Pakai, Jasa Pemesanan Molding Import & Pembuatan Molding Plastik Custom"
                  />
                  <small>
                    Disarankan memuat kata kunci utama dan nama brand (60–110
                    karakter).
                  </small>
                </label>

                <label class="field-label col-span-2">
                  <span>Deskripsi Pencarian Google (Meta Description) *</span>
                  <textarea
                    v-model="cms.seo.metaDescription"
                    rows="3"
                    placeholder="iLUFA Molding melayani jasa pemesanan molding import baru, pembuatan molding plastik custom, serta jual molding injeksi plastik siap pakai..."
                  ></textarea>
                  <small>
                    Teks ringkasan yang muncul di bawah judul pada hasil
                    pencarian Google (140–220 karakter).
                  </small>
                </label>

                <label class="field-label col-span-2">
                  <span>Kata Kunci Target (Meta Keywords)</span>
                  <textarea
                    v-model="cms.seo.metaKeywords"
                    rows="2"
                    placeholder="jual molding injeksi plastik siap pakai, jasa pemesanan molding import, pembuatan molding plastik custom..."
                  ></textarea>
                  <small
                    >Pisahkan setiap kata kunci dengan tanda koma (,).</small
                  >
                </label>

                <label class="field-label col-span-2">
                  <span>Canonical Domain URL</span>
                  <input
                    v-model="cms.seo.canonicalUrl"
                    placeholder="https://ilufamolding.com/"
                  />
                </label>
              </div>
            </div>

            <!-- SUBTAB 7: LOGO & THEME COLORS -->
            <div v-if="cmsSubTab === 'theme'" class="form-section">
              <h3 class="form-title">Logo & Konsep Warna Website</h3>
              <p class="form-help">
                Sesuaikan logo resmi perusahaan serta palet warna website (Warna
                Utama, Latar Sekunder, dan Aksen Emas) agar selaras dengan
                identitas brand Anda.
              </p>

              <!-- BAGIAN 1: LOGO WEBSITE -->
              <div class="theme-card-block">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                    flex-wrap: wrap;
                    gap: 8px;
                  "
                >
                  <div>
                    <h4
                      style="margin: 0 0 4px; font-size: 15px; color: #0b1f33"
                    >
                      1. Logo Perusahaan / Brand
                    </h4>
                    <p style="font-size: 12px; color: #64748b; margin: 0">
                      Unggah logo resmi Anda (format PNG transparan, WEBP, atau
                      JPG). Jika dikosongkan, website otomatis menampilkan
                      lambang inisial kotak default.
                    </p>
                  </div>
                  <button
                    v-if="cms.general.logoUrl"
                    class="btn btn-outline-danger btn-sm"
                    @click="cms.general.logoUrl = ''"
                    type="button"
                  >
                    <Trash2 :size="13" /> Hapus Logo (Gunakan Inisial)
                  </button>
                </div>

                <div class="input-with-upload">
                  <input
                    v-model="cms.general.logoUrl"
                    placeholder="URL Gambar Logo (atau klik tombol Unggah Logo)"
                  />
                  <label class="btn-upload">
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleFileUpload($event, cms.general, 'logoUrl')"
                    />
                    <span><Upload :size="14" /> Unggah Logo</span>
                  </label>
                </div>

                <!-- Preview Logo -->
                <div v-if="cms.general.logoUrl" class="logo-preview-grid">
                  <div class="logo-preview-box light">
                    <span class="preview-label"
                      >Pratinjau di Header (Latar Putih)</span
                    >
                    <div class="preview-img-wrap">
                      <img
                        :src="cms.general.logoUrl"
                        alt="Logo Header Preview"
                      />
                    </div>
                  </div>
                  <div
                    class="logo-preview-box dark"
                    :style="{
                      background:
                        cms.general?.themeColors?.primaryNavy || '#0b1f33',
                    }"
                  >
                    <span class="preview-label" style="color: #94a3b8"
                      >Pratinjau di Footer (Latar Gelap)</span
                    >
                    <div class="preview-img-wrap">
                      <img
                        :src="cms.general.logoUrl"
                        alt="Logo Footer Preview"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- BAGIAN 2: PALET WARNA WEBSITE -->
              <div class="theme-card-block" style="margin-top: 24px">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                    gap: 10px;
                  "
                >
                  <div>
                    <h4
                      style="margin: 0 0 4px; font-size: 15px; color: #0b1f33"
                    >
                      2. Konsep Warna Tema Website
                    </h4>
                    <p style="font-size: 12px; color: #64748b; margin: 0">
                      Ubah warna tema utama, sekunder, dan aksen emas. Warna
                      langsung diterapkan ke seluruh halaman website.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    @click="applyColorPreset('#0b1f33', '#122e47', '#d9aa52')"
                  >
                    <RotateCcw :size="13" /> Reset ke Default iLUFA
                  </button>
                </div>

                <div class="theme-colors-grid">
                  <!-- Warna 1: Primary Navy -->
                  <div class="color-picker-card">
                    <div
                      class="color-swatch-circle"
                      :style="{
                        background:
                          cms.general?.themeColors?.primaryNavy || '#0b1f33',
                      }"
                    ></div>
                    <div class="color-details">
                      <span class="color-label">Warna Utama (Primary)</span>
                      <small class="color-desc"
                        >Header brand, Hero banner, Tombol utama</small
                      >
                      <div class="color-input-group">
                        <input
                          type="color"
                          v-model="cms.general.themeColors.primaryNavy"
                          class="color-native-input"
                        />
                        <input
                          type="text"
                          v-model="cms.general.themeColors.primaryNavy"
                          class="color-hex-input"
                          maxlength="7"
                          placeholder="#0b1f33"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Warna 2: Secondary Navy -->
                  <div class="color-picker-card">
                    <div
                      class="color-swatch-circle"
                      :style="{
                        background:
                          cms.general?.themeColors?.secondaryNavy || '#122e47',
                      }"
                    ></div>
                    <div class="color-details">
                      <span class="color-label">Warna Latar (Secondary)</span>
                      <small class="color-desc"
                        >Topbar pengumuman, Card navy, Footer</small
                      >
                      <div class="color-input-group">
                        <input
                          type="color"
                          v-model="cms.general.themeColors.secondaryNavy"
                          class="color-native-input"
                        />
                        <input
                          type="text"
                          v-model="cms.general.themeColors.secondaryNavy"
                          class="color-hex-input"
                          maxlength="7"
                          placeholder="#122e47"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Warna 3: Accent Gold -->
                  <div class="color-picker-card">
                    <div
                      class="color-swatch-circle"
                      :style="{
                        background:
                          cms.general?.themeColors?.accentGold || '#d9aa52',
                      }"
                    ></div>
                    <div class="color-details">
                      <span class="color-label">Warna Aksen (Accent)</span>
                      <small class="color-desc"
                        >Tombol CTA emas, Garis eyebrow, Badge highlight</small
                      >
                      <div class="color-input-group">
                        <input
                          type="color"
                          v-model="cms.general.themeColors.accentGold"
                          class="color-native-input"
                        />
                        <input
                          type="text"
                          v-model="cms.general.themeColors.accentGold"
                          class="color-hex-input"
                          maxlength="7"
                          placeholder="#d9aa52"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Rekomendasi Palet Cepat -->
                <div class="palette-quick-select">
                  <span class="palette-quick-label">
                    Pilihan Palet Warna Siap Pakai:
                  </span>
                  <div class="palette-chips-wrap">
                    <button
                      type="button"
                      class="btn-palette-chip"
                      @click="applyColorPreset('#0b1f33', '#122e47', '#d9aa52')"
                    >
                      <span
                        class="dot-swatch"
                        style="background: #0b1f33"
                      ></span>
                      <span
                        class="dot-swatch"
                        style="background: #d9aa52"
                      ></span>
                      iLUFA Classic (Navy & Emas)
                    </button>
                    <button
                      type="button"
                      class="btn-palette-chip"
                      @click="applyColorPreset('#0f172a', '#1e293b', '#2563eb')"
                    >
                      <span
                        class="dot-swatch"
                        style="background: #0f172a"
                      ></span>
                      <span
                        class="dot-swatch"
                        style="background: #2563eb"
                      ></span>
                      Steel Industrial (Slate & Blue)
                    </button>
                    <button
                      type="button"
                      class="btn-palette-chip"
                      @click="applyColorPreset('#064e3b', '#065f46', '#10b981')"
                    >
                      <span
                        class="dot-swatch"
                        style="background: #064e3b"
                      ></span>
                      <span
                        class="dot-swatch"
                        style="background: #10b981"
                      ></span>
                      Emerald Eco (Dark Green & Emerald)
                    </button>
                    <button
                      type="button"
                      class="btn-palette-chip"
                      @click="applyColorPreset('#18181b', '#27272a', '#e11d48')"
                    >
                      <span
                        class="dot-swatch"
                        style="background: #18181b"
                      ></span>
                      <span
                        class="dot-swatch"
                        style="background: #e11d48"
                      ></span>
                      Titanium High-Tech (Zinc & Red)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="cms-save-bar" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
              <button class="btn btn-outline-danger" @click="resetCMS" title="Kembalikan semua teks CMS ke standar">
                <RotateCcw :size="15" /> Reset Teks CMS
              </button>
              <button class="btn btn-outline-danger" @click="resetDemoCatalog" title="Kembalikan data katalog sample jika setelah pengetesan ingin memulihkannya">
                <RotateCcw :size="15" /> Pulihkan Data Katalog Contoh
              </button>
              <button class="btn btn-gold" @click="saveCMS" :disabled="loading">
                <Save :size="16" />
                {{ loading ? "Menyimpan..." : "Simpan Semua Perubahan CMS" }}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 6: CMS FAQS -->
        <div v-if="activeTab === 'faqs'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2 style="margin: 0 0 4px">Kelola Tanya Jawab (FAQ)</h2>
              <p class="section-sub" style="margin: 0">
                Daftar pertanyaan umum yang ditampilkan di halaman beranda untuk
                meyakinkan calon pelanggan sebelum menghubungi tim.
              </p>
            </div>
            <button class="btn btn-gold" @click="addFaqItem">
              <Plus :size="16" /> Tambah FAQ Baru
            </button>
          </div>

          <div class="faq-admin-list">
            <div
              v-for="(faq, idx) in cms.faqs"
              :key="idx"
              class="faq-admin-item"
            >
              <div class="faq-item-header">
                <b>Pertanyaan {{ idx + 1 }}</b>
                <button
                  class="btn-icon danger"
                  @click="removeFaqItem(idx)"
                  title="Hapus Pertanyaan"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
              <label class="field-label">
                <span>Pertanyaan</span>
                <input v-model="faq.q" placeholder="Pertanyaan..." />
              </label>
              <label class="field-label mt-2">
                <span>Jawaban</span>
                <textarea
                  v-model="faq.a"
                  rows="3"
                  placeholder="Jawaban lengkap..."
                ></textarea>
              </label>
            </div>
          </div>

          <div
            class="mt-6"
            style="display: flex; justify-content: flex-end; margin-top: 20px"
          >
            <button class="btn btn-gold" @click="saveCMS">
              <Save :size="16" /> Simpan Perubahan FAQ
            </button>
          </div>
        </div>

        <!-- TAB 7: INQUIRIES (RFQ LEADS) -->
        <div v-if="activeTab === 'inquiries'" class="tab-pane">
          <div class="toolbar">
            <div>
              <h2 style="margin: 0 0 4px">Permintaan Penawaran Masuk (RFQ)</h2>
              <p class="section-sub" style="margin: 0">
                Daftar calon pelanggan pabrik yang telah mengirim form kebutuhan
                molding.
              </p>
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
                    <small>{{
                      new Date(inq.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    }}</small>
                  </td>
                  <td>
                    <b class="text-navy">{{ inq.companyName }}</b>
                    <div>PIC: {{ inq.contactName }}</div>
                    <small class="text-muted block"
                      >Telp: {{ inq.phone }}</small
                    >
                    <small v-if="inq.email" class="text-muted block"
                      >Email: {{ inq.email }}</small
                    >
                  </td>
                  <td>
                    <span
                      class="pill-type"
                      :class="'type-' + inq.moldType.toLowerCase()"
                      >{{ inq.moldType }}</span
                    >
                    <div v-if="inq.targetDate" class="text-xs text-muted mt-1">
                      Target: {{ inq.targetDate }}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm font-medium">{{ inq.productNeed }}</div>
                    <small v-if="inq.notes" class="text-muted italic block mt-1"
                      >Catatan: {{ inq.notes }}</small
                    >
                  </td>
                  <td>
                    <div class="text-xs">Cavity: {{ inq.cavity || "-" }}</div>
                    <div class="text-xs">
                      Dimensi: {{ inq.dimensions || "-" }}
                    </div>
                    <div class="text-xs">
                      Mesin: {{ inq.machineInfo || "-" }}
                    </div>
                    <div class="text-xs text-gold font-bold" v-if="inq.budget">
                      Budget: {{ inq.budget }}
                    </div>
                  </td>
                  <td>
                    <select
                      :value="inq.status"
                      @change="(e) => updateInquiryStatus(inq, e.target.value)"
                      class="status-select"
                    >
                      <option value="NEW">BARU</option>
                      <option value="CONTACTED">DIHUBUNGI</option>
                      <option value="QUOTED">PENAWARAN DIBERIKAN</option>
                      <option value="DEAL">DEAL / PO</option>
                      <option value="REJECTED">BATAL / REJECT</option>
                    </select>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <a
                        :href="waInquiryLink(inq)"
                        target="_blank"
                        class="btn btn-wa-sm"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageCircle :size="14" /> Chat PIC
                      </a>
                      <button
                        class="btn-icon danger"
                        @click="deleteInquiry(inq)"
                        title="Hapus"
                      >
                        <Trash2 :size="15" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filteredMolds.length">
                  <td colspan="7" style="text-align: center; padding: 48px 16px; color: #64748b;">
                    Belum ada data molding yang tersedia. Klik "+ Tambah Molding Baru" untuk membuat baru.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL FORM: TAMBAH / EDIT KATEGORI & DETAIL (MAX 3 GAMBAR TAMBAHAN) -->
    <div
      v-if="categoryModalOpen"
      class="modal-backdrop"
      @click.self="categoryModalOpen = false"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            {{
              isEditingCategory
                ? "Edit Kategori & Detail Galeri"
                : "Tambah Kategori Baru"
            }}
          </h3>
          <button
            type="button"
            class="close-btn"
            @click="categoryModalOpen = false"
          >
            <X :size="18" />
          </button>
        </div>
        <form @submit.prevent="saveCategory" class="modal-form">
          <div class="modal-body">
            <div class="grid-2">
              <label class="field-label">
                <span>Nama Kategori *</span>
                <input
                  v-model="categoryForm.name"
                  required
                  placeholder="Contoh: Gantungan & Cantolan, Packaging..."
                />
              </label>
              <label class="field-label">
                <span>Tampilkan Kategori Ini di Website? *</span>
                <select v-model="categoryForm.isVisible">
                  <option :value="true">✅ Ya, Tampilkan di Website</option>
                  <option :value="false">
                    🚫 Tidak, Sembunyikan dari Website
                  </option>
                </select>
              </label>

              <label class="field-label col-span-2">
                <span>Deskripsi Singkat Kategori</span>
                <input
                  v-model="categoryForm.description"
                  placeholder="Ringkasan 1 kalimat mengenai kategori ini..."
                />
              </label>

              <label class="field-label col-span-2">
                <span>Penjelasan Detail Kategori</span>
                <textarea
                  v-model="categoryForm.detailContent"
                  rows="3"
                  placeholder="Jelaskan secara detail produk apa saja yang masuk kategori ini, rekomendasi material plastik (PP/HDPE/ABS), jumlah cavity, atau spesifikasi mesin..."
                ></textarea>
              </label>

              <div class="field-label col-span-2">
                <span>Gambar Utama Kategori</span>
                <div class="input-with-upload">
                  <input
                    v-model="categoryForm.imageUrl"
                    placeholder="URL Gambar Utama atau klik Unggah..."
                  />
                  <label class="btn-upload">
                    <Upload :size="14" /> Unggah Foto
                    <input
                      type="file"
                      accept="image/*"
                      @change="
                        (e) => handleFileUpload(e, categoryForm, 'imageUrl')
                      "
                    />
                  </label>
                </div>
                <div v-if="categoryForm.imageUrl" class="thumb-preview">
                  <img :src="categoryForm.imageUrl" />
                </div>
              </div>

              <!-- GALERI 3 GAMBAR DETAIL TAMBAHAN -->
              <div class="col-span-2 gallery-box-section">
                <div class="gallery-box-header">
                  <b
                    >Galeri Gambar Detail Kategori (Maksimal 3 Gambar
                    Tambahan)</b
                  >
                  <small
                    >Opsional. Jika dikosongkan tidak akan menampilkan slot
                    kosong di website.</small
                  >
                </div>
                <div class="gallery-slots-grid">
                  <div
                    v-for="idx in [0, 1, 2]"
                    :key="idx"
                    class="gallery-slot-card"
                  >
                    <div class="slot-head">
                      <span>Gambar Detail {{ idx + 1 }}</span>
                      <button
                        v-if="categoryForm.gallerySlots[idx]"
                        type="button"
                        class="clear-slot-btn"
                        @click="categoryForm.gallerySlots[idx] = ''"
                      >
                        Hapus
                      </button>
                    </div>
                    <input
                      v-model="categoryForm.gallerySlots[idx]"
                      placeholder="Tempel URL Gambar..."
                    />
                    <label class="btn-upload btn-upload-slot">
                      <Upload :size="12" /> Upload Gambar {{ idx + 1 }}
                      <input
                        type="file"
                        accept="image/*"
                        @change="
                          (e) =>
                            handleGallerySlotUpload(
                              e,
                              categoryForm.gallerySlots,
                              idx,
                            )
                        "
                      />
                    </label>
                    <div
                      v-if="categoryForm.gallerySlots[idx]"
                      class="slot-thumb"
                    >
                      <img :src="categoryForm.gallerySlots[idx]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-dark"
              @click="categoryModalOpen = false"
            >
              Batal
            </button>
            <button type="submit" class="btn btn-gold" :disabled="loading">
              <Save :size="15" />
              {{
                isEditingCategory
                  ? "Simpan Perubahan Kategori"
                  : "Tambahkan Kategori"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL FORM: TAMBAH / EDIT MOLDING -->
    <div
      v-if="moldModalOpen"
      class="modal-backdrop"
      @click.self="moldModalOpen = false"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            {{
              isEditingMold
                ? "Edit Data Molding & Detail"
                : "Tambah Molding Baru"
            }}
          </h3>
          <button
            type="button"
            class="close-btn"
            @click="moldModalOpen = false"
          >
            <X :size="18" />
          </button>
        </div>
        <form @submit.prevent="saveMold" class="modal-form">
          <div class="modal-body">
            <div class="grid-2">
              <label class="field-label">
                <span>Nama Molding *</span>
                <input
                  v-model="moldForm.name"
                  required
                  placeholder="Contoh: Mold Tutup Botol 28mm"
                />
              </label>
              <label class="field-label">
                <span>Kode Cetakan</span>
                <input
                  v-model="moldForm.code"
                  placeholder="Contoh: ILF-USD-005"
                />
              </label>
              <label class="field-label">
                <span>Tipe Kategori Pengadaan *</span>
                <select v-model="moldForm.type" required>
                  <option
                    v-for="pt in availableProcurementTypes"
                    :key="pt.code"
                    :value="pt.code"
                  >
                    {{ pt.name }}
                  </option>
                </select>
              </label>
              <label class="field-label">
                <span>Kategori Produk *</span>
                <select v-model="moldForm.category" required>
                  <option v-for="c in categories" :key="c.id" :value="c.name">
                    {{ c.name }}
                  </option>
                  <option
                    v-if="
                      !categories.some((c) => c.name === moldForm.category) &&
                      moldForm.category
                    "
                    :value="moldForm.category"
                  >
                    {{ moldForm.category }}
                  </option>
                </select>
              </label>

              <label class="field-label">
                <span>Tampilkan Molding Ini di Website? *</span>
                <select v-model="moldForm.isVisible">
                  <option :value="true">✅ Ya, Tampilkan di Website</option>
                  <option :value="false">
                    🚫 Tidak, Sembunyikan dari Website (Draft)
                  </option>
                </select>
              </label>
              <label class="field-label">
                <span>Status Ketersediaan Stok</span>
                <select v-model="moldForm.status">
                  <option value="AVAILABLE">Tersedia (Ready)</option>
                  <option value="ON_ORDER">PO / Indent</option>
                  <option value="NEGOTIATION">Sedang Negosiasi</option>
                  <option value="SOLD">Terjual</option>
                </select>
              </label>

              <label class="field-label col-span-2">
                <span>Deskripsi Ringkas (Tampil di Kartu Katalog)</span>
                <textarea
                  v-model="moldForm.description"
                  rows="2"
                  placeholder="Ringkasan kondisi mold dan fungsi utamanya..."
                ></textarea>
              </label>

              <label class="field-label col-span-2">
                <span
                  >Penjelasan Detail Lengkap (Tampil saat Detail Molding
                  Diklik)</span
                >
                <textarea
                  v-model="moldForm.detailContent"
                  rows="3"
                  placeholder="Jelaskan secara mendalam sistem pendingin, sistem runner, histori pemakaian, dan kelengkapan..."
                ></textarea>
              </label>

              <div class="field-label col-span-2">
                <span>Foto Utama Molding</span>
                <div class="input-with-upload">
                  <input
                    v-model="moldForm.imageUrl"
                    placeholder="URL Gambar atau klik Unggah..."
                  />
                  <label class="btn-upload">
                    <Upload :size="14" /> Unggah Foto
                    <input
                      type="file"
                      accept="image/*"
                      @change="(e) => handleFileUpload(e, moldForm, 'imageUrl')"
                    />
                  </label>
                </div>
                <div v-if="moldForm.imageUrl" class="thumb-preview">
                  <img :src="moldForm.imageUrl" />
                </div>
              </div>

              <!-- GALERI 3 GAMBAR DETAIL TAMBAHAN -->
              <div class="col-span-2 gallery-box-section">
                <div class="gallery-box-header">
                  <b>Galeri Foto Detail Molding (Maksimal 3 Gambar Tambahan)</b>
                  <small
                    >Opsional. Tambahkan foto tampak dalam (cavity/core), plat
                    mold base, atau hasil sampel cetakan.</small
                  >
                </div>
                <div class="gallery-slots-grid">
                  <div
                    v-for="idx in [0, 1, 2]"
                    :key="idx"
                    class="gallery-slot-card"
                  >
                    <div class="slot-head">
                      <span>Gambar Detail {{ idx + 1 }}</span>
                      <button
                        v-if="moldForm.gallerySlots[idx]"
                        type="button"
                        class="clear-slot-btn"
                        @click="moldForm.gallerySlots[idx] = ''"
                      >
                        Hapus
                      </button>
                    </div>
                    <input
                      v-model="moldForm.gallerySlots[idx]"
                      placeholder="Tempel URL Gambar..."
                    />
                    <label class="btn-upload btn-upload-slot">
                      <Upload :size="12" /> Upload Gambar {{ idx + 1 }}
                      <input
                        type="file"
                        accept="image/*"
                        @change="
                          (e) =>
                            handleGallerySlotUpload(
                              e,
                              moldForm.gallerySlots,
                              idx,
                            )
                        "
                      />
                    </label>
                    <div v-if="moldForm.gallerySlots[idx]" class="slot-thumb">
                      <img :src="moldForm.gallerySlots[idx]" />
                    </div>
                  </div>
                </div>
              </div>

              <label class="field-label">
                <span>Jumlah Cavity</span>
                <input
                  v-model="moldForm.cavity"
                  type="number"
                  placeholder="Contoh: 4, 8, 16"
                />
              </label>
              <label class="field-label">
                <span>Dimensi Mold Base</span>
                <input
                  v-model="moldForm.dimensions"
                  placeholder="Contoh: 450 x 380 x 420 mm"
                />
              </label>
              <label class="field-label">
                <span>Estimasi Berat (Kg)</span>
                <input
                  v-model="moldForm.weightKg"
                  type="number"
                  step="0.1"
                  placeholder="Contoh: 450"
                />
              </label>
              <label class="field-label">
                <span>Material / Baja Mold</span>
                <input
                  v-model="moldForm.material"
                  placeholder="Contoh: P20, 718H, S136, NAK80"
                />
              </label>
              <label class="field-label">
                <span>Rekomendasi Tonase Mesin</span>
                <input
                  v-model="moldForm.machineTonnage"
                  placeholder="Contoh: 180 - 250 Ton"
                />
              </label>
              <label class="field-label">
                <span>Kondisi & Kelengkapan</span>
                <input
                  v-model="moldForm.condition"
                  placeholder="Contoh: Baru / Siap pakai uji coba"
                />
              </label>
              <label class="field-label col-span-2">
                <span>Label Harga</span>
                <input
                  v-model="moldForm.priceLabel"
                  placeholder="Minta penawaran atau Rp XX.XXX.XXX"
                />
              </label>
              <label class="checkbox-label col-span-2">
                <input type="checkbox" v-model="moldForm.featured" />
                <span>⭐ Prioritaskan di urutan atas katalog (Unggulan)</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-dark"
              @click="moldModalOpen = false"
            >
              Batal
            </button>
            <button type="submit" class="btn btn-gold" :disabled="loading">
              <Save :size="15" />
              {{ isEditingMold ? "Simpan Perubahan" : "Tambahkan Molding" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL FORM: TAMBAH / EDIT PRODUK CETAKAN -->
    <div
      v-if="productModalOpen"
      class="modal-backdrop"
      @click.self="productModalOpen = false"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>
            {{
              isEditingProduct
                ? "Edit Contoh Produk Hasil Cetakan & Detail"
                : "Tambah Contoh Hasil Cetakan"
            }}
          </h3>
          <button
            type="button"
            class="close-btn"
            @click="productModalOpen = false"
          >
            <X :size="18" />
          </button>
        </div>
        <form @submit.prevent="saveProduct" class="modal-form">
          <div class="modal-body">
            <div class="grid-2">
              <label class="field-label">
                <span>Nama Produk Plastik *</span>
                <input
                  v-model="productForm.name"
                  required
                  placeholder="Contoh: Gantungan Baju Anti Slip"
                />
              </label>
              <label class="field-label">
                <span>Kategori Produk *</span>
                <select v-model="productForm.category" required>
                  <option v-for="c in categories" :key="c.id" :value="c.name">
                    {{ c.name }}
                  </option>
                  <option
                    v-if="
                      !categories.some(
                        (c) => c.name === productForm.category,
                      ) && productForm.category
                    "
                    :value="productForm.category"
                  >
                    {{ productForm.category }}
                  </option>
                </select>
              </label>

              <label class="field-label col-span-2">
                <span>Tampilkan Produk Ini di Website? *</span>
                <select v-model="productForm.isVisible">
                  <option :value="true">✅ Ya, Tampilkan di Website</option>
                  <option :value="false">
                    🚫 Tidak, Sembunyikan dari Website (Draft)
                  </option>
                </select>
              </label>

              <label class="field-label col-span-2">
                <span>Deskripsi Singkat (Tampil di Kartu Depan)</span>
                <textarea
                  v-model="productForm.description"
                  rows="2"
                  placeholder="Ringkasan produk dan fungsinya..."
                ></textarea>
              </label>

              <label class="field-label col-span-2">
                <span
                  >Penjelasan Detail Lengkap (Tampil saat Detail Produk
                  Diklik)</span
                >
                <textarea
                  v-model="productForm.detailContent"
                  rows="3"
                  placeholder="Jelaskan karakteristik produk plastik ini, ketebalan dinding, jenis aplikasi industri, dan keunggulan desain cetakannya..."
                ></textarea>
              </label>

              <div class="field-label col-span-2">
                <span>Foto Utama Produk Plastik Jadi</span>
                <div class="input-with-upload">
                  <input
                    v-model="productForm.imageUrl"
                    placeholder="URL Foto atau unggah..."
                  />
                  <label class="btn-upload">
                    <Upload :size="14" /> Unggah Foto
                    <input
                      type="file"
                      accept="image/*"
                      @change="
                        (e) => handleFileUpload(e, productForm, 'imageUrl')
                      "
                    />
                  </label>
                </div>
                <div v-if="productForm.imageUrl" class="thumb-preview">
                  <img :src="productForm.imageUrl" />
                </div>
              </div>

              <!-- GALERI 3 GAMBAR DETAIL TAMBAHAN -->
              <div class="col-span-2 gallery-box-section">
                <div class="gallery-box-header">
                  <b
                    >Galeri Gambar Detail Produk (Maksimal 3 Gambar Tambahan)</b
                  >
                  <small
                    >Opsional. Tambahkan foto tampak samping, detail
                    ulir/engsel, atau variasi warna produk.</small
                  >
                </div>
                <div class="gallery-slots-grid">
                  <div
                    v-for="idx in [0, 1, 2]"
                    :key="idx"
                    class="gallery-slot-card"
                  >
                    <div class="slot-head">
                      <span>Gambar Detail {{ idx + 1 }}</span>
                      <button
                        v-if="productForm.gallerySlots[idx]"
                        type="button"
                        class="clear-slot-btn"
                        @click="productForm.gallerySlots[idx] = ''"
                      >
                        Hapus
                      </button>
                    </div>
                    <input
                      v-model="productForm.gallerySlots[idx]"
                      placeholder="Tempel URL Gambar..."
                    />
                    <label class="btn-upload btn-upload-slot">
                      <Upload :size="12" /> Upload Gambar {{ idx + 1 }}
                      <input
                        type="file"
                        accept="image/*"
                        @change="
                          (e) =>
                            handleGallerySlotUpload(
                              e,
                              productForm.gallerySlots,
                              idx,
                            )
                        "
                      />
                    </label>
                    <div
                      v-if="productForm.gallerySlots[idx]"
                      class="slot-thumb"
                    >
                      <img :src="productForm.gallerySlots[idx]" />
                    </div>
                  </div>
                </div>
              </div>

              <label class="field-label">
                <span>Perkiraan Berat Produk</span>
                <input
                  v-model="productForm.weightEst"
                  placeholder="Contoh: 42 gram"
                />
              </label>
              <label class="field-label">
                <span>Ukuran / Dimensi Produk</span>
                <input
                  v-model="productForm.dimensions"
                  placeholder="Contoh: 42 x 20 x 0.8 cm"
                />
              </label>
              <label class="field-label">
                <span>Informasi Mold Terkait</span>
                <input
                  v-model="productForm.moldInfo"
                  placeholder="Contoh: Mold 4-Cavity Hot Runner"
                />
              </label>
              <label class="field-label">
                <span>Material Resin Plastik</span>
                <input
                  v-model="productForm.materialType"
                  placeholder="Contoh: PP Food Grade / HDPE / ABS"
                />
              </label>
              <label class="field-label">
                <span>Estimasi Siklus Cetak (Cycle Time)</span>
                <input
                  v-model="productForm.cycleTime"
                  placeholder="Contoh: 12 - 15 detik"
                />
              </label>
              <label class="field-label">
                <span>Kebutuhan Tonase Mesin</span>
                <input
                  v-model="productForm.minMachineTonnage"
                  placeholder="Contoh: 160 - 250 Ton"
                />
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-outline-dark"
              @click="productModalOpen = false"
            >
              Batal
            </button>
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
  font-family: "DM Sans", sans-serif;
  overflow-x: hidden;
}

/* UNIVERSAL FORM CONTROLS INSIDE ADMIN */
.admin-wrapper input:not([type="checkbox"]):not([type="file"]),
.admin-wrapper select,
.admin-wrapper textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #dce2e8;
  padding: 10px 12px;
  font-size: 12px;
  outline: 0;
  border-radius: 3px;
  background: #fdfdfd;
  color: #14283b;
}
.admin-wrapper input:not([type="checkbox"]):not([type="file"]):focus,
.admin-wrapper select:focus,
.admin-wrapper textarea:focus {
  border-color: #d9aa52;
  background: white;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #3b4e60;
  min-width: 0;
}
.field-label small {
  font-size: 10px;
  color: #8899a8;
  font-weight: 400;
}

/* LOGIN SCREEN */
.admin-login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: radial-gradient(circle at top right, #193853, #0b1f33);
}
.login-card {
  background: white;
  width: 100%;
  max-width: 440px;
  padding: 36px 30px;
  border-radius: 4px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
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
  font-family: "Manrope", sans-serif;
  font-size: 26px;
  font-weight: 800;
  font-style: italic;
  border-radius: 3px;
  flex-shrink: 0;
}
.login-brand b {
  display: block;
  font-size: 19px;
  color: #0b1f33;
  font-family: "Manrope", sans-serif;
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
  margin-top: 4px;
  border-radius: 3px;
}
.input-with-icon svg {
  color: #8394a2;
  flex-shrink: 0;
}
.input-with-icon input {
  border: 0 !important;
  background: transparent !important;
  padding: 12px 0 !important;
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
  position: relative;
}
.admin-sidebar-backdrop {
  display: none;
}
.admin-sidebar {
  width: 268px;
  background: #0b1f33;
  color: #dce5ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #1c364e;
  z-index: 910;
}
.sidebar-header {
  padding: 20px 18px;
  border-bottom: 1px solid #16324a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.sidebar-close-btn {
  display: none;
  border: 1px solid #244563;
  background: #132e46;
  color: #dce5ed;
  width: 34px;
  height: 34px;
  border-radius: 3px;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.sidebar-close-btn:hover {
  background: #d9aa52;
  color: #0b1f33;
  border-color: #d9aa52;
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
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow-y: auto;
}
.sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
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
  padding: 16px;
  border-top: 1px solid #16324a;
  background: #081726;
}
.admin-user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
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
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.admin-topbar {
  background: white;
  min-height: 68px;
  border-bottom: 1px solid #e1e6eb;
  padding: 12px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 40;
}
.topbar-left-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.sidebar-toggle-btn {
  display: none;
  width: 38px;
  height: 38px;
  border: 1px solid #d5dde5;
  background: #f8fafc;
  color: #0b1f33;
  border-radius: 3px;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.sidebar-toggle-btn:hover {
  background: #0b1f33;
  color: #d9aa52;
  border-color: #0b1f33;
}
.topbar-title {
  min-width: 0;
}
.topbar-title h1 {
  font-size: 19px;
  font-family: "Manrope", sans-serif;
  margin: 0;
  color: #0b1f33;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-pane {
  padding: 28px;
  flex: 1;
}

/* METRICS */
.metrics-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.metric-card {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 3px;
  transition: all 0.2s;
}
.metric-card:hover {
  border-color: #d9aa52;
  transform: translateY(-2px);
}
.metric-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  flex-shrink: 0;
}
.metric-icon.purple {
  background: #f2ecfb;
  color: #5b32a8;
}
.metric-icon.gold {
  background: #fbf2e2;
  color: #b78732;
}
.metric-icon.blue {
  background: #e6eef6;
  color: #1e4a73;
}
.metric-icon.green {
  background: #e8f5ec;
  color: #2e7d4a;
}
.metric-card small {
  font-size: 9px;
  font-weight: 700;
  color: #7b8b98;
  letter-spacing: 1px;
}
.metric-card h3 {
  font-family: "Manrope", sans-serif;
  font-size: 25px;
  margin: 3px 0 2px;
  color: #0b1f33;
}
.metric-card span {
  font-size: 11px;
  color: #5c6e7e;
}

/* VISIBILITY TOGGLE BUTTON */
.visibility-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}
.visibility-toggle-btn.btn-xs {
  padding: 4px 9px;
  font-size: 10px;
}
.visibility-toggle-btn.vis-on {
  background: #e6f6ec;
  color: #1b6b3a;
  border-color: #b7e2c7;
}
.visibility-toggle-btn.vis-on:hover {
  background: #d2f0de;
}
.visibility-toggle-btn.vis-off {
  background: #f1f3f5;
  color: #6c7a86;
  border-color: #d6dde3;
}
.visibility-toggle-btn.vis-off:hover {
  background: #e5e9ed;
  color: #14283b;
}

.is-hidden-item {
  opacity: 0.72;
  border-style: dashed !important;
}
.row-hidden {
  background: #f9fafb;
  opacity: 0.75;
}

/* CATEGORIES GRID */
.categories-admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.category-admin-card {
  background: white;
  border: 1px solid #e1e7ec;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cat-card-media {
  height: 170px;
  position: relative;
  background: #0b1f33;
}
.cat-card-media > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cat-gallery-strip {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(11, 31, 51, 0.85);
  padding: 5px 8px;
  border-radius: 3px;
}
.cat-gallery-strip img {
  width: 34px;
  height: 26px;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid #d9aa52;
}
.gallery-count {
  font-size: 10px;
  color: #f2c875;
  font-weight: 700;
  padding-left: 4px;
}
.cat-card-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.cat-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.cat-card-top h3 {
  font-family: "Manrope", sans-serif;
  font-size: 17px;
  margin: 0 0 3px;
  color: #0b1f33;
}
.usage-meta {
  font-size: 11px;
  color: #778897;
}
.cat-short-desc {
  font-size: 12px;
  color: #485a6a;
  line-height: 1.6;
  margin: 0 0 12px;
}
.cat-detail-preview {
  background: #f7f9fb;
  border-left: 3px solid #d9aa52;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 0 3px 3px 0;
}
.cat-detail-preview b {
  display: block;
  font-size: 10px;
  color: #0b1f33;
  margin-bottom: 3px;
  text-transform: uppercase;
}
.cat-detail-preview p {
  font-size: 11px;
  color: #5b6d7d;
  line-height: 1.6;
  margin: 0;
}
.cat-card-footer {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #edf1f4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.img-count-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #647585;
  font-weight: 600;
}

/* GALLERY SLOTS IN MODAL */
.gallery-box-section {
  background: #f7f9fb;
  border: 1px solid #dfe6ec;
  padding: 16px;
  border-radius: 4px;
  min-width: 0;
}
.gallery-box-header {
  margin-bottom: 12px;
}
.gallery-box-header b {
  display: block;
  font-size: 13px;
  color: #0b1f33;
}
.gallery-box-header small {
  font-size: 11px;
  color: #6b7c8c;
}
.gallery-slots-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.gallery-slot-card {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 12px;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.slot-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #3b4e60;
}
.clear-slot-btn {
  border: 0;
  background: #feecef;
  color: #c93b2b;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 2px;
  cursor: pointer;
}
.btn-upload-slot {
  width: 100%;
  justify-content: center;
  padding: 8px 10px !important;
  font-size: 11px !important;
}
.slot-thumb {
  height: 82px;
  border-radius: 2px;
  overflow: hidden;
  background: #eef2f5;
  border: 1px solid #e2e8ed;
}
.slot-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* SPLIT PANELS */
.dashboard-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px;
}
.panel {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 22px;
  border-radius: 3px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf1f4;
  padding-bottom: 12px;
}
.panel-header h3 {
  font-size: 16px;
  font-family: "Manrope", sans-serif;
  margin: 0;
  color: #0b1f33;
}
.quick-actions-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.quick-card {
  background: #f7fafc;
  border: 1px solid #e1e7eb;
  padding: 16px;
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
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
  gap: 10px;
  padding: 13px 0;
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
  line-height: 1.4;
}
.inq-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* TOOLBAR & SEARCH */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  flex-wrap: wrap;
}
.toolbar-filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #dce2e8;
  padding: 0 12px;
  height: 40px;
  width: 250px;
  max-width: 100%;
  border-radius: 3px;
}
.search-input input {
  border: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}
.select-filter {
  width: auto !important;
  height: 40px;
  padding: 0 12px !important;
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
  white-space: nowrap;
}
.data-table td {
  padding: 13px 16px;
  border-bottom: 1px solid #edf1f4;
  vertical-align: middle;
}
.table-media-wrap {
  position: relative;
  display: inline-block;
}
.thumb-img {
  width: 64px;
  height: 46px;
  object-fit: cover;
  border-radius: 2px;
  background: #eaeff2;
  display: block;
}
.extra-img-badge {
  display: block;
  font-size: 9px;
  background: #0b1f33;
  color: #d9aa52;
  text-align: center;
  padding: 1px 4px;
  font-weight: 700;
  margin-top: 2px;
  border-radius: 2px;
}
.pill-type {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 7px;
  border-radius: 2px;
}
.type-new {
  background: #e8f4fc;
  color: #165688;
}
.type-custom {
  background: #fdf3e2;
  color: #94651a;
}
.type-used {
  background: #ebf5ee;
  color: #2d6e42;
}

.status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 7px;
  border-radius: 2px;
}
.status-available {
  background: #e8f5ec;
  color: #236c3c;
}
.status-on_order {
  background: #fff3db;
  color: #875c12;
}
.status-negotiation {
  background: #ebf0f8;
  color: #2c4b75;
}
.status-sold {
  background: #eaeaea;
  color: #666;
}
.status-new {
  background: #fbeee6;
  color: #b1481d;
}

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
  flex-shrink: 0;
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
  width: auto !important;
  padding: 6px 8px !important;
  font-size: 11px !important;
  font-weight: 600;
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
  white-space: nowrap;
}

/* PRODUCTS GRID */
.products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
.prod-card-img-wrap {
  position: relative;
  height: 180px;
  background: #eef2f5;
}
.prod-card-img-wrap > img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.mini-thumbs {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(11, 31, 51, 0.85);
  padding: 4px 7px;
  border-radius: 2px;
}
.mini-thumbs img {
  width: 28px;
  height: 22px;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid #d9aa52;
}
.mini-thumbs span {
  font-size: 9px;
  color: #f2c875;
  font-weight: 700;
  margin-left: 3px;
}
.card-content {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.badge-cat {
  font-size: 9px;
  color: #b78732;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.card-content h4 {
  font-family: "Manrope", sans-serif;
  font-size: 16px;
  margin: 4px 0 8px;
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
  flex-wrap: wrap;
}

/* CMS STYLING */
.cms-subtabs {
  display: flex;
  gap: 6px;
  border-bottom: 2px solid #e2e8ee;
  margin-bottom: 22px;
  overflow-x: auto;
}
.cms-subtabs button {
  padding: 11px 16px;
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
  padding: 26px;
  border-radius: 3px;
}
.form-title {
  font-family: "Manrope", sans-serif;
  font-size: 18px;
  color: #0b1f33;
  margin: 0 0 6px;
}
.form-help {
  font-size: 12px;
  color: #728292;
  margin: 0 0 22px;
  line-height: 1.6;
}
.grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.col-span-2 {
  grid-column: 1 / -1;
}
.input-with-upload {
  display: flex;
  gap: 8px;
  align-items: stretch;
  min-width: 0;
}
.input-with-upload input {
  flex: 1;
  min-width: 0;
}
.btn-upload {
  background: #0b1f33;
  color: white;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-upload:hover {
  background: #173654;
}
.btn-upload input {
  display: none !important;
}
.preview-img-box {
  margin-top: 10px;
  height: auto;
  max-height: 220px;
  border: 1px solid #e1e7eb;
  border-radius: 6px;
  overflow: hidden;
  max-width: 380px;
  background: #081624;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-img-box img {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  display: block;
}
.thumb-preview {
  margin-top: 8px;
  height: 100px;
  max-width: 160px;
  border: 1px solid #e1e7eb;
  border-radius: 2px;
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
  padding: 18px;
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
  gap: 14px;
  padding: 16px;
  border: 1px solid #e3e8ed;
  background: #f8fafb;
  border-radius: 3px;
}
.step-num {
  font-family: "Manrope", sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #d9aa52;
}
.step-inputs {
  flex: 1;
  min-width: 0;
}

/* THEME & LOGO EDITOR STYLES */
.theme-card-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 20px;
}

.logo-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.logo-preview-box {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.logo-preview-box.light {
  background: #ffffff;
}

.preview-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.preview-img-wrap {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.preview-img-wrap img {
  max-height: 52px;
  max-width: 180px;
  object-fit: contain;
}

.theme-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.color-picker-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 14px 16px;
  border-radius: 6px;
}

.color-swatch-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.color-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.color-label {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.color-desc {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
  line-height: 1.3;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-native-input {
  width: 34px;
  height: 32px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.color-hex-input {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  width: 85px;
  text-transform: uppercase;
}

.palette-quick-select {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #cbd5e1;
}

.palette-quick-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  display: block;
  margin-bottom: 10px;
}

.palette-chips-wrap {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-palette-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-palette-chip:hover {
  border-color: #0b1f33;
  background: #f1f5f9;
}

.dot-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.cms-save-bar {
  border-top: 1px solid #e8edf1;
  margin-top: 28px;
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

/* FAQ STYLES */
.faq-admin-list {
  display: grid;
  gap: 16px;
}
.faq-admin-item {
  background: white;
  border: 1px solid #e1e7ec;
  padding: 20px;
  border-radius: 3px;
}
.faq-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* MODAL STYLES - FIXED NO OVERFLOW */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 31, 51, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 16px;
}
.modal-dialog {
  background: white;
  width: min(720px, 100%);
  max-height: calc(100vh - 32px);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
}
.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid #e6ebf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.modal-header h3 {
  margin: 0;
  font-family: "Manrope", sans-serif;
  font-size: 18px;
  color: #0b1f33;
}
.close-btn {
  border: 0;
  background: none;
  cursor: pointer;
  color: #718292;
  padding: 4px;
}
.modal-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.modal-body {
  padding: 22px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e6ebf0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #f8fafc;
  flex-shrink: 0;
}
.checkbox-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #3b4e60;
  cursor: pointer;
}

/* TOAST */
.admin-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1050;
  padding: 14px 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}
.toast-success {
  background: #1b5e35;
  color: white;
}
.toast-error {
  background: #b03224;
  color: white;
}
.toast-info {
  background: #13395d;
  color: white;
}

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

/* RESPONSIVE TABLET & MOBILE FOR ADMIN (OFF-CANVAS SIDEBAR DRAWER) */
@media (max-width: 1080px) {
  .metrics-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .categories-admin-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 1024px) {
  .admin-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(7, 22, 37, 0.62);
    backdrop-filter: blur(2px);
    z-index: 900;
  }
  .admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 12px 0 36px rgba(0, 0, 0, 0.35);
    z-index: 910;
  }
  .admin-sidebar.sidebar-open {
    transform: translateX(0);
  }
  .sidebar-close-btn {
    display: grid;
  }
  .sidebar-toggle-btn {
    display: grid;
  }
  .dashboard-split {
    grid-template-columns: 1fr;
  }
  .tab-pane {
    padding: 20px 16px;
  }
  .admin-topbar {
    padding: 12px 16px;
    min-height: 60px;
  }
  .topbar-title h1 {
    font-size: 16px;
  }
}
@media (max-width: 680px) {
  .grid-2,
  .grid-3,
  .gallery-slots-grid,
  .quick-actions-grid,
  .products-grid,
  .metrics-grid-4 {
    grid-template-columns: 1fr;
  }
  .hide-xs {
    display: none;
  }
  .modal-body {
    padding: 16px;
  }
  .modal-header,
  .modal-footer {
    padding: 14px 16px;
  }
  .input-with-upload {
    flex-direction: column;
  }
  .btn-upload {
    padding: 10px 14px;
    justify-content: center;
  }
  .search-input {
    width: 100%;
  }
  .toolbar-left,
  .toolbar-filters {
    width: 100%;
  }
  .select-filter {
    flex: 1;
  }
}
</style>
