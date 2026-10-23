<script setup>
import { computed } from 'vue'
import { X, ArrowUpRight, MessageCircle, ShieldCheck, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps({
  mold: { type: Object, default: null },
  whatsapp: { type: String, default: '628132207311' }
})

const emit = defineEmits(['close', 'request-quote'])

const typeLabel = (type) => ({ NEW: 'Molding Import Baru', CUSTOM: 'Molding Custom Sesuai Pesanan', USED: 'Molding Second / Bekas' }[type] || type)
const statusLabel = (status) => ({ AVAILABLE: 'Tersedia (Ready)', ON_ORDER: 'PO / Indent', NEGOTIATION: 'Dalam Negosiasi', SOLD: 'Terjual' }[status] || status)

const waLink = computed(() => {
  if (!props.mold) return '#'
  const msg = `Halo iLUFA Molding, saya tertarik dengan "${props.mold.name}" (Kode: ${props.mold.code}). Mohon info penawaran dan spesifikasi lengkapnya.`
  return `https://wa.me/${props.whatsapp}?text=${encodeURIComponent(msg)}`
})
</script>

<template>
  <div v-if="mold" class="mold-modal-backdrop" @click.self="emit('close')">
    <div class="mold-modal-card">
      <button class="modal-close-icon" @click="emit('close')"><X :size="20" /></button>
      
      <div class="mold-modal-grid">
        <div class="modal-gallery">
          <img :src="mold.imageUrl || 'https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1000&q=80'" :alt="mold.name" />
          <div class="modal-tags">
            <span class="type-badge">{{ typeLabel(mold.type) }}</span>
            <span class="status-badge" :class="'status-' + mold.status.toLowerCase()">{{ statusLabel(mold.status) }}</span>
          </div>
        </div>

        <div class="modal-details">
          <div class="detail-header">
            <span class="detail-code">{{ mold.code }} · {{ mold.category }}</span>
            <h2>{{ mold.name }}</h2>
            <p class="detail-desc">{{ mold.description }}</p>
          </div>

          <div class="specs-table-box">
            <h4>Spesifikasi Teknis Mold</h4>
            <div class="specs-grid">
              <div class="spec-item">
                <small>Jumlah Cavity</small>
                <b>{{ mold.cavity ? mold.cavity + ' Cavity' : 'Perlu konfirmasi' }}</b>
              </div>
              <div class="spec-item">
                <small>Dimensi Mold Base</small>
                <b>{{ mold.dimensions || 'Sesuai desain' }}</b>
              </div>
              <div class="spec-item">
                <small>Estimasi Berat</small>
                <b>{{ mold.weightKg ? mold.weightKg + ' kg' : 'Perlu konfirmasi' }}</b>
              </div>
              <div class="spec-item">
                <small>Material / Baja Mold</small>
                <b>{{ mold.material || 'P20 / 718 / Sesuai pesanan' }}</b>
              </div>
              <div class="spec-item">
                <small>Kesesuaian Mesin</small>
                <b>{{ mold.machineTonnage || 'Ditentukan saat konsultasi' }}</b>
              </div>
              <div class="spec-item">
                <small>Kondisi & Kelayakan</small>
                <b>{{ mold.condition || 'Terverifikasi' }}</b>
              </div>
            </div>
          </div>

          <div class="price-quote-banner">
            <div>
              <small>STATUS HARGA</small>
              <b>{{ mold.priceLabel || 'Minta Penawaran Resmi' }}</b>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" @click="emit('request-quote', mold)">
                Minta Penawaran (RFQ) <ArrowUpRight :size="16" />
              </button>
              <a :href="waLink" target="_blank" class="btn btn-wa">
                <MessageCircle :size="16" /> Chat WhatsApp
              </a>
            </div>
          </div>

          <div class="modal-notice">
            <ShieldCheck :size="16" />
            <small>Spesifikasi teknis, kelengkapan runner, dan biaya pengiriman dikonfirmasi secara transparan sebelum kesepakatan PO / Indent.</small>
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
  padding: 20px;
}
.mold-modal-card {
  background: white;
  width: 100%;
  max-width: 880px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 4px;
  box-shadow: 0 30px 70px rgba(0,0,0,0.35);
  position: relative;
}
.modal-close-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  background: white;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  color: #14283b;
}
.mold-modal-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
}
.modal-gallery {
  position: relative;
  background: #0b1f33;
  min-height: 360px;
}
.modal-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.modal-tags {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
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
  padding: 36px 32px;
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
  font-size: 24px;
  margin: 6px 0 10px;
  color: #0b1f33;
}
.detail-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #5b6c7c;
  margin: 0 0 20px;
}
.specs-table-box {
  background: #f7f9fa;
  border: 1px solid #e3e8ed;
  padding: 18px;
  border-radius: 3px;
  margin-bottom: 22px;
}
.specs-table-box h4 {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  margin: 0 0 12px;
  color: #0b1f33;
}
.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
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
  margin-top: 10px;
}
.modal-notice svg {
  color: #b78732;
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .mold-modal-grid { grid-template-columns: 1fr; }
  .modal-gallery { height: 220px; min-height: unset; }
  .modal-details { padding: 22px 18px; }
  .modal-actions { width: 100%; flex-direction: column; }
  .modal-actions .btn { width: 100%; }
}
</style>

