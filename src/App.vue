<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  Menu,
  X,
  ArrowUpRight,
  CheckCircle2,
  Factory,
  Boxes,
  Wrench,
  ClipboardCheck,
  MessageCircle,
  ShieldCheck,
  Clock3,
  Search,
  ChevronDown,
  Send,
  MoveRight,
  Lock,
} from "lucide-vue-next";
import AdminPanel from "./components/AdminPanel.vue";
import MoldDetailModal from "./components/MoldDetailModal.vue";
import ProductDetailModal from "./components/ProductDetailModal.vue";
import LanguageSelector from "./components/LanguageSelector.vue";
import { LOCALES } from "./locales.js";
import { applyThemeVariables } from "./utils/themeContrast.js";

const API = import.meta.env.VITE_API_URL || "/api";
const WA_DEFAULT = import.meta.env.VITE_WHATSAPP_NUMBER || "6289676181754";

// --- Multi-Language & Automatic Translation Engine ---
const currentLang = ref(localStorage.getItem("ilufa_lang") || "id");

function applyGoogleTranslate(lang) {
  try {
    const hostname = window.location.hostname;
    const cookieVal = lang === "id" ? "/id/id" : `/id/${lang}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
    if (hostname.includes(".")) {
      const parts = hostname.split(".");
      if (parts.length > 1) {
        const rootDomain = "." + parts.slice(-2).join(".");
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain};`;
      }
    }

    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    }
  } catch {}
}

function setLang(lang) {
  currentLang.value = lang;
  try {
    localStorage.setItem("ilufa_lang", lang);
  } catch {}
  applyGoogleTranslate(lang);
}

function t(key, fallback = "") {
  return LOCALES[currentLang.value]?.[key] ?? fallback ?? key;
}

// --- View Mode: 'site' or 'admin' ---
const viewMode = ref("site");
function setViewMode(mode) {
  viewMode.value = mode;
  if (mode === "admin") {
    window.location.hash = "admin";
  } else {
    if (window.location.hash === "#admin" || window.location.hash === "#cms") {
      history.pushState("", document.title, window.location.pathname);
    }
    refreshAllPublicData();
  }
}

function handleHashChange() {
  if (window.location.hash === "#admin" || window.location.hash === "#cms") {
    viewMode.value = "admin";
  }
}

