<script setup>
import { computed, ref, watch } from 'vue'
import { X, ArrowUpRight, MessageCircle, ShieldCheck } from 'lucide-vue-next'

const props = defineProps({
  mold: { type: Object, default: null },
  whatsapp: { type: String, default: '628132207311' },
  lang: { type: String, default: 'id' }
})

const emit = defineEmits(['close', 'request-quote'])

const isEn = computed(() => props.lang === 'en')

const defaultImg = 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1000&q=80'
const activeImage = ref('')

const extraImages = computed(() => {
  if (!props.mold || !Array.isArray(props.mold.galleryImages)) return []
  return props.mold.galleryImages.map(s => String(s || '').trim()).filter(Boolean).slice(0, 3)
})

const hasDetailImages = computed(() => extraImages.value.length > 0)

const allImages = computed(() => {
  if (!props.mold) return []
  const main = props.mold.imageUrl || defaultImg
  return [main, ...extraImages.value]
})

watch(() => props.mold, (newMold) => {
  if (newMold) {
    activeImage.value = newMold.imageUrl || defaultImg
  }
}, { immediate: true })

const typeLabel = (type) => {
  if (isEn.value) {
    return { NEW: 'New Imported Mold', CUSTOM: 'Custom Mold Fabrication', USED: 'Used / Second Mold' }[type] || type
  }
  return { NEW: 'Molding Import Baru', CUSTOM: 'Molding Custom Sesuai Pesanan', USED: 'Molding Second / Bekas' }[type] || type
}

const statusLabel = (status) => {
  if (isEn.value) {
    return { AVAILABLE: 'Available (Ready)', ON_ORDER: 'PO / Indent', NEGOTIATION: 'In Negotiation', SOLD: 'Sold' }[status] || status
  }
  return { AVAILABLE: 'Tersedia (Ready)', ON_ORDER: 'PO / Indent', NEGOTIATION: 'Dalam Negosiasi', SOLD: 'Terjual' }[status] || status
}

const waLink = computed(() => {
  if (!props.mold) return '#'
  const msg = isEn.value
    ? `Hello iLUFA Molding, I am interested in "${props.mold.name}" (Code: ${props.mold.code}). Please share complete specifications and official quotation.`
    : `Halo iLUFA Molding, saya tertarik dengan "${props.mold.name}" (Kode: ${props.mold.code}). Mohon info penawaran dan spesifikasi lengkapnya.`
  return `https://wa.me/${props.whatsapp}?text=${encodeURIComponent(msg)}`
})
</script>

