<script setup>
import { computed, ref, watch } from 'vue'
import { X, ArrowUpRight, MessageCircle, Layers, ShieldCheck } from 'lucide-vue-next'

const props = defineProps({
  item: { type: Object, default: null },
  categoryObj: { type: Object, default: null },
  mode: { type: String, default: 'product' }, // 'product' or 'category'
  whatsapp: { type: String, default: '628132207311' },
  lang: { type: String, default: 'id' }
})

const emit = defineEmits(['close', 'request-quote'])

const isEn = computed(() => props.lang === 'en')

const defaultImg = 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=900&q=80'
const activeImage = ref('')

const extraImages = computed(() => {
  if (!props.item) return []
  const itemGallery = Array.isArray(props.item.galleryImages)
    ? props.item.galleryImages.map(s => String(s || '').trim()).filter(Boolean)
    : []
  if (itemGallery.length > 0) return itemGallery.slice(0, 3)

  // Fallback to category gallery if item has none
  if (props.categoryObj && Array.isArray(props.categoryObj.galleryImages)) {
    return props.categoryObj.galleryImages.map(s => String(s || '').trim()).filter(Boolean).slice(0, 3)
  }
  return []
})

const hasDetailImages = computed(() => extraImages.value.length > 0)

const allImages = computed(() => {
  if (!props.item) return []
  const main = props.item.imageUrl || props.categoryObj?.imageUrl || defaultImg
  return [main, ...extraImages.value]
})

watch(() => props.item, (newVal) => {
  if (newVal) {
    activeImage.value = newVal.imageUrl || props.categoryObj?.imageUrl || defaultImg
  }
}, { immediate: true })

const waLink = computed(() => {
  if (!props.item) return '#'
  const label = props.mode === 'category'
    ? `kategori molding "${props.item.name}"`
    : `pembuatan mold untuk produk "${props.item.name}" (${props.item.category})`
  const msg = `Halo iLUFA Molding, saya ingin konsultasi mengenai ${label}. Mohon informasi spesifikasi dan penawarannya.`
  return `https://wa.me/${props.whatsapp}?text=${encodeURIComponent(msg)}`
})
</script>

