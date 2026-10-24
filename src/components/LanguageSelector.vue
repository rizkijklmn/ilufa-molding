<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Globe, Search, ChevronDown, Check, X } from 'lucide-vue-next'
import { LANGUAGES } from '../languages.js'

const isOpen = ref(false)
const searchQuery = ref('')
const currentLangCode = ref('id')

// Ambil bahasa saat ini dari cookie atau localStorage
function detectCurrentLang() {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/id\/([^;]+)/)
  if (match && match[1]) {
    currentLangCode.value = match[1]
  } else {
    currentLangCode.value = localStorage.getItem('ilufa_lang') || 'id'
  }
}

const currentLanguage = computed(() => {
  return LANGUAGES.find(l => l.code === currentLangCode.value) || {
    code: 'id',
    name: 'Bahasa Indonesia',
    native: 'Bahasa Indonesia',
    flag: '🇮🇩'
  }
})

const filteredLanguages = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return LANGUAGES
  return LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.native.toLowerCase().includes(q) ||
    l.code.toLowerCase().includes(q)
  )
})

const popularLanguages = computed(() => {
  if (searchQuery.value.trim()) return []
  return LANGUAGES.filter(l => l.popular)
})

function selectLanguage(lang) {
  isOpen.value = false
  currentLangCode.value = lang.code
  try {
    localStorage.setItem('ilufa_lang', lang.code)
  } catch {}

  const hostname = window.location.hostname
  const cookieVal = lang.code === 'id' ? '/id/id' : `/id/${lang.code}`

  // Set Google Translate Cookie
  document.cookie = `googtrans=${cookieVal}; path=/;`
  document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`
  if (hostname.includes('.')) {
    const parts = hostname.split('.')
    if (parts.length > 1) {
      const rootDomain = '.' + parts.slice(-2).join('.')
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain};`
    }
  }

  // Jika kembali ke bahasa Indonesia, bersihkan expire cookie agar reset tuntas
  if (lang.code === 'id') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`
  }

  // Picu selector native Google jika tersedia
  const select = document.querySelector('.goog-te-combo')
  if (select) {
    select.value = lang.code
    select.dispatchEvent(new Event('change'))
  }

  // Refresh halaman sesuai permintaan user
  setTimeout(() => {
    window.location.reload()
  }, 100)
}

function handleOutsideClick(e) {
  if (
    !e.target.closest('.lang-dropdown-wrapper') &&
    !e.target.closest('.lang-modal-dialog')
  ) {
    isOpen.value = false
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  detectCurrentLang()
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="lang-dropdown-wrapper">
    <!-- TRIGGER BUTTON DI TOPBAR -->
    <button
      type="button"
      class="lang-trigger-btn"
      :class="{ active: isOpen }"
      @click="isOpen = !isOpen"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
    >
      <Globe :size="13" class="globe-icon" />
      <span class="lang-flag">{{ currentLanguage.flag }}</span>
      <span class="lang-name lang-name-full">{{ currentLanguage.name }}</span>
      <span class="lang-name lang-name-short">{{ currentLanguage.code === 'id' ? 'ID' : currentLanguage.code === 'en' ? 'EN' : currentLanguage.code.toUpperCase() }}</span>
      <ChevronDown :size="12" class="chevron-icon" :class="{ rotate: isOpen }" />
    </button>

    <!-- TELEPORTED MODAL DIALOG (ANTI-KEPOTONG DI SEMUA LAYAR HP & TABLET) -->
    <teleport to="body">
      <div v-if="isOpen" class="lang-modal-backdrop" @click="isOpen = false">
        <div class="lang-modal-dialog" @click.stop>
          <div class="lang-modal-header">
            <div class="lang-modal-title-row">
              <span class="modal-title-text">
                <Globe :size="16" /> Pilih Bahasa / Select Language
              </span>
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="isOpen = false"
                aria-label="Tutup"
              >
                <X :size="18" />
              </button>
            </div>

            <div class="lang-search-wrap">
              <Search :size="15" class="search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari bahasa / Search language..."
                class="lang-search-input"
                autofocus
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                @click="searchQuery = ''"
                type="button"
              >
                <X :size="13" />
              </button>
            </div>
          </div>

          <div class="lang-list-container">
            <!-- BAHASA POPULER (HANYA MUNCUL SAAT TIDAK SEARCH) -->
            <div v-if="popularLanguages.length > 0" class="lang-section-block">
              <span class="section-label">Bahasa Utama & Rekomendasi</span>
              <div class="lang-grid-quick">
                <button
                  v-for="lang in popularLanguages"
                  :key="'pop-' + lang.code"
                  type="button"
                  class="lang-chip-btn"
                  :class="{ selected: currentLangCode === lang.code }"
                  @click="selectLanguage(lang)"
                >
                  <span class="chip-flag">{{ lang.flag }}</span>
                  <span class="chip-name">{{ lang.name }}</span>
                </button>
              </div>
            </div>

            <!-- DAFTAR SEMUA BAHASA (SCROLL VERTIKAL KE BAWAH) -->
            <div class="lang-section-block">
              <span class="section-label">
                {{ searchQuery ? `Hasil Pencarian (${filteredLanguages.length})` : 'Semua Bahasa (Alfabetis)' }}
              </span>

              <div v-if="filteredLanguages.length === 0" class="empty-lang-state">
                Bahasa "{{ searchQuery }}" tidak ditemukan.
              </div>

              <ul v-else class="lang-vertical-list">
                <li
                  v-for="lang in filteredLanguages"
                  :key="lang.code"
                  class="lang-list-item"
                  :class="{ selected: currentLangCode === lang.code }"
                  @click="selectLanguage(lang)"
                >
                  <div class="lang-item-left">
                    <span class="item-flag">{{ lang.flag }}</span>
                    <div class="item-text">
                      <span class="item-name">{{ lang.name }}</span>
                      <small class="item-native">{{ lang.native }}</small>
                    </div>
                  </div>
                  <Check v-if="currentLangCode === lang.code" :size="16" class="check-icon" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.lang-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

/* TRIGGER BUTTON */
.lang-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  padding: 5px 11px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.lang-trigger-btn:hover,
.lang-trigger-btn.active {
  background: rgba(217, 170, 82, 0.2);
  border-color: #d9aa52;
  color: #f2c875;
}

.globe-icon {
  color: #d9aa52;
}

.lang-flag {
  font-size: 13px;
  line-height: 1;
}

.lang-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lang-name-full {
  display: inline;
}

.lang-name-short {
  display: none;
}

.chevron-icon {
  opacity: 0.8;
  transition: transform 0.2s ease;
}

.chevron-icon.rotate {
  transform: rotate(180deg);
}

/* RESPONSIVE MOBILE TRIGGER */
@media (max-width: 600px) {
  .lang-name-full {
    display: none !important;
  }
  .lang-name-short {
    display: inline !important;
    font-size: 11px;
    font-weight: 700;
  }
  .globe-icon {
    display: none;
  }
  .lang-trigger-btn {
    padding: 3px 8px;
    gap: 4px;
  }
}

/* TELEPORTED MODAL DIALOG (ANTI-CUT-OFF DI SEMUA LAYAR HP & TABLET) */
.lang-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999999;
  background: rgba(11, 31, 51, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  animation: modalBackdropFadeIn 0.2s ease-out;
}

@keyframes modalBackdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lang-modal-dialog {
  width: 100%;
  max-width: 430px;
  max-height: 84vh;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 25px 50px -12px rgba(11, 31, 51, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.lang-modal-header {
  padding: 14px 16px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lang-modal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.modal-title-text {
  font-size: 13.5px;
  font-weight: 700;
  color: #0b1f33;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-close-icon-btn {
  background: #e2e8f0;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.modal-close-icon-btn:hover {
  background: #cbd5e1;
  color: #0f172a;
}

.lang-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  transition: border-color 0.15s;
}

.lang-search-wrap:focus-within {
  border-color: #0b1f33;
  box-shadow: 0 0 0 2px rgba(11, 31, 51, 0.1);
}

.search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.lang-search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 12.5px;
  color: #1e293b;
  background: transparent;
}

.clear-search-btn {
  border: none;
  background: #e2e8f0;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  padding: 0;
}

/* LIST CONTAINER VERTIKAL SCROLL */
.lang-list-container {
  max-height: 330px;
  overflow-y: auto;
  padding: 8px 0;
  scrollbar-width: thin;
}

.lang-list-container::-webkit-scrollbar {
  width: 5px;
}

.lang-list-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.lang-section-block {
  padding: 4px 10px 8px;
}

.section-label {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
  padding: 0 4px;
}

/* QUICK GRID CHIPS */
.lang-grid-quick {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.lang-chip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lang-chip-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.lang-chip-btn.selected {
  background: #0b1f33;
  color: #ffffff;
  border-color: #0b1f33;
}

/* VERTICAL LIST */
.lang-vertical-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lang-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.lang-list-item:hover {
  background: #f1f5f9;
}

.lang-list-item.selected {
  background: #f8fafc;
  font-weight: 700;
}

.lang-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.item-flag {
  font-size: 15px;
  flex-shrink: 0;
}

.item-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.item-name {
  font-size: 12.5px;
  color: #1e293b;
}

.item-native {
  font-size: 10.5px;
  color: #64748b;
}

.check-icon {
  color: #0b1f33;
  flex-shrink: 0;
}

.empty-lang-state {
  padding: 20px 10px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}
</style>