// --- CMS Data (Dynamic with Robust Defaults) ---
const cms = ref({
  seo: {
    metaTitle:
      "iLUFA Molding — Jual Molding Injeksi Plastik Siap Pakai, Jasa Pemesanan Molding Import & Pembuatan Molding Plastik Custom",
    metaDescription:
      "iLUFA Molding melayani jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D & sampel, serta jual molding injeksi plastik siap pakai untuk pabrik manufaktur plastik di Indonesia.",
    metaKeywords:
      "jual molding injeksi plastik siap pakai, jasa pemesanan molding import, pembuatan molding plastik custom, cetakan injeksi plastik, jual mold plastik siap pakai, pabrik molding plastik indonesia, harga molding injeksi plastik, pengadaan cetakan plastik bekasi cikarang",
    canonicalUrl: "https://ilufamolding.com/",
  },
  general: {
    siteName: "iLUFA MOLDING",
    siteTagline: "INDUSTRIAL MOLD PROCUREMENT",
    logoUrl: "",
    themeColors: {
      primaryNavy: "#0b1f33",
      secondaryNavy: "#122e47",
      accentGold: "#d9aa52",
    },
    topbarNotice:
      "Jasa Pemesanan Molding Import, Pembuatan Molding Plastik Custom & Jual Molding Injeksi Plastik Siap Pakai",
    whatsappNumber: WA_DEFAULT,
    whatsappMessage:
      "Halo iLUFA Molding, saya ingin konsultasi kebutuhan molding injeksi plastik.",
    email: "info@ilufamolding.com",
    phone: "+6289676181754",
    address: "Kawasan Industri Cikarang, Bekasi, Jawa Barat 17530",
    operationalHours: "Senin - Sabtu: 08.00 - 17.00 WIB",
  },
  hero: {
    eyebrow: "SOLUSI PENGADAAN MOLDING INJEKSI PLASTIK",
    title: "Molding yang tepat.\nProduksi lebih siap.",
    subtitle:
      "Solusi lengkap jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D, serta jual molding injeksi plastik siap pakai berkualitas melalui sistem PO / indent terpercaya.",
    primaryCtaText: "Konsultasi & Minta Penawaran",
    secondaryCtaText: "Jelajahi Katalog",
    imageUrl:
      "https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1300&q=85",
    badges: [
      "Jasa pemesanan molding import",
      "Pembuatan molding plastik custom",
      "Jual molding injeksi plastik siap pakai",
    ],
    floatingCardTitle: "Industrial Mold Solutions",
    floatingCardSubtitle: "IMPORT BARU · CUSTOM · SIAP PAKAI",
  },
  procurementTypes: [
    {
      code: "NEW",
      name: "Molding Import Baru",
      shortLabel: "Import Baru",
      badge: "01 / PROCUREMENT",
      desc: "Layanan jasa pemesanan molding import baru langsung dari workshop spesialis luar negeri sesuai standar industri. Pilihan multi-cavity, steel grade (P20, 718H, NAK80, S136), dan hot/cold runner system terkalibrasi.",
      ctaText: "Pesan Molding Import",
    },
    {
      code: "CUSTOM",
      name: "Molding Custom Sesuai Desain",
      shortLabel: "Custom",
      badge: "02 / ENGINEERING",
      desc: "Jasa pembuatan molding plastik custom berdasarkan gambar teknik 2D/3D (CAD/STEP) atau sampel fisik produk Anda. Konsultasi ketebalan dinding, shrinkage, parting line, dan kecocokan tonase mesin injeksi.",
      ctaText: "Konsultasi Desain (RFQ)",
    },
    {
      code: "USED",
      name: "Molding Siap Pakai",
      shortLabel: "Siap Pakai",
      badge: "03 / READY STOCK",
      desc: "Pusat jual molding injeksi plastik siap pakai berkualitas untuk pabrik yang ingin menghemat biaya investasi cetakan (CAPEX). Setiap unit telah diverifikasi ukuran, cavity, runner, dan kelayakan cetaknya.",
      ctaText: "Lihat Katalog Siap Pakai",
    },
  ],
  services: [
    {
      num: "01 / PROCUREMENT",
      title: "Jasa Pemesanan Molding Import Baru",
      desc: "Layanan jasa pemesanan molding import baru langsung dari workshop spesialis luar negeri sesuai standar industri. Pilihan multi-cavity, steel grade (P20, 718H, NAK80, S136), dan hot/cold runner system terkalibrasi.",
      ctaText: "Pesan Molding Import",
      type: "NEW",
    },
    {
      num: "02 / ENGINEERING",
      title: "Pembuatan Molding Plastik Custom",
      desc: "Jasa pembuatan molding plastik custom berdasarkan gambar teknik 2D/3D (CAD/STEP) atau sampel fisik produk Anda. Konsultasi ketebalan dinding, shrinkage, parting line, dan kecocokan tonase mesin injeksi.",
      ctaText: "Konsultasi Desain (RFQ)",
      type: "CUSTOM",
    },
    {
      num: "03 / READY STOCK",
      title: "Jual Molding Injeksi Plastik Siap Pakai",
      desc: "Pusat jual molding injeksi plastik siap pakai berkualitas untuk pabrik yang ingin menghemat biaya investasi cetakan (CAPEX). Setiap unit telah diverifikasi ukuran, cavity, runner, dan kelayakan cetaknya.",
      ctaText: "Lihat Katalog Siap Pakai",
      type: "USED",
    },
  ],
  process: [
    {
      step: "01",
      title: "Kirim Kebutuhan & Gambar",
      desc: "Sampaikan jenis produk, gambar 2D/3D, sampel, atau target produksi Anda.",
    },
    {
      step: "02",
      title: "Konsultasi Teknis & Mesin",
      desc: "Diskusikan ukuran, cavity, baja mold, dan tonase mesin injection molding Anda.",
    },
    {
      step: "03",
      title: "Penawaran & Kesepakatan",
      desc: "Penawaran harga, estimasi waktu, termin pembayaran PO, dan pengiriman dikonfirmasi.",
    },
    {
      step: "04",
      title: "Pengadaan, QC, & Pengiriman",
      desc: "Proses produksi, uji coba cetak (sample test), hingga pengiriman aman ke pabrik Anda.",
    },
  ],
  about: {
    eyebrow: "TENTANG iLUFA MOLDING",
    title: "Partner Terpercaya Pengadaan\nMolding Injeksi Plastik",
    p1: "iLUFA Molding dirancang sebagai titik awal bagi perusahaan manufaktur yang membutuhkan solusi pengadaan molding injeksi plastik—baik untuk kebutuhan baru, pengembangan desain custom, maupun alternatif molding siap pakai.",
    p2: "Kami mengutamakan komunikasi teknis, transparansi spesifikasi baja, dan kepastian alur pemesanan sebelum transaksi.",
    imageUrl:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85",
    caption: "Procurement with Precision & Purpose",
    points: [
      "Fokus kebutuhan spesifik manufaktur lokal",
      "Transparansi spesifikasi baja dan kelengkapan",
      "Dukungan konsultasi teknis sebelum komitmen",
      "Layanan PO / Indent resmi & bergaransi",
    ],
  },
  faqs: [
    {
      q: "Bagaimana sistem pembayaran untuk pemesanan molding baru / custom?",
      a: "Pemesanan molding baru atau custom menggunakan sistem termin (PO/Indent), umumnya Down Payment (DP) saat kontrak disepakati, termin setelah video trial cetak (T1) disetujui, dan pelunasan sebelum pengiriman ke pabrik Anda.",
    },
    {
      q: "Berapa lama estimasi waktu pembuatan dan pengiriman molding import?",
      a: "Waktu pengerjaan (lead time) umumnya berkisar 25–45 hari kerja tergantung kompleksitas desain, ukuran, dan jumlah cavity. Estimasi pengiriman dikonfirmasi secara transparan saat penawaran.",
    },
    {
      q: "Bagaimana memastikan molding siap pakai masih optimal dan layak pakai?",
      a: "Setiap molding siap pakai di katalog kami telah melewati pemeriksaan fisik awal: kondisi core & cavity, keausan slider/pin ejector, serta kelengkapan runner system. Calon pembeli juga dipersilakan melakukan inspeksi fisik langsung.",
    },
    {
      q: "Jika saya hanya punya sampel produk fisik tanpa file 3D, apakah bisa?",
      a: "Bisa. Kami dapat membantu proses reverse engineering melalui 3D scanning produk dan pembuatan gambar kerja 3D CAD untuk disetujui sebelum mold dibuat.",
    },
    {
      q: "Apakah iLUFA Molding bisa mencocokkan molding dengan tonase mesin kami?",
      a: "Ya, Anda cukup memberikan informasi tonase mesin injeksi (misal: 120T, 250T, 450T) dan jarak tie bar. Tim kami akan memastikan dimensi mold base muat dan kapasitas tembak (shot weight) sesuai.",
    },
  ],
});

function onCmsUpdated(newCms) {
  cms.value = { ...cms.value, ...newCms };
}

// --- Categories, Molds & Molded Products Catalog Data ---
const menuOpen = ref(false);
const categories = ref([]);
const molds = ref([]);
const moldedProducts = ref([]);
const loadingMolds = ref(true);
const loadError = ref("");
const query = ref("");
const filterType = ref("ALL");
const moldCategoryFilter = ref("ALL");
const catalogPage = ref(1);
const catalogPageSize = ref(8);

// Reset catalog page whenever filters or search query change
watch([filterType, moldCategoryFilter, query], () => {
  catalogPage.value = 1;
});

// Real-time CSS Variables Injection with Automatic Contrast Adjustment
function applyThemeColors() {
  const colors = cms.value?.general?.themeColors;
  if (!colors) return;
  applyThemeVariables(colors, document.documentElement);
}

watch(() => cms.value?.general?.themeColors, applyThemeColors, {
  deep: true,
  immediate: true,
});

// Modals State
const selectedMold = ref(null);
const detailModalItem = ref(null);
const detailModalMode = ref("product");

// Active Categories (Only categories with isVisible !== false)
const visibleCategories = computed(() => {
  return categories.value.filter((c) => c.isVisible !== false);
});

const hiddenCategoryNames = computed(() => {
  return new Set(
    categories.value.filter((c) => c.isVisible === false).map((c) => c.name),
  );
});

// --- Molded Products Category Filter ---
const selectedCategory = ref("ALL");

const filteredProducts = computed(() => {
  return moldedProducts.value.filter((p) => {
    if (p.isVisible === false) return false;
    if (hiddenCategoryNames.value.has(p.category)) return false;
    if (selectedCategory.value === "ALL") return true;
    return p.category === selectedCategory.value;
  });
});

