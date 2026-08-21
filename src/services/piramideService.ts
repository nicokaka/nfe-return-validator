import { PIRAMIDE_MOTIVOS, PIRAMIDE_WAREHOUSES } from '../data/piramideData';
import { PiramideMotivo, PiramideResolution, PiramideWarehouse } from '../types/nfe';
import { calculateStringSimilarity } from '../utils/textSimilarity';

export function getAllPiramideMotivos(): PiramideMotivo[] {
  return PIRAMIDE_MOTIVOS;
}

export function getAllPiramideWarehouses(): PiramideWarehouse[] {
  return PIRAMIDE_WAREHOUSES;
}

export function getPiramideMotivoByCode(code: string): PiramideMotivo | undefined {
  const cleanCode = code.trim().padStart(2, '0');
  return PIRAMIDE_MOTIVOS.find(m => m.code === cleanCode || m.code === code.trim());
}

export function detectPiramideMotivo(text?: string): PiramideResolution | null {
  if (!text) return null;

  const normalized = text.trim();

  // Pattern 1: Explicit Code in text (e.g. "MOTIVO: 30", "MOTIVO 11", "COD 04", "MOTIVO: 03 - VENCIDO")
  const codeMatch = normalized.match(/(?:MOTIVO(?:\s+(?:DA|DE)\s+DEVOLU[ÇC][AÃ]O)?|C[OÓ]D(?:IGO)?)\s*[:=-]?\s*(\d{1,2})/i);
  if (codeMatch && codeMatch[1]) {
    const found = getPiramideMotivoByCode(codeMatch[1]);
    if (found) {
      return {
        motivoCode: found.code,
        motivoDesc: found.description,
        almoxarifado: found.almoxarifado,
        isAutomatic: found.isAutomatic,
        destinationType: found.destinationType,
        notes: found.isAutomatic
          ? `Almoxarifado sugerido automaticamente: ${found.almoxarifado}`
          : 'A destinação física dependerá da conferência/inspeção visual na chegada da carga.',
      };
    }
  }

  // Pattern 2: Keyword scanning from description
  const upper = normalized.toUpperCase();

  // Specific high-priority keywords
  if (/VAZAND|VAZAMENTO|CARTUCHO VAZIO|TAMPA ABERTA|DESVIO DE QUALIDADE|DEFEITO T[EÉ]CNICO/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(item => /VAZAND|QUALIDADE|DEFEITO/i.test(item.description)) || PIRAMIDE_MOTIVOS.find(i => i.code === '30');
    if (m) return buildResolution(m);
  }

  if (/VENCID|VALIDADE VENCIDA/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '03');
    if (m) return buildResolution(m);
  }

  if (/PR[OÓ]XIMO AO VENCIMENTO/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '29');
    if (m) return buildResolution(m);
  }

  if (/AVARIA|AMASSAD|DANIFICAD|QUEBRAD/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '11') || PIRAMIDE_MOTIVOS.find(i => i.code === '04');
    if (m) return buildResolution(m);
  }

  if (/EXTRAVIO|FALTA DE VOLUME|FALTA PARCIAL/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '10') || PIRAMIDE_MOTIVOS.find(i => i.code === '39');
    if (m) return buildResolution(m);
  }

  if (/RECALL/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '24');
    if (m) return buildResolution(m);
  }

  if (/PEDIDO CANCELADO|CANCELAMENTO/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '26');
    if (m) return buildResolution(m);
  }

  if (/DIVERG[EÊ]NCIA COMERCIAL/i.test(upper)) {
    const m = PIRAMIDE_MOTIVOS.find(i => i.code === '01');
    if (m) return buildResolution(m);
  }

  // Fallback: Fuzzy matching against descriptions
  let bestScore = 0;
  let bestMatch: PiramideMotivo | null = null;

  for (const motivo of PIRAMIDE_MOTIVOS) {
    const sim = calculateStringSimilarity(normalized, motivo.description);
    if (sim > 0.65 && sim > bestScore) {
      bestScore = sim;
      bestMatch = motivo;
    }
  }

  if (bestMatch) {
    return buildResolution(bestMatch);
  }

  return null;
}

function buildResolution(m: PiramideMotivo): PiramideResolution {
  return {
    motivoCode: m.code,
    motivoDesc: m.description,
    almoxarifado: m.almoxarifado,
    isAutomatic: m.isAutomatic,
    destinationType: m.destinationType,
    notes: m.isAutomatic
      ? `Almoxarifado sugerido automaticamente: ${m.almoxarifado}`
      : 'A destinação física dependerá da conferência/inspeção visual na chegada da carga.',
  };
}