<template>
  <div v-if="item" class="prod-modal-backdrop" @click.self="emit('close')">
    <div class="prod-modal-card">
      <button class="modal-close-icon" @click="emit('close')" aria-label="Tutup"><X :size="20" /></button>

      <div class="prod-modal-grid">
        <!-- LEFT: IMAGE GALLERY (Full height with no blue bar if no detail images) -->
        <div class="modal-gallery-col" :class="{ 'single-image-mode': !hasDetailImages }">
          <div class="modal-main-img">
            <img :src="activeImage || defaultImg" :alt="item.name" />
            <div class="modal-tags">
              <span class="cat-badge">
                <Layers :size="12" />
                {{ mode === 'category' ? 'Detail Kategori' : item.category }}
              </span>
            </div>
          </div>

          <!-- ONLY RENDER THUMBNAIL BAR IF THERE ARE EXTRA DETAIL IMAGES -->
          <div v-if="hasDetailImages" class="modal-thumbs-bar">
            <button
              v-for="(imgUrl, idx) in allImages"
              :key="idx"
              type="button"
              class="thumb-item"
              :class="{ active: activeImage === imgUrl }"
              @click="activeImage = imgUrl"
            >
              <img :src="imgUrl" :alt="`${item.name} gambar ${idx + 1}`" />
              <span class="thumb-label">{{ idx === 0 ? 'Utama' : `Detail ${idx}` }}</span>
            </button>
          </div>
        </div>

        <!-- RIGHT: DETAILS & SPECS -->
        <div class="modal-details">
          <div class="detail-header">
            <span class="detail-eyebrow">
              {{ mode === 'category' ? 'INFORMASI & DETAIL KATEGORI' : `CONTOH HASIL CETAKAN · ${item.category}` }}
            </span>
            <h2>{{ item.name }}</h2>
            <p v-if="item.description" class="detail-desc">{{ item.description }}</p>
            <div v-if="item.detailContent" class="detail-box">
              <b>Penjelasan Detail & Aplikasi:</b>
              <p>{{ item.detailContent }}</p>
            </div>
          </div>

          <!-- PRODUCT TECHNICAL SPECS -->
          <div v-if="mode === 'product'" class="specs-table-box">
            <h4>{{ isEn ? 'Product Specifications & Mold Requirements' : 'Spesifikasi Produk & Kebutuhan Mold' }}</h4>
            <div class="specs-grid">
              <div class="spec-item">
                <small>{{ isEn ? 'Estimated Product Weight' : 'Perkiraan Berat Produk' }}</small>
                <b>{{ item.weightEst || (isEn ? 'Per design' : 'Sesuai desain') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Dimensions / Size' : 'Dimensi / Ukuran' }}</small>
                <b>{{ item.dimensions || (isEn ? 'Per sample' : 'Sesuai sampel') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Recommended Mold Specs' : 'Rekomendasi Spesifikasi Mold' }}</small>
                <b>{{ item.moldInfo || 'Single / Multi-Cavity' }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Plastic Resin Material' : 'Material Resin Plastik' }}</small>
                <b>{{ item.materialType || (isEn ? 'PP / HDPE / ABS / Custom' : 'PP / HDPE / ABS / Sesuai kebutuhan') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Estimated Cycle Time' : 'Estimasi Siklus Cetak' }}</small>
                <b>{{ item.cycleTime || (isEn ? 'Customized per cooling design' : 'Disesuaikan desain pendingin') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Required Machine Tonnage' : 'Kebutuhan Tonase Mesin' }}</small>
                <b>{{ item.minMachineTonnage || (isEn ? 'Calculated upon consultation' : 'Dikalkulasi saat konsultasi') }}</b>
              </div>
            </div>
          </div>

          <!-- CATEGORY EXTRA INFO -->
          <div v-if="mode === 'product' && categoryObj && categoryObj.detailContent && categoryObj.detailContent !== item.detailContent" class="cat-context-box">
            <small>{{ isEn ? `CATEGORY DETAILS: ${categoryObj.name.toUpperCase()}` : `DETAIL KATEGORI ${categoryObj.name.toUpperCase()}` }}</small>
            <p>{{ categoryObj.detailContent }}</p>
          </div>

          <!-- ACTIONS -->
          <div class="quote-action-bar">
            <div class="modal-actions">
              <button class="btn btn-primary" @click="emit('request-quote', item)">
                {{ isEn ? 'Order / Request Quote for this Mold' : 'Pesan / Minta Penawaran Mold Ini' }} <ArrowUpRight :size="16" />
              </button>
              <a :href="waLink" target="_blank" class="btn btn-wa">
                <MessageCircle :size="16" /> {{ isEn ? 'WhatsApp Consultation' : 'Konsultasi WhatsApp' }}
              </a>
            </div>
          </div>

          <div class="modal-notice">
            <ShieldCheck :size="16" />
            <small>{{ isEn ? 'We provide new and custom injection mold fabrication to produce parts like above tailored to your plant machines.' : 'Kami melayani pembuatan molding baru maupun custom untuk menghasilkan produk seperti di atas sesuai ukuran dan kapasitas mesin pabrik Anda.' }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prod-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 31, 51, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.prod-modal-card {
  background: white;
  width: 100%;
  max-width: 920px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 4px;
  box-shadow: 0 30px 70px rgba(0,0,0,0.35);
  position: relative;
}
.modal-close-icon {
  position: absolute;
  top: 14px;
  right: 14px;
  border: 0;
  background: white;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
  color: #14283b;
}
.prod-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  align-items: stretch;
}
.modal-gallery-col {
  background: #e9eef2;
  display: flex;
  flex-direction: column;
}
.modal-main-img {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 340px;
  overflow: hidden;
}
.single-image-mode .modal-main-img {
  min-height: 100%;
}
.modal-main-img img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.modal-tags {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
}
.cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(11, 31, 51, 0.9);
  color: #d9aa52;
  padding: 6px 11px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 2px;
}
.modal-thumbs-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
  background: #0b1f33;
  flex-shrink: 0;
}
.thumb-item {
  border: 2px solid transparent;
  padding: 0;
  background: #122a40;
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  height: 64px;
  transition: all 0.2s;
}
.thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
  display: block;
}
.thumb-item.active {
  border-color: #d9aa52;
}
.thumb-item.active img,
.thumb-item:hover img {
  opacity: 1;
}
.thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(7, 21, 35, 0.82);
  color: #e2e8f0;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 4px;
  text-align: center;
}

.modal-details {
  padding: 32px 30px;
  display: flex;
  flex-direction: column;
}
.detail-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #b78732;
  text-transform: uppercase;
}
.detail-header h2 {
  font-family: 'Manrope', sans-serif;
  font-size: 23px;
  margin: 6px 0 10px;
  color: #0b1f33;
}
.detail-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #465868;
  margin: 0 0 14px;
}
.detail-box {
  background: #f8fafc;
  border-left: 3px solid #d9aa52;
  padding: 12px 15px;
  margin-bottom: 18px;
  border-radius: 0 3px 3px 0;
}
.detail-box b {
  display: block;
  font-size: 11px;
  color: #0b1f33;
  margin-bottom: 4px;
}
.detail-box p {
  font-size: 12px;
  line-height: 1.75;
  color: #556777;
  margin: 0;
  white-space: pre-line;
}
.specs-table-box {
  background: #f7f9fa;
  border: 1px solid #e3e8ed;
  padding: 16px 18px;
  border-radius: 3px;
  margin-bottom: 16px;
}
.specs-table-box h4 {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  margin: 0 0 12px;
  color: #0b1f33;
}
.specs-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 11px 14px;
}
.spec-item small {
  display: block;
  font-size: 10px;
  color: #7b8c9a;
  margin-bottom: 2px;
}
.spec-item b {
  font-size: 12px;
  color: #14283b;
}
.cat-context-box {
  background: #fdf9f0;
  border: 1px solid #efe2c6;
  padding: 12px 14px;
  border-radius: 3px;
  margin-bottom: 18px;
}
.cat-context-box small {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #9b7029;
  display: block;
  margin-bottom: 4px;
}
.cat-context-box p {
  font-size: 11px;
  line-height: 1.65;
  color: #5d513b;
  margin: 0;
}
.quote-action-bar {
  border-top: 1px solid #e7ecf0;
  padding-top: 18px;
  margin-top: auto;
  margin-bottom: 14px;
}
.modal-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.btn-wa {
  background: #25d366;
  color: white;
  border: 0;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 2px;
  cursor: pointer;
}
.btn-wa:hover {
  background: #20ba59;
}
.modal-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #71818f;
  font-size: 11px;
  line-height: 1.5;
}
.modal-notice svg {
  color: #b78732;
  flex-shrink: 0;
}

@media (max-width: 820px) {
  .prod-modal-grid { grid-template-columns: 1fr; }
  .modal-main-img { height: 260px; min-height: 260px; position: relative; }
  .single-image-mode .modal-main-img { min-height: 260px; }
  .modal-details { padding: 22px 18px; }
}
@media (max-width: 520px) {
  .specs-grid { grid-template-columns: 1fr; gap: 10px; }
  .modal-actions { flex-direction: column; width: 100%; }
  .modal-actions .btn, .modal-actions .btn-wa { width: 100%; justify-content: center; }
}
</style>