const categoriesList = computed(() => {
  const fromCats = visibleCategories.value.map((c) => c.name);
  const fromProds = moldedProducts.value
    .filter(
      (p) =>
        p.isVisible !== false && !hiddenCategoryNames.value.has(p.category),
    )
    .map((p) => p.category)
    .filter(Boolean);
  const merged = Array.from(new Set([...fromCats, ...fromProds]));
  return ["ALL", ...merged];
});

function openProductDetail(prod) {
  detailModalMode.value = "product";
  detailModalItem.value = prod;
}

function findCategoryForProduct(prod) {
  if (!prod) return null;
  return categories.value.find((c) => c.name === prod.category) || null;
}

function getExtraImagesCount(prod) {
  if (
    Array.isArray(prod.galleryImages) &&
    prod.galleryImages.filter(Boolean).length > 0
  ) {
    return prod.galleryImages.filter(Boolean).length;
  }
  const cat = findCategoryForProduct(prod);
  if (cat && Array.isArray(cat.galleryImages)) {
    return cat.galleryImages.filter(Boolean).length;
  }
  return 0;
}

// --- FAQ Accordion State ---
const openFaqIndex = ref(0);
function toggleFaq(index) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

// --- RFQ Inquiry Form State ---
const formBusy = ref(false);
const formMessage = ref("");
const formError = ref("");
const form = ref({
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  moldType: "CUSTOM",
  productNeed: "",
  dimensions: "",
  cavity: "",
  machineInfo: "",
  budget: "",
  targetDate: "",
  notes: "",
  moldId: null,
});

// Only show Molds where isVisible !== false and category is not hidden
const filteredMolds = computed(() =>
  molds.value.filter((m) => {
    if (m.isVisible === false) return false;
    if (hiddenCategoryNames.value.has(m.category)) return false;
    const matchesType =
      filterType.value === "ALL" || m.type === filterType.value;
    const matchesCategory =
      moldCategoryFilter.value === "ALL" ||
      m.category === moldCategoryFilter.value;
    const search = query.value.toLowerCase().trim();
    const matchesQuery =
      !search ||
      `${m.name} ${m.code} ${m.category} ${m.material || ""}`
        .toLowerCase()
        .includes(search);
    return matchesType && matchesCategory && matchesQuery;
  }),
);

const totalCatalogPages = computed(() => {
  return Math.ceil(filteredMolds.value.length / catalogPageSize.value) || 1;
});

const paginatedMolds = computed(() => {
  const start = (catalogPage.value - 1) * catalogPageSize.value;
  return filteredMolds.value.slice(start, start + catalogPageSize.value);
});

const availableProcurementTypes = computed(() => {
  if (Array.isArray(cms.value?.procurementTypes) && cms.value.procurementTypes.length > 0) {
    return cms.value.procurementTypes;
  }
  return [
    { code: "NEW", name: "Molding Import Baru", shortLabel: "Baru", badge: "01 / PROCUREMENT" },
    { code: "CUSTOM", name: "Molding Custom Sesuai Desain", shortLabel: "Custom", badge: "02 / ENGINEERING" },
    { code: "USED", name: "Molding Siap Pakai", shortLabel: "Siap Pakai", badge: "03 / READY STOCK" },
  ];
});

const typeLabel = (type) => {
  const found = availableProcurementTypes.value.find((pt) => pt.code === type);
  if (found) {
    if (currentLang.value === "en") {
      return (
        { NEW: "New Imported Mold", CUSTOM: "Custom Fabrication", USED: "Ready-to-Use Mold" }[type] || found.name
      );
    }
    return found.name;
  }
  if (currentLang.value === "en") {
    return (
      { NEW: "New Imported Mold", CUSTOM: "Custom Fabrication", USED: "Ready-to-Use Mold" }[type] || type
    );
  }
  return (
    { NEW: "Molding Import Baru", CUSTOM: "Molding Custom Sesuai Desain", USED: "Molding Siap Pakai" }[type] ||
    type
  );
};

const statusLabel = (status) => {
  if (currentLang.value === "en") {
    return (
      {
        AVAILABLE: "Ready (In Stock)",
        ON_ORDER: "PO / Indent",
        NEGOTIATION: "Negotiation",
        SOLD: "Sold",
      }[status] || status
    );
  }
  return (
    {
      AVAILABLE: "Tersedia",
      ON_ORDER: "PO / Indent",
      NEGOTIATION: "Negosiasi",
      SOLD: "Terjual",
    }[status] || status
  );
};

const waLink = computed(() => {
  const num = cms.value.general.whatsappNumber || WA_DEFAULT;
  const msg =
    cms.value.general.whatsappMessage ||
    "Halo iLUFA Molding, saya ingin konsultasi kebutuhan molding injeksi plastik.";
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
});

async function fetchCMS() {
  try {
    const res = await fetch(`${API}/cms`);
    if (res.ok) {
      const data = await res.json();
      if (data.data) cms.value = { ...cms.value, ...data.data };
    }
  } catch {}
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    if (res.ok) {
      const result = await res.json();
      categories.value = result.data || [];
    }
  } catch {}
}

async function fetchMolds() {
  loadingMolds.value = true;
  loadError.value = "";
  try {
    const res = await fetch(`${API}/molds`);
    if (!res.ok) throw new Error("Gagal memuat katalog.");
    const result = await res.json();
    molds.value = result.data || [];
  } catch {
    loadError.value = "Katalog belum dapat dimuat dari database.";
  } finally {
    loadingMolds.value = false;
  }
}

async function fetchMoldedProducts() {
  try {
    const res = await fetch(`${API}/molded-products`);
    if (res.ok) {
      const result = await res.json();
      moldedProducts.value = result.data || [];
    }
  } catch {}
}

async function refreshAllPublicData() {
  await Promise.all([
    fetchCMS(),
    fetchCategories(),
    fetchMolds(),
    fetchMoldedProducts(),
  ]);
}