<template>
  <div v-if="mold" class="mold-modal-backdrop" @click.self="emit('close')">
    <div class="mold-modal-card">
      <button class="modal-close-icon" @click="emit('close')" aria-label="Tutup"><X :size="20" /></button>
      
      <div class="mold-modal-grid">
        <!-- LEFT COLUMN: IF NO EXTRA IMAGES, FULL HEIGHT IMAGE WITH NO BLUE BAR -->
        <div class="modal-gallery-col" :class="{ 'single-image-mode': !hasDetailImages }">
          <div class="modal-main-img">
            <img :src="activeImage || defaultImg" :alt="mold.name" />
            <div class="modal-tags">
              <span class="type-badge">{{ typeLabel(mold.type) }}</span>
              <span class="status-badge" :class="'status-' + mold.status.toLowerCase()">{{ statusLabel(mold.status) }}</span>
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
              <img :src="imgUrl" :alt="`${mold.name} foto ${idx + 1}`" />
              <span class="thumb-label">{{ idx === 0 ? 'Utama' : `Detail ${idx}` }}</span>
            </button>
          </div>
        </div>

        <div class="modal-details">
          <div class="detail-header">
            <span class="detail-code">{{ mold.code }} · {{ mold.category }}</span>
            <h2>{{ mold.name }}</h2>
            <p class="detail-desc">{{ mold.description }}</p>
            <p v-if="mold.detailContent" class="detail-extra">{{ mold.detailContent }}</p>
          </div>

          <div class="specs-table-box">
            <h4>{{ isEn ? 'Technical Mold Specifications' : 'Spesifikasi Teknis Mold' }}</h4>
            <div class="specs-grid">
              <div class="spec-item">
                <small>{{ isEn ? 'Number of Cavities' : 'Jumlah Cavity' }}</small>
                <b>{{ mold.cavity ? mold.cavity + ' Cavity' : (isEn ? 'To be confirmed' : 'Perlu konfirmasi') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Mold Base Dimensions' : 'Dimensi Mold Base' }}</small>
                <b>{{ mold.dimensions || (isEn ? 'Per design specs' : 'Sesuai desain') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Estimated Weight' : 'Estimasi Berat' }}</small>
                <b>{{ mold.weightKg ? mold.weightKg + ' kg' : (isEn ? 'To be confirmed' : 'Perlu konfirmasi') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Mold Steel Grade' : 'Material / Baja Mold' }}</small>
                <b>{{ mold.material || (isEn ? 'P20 / 718 / Per request' : 'P20 / 718 / Sesuai pesanan') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Machine Compatibility' : 'Kesesuaian Mesin' }}</small>
                <b>{{ mold.machineTonnage || (isEn ? 'Determined upon consultation' : 'Ditentukan saat konsultasi') }}</b>
              </div>
              <div class="spec-item">
                <small>{{ isEn ? 'Condition & Quality' : 'Kondisi & Kelayakan' }}</small>
                <b>{{ mold.condition || (isEn ? 'Verified' : 'Terverifikasi') }}</b>
              </div>
            </div>
          </div>

          <div class="price-quote-banner">
            <div>
              <small>{{ isEn ? 'PRICE STATUS' : 'STATUS HARGA' }}</small>
              <b>{{ mold.priceLabel || (isEn ? 'Request Official Quote' : 'Minta Penawaran Resmi') }}</b>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" @click="emit('request-quote', mold)">
                {{ isEn ? 'Request Quote (RFQ)' : 'Minta Penawaran (RFQ)' }} <ArrowUpRight :size="16" />
              </button>
              <a :href="waLink" target="_blank" class="btn btn-wa">
                <MessageCircle :size="16" /> {{ isEn ? 'Chat WhatsApp' : 'Chat WhatsApp' }}
              </a>
            </div>
          </div>

          <div class="modal-notice">
            <ShieldCheck :size="16" />
            <small>{{ isEn ? 'Technical specs, runner completeness, and shipping fees are transparently confirmed prior to PO agreement.' : 'Spesifikasi teknis, kelengkapan runner, dan biaya pengiriman dikonfirmasi secara transparan sebelum kesepakatan PO / Indent.' }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mold-modal-backdrop {
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
.mold-modal-card {
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
.mold-modal-grid {
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
.modal-tags {
  position: absolute;
  bottom: 14px;
  left: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 2;
}
.type-badge, .status-badge {
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 2px;
}
.type-badge { background: #0b1f33; color: #d9aa52; }
.status-badge { background: #e8f5ec; color: #236c3c; }
.status-on_order { background: #fff3db; color: #875c12; }
.status-negotiation { background: #ebf0f8; color: #2c4b75; }
.status-sold { background: #eee; color: #666; }

.modal-details {
  padding: 32px 30px;
  display: flex;
  flex-direction: column;
}
.detail-code {
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
  margin: 0 0 10px;
}
.detail-extra {
  font-size: 12px;
  line-height: 1.75;
  color: #5b6c7c;
  background: #f8fafc;
  border-left: 3px solid #d9aa52;
  padding: 10px 14px;
  margin: 0 0 18px;
  white-space: pre-line;
}
.specs-table-box {
  background: #f7f9fa;
  border: 1px solid #e3e8ed;
  padding: 16px 18px;
  border-radius: 3px;
  margin-bottom: 20px;
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
  gap: 12px 14px;
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
.price-quote-banner {
  border-top: 1px solid #e7ecf0;
  padding-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: auto;
  margin-bottom: 14px;
}
.price-quote-banner small {
  display: block;
  font-size: 9px;
  letter-spacing: 1.2px;
  color: #7b8c9a;
}
.price-quote-banner b {
  font-size: 16px;
  color: #0b1f33;
  margin-top: 2px;
  display: block;
}
.modal-actions {
  display: flex;
  gap: 8px;
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
  .mold-modal-grid { grid-template-columns: 1fr; }
  .modal-main-img { height: 260px; min-height: 260px; position: relative; }
  .single-image-mode .modal-main-img { min-height: 260px; }
  .modal-details { padding: 22px 18px; }
}
@media (max-width: 520px) {
  .specs-grid { grid-template-columns: 1fr; gap: 10px; }
  .price-quote-banner { flex-direction: column; align-items: stretch; }
  .modal-actions { width: 100%; flex-direction: column; }
  .modal-actions .btn, .modal-actions .btn-wa { width: 100%; }
}
</style>
