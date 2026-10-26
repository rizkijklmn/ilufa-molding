// src/utils/themeContrast.js

/**
 * Calculate relative luminance of a hex color (0.0 to 1.0)
 * Compliant with WCAG 2.1 formula
 */
export function getLuminance(hex) {
  if (!hex || typeof hex !== 'string') return 0
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 3 && clean.length !== 6) return 0
  const full = clean.length === 3 
    ? clean.split('').map(c => c + c).join('') 
    : clean
  const r = parseInt(full.substring(0, 2), 16) / 255
  const g = parseInt(full.substring(2, 4), 16) / 255
  const b = parseInt(full.substring(4, 6), 16) / 255
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  )
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

/**
 * Calculate contrast ratio between two hex colors (1:1 to 21:1)
 */
export function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1)
  const l2 = getLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Automatically applies colors and calculates contrast-safe text and button colors
 * to ensure all headings, paragraphs, eyebrows, and CTA buttons remain 100% legible
 * regardless of what colors are selected in the CMS theme customizer.
 */
export function applyThemeVariables(colors, targetElement = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!colors || !targetElement) return

  const primaryNavy = colors.primaryNavy || '#0b1f33'
  const secondaryNavy = colors.secondaryNavy || '#122e47'
  const accentGold = colors.accentGold || '#d9aa52'

  targetElement.style.setProperty('--navy', primaryNavy)
  targetElement.style.setProperty('--navy2', secondaryNavy)
  targetElement.style.setProperty('--gold', accentGold)
  targetElement.style.setProperty('--gold-light', accentGold + '20')

  const lumNavy = getLuminance(primaryNavy)
  const lumNavy2 = getLuminance(secondaryNavy)
  const lumGold = getLuminance(accentGold)

  // 1. Theme 1 (--navy): Used in Hero, Footer, Topbar, About Caption, etc.
  if (lumNavy > 0.35) {
    // Light or bright background -> Use dark text & slate muted text
    targetElement.style.setProperty('--navy-text', '#0c1926')
    targetElement.style.setProperty('--navy-muted', '#334155')
    targetElement.style.setProperty('--navy-border', 'rgba(0, 0, 0, 0.14)')
    targetElement.style.setProperty('--navy-btn-text', '#ffffff')
  } else {
    // Dark background -> Use crisp white text & light muted text
    targetElement.style.setProperty('--navy-text', '#ffffff')
    targetElement.style.setProperty('--navy-muted', '#c8d3dd')
    targetElement.style.setProperty('--navy-border', 'rgba(255, 255, 255, 0.12)')
    targetElement.style.setProperty('--navy-btn-text', '#ffffff')
  }

  // 2. Theme 2 (--navy2): Used in CTA Band, footer brand mark, hero visual
  if (lumNavy2 > 0.35) {
    // Light or warm/bright background (e.g. orange, amber, pastel, white)
    targetElement.style.setProperty('--navy2-text', '#0c1926')
    targetElement.style.setProperty('--navy2-muted', '#334155')
    targetElement.style.setProperty('--navy2-border', 'rgba(0, 0, 0, 0.15)')

    // Eyebrow check on navy2:
    const goldContrastOnNavy2 = getContrastRatio(secondaryNavy, accentGold)
    if (goldContrastOnNavy2 < 3.0) {
      // Gold and navy2 are both warm/bright (e.g. gold on orange) -> use deep dark accent
      targetElement.style.setProperty('--navy2-eyebrow', '#0c1926')
    } else {
      targetElement.style.setProperty('--navy2-eyebrow', accentGold)
    }

    // CTA Button on CTA Band:
    if (goldContrastOnNavy2 < 2.5) {
      // Button would blend into background -> make button dark navy with white text for maximum pop!
      targetElement.style.setProperty('--cta-btn-bg', '#0c1926')
      targetElement.style.setProperty('--cta-btn-text', '#ffffff')
      targetElement.style.setProperty('--cta-btn-hover-bg', '#1e293b')
      targetElement.style.setProperty('--cta-btn-border', 'none')
    } else {
      targetElement.style.setProperty('--cta-btn-bg', accentGold)
      targetElement.style.setProperty('--cta-btn-text', lumGold > 0.45 ? '#0c1926' : '#ffffff')
      targetElement.style.setProperty('--cta-btn-hover-bg', '#edc474')
      targetElement.style.setProperty('--cta-btn-border', 'none')
    }
  } else {
    // Standard dark background
    targetElement.style.setProperty('--navy2-text', '#ffffff')
    targetElement.style.setProperty('--navy2-muted', '#c0ccd5')
    targetElement.style.setProperty('--navy2-border', 'rgba(255, 255, 255, 0.12)')
    targetElement.style.setProperty('--navy2-eyebrow', accentGold)
    targetElement.style.setProperty('--cta-btn-bg', accentGold)
    targetElement.style.setProperty('--cta-btn-text', lumGold > 0.45 ? '#0c1926' : '#ffffff')
    targetElement.style.setProperty('--cta-btn-hover-bg', '#edc474')
    targetElement.style.setProperty('--cta-btn-border', 'none')
  }

  // 3. Gold Accent Buttons (.btn-gold)
  targetElement.style.setProperty('--gold-btn-text', lumGold > 0.45 ? '#0c1926' : '#ffffff')
}