async function submitInquiry() {
  formBusy.value = true;
  formMessage.value = "";
  formError.value = "";
  try {
    const res = await fetch(`${API}/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Permintaan gagal dikirim.");
    formMessage.value = `Terima kasih! Permintaan Anda tersimpan dengan nomor tiket #${result.data.id}. Tim teknis iLUFA akan segera menghubungi Anda.`;
    form.value = {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      moldType: "CUSTOM",
      productNeed: "",
      dimensions: "",
      cavity: "",
      machineInfo: "",
      budget: "",
      targetDate: "",
      notes: "",
      moldId: null,
    };
  } catch (error) {
    formError.value =
      error.message || "Tidak dapat mengirim permintaan. Coba lagi.";
  } finally {
    formBusy.value = false;
  }
}

function handleRequestQuoteFromMoldModal(mold) {
  selectedMold.value = null;
  form.value.moldType = mold.type;
  form.value.moldId = mold.id;
  form.value.productNeed = `Saya tertarik dengan ${mold.name} (Kode: ${mold.code}). Mohon info harga penawaran dan spesifikasi detailnya.`;
  jumpTo("rfq");
}

function handleRequestQuoteFromProductModal(item) {
  detailModalItem.value = null;
  form.value.moldType = "CUSTOM";
  form.value.productNeed = `Saya tertarik membuat/memesan molding untuk produk "${item.name}" (Kategori: ${item.category}).`;
  if (item.dimensions) form.value.dimensions = item.dimensions;
  jumpTo("rfq");
}

function jumpTo(id) {
  menuOpen.value = false;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function setMetaTag(selector, attrName, attrValue, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content || "");
}

function updateSeoHeadAndSchema() {
  const seo = cms.value.seo || {};
  const gen = cms.value.general || {};
  const title =
    seo.metaTitle ||
    `${gen.siteName || "iLUFA Molding"} — Jual Molding Injeksi Plastik Siap Pakai, Jasa Pemesanan Molding Import & Pembuatan Molding Plastik Custom`;
  const desc =
    seo.metaDescription ||
    "iLUFA Molding melayani jasa pemesanan molding import baru, pembuatan molding plastik custom sesuai desain 2D/3D & sampel, serta jual molding injeksi plastik siap pakai untuk pabrik manufaktur plastik di Indonesia.";
  const keywords =
    seo.metaKeywords ||
    "jual molding injeksi plastik siap pakai, jasa pemesanan molding import, pembuatan molding plastik custom, cetakan injeksi plastik, jual mold plastik siap pakai, pabrik molding plastik indonesia";
  const canonicalUrl =
    seo.canonicalUrl || window.location.origin + window.location.pathname;

  document.title = title;
  setMetaTag('meta[name="title"]', "name", "title", title);
  setMetaTag('meta[name="description"]', "name", "description", desc);
  setMetaTag('meta[name="keywords"]', "name", "keywords", keywords);
  setMetaTag('meta[property="og:title"]', "property", "og:title", title);
  setMetaTag(
    'meta[property="og:description"]',
    "property",
    "og:description",
    desc,
  );
  setMetaTag(
    'meta[property="og:image"]',
    "property",
    "og:image",
    cms.value.hero?.imageUrl || "",
  );
  setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMetaTag(
    'meta[name="twitter:description"]',
    "name",
    "twitter:description",
    desc,
  );

  let canonLink = document.head.querySelector('link[rel="canonical"]');
  if (!canonLink) {
    canonLink = document.createElement("link");
    canonLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonLink);
  }
  canonLink.setAttribute("href", canonicalUrl);

  // Build Rich JSON-LD Schema (Organization + Service + FAQPage + ItemList)
  const faqEntities = (cms.value.faqs || []).map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  }));

  const moldCatalogEntities = filteredMolds.value
    .slice(0, 12)
    .map((m, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: m.name,
        sku: m.code,
        category: m.category,
        description:
          m.description ||
          `${m.name} - ${typeLabel(m.type)} (${m.category}) di iLUFA Molding`,
        image: m.imageUrl,
        brand: {
          "@type": "Brand",
          name: gen.siteName || "iLUFA Molding",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "IDR",
          price: "0",
          availability:
            m.status === "SOLD"
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          seller: {
            "@type": "Organization",
            name: gen.siteName || "iLUFA Molding",
          },
        },
      },
    }));

  const jsonLdGraph = [
    {
      "@type": "IndustrialBusiness",
      "@id": `${canonicalUrl}#organization`,
      name: gen.siteName || "iLUFA Molding",
      description: desc,
      url: canonicalUrl,
      telephone: gen.phone || "+6289676181754",
      email: gen.email || "info@ilufamolding.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: gen.address || "Kawasan Industri Cikarang, Bekasi",
        addressRegion: "Jawa Barat",
        addressCountry: "ID",
      },
      knowsAbout: [
        "Jual Molding Injeksi Plastik Siap Pakai",
        "Jasa Pemesanan Molding Import",
        "Pembuatan Molding Plastik Custom",
        "Cetakan Injeksi Plastik",
      ],
    },
  ];

  if (faqEntities.length > 0) {
    jsonLdGraph.push({
      "@type": "FAQPage",
      mainEntity: faqEntities,
    });
  }

  if (moldCatalogEntities.length > 0) {
    jsonLdGraph.push({
      "@type": "ItemList",
      name: "Katalog Jual Molding Injeksi Plastik Siap Pakai, Import Baru & Custom",
      itemListElement: moldCatalogEntities,
    });
  }

  let scriptEl = document.getElementById("seo-json-ld");
  if (!scriptEl) {
    scriptEl = document.createElement("script");
    scriptEl.id = "seo-json-ld";
    scriptEl.type = "application/ld+json";
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": jsonLdGraph,
  });
}

watch(
  [cms, molds],
  () => {
    updateSeoHeadAndSchema();
  },
  { deep: true },
);

onMounted(() => {
  handleHashChange();
  window.addEventListener("hashchange", handleHashChange);
  updateSeoHeadAndSchema();
  refreshAllPublicData();

  if (currentLang.value && currentLang.value !== "id") {
    setTimeout(() => {
      applyGoogleTranslate(currentLang.value);
    }, 600);
  }
});

onUnmounted(() => {
  window.removeEventListener("hashchange", handleHashChange);
});
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
        @data-updated="refreshAllPublicData"
      />
    </div>

    <!-- PUBLIC WEBSITE VIEW -->
    <div v-else class="site-wrapper">
      <!-- TOPBAR -->
      <div class="topbar">
        <div class="container topbar-inner">
          <span class="topbar-notice">{{ cms.general.topbarNotice }}</span>
          <div class="topbar-right">
            <LanguageSelector />
          </div>
        </div>
      </div>

      <!-- HEADER NAVIGATION -->
      <header class="header">
        <div class="container nav">
          <a href="#" class="brand" aria-label="iLUFA Molding beranda">
            <img
              v-if="cms.general.logoUrl"
              :src="cms.general.logoUrl"
              :alt="cms.general.siteName || 'iLUFA Molding'"
              class="brand-logo-img"
            />
            <span v-else class="brand-mark">i</span>
            <div class="brand-info">
              <span class="brand-name notranslate" translate="no">{{
                cms.general.siteName || "iLUFA MOLDING"
              }}</span>
              <small class="brand-tagline">{{
                cms.general.siteTagline || "INDUSTRIAL MOLD PROCUREMENT"
              }}</small>
            </div>
          </a>

          <button
            class="mobile-toggle"
            @click="menuOpen = !menuOpen"
            aria-label="Buka menu"
          >
            <X v-if="menuOpen" />
            <Menu v-else />
          </button>

          <nav :class="{ 'nav-open': menuOpen }">
            <a href="#layanan" @click="menuOpen = false">{{
              t("navServices", "Layanan")
            }}</a>
            <a href="#katalog" @click="menuOpen = false">{{
              t("navCatalog", "Katalog Molding")
            }}</a>
            <a href="#hasil-cetakan" @click="menuOpen = false">{{
              t("navProducts", "Contoh Hasil Cetak")
            }}</a>
            <a href="#proses" @click="menuOpen = false">{{
              t("navProcess", "Cara Pemesanan")
            }}</a>
            <a href="#faq" @click="menuOpen = false">{{
              t("navFaq", "FAQ")
            }}</a>
            <a href="#tentang" @click="menuOpen = false">{{
              t("navAbout", "Tentang Kami")
            }}</a>
            <button class="btn btn-primary nav-cta" @click="jumpTo('rfq')">
              {{ t("navRfq", "Minta Penawaran") }} <ArrowUpRight :size="16" />
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
              <h1 style="white-space: pre-line">{{ cms.hero.title }}</h1>
              <p class="hero-desc">{{ cms.hero.subtitle }}</p>

              <div class="hero-actions">
                <button class="btn btn-gold" @click="jumpTo('rfq')">
                  {{ cms.hero.primaryCtaText }} <MoveRight :size="18" />
                </button>
                <button
                  class="btn btn-outline-light"
                  @click="jumpTo('katalog')"
                >
                  {{ cms.hero.secondaryCtaText }}
                </button>
              </div>

              <div class="hero-points">
                <span v-for="(badge, bIdx) in cms.hero.badges" :key="bIdx">
                  <CheckCircle2 :size="16" /> {{ badge }}
                </span>
              </div>
            </div>

            <div class="hero-visual-col">
              <div class="hero-visual">
                <img
                  :src="cms.hero.imageUrl"
                  class="hero-visual-img"
                  style="max-width: 100%; max-height: 480px; width: 100%; height: auto; object-fit: contain !important; display: block; border-radius: 8px;"
                  alt="Jasa Pemesanan Molding Import, Pembuatan Molding Plastik Custom & Jual Molding Injeksi Plastik Siap Pakai - iLUFA Molding"
                />
              </div>

              <div class="hero-visual-footer">
                <div class="hero-label">
                  <span class="label-icon"><Factory :size="20" /></span>
                  <div>
                    <b>{{
                      cms.hero.floatingCardTitle || "Industrial Mold Solutions"
                    }}</b>
                    <small>{{
                      cms.hero.floatingCardSubtitle || "NEW · CUSTOM · SIAP PAKAI"
                    }}</small>
                  </div>
                </div>
                <div class="visual-number">
                  <b>01</b>
                  <span>ENGINEERING<br />YOUR NEXT STEP</span>
                </div>
              </div>
            </div>

            <div class="hero-side-note">
              PRECISION · PROCUREMENT · PARTNERSHIP
            </div>
          </div>
        </section>

        <!-- TRUST STRIP -->
        <section class="trust-strip">
          <div class="container trust-grid">
            <div>
              <Factory />
              <span
                ><b>{{ t("trust1Title", "Solusi Industri") }}</b
                ><small>{{
                  t("trust1Desc", "Fokus pada kebutuhan produksi")
                }}</small></span
              >
            </div>
            <div>
              <Boxes />
              <span
                ><b>{{ t("trust2Title", "3 Pilihan Layanan") }}</b
                ><small>{{
                  t("trust2Desc", "Baru, custom, dan siap pakai")
                }}</small></span
              >
            </div>
            <div>
              <ClipboardCheck />
              <span
                ><b>{{ t("trust3Title", "Proses Terarah") }}</b
                ><small>{{
                  t("trust3Desc", "Spesifikasi hingga pengiriman")
                }}</small></span
              >
            </div>
            <div>
              <ShieldCheck />
              <span
                ><b>{{ t("trust4Title", "Pengiriman Seluruh Indonesia") }}</b
                ><small>{{
                  t("trust4Desc", "Dukungan logistik ke pabrik")
                }}</small></span
              >
            </div>
          </div>
        </section>

        <!-- 3 PILAR LAYANAN -->
        <section id="layanan" class="section services-section">
          <div class="container">
            <div class="section-heading">
              <div>
                <div class="eyebrow dark">
                  <span class="eyebrow-line"></span>
                  {{ t("servicesEyebrow", "LAYANAN KAMI") }}
                </div>
                <h2>
                  Satu partner untuk<br /><span>berbagai kebutuhan mold.</span>
                </h2>
              </div>
              <p>
                Melayani <strong>jasa pemesanan molding import</strong> baru,
                <strong>pembuatan molding plastik custom</strong> berdasarkan
                desain produk Anda, serta
                <strong>jual molding injeksi plastik siap pakai</strong>.
                Spesifikasi dan estimasi dikonfirmasi melalui konsultasi teknis.
              </p>
            </div>

            <div class="service-grid">
              <article
                v-for="(srv, sIdx) in cms.services"
                :key="sIdx"
                class="service-card"
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
                  @click="
                    srv.type !== 'USED' ? (form.moldType = srv.type) : null
                  "
                >
                  {{ srv.ctaText }} <ArrowUpRight :size="16" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <!-- KATALOG MOLDING (BARU, CUSTOM, SIAP PAKAI) -->
        <section id="katalog" class="section catalog-section">
          <div class="container">
            <div class="section-heading catalog-heading">
              <div>
                <div class="eyebrow dark">
                  <span class="eyebrow-line"></span>
                  {{ t("catalogEyebrow", "KATALOG MOLDING") }}
                </div>
                <h2>
                  {{
                    currentLang === "en"
                      ? "Find the right mold option"
                      : "Temukan opsi yang"
                  }}<br /><span>{{
                    currentLang === "en"
                      ? "for your manufacturing needs."
                      : "sesuai kebutuhan Anda."
                  }}</span>
                </h2>
              </div>
              <p>
                {{
                  t(
                    "catalogDesc",
                    "Klik salah satu molding untuk melihat detail spesifikasi lengkap (cavity, berat, dimensi base, tonase mesin) dan meminta penawaran.",
                  )
                }}
              </p>
            </div>

            <div class="catalog-tools">
              <div class="search-box">
                <Search :size="18" />
                <input
                  v-model="query"
                  :placeholder="
                    t('searchPlaceholder', 'Cari nama, kode, kategori...')
                  "
                  :aria-label="t('searchPlaceholder', 'Cari katalog')"
                />
              </div>
              <div class="filter-tabs">
                <button
                  :class="{ active: filterType === 'ALL' }"
                  @click="filterType = 'ALL'"
                >
                  {{ t('filterAll', 'Semua Tipe') }}
                </button>
                <button
                  v-for="pt in availableProcurementTypes"
                  :key="pt.code"
                  :class="{ active: filterType === pt.code }"
                  @click="filterType = pt.code"
                >
                  {{ pt.shortLabel || pt.name }}
                </button>
              </div>
            </div>

            <!-- Category Pills Bar Filter -->
            <div class="catalog-category-bar">
              <button
                type="button"
                class="cat-pill-btn"
                :class="{ active: moldCategoryFilter === 'ALL' }"
                @click="moldCategoryFilter = 'ALL'"
              >
                {{ t("categoryFilterAll", "Semua Kategori") }}
              </button>
              <button
                v-for="cat in visibleCategories"
                :key="cat.id"
                type="button"
                class="cat-pill-btn"
                :class="{ active: moldCategoryFilter === cat.name }"
                @click="moldCategoryFilter = cat.name"
              >
                {{ cat.name }}
              </button>
            </div>

            <div v-if="loadingMolds" class="empty-state">
              {{ t("loadingMolds", "Memuat katalog molding...") }}
            </div>
            <div v-else-if="loadError" class="empty-state error-state">
              {{ loadError }}
              <button class="text-button" @click="fetchMolds">Coba lagi</button>
            </div>
            <div v-else-if="filteredMolds.length" class="mold-grid">
              <article
                class="mold-card"
                v-for="mold in paginatedMolds"
                :key="mold.id"
                @click="selectedMold = mold"
                style="cursor: pointer"
              >
                <div class="mold-image">
                  <img
                    :src="
                      mold.imageUrl ||
                      'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=900&q=80'
                    "
                    :alt="`${mold.name} - ${typeLabel(mold.type)} (${mold.category}) di iLUFA Molding`"
                    loading="lazy"
                  />
                  <span class="type-tag">{{ typeLabel(mold.type) }}</span>
                  <span
                    class="status-tag"
                    :class="'status-' + mold.status.toLowerCase()"
                    >{{ statusLabel(mold.status) }}</span
                  >
                  <span
                    v-if="
                      mold.galleryImages &&
                      mold.galleryImages.filter(Boolean).length > 0
                    "
                    class="gallery-pill"
                  >
                    +{{ mold.galleryImages.filter(Boolean).length }}
                    {{ t("photoDetailSuffix", "Foto Detail") }}
                  </span>
                </div>
                <div class="mold-body">
                  <div class="mold-code">
                    <span class="notranslate" translate="no">{{
                      mold.code
                    }}</span>
                    <span>{{ mold.category }}</span>
                  </div>
                  <h3>{{ mold.name }}</h3>
                  <p>{{ mold.description }}</p>
                  <div class="spec-row">
                    <span v-if="mold.cavity" class="notranslate" translate="no"
                      ><b>{{ mold.cavity }}</b> cavity</span
                    >
                    <span
                      v-if="mold.dimensions"
                      class="notranslate"
                      translate="no"
                      ><b>{{ mold.dimensions }}</b></span
                    >
                    <span v-if="mold.condition"
                      ><b>{{ mold.condition }}</b></span
                    >
                  </div>
                  <div class="mold-footer">
                    <div>
                      <small>{{ t("priceStatus", "STATUS HARGA") }}</small>
                      <b>{{
                        mold.priceLabel || t("askQuotation", "Minta penawaran")
                      }}</b>
                    </div>
                    <button
                      class="icon-btn"
                      :aria-label="`Detail ${mold.name}`"
                    >
                      <ArrowUpRight />
                    </button>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">
              {{
                t(
                  "noMoldsFound",
                  "Belum ada item molding yang ditampilkan untuk filter ini.",
                )
              }}
            </div>

            <!-- Pagination Bar for Catalog -->
            <div
              v-if="filteredMolds.length > catalogPageSize"
              class="catalog-pagination"
            >
              <div class="pagination-info">
                {{
                  t(
                    "paginationInfo",
                    "Menampilkan {from} - {to} dari {total} unit molding",
                  )
                    .replace("{from}", (catalogPage - 1) * catalogPageSize + 1)
                    .replace(
                      "{to}",
                      Math.min(
                        catalogPage * catalogPageSize,
                        filteredMolds.length,
                      ),
                    )
                    .replace("{total}", filteredMolds.length)
                }}
              </div>
              <div class="pagination-controls">
                <button
                  type="button"
                  class="page-btn"
                  :disabled="catalogPage <= 1"
                  @click="catalogPage--"
                  :aria-label="t('prevPage', 'Sebelumnya')"
                >
                  ‹ {{ t("prevPage", "Sebelumnya") }}
                </button>
                <button
                  v-for="p in totalCatalogPages"
                  :key="p"
                  type="button"
                  class="page-btn"
                  :class="{ active: catalogPage === p }"
                  @click="catalogPage = p"
                >
                  {{ p }}
                </button>
                <button
                  type="button"
                  class="page-btn"
                  :disabled="catalogPage >= totalCatalogPages"
                  @click="catalogPage++"
                  :aria-label="t('nextPage', 'Selanjutnya')"
                >
                  {{ t("nextPage", "Selanjutnya") }} ›
                </button>
              </div>
            </div>

            <div class="catalog-footnote">
              <ShieldCheck :size="17" />
              Katalog ini diperbarui secara berkala. Pastikan ketersediaan,
              kondisi fisik, dan kesesuaian clamping mesin telah dikonfirmasi
              sebelum proses PO.
            </div>
          </div>
        </section>

        <!-- KATALOG PRODUK HASIL CETAKAN PLASTIK (1 MODEL CARD INFORMASI YANG RAPI) -->
        <section id="hasil-cetakan" class="products-showcase-section">
          <div class="container">
            <div class="section-heading">
              <div>
                <div class="eyebrow dark">
                  <span class="eyebrow-line"></span> HASIL CETAKAN PLASTIK
                </div>
                <h2>Contoh produk yang<br /><span>dapat diproduksi.</span></h2>
              </div>
              <p>
                Mulai dari peralatan rumah tangga, packaging botol, gantungan,
                hingga komponen industri berkekuatan tinggi. Klik kartu produk
                untuk melihat detail dan galeri foto.
              </p>
            </div>

            <!-- FILTER TABS KATEGORI -->
            <div class="catalog-tools" style="margin-bottom: 24px">
              <div class="filter-tabs">
                <button
                  v-for="cat in categoriesList"
                  :key="cat"
                  :class="{ active: selectedCategory === cat }"
                  @click="selectedCategory = cat"
                >
                  {{ cat === "ALL" ? "Semua Kategori" : cat }}
                </button>
              </div>
            </div>

            <!-- SATU MODEL CARD GRID INFORMASI -->
            <div v-if="filteredProducts.length === 0" class="empty-state">
              Belum ada contoh produk hasil cetakan yang ditampilkan pada
              kategori ini.
            </div>
            <div v-else class="showcase-grid">
              <article
                v-for="prod in filteredProducts"
                :key="prod.id"
                class="showcase-card"
                @click="openProductDetail(prod)"
                style="cursor: pointer"
              >
                <div class="showcase-img">
                  <img
                    :src="
                      prod.imageUrl ||
                      'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80'
                    "
                    :alt="`Contoh cetakan plastik ${prod.name} - Pembuatan Molding Plastik Custom ${prod.category}`"
                    loading="lazy"
                  />
                  <span class="showcase-cat">{{ prod.category }}</span>
                  <span
                    v-if="getExtraImagesCount(prod) > 0"
                    class="gallery-pill"
                  >
                    +{{ getExtraImagesCount(prod) }} Foto Detail
                  </span>
                </div>
                <div class="showcase-body">
                  <h3>{{ prod.name }}</h3>
                  <p>{{ prod.description }}</p>
                  <div class="showcase-specs">
                    <span v-if="prod.weightEst"
                      >Perkiraan Berat: <b>{{ prod.weightEst }}</b></span
                    >
                    <span v-if="prod.dimensions"
                      >Dimensi Produk: <b>{{ prod.dimensions }}</b></span
                    >
                    <span v-if="prod.moldInfo"
                      >Spesifikasi Mold: <b>{{ prod.moldInfo }}</b></span
                    >
                  </div>
                  <div class="showcase-footer">
                    <span>Lihat Detail & Galeri Foto</span>
                    <ArrowUpRight :size="15" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <!-- CARA PEMESANAN (PO / INDENT) -->
        <section class="process-section" id="proses">
          <div class="container process-layout">
            <div class="process-intro">
              <div class="eyebrow">
                <span class="eyebrow-line"></span> CARA PEMESANAN
              </div>
              <h2>Jelas dari awal.<br /><span>Terarah sampai kirim.</span></h2>
              <p>
                Setiap kebutuhan mold memiliki karakter tersendiri. Kami
                memastikan setiap spesifikasi dan biaya terkonfirmasi secara
                transparan sebelum pembayaran.
              </p>
              <button class="btn btn-gold" @click="jumpTo('rfq')">
                Mulai Konsultasi <MoveRight :size="18" />
              </button>
            </div>

            <div class="process-list">
              <div
                v-for="(st, idx) in cms.process"
                :key="idx"
                class="process-item"
              >
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
              <div class="eyebrow">
                <span class="eyebrow-line"></span> REQUEST FOR QUOTATION
              </div>
              <h2>Ceritakan kebutuhan<br /><span>molding Anda.</span></h2>
              <p>
                Lengkapi informasi kebutuhan cetakan di samping. Tim teknis
                iLUFA akan menggunakan detail ini untuk menyiapkan kalkulasi
                penawaran resmi.
              </p>

              <div class="rfq-note">
                <div><Clock3 /></div>
                <span>
                  <b>Belum punya spesifikasi lengkap?</b>
                  <small
                    >Tidak masalah. Isi informasi yang sudah Anda ketahui, lalu
                    diskusikan sisanya bersama tim kami.</small
                  >
                </span>
              </div>

              <a class="rfq-wa" :href="waLink" target="_blank" rel="noreferrer">
                <MessageCircle /> Konsultasi Langsung via WhatsApp
                <ArrowUpRight />
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
                  <input
                    v-model.trim="form.companyName"
                    required
                    placeholder="PT / CV / Nama Usaha"
                  />
                </label>
                <label>
                  Nama PIC Kontak *
                  <input
                    v-model.trim="form.contactName"
                    required
                    placeholder="Nama lengkap Anda"
                  />
                </label>
                <label>
                  Email Resmi
                  <input
                    v-model.trim="form.email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                  />
                </label>
                <label>
                  Nomor WhatsApp / HP *
                  <input
                    v-model.trim="form.phone"
                    required
                    placeholder="Contoh: 08123456789"
                  />
                </label>
                <label>
                  Jenis Kebutuhan Mold *
                  <select v-model="form.moldType" required>
                    <option
                      v-for="pt in availableProcurementTypes"
                      :key="pt.code"
                      :value="pt.code"
                    >
                      {{ pt.name }}
                    </option>
                  </select>
                </label>
                <label>
                  Target Jadwal Produksi
                  <input
                    v-model="form.targetDate"
                    placeholder="Contoh: Segera / 2 Bulan ke depan"
                  />
                </label>
                <label class="full-field">
                  Deskripsi Kebutuhan Cetakan / Produk *
                  <textarea
                    v-model.trim="form.productNeed"
                    required
                    rows="3"
                    placeholder="Jelaskan jenis produk plastik yang akan dicetak, estimasi berat, atau referensi mold..."
                  ></textarea>
                </label>
                <label>
                  Dimensi Produk / Mold (jika ada)
                  <input
                    v-model="form.dimensions"
                    placeholder="Contoh: 15 x 10 cm"
                  />
                </label>
                <label>
                  Rencana Jumlah Cavity
                  <input
                    v-model="form.cavity"
                    placeholder="Contoh: 2, 4, 8, 16 Cavity"
                  />
                </label>
                <label class="full-field">
                  Informasi Mesin Injection Molding
                  <input
                    v-model="form.machineInfo"
                    placeholder="Merek dan Tonase mesin (misal: Haitian 180T, Toyo 250T)"
                  />
                </label>
                <label>
                  Estimasi Budget Pengadaan
                  <input v-model="form.budget" placeholder="Opsional" />
                </label>
                <label class="full-field">
                  Catatan Khusus
                  <textarea
                    v-model="form.notes"
                    rows="2"
                    placeholder="Informasi file gambar 3D CAD (STEP), sampel fisik, atau persyaratan baja mold"
                  ></textarea>
                </label>
              </div>

              <p v-if="formError" class="form-alert form-alert-error">
                {{ formError }}
              </p>
              <p v-if="formMessage" class="form-alert form-alert-success">
                <CheckCircle2 :size="18" /> {{ formMessage }}
              </p>

              <div class="form-bottom">
                <small
                  >Informasi kebutuhan Anda dijaga kerahasiaannya dan hanya
                  digunakan untuk menyusun penawaran teknis.</small
                >
                <button
                  class="btn btn-primary"
                  type="submit"
                  :disabled="formBusy"
                >
                  {{ formBusy ? "Mengirim..." : "Kirim Permintaan Penawaran" }}
                  <Send :size="16" />
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- FAQ SECTION ACCORDION -->
        <section class="faq-section" id="faq">
          <div class="container">
            <div class="section-heading faq-heading">
              <div class="eyebrow dark" style="justify-content: center">
                <span class="eyebrow-line"></span> FAQ & TANYA JAWAB
              </div>
              <h2>
                Pertanyaan yang sering<br /><span>diajukan pelanggan.</span>
              </h2>
              <p>
                Semua kejelasan seputar garansi, inspeksi fisik mold siap pakai, dan
                sistem pembayaran termin PO dijelaskan secara terbuka.
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
            <div class="about-visual-col">
              <div class="about-visual">
                <img
                  :src="cms.about.imageUrl"
                  class="about-visual-img"
                  style="max-width: 100%; max-height: 480px; width: 100%; height: auto; object-fit: contain !important; display: block; border-radius: 8px;"
                  alt="Tim teknis iLUFA Molding"
                  loading="lazy"
                />
              </div>
              <div class="about-caption" v-if="cms.about.caption">
                <span>iLUFA</span>
                <b>{{ cms.about.caption }}</b>
              </div>
            </div>
            <div class="about-copy">
              <div class="eyebrow dark">
                <span class="eyebrow-line"></span> {{ cms.about.eyebrow }}
              </div>
              <h2 style="white-space: pre-line">{{ cms.about.title }}</h2>
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
              <p>
                Mulai diskusi bersama tim teknis kami. Gambar teknik dan
                spesifikasi mesin dapat disesuaikan.
              </p>
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
            <img
              v-if="cms.general.logoUrl"
              :src="cms.general.logoUrl"
              :alt="cms.general.siteName || 'iLUFA Molding'"
              class="brand-logo-img"
            />
            <span v-else class="brand-mark">i</span>
            <div class="brand-info">
              <span
                class="brand-name notranslate"
                translate="no"
                style="color: var(--navy-text, #ffffff)"
                >{{ cms.general.siteName || "iLUFA MOLDING" }}</span
              >
              <small class="brand-tagline">{{
                cms.general.siteTagline || "INDUSTRIAL MOLD PROCUREMENT"
              }}</small>
            </div>
          </div>
          <div class="footer-contact-info">
            <p class="contact-item">{{ cms.general.address }}</p>
            <p class="contact-item">
              Email:
              <span class="notranslate" translate="no">{{
                cms.general.email
              }}</span>
            </p>
            <p class="contact-item">
              Telp:
              <span class="notranslate" translate="no">{{
                cms.general.phone
              }}</span>
            </p>
            <p v-if="cms.general.operationalHours" class="contact-item">
              Jam Operasional: {{ cms.general.operationalHours }}
            </p>
          </div>
          <div class="footer-links">
            <a href="#layanan">{{ t("navServices", "Layanan") }}</a>
            <a href="#katalog">{{ t("navCatalog", "Katalog Molding") }}</a>
            <a href="#hasil-cetakan">{{
              t("navProducts", "Contoh Hasil Cetak")
            }}</a>
            <a href="#proses">{{ t("navProcess", "Cara Pemesanan") }}</a>
            <a href="#faq">{{ t("navFaq", "FAQ") }}</a>
            <a href="#rfq">{{ t("navRfq", "Minta Penawaran") }}</a>
          </div>
        </div>
        <div class="container footer-bottom">
          <span
            >© {{ new Date().getFullYear() }} {{ cms.general.siteName }}.
            {{ t("footerCopyright", "All rights reserved.") }}</span
          >
          <span
            >Jual Molding Injeksi Plastik Siap Pakai · Jasa Pemesanan Molding Import
            · Pembuatan Molding Plastik Custom</span
          >
        </div>
      </footer>

      <!-- FLOATING WHATSAPP CTA BUTTON -->
      <a
        :href="waLink"
        target="_blank"
        rel="noreferrer"
        class="floating-wa-btn"
        :aria-label="t('waFloatCta', 'Konsultasi dengan Kami')"
      >
        <div class="wa-icon-bubble">
          <MessageCircle :size="20" />
          <span class="wa-pulse"></span>
        </div>
        <div class="wa-btn-content">
          <span class="wa-btn-sub">{{
            t("waFloatSub", "Online & Fast Response")
          }}</span>
          <span class="wa-btn-text">{{
            t("waFloatCta", "Konsultasi dengan Kami")
          }}</span>
        </div>
      </a>

      <!-- MOLD DETAIL MODAL -->
      <MoldDetailModal
        v-if="selectedMold"
        :mold="selectedMold"
        :whatsapp="cms.general.whatsappNumber"
        :lang="currentLang"
        @close="selectedMold = null"
        @request-quote="handleRequestQuoteFromMoldModal"
      />

      <!-- PRODUCT & CATEGORY DETAIL MODAL -->
      <ProductDetailModal
        v-if="detailModalItem"
        :item="detailModalItem"
        :mode="detailModalMode"
        :category-obj="findCategoryForProduct(detailModalItem)"
        :whatsapp="cms.general.whatsappNumber"
        :lang="currentLang"
        @close="detailModalItem = null"
        @request-quote="handleRequestQuoteFromProductModal"
      />
    </div>
  </div>
</template>
