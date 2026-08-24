import {
  DiscountAudit,
  ItemComparison,
  NcmProfile,
  NFeDocument,
  NFeItem,
  PharmaceuticalSummary,
  ValidationIssue,
} from '../types/nfe';

/**
 * Classifica o NCM e extrai o perfil regulatório e tributário farmacêutico.
 */
export function classifyNcm(ncmRaw: string): NcmProfile {
  const cleanNcm = (ncmRaw || '').replace(/\D/g, '');
  const prefix4 = cleanNcm.slice(0, 4);
  const prefix2 = cleanNcm.slice(0, 2);

  // 1. Medicamentos (Capítulo 30 da TIPI: 3001, 3002, 3003, 3004, 3005, 3006)
  if (['3001', '3002', '3003', '3004', '3005', '3006'].includes(prefix4)) {
    let desc = 'Medicamentos e produtos farmacêuticos';
    if (prefix4 === '3004') desc = 'Medicamentos em doses/retalho (Capítulo 30)';
    else if (prefix4 === '3003') desc = 'Medicamentos não dosados';
    else if (prefix4 === '3002') desc = 'Vacinas, toxinas e culturas de microrganismos';
    else if (prefix4 === '3005') desc = 'Gaze, algodão e curativos cirúrgicos';

    return {
      ncm: ncmRaw,
      cleanNcm,
      category: 'MEDICAMENTO',
      categoryLabel: 'Medicamento',
      icon: '💊',
      requiresMedTag: true,
      requiresRastroTag: true,
      pisCofinsRegime: 'MONOFASICO_ALÍQUOTA_ZERO',
      expectedPisCst: ['04', '06'],
      anvisaRegulated: true,
      description: desc,
    };
  }

  // 2. Vitaminas e Provitaminas (Capítulo 29: NCM 2936)
  if (prefix4 === '2936') {
    return {
      ncm: ncmRaw,
      cleanNcm,
      category: 'VITAMINA',
      categoryLabel: 'Vitamina / Provitamina',
      icon: '🧪',
      requiresMedTag: false,
      requiresRastroTag: false, // Dispensado / Opcional pela NT 2021.004
      pisCofinsRegime: 'TRIBUTACAO_NORMAL',
      expectedPisCst: ['01', '02', '49', '99'],
      anvisaRegulated: false,
      description: 'Vitaminas e provitaminas em substância ou forma simples (Capítulo 29)',
    };
  }

  // 3. Suplementos Alimentares (Capítulo 21: NCM 2106, 1901, 2101)
  if (prefix4 === '2106' || prefix4 === '1901' || prefix4 === '2101') {
    return {
      ncm: ncmRaw,
      cleanNcm,
      category: 'SUPLEMENTO',
      categoryLabel: 'Suplemento Alimentar',
      icon: '🥤',
      requiresMedTag: false,
      requiresRastroTag: false,
      pisCofinsRegime: 'TRIBUTACAO_NORMAL',
      expectedPisCst: ['01', '02', '49', '99'],
      anvisaRegulated: false,
      description: 'Suplementos alimentares e preparações alimentícias (Capítulo 21)',
    };
  }

  // 4. Cosméticos, Higiene e Correlatos Médicos (Capítulos 33, 34, 90)
  if (['3304', '3305', '3306', '3307', '3401', '3402', '9018', '9019', '9021'].includes(prefix4)) {
    return {
      ncm: ncmRaw,
      cleanNcm,
      category: 'COSMETICO_CORRELATO',
      categoryLabel: 'Cosmético / Correlato',
      icon: '🧴',
      requiresMedTag: false,
      requiresRastroTag: false,
      pisCofinsRegime: 'TRIBUTACAO_NORMAL',
      expectedPisCst: ['01', '02', '04', '49'],
      anvisaRegulated: true,
      description: 'Cosméticos, dermocosméticos, higiene ou artigos médico-hospitalares',
    };
  }

  // 5. Outros
  return {
    ncm: ncmRaw,
    cleanNcm,
    category: 'OUTROS',
    categoryLabel: 'Geral / Outros',
    icon: '📦',
    requiresMedTag: false,
    requiresRastroTag: false,
    pisCofinsRegime: 'TRIBUTACAO_NORMAL',
    expectedPisCst: ['01', '02', '49', '99'],
    anvisaRegulated: false,
    description: `Produto geral (NCM Capítulo ${prefix2 || 'Indefinido'})`,
  };
}

/**
 * Realiza auditoria matemática e fiscal profunda de descontos (vDesc).
 * Verifica proporcionalidade em devolução parcial e risco de Rejeição SEFAZ 483.
 */
export function auditDiscount(
  nfdItem: NFeItem,
  nfoItem?: NFeItem
): { discountAudit: DiscountAudit; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const nfdVDesc = nfdItem.vDesc || 0;
  const nfdVProd = nfdItem.vProd || (nfdItem.qCom * nfdItem.vUnCom);
  const nfdQCom = nfdItem.qCom || 0;

  // 1. Rejeição 483 SEFAZ: Desconto maior que o valor do produto
  const isExceededProductValue = nfdVDesc > nfdVProd + 0.001;
  if (isExceededProductValue) {
    issues.push({
      id: `DISC_SEFAZ_483_${nfdItem.nItem}`,
      code: 'DISCOUNT_EXCEEDS_PRODUCT_VALUE',
      title: 'Rejeição SEFAZ 483: Desconto Maior que Valor do Produto',
      description: `O valor do desconto (R$ ${nfdVDesc.toFixed(2)}) é maior que o valor total do produto (R$ ${nfdVProd.toFixed(2)}). A SEFAZ rejeitará a nota (Rejeição 483).`,
      severity: 'CRITICAL',
      field: 'vDesc',
    });
  }

  const discountPerUnitNfd = nfdQCom > 0 ? nfdVDesc / nfdQCom : 0;
  const discountPercentageNfd = (nfdVProd + nfdVDesc) > 0 ? (nfdVDesc / (nfdVProd + nfdVDesc)) * 100 : 0;

  if (!nfoItem) {
    return {
      discountAudit: {
        actualDiscount: nfdVDesc,
        expectedDiscount: nfdVDesc,
        diffDiscount: 0,
        discountPerUnitNfd,
        discountPerUnitNfo: 0,
        discountPercentageNfd,
        discountPercentageNfo: 0,
        isProportional: true,
        isExceededProductValue,
      },
      issues,
    };
  }

  const nfoVDesc = nfoItem.vDesc || 0;
  const nfoVProd = nfoItem.vProd || (nfoItem.qCom * nfoItem.vUnCom);
  const nfoQCom = nfoItem.qCom || 0;

  const discountPerUnitNfo = nfoQCom > 0 ? nfoVDesc / nfoQCom : 0;
  const discountPercentageNfo = (nfoVProd + nfoVDesc) > 0 ? (nfoVDesc / (nfoVProd + nfoVDesc)) * 100 : 0;

  // Coeficiente de devolução proporcional
  const returnRatio = nfoQCom > 0 ? nfdQCom / nfoQCom : 1;
  const expectedDiscount = Math.round(nfoVDesc * returnRatio * 100) / 100;
  const diffDiscount = Math.abs(nfdVDesc - expectedDiscount);
  const isProportional = diffDiscount <= 0.05;

  // 2. Análise de divergência de desconto
  if (nfoVDesc > 0 && nfdVDesc === 0) {
    issues.push({
      id: `DISC_OMITTED_${nfdItem.nItem}`,
      code: 'DISCOUNT_OMITTED_IN_RETURN',
      title: 'Desconto Concedido na Origem Omitido na Devolução',
      description: `A venda original concedeu R$ ${nfoVDesc.toFixed(2)} de desconto (R$ ${discountPerUnitNfo.toFixed(2)}/un). A devolução omitiu o desconto (esperado R$ ${expectedDiscount.toFixed(2)} para ${nfdQCom} un). Isso causará divergência fiscal no estorno financeiro.`,
      severity: 'WARNING',
      field: 'vDesc',
    });
  } else if (nfoVDesc === 0 && nfdVDesc > 0) {
    issues.push({
      id: `DISC_UNEXPECTED_${nfdItem.nItem}`,
      code: 'DISCOUNT_UNEXPECTED_IN_RETURN',
      title: 'Desconto Inexistente na Venda Original Informado na Devolução',
      description: `A nota de origem não possuía desconto faturado para este item, mas a NFD informou R$ ${nfdVDesc.toFixed(2)} de desconto.`,
      severity: 'WARNING',
      field: 'vDesc',
    });
  } else if (!isProportional && !isExceededProductValue) {
    const isCritical = diffDiscount > 5.00 || Math.abs(discountPercentageNfd - discountPercentageNfo) > 10.0;
    issues.push({
      id: `DISC_NOT_PROPORTIONAL_${nfdItem.nItem}`,
      code: 'DISCOUNT_NOT_PROPORTIONAL',
      title: isCritical ? 'Desconto com Divergência Crítica de Proporcionalidade' : 'Desconto Fora da Proporção da Venda Original',
      description: `Desconto informado na devolução: R$ ${nfdVDesc.toFixed(2)} (R$ ${discountPerUnitNfd.toFixed(2)}/un | ${discountPercentageNfd.toFixed(1)}%). Desconto proporcional esperado: R$ ${expectedDiscount.toFixed(2)} (R$ ${discountPerUnitNfo.toFixed(2)}/un | ${discountPercentageNfo.toFixed(1)}%). Divergência de R$ ${diffDiscount.toFixed(2)}.`,
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      field: 'vDesc',
    });
  }

  return {
    discountAudit: {
      actualDiscount: nfdVDesc,
      expectedDiscount,
      diffDiscount,
      discountPerUnitNfd,
      discountPerUnitNfo,
      discountPercentageNfd,
      discountPercentageNfo,
      isProportional,
      isExceededProductValue,
    },
    issues,
  };
}

/**
 * Audita regras regulatórias farmacêuticas (NT 2021.004, ANVISA, PIS/COFINS Monofásico).
 */
export function auditPharmaceuticalItem(
  nfdItem: NFeItem,
  nfoItem?: NFeItem,
  nfdDoc?: NFeDocument,
  _nfoDoc?: NFeDocument
): { ncmProfile: NcmProfile; issues: ValidationIssue[] } {
  const ncmProfile = classifyNcm(nfdItem.ncm || (nfoItem ? nfoItem.ncm : ''));
  const issues: ValidationIssue[] = [];

  const isNfdDevolucao = nfdDoc ? nfdDoc.finNFe === 4 : true;
  const hasNfdBatches = nfdItem.batches.length > 0;
  const hasNfoBatches = nfoItem ? nfoItem.batches.length > 0 : false;

  // 1. Auditoria de Lote e NT 2021.004 (Rastreabilidade)
  if (ncmProfile.category === 'MEDICAMENTO') {
    if (hasNfoBatches && !hasNfdBatches) {
      if (isNfdDevolucao) {
        // NT 2021.004 Exceção: finNFe=4 dispensa tag <rastro> na SEFAZ, mas WMS exige conferência física
        issues.push({
          id: `NT2021_RASTRO_EXEMPTION_${nfdItem.nItem}`,
          code: 'NT2021_RASTRO_DEVOLUCAO_AVISO',
          title: 'Medicamento sem Tag de Lote na NFD (Dispensado pela NT 2021.004)',
          description: `A NFD não informou a tag <rastro>. A NT 2021.004 da SEFAZ autoriza devoluções (finNFe=4) sem rejeição 873, porém a conferência física do lote na doca é mandatória para segregação no almoxarifado farmacêutico.`,
          severity: 'INFO',
          field: 'nLote',
        });
      } else {
        // Venda ou operação normal sem lote -> Risco SEFAZ Rejeição 873
        issues.push({
          id: `SEFAZ_873_RISK_${nfdItem.nItem}`,
          code: 'SEFAZ_873_MISSING_RASTRO',
          title: 'Risco de Rejeição SEFAZ 873: Medicamento sem Rastreabilidade',
          description: `Produto NCM ${nfdItem.ncm} (Medicamento) sem grupo <rastro> em operação comercial. A SEFAZ exige lote e validade para medicamentos.`,
          severity: 'CRITICAL',
          field: 'nLote',
        });
      }
    }

    // Auditoria de ANVISA
    if (nfdItem.med?.cProdANVISA) {
      const anvisa = nfdItem.med.cProdANVISA.trim().toUpperCase();
      if (anvisa !== 'ISENTO' && anvisa.length !== 11 && anvisa.length !== 13) {
        issues.push({
          id: `ANVISA_FORMAT_${nfdItem.nItem}`,
          code: 'ANVISA_CODE_INVALID_FORMAT',
          title: 'Código ANVISA com Formato Incomum',
          description: `Código ANVISA informado: "${anvisa}" (tamanho ${anvisa.length}). A NT 2021.004 padroniza registros com 11 ou 13 dígitos numéricos ou o literal "ISENTO".`,
          severity: 'INFO',
          field: 'cProdANVISA',
        });
      }
    }
  } else if (ncmProfile.category === 'VITAMINA' || ncmProfile.category === 'SUPLEMENTO') {
    // Para Vitaminas (2936) e Suplementos (2106), o preenchimento de lote é opcional e não gera rejeição 840/873
    if (!hasNfdBatches && hasNfoBatches) {
      issues.push({
        id: `SUPPL_BATCH_OPTIONAL_${nfdItem.nItem}`,
        code: 'SUPPLEMENT_BATCH_NOT_MANDATORY',
        title: `${ncmProfile.categoryLabel} sem Lote (Conformidade Fiscal OK)`,
        description: `NCM ${nfdItem.ncm} não é classificado como medicamento (Capítulo 30). Conforme NT 2021.004, o preenchimento de lote é voluntário para este segmento.`,
        severity: 'INFO',
        field: 'nLote',
      });
    }
  }

  // 2. Auditoria Tributária de PIS / COFINS (Regime Monofásico vs Normal)
  const pisCstNfd = nfdItem.pis?.cst;
  const pisCstNfo = nfoItem?.pis?.cst;

  if (ncmProfile.pisCofinsRegime === 'MONOFASICO_ALÍQUOTA_ZERO') {
    // Medicamentos NCM 3004 devem ser CST 04 (Alíquota Zero na revenda por Lei 10.147/2000)
    if (pisCstNfd && ['01', '02'].includes(pisCstNfd)) {
      issues.push({
        id: `PIS_BITRIBUTACAO_RISK_${nfdItem.nItem}`,
        code: 'PIS_COFINS_MONOFASICO_BITRIBUTACAO',
        title: 'Alerta Fiscal: Possível Bitributação de PIS/COFINS',
        description: `Medicamentos (NCM ${nfdItem.ncm}) são sujeitos à tributação monofásica concentrada no fabricante (Lei 10.147/2000), com saída a Alíquota Zero (CST 04). A NFD informou CST ${pisCstNfd} (Tributado integralmente), gerando risco de recolhimento indevido.`,
        severity: 'WARNING',
        field: 'pisCst',
      });
    }
  } else if (ncmProfile.pisCofinsRegime === 'TRIBUTACAO_NORMAL') {
    // Vitaminas e Suplementos não costumam ser Monofásicos
    if (pisCstNfd === '04') {
      issues.push({
        id: `PIS_SUPPL_MONO_CHECK_${nfdItem.nItem}`,
        code: 'PIS_COFINS_SUPPLEMENT_MONOFASICO_CHECK',
        title: `${ncmProfile.categoryLabel} com CST 04 (Monofásico)`,
        description: `Produto NCM ${nfdItem.ncm} faturado com CST 04 (Monofásico). Confirme com o setor fiscal se este item possui benefício de alíquota zero específico ou se deve tributar normalmente (CST 01/02).`,
        severity: 'INFO',
        field: 'pisCst',
      });
    }
  }

  // Divergência de CST de PIS/COFINS entre NFD e NFO
  if (pisCstNfd && pisCstNfo && pisCstNfd !== pisCstNfo) {
    issues.push({
      id: `PIS_CST_MISMATCH_${nfdItem.nItem}`,
      code: 'PIS_CST_MISMATCH',
      title: 'CST de PIS/COFINS Divergente da Origem',
      description: `CST de PIS na devolução (${pisCstNfd}) difere do faturado na nota de origem (${pisCstNfo}).`,
      severity: 'INFO',
      field: 'pisCst',
    });
  }

  return { ncmProfile, issues };
}

/**
 * Constrói resumo executivo e métricas da carga farmacêutica auditada.
 */
export function buildPharmaceuticalSummary(
  itemComparisons: ItemComparison[],
  _nfdDoc?: NFeDocument,
  _nfoDoc?: NFeDocument
): PharmaceuticalSummary {
  let totalMedicamentos = 0;
  let totalVitaminas = 0;
  let totalSuplementos = 0;
  let totalCosmeticosCorrelatos = 0;
  let totalOutros = 0;
  let totalMonofasicos = 0;
  let totalComLote = 0;
  let totalComAnvisa = 0;
  let totalDescontoNfd = 0;
  let totalDescontoNfoProporcional = 0;
  let temDivergenciaDesconto = false;

  for (const comp of itemComparisons) {
    const ncmProf = comp.ncmProfile || classifyNcm(comp.nfdItem.ncm);
    if (ncmProf.category === 'MEDICAMENTO') totalMedicamentos++;
    else if (ncmProf.category === 'VITAMINA') totalVitaminas++;
    else if (ncmProf.category === 'SUPLEMENTO') totalSuplementos++;
    else if (ncmProf.category === 'COSMETICO_CORRELATO') totalCosmeticosCorrelatos++;
    else totalOutros++;

    if (ncmProf.pisCofinsRegime === 'MONOFASICO_ALÍQUOTA_ZERO') totalMonofasicos++;
    if (comp.nfdItem.batches.length > 0) totalComLote++;
    if (comp.nfdItem.med?.cProdANVISA) totalComAnvisa++;

    const nfdDesc = comp.nfdItem.vDesc || 0;
    totalDescontoNfd += nfdDesc;

    if (comp.discountAudit) {
      totalDescontoNfoProporcional += comp.discountAudit.expectedDiscount;
      if (!comp.discountAudit.isProportional) {
        temDivergenciaDesconto = true;
      }
    } else {
      totalDescontoNfoProporcional += nfdDesc;
    }
  }

  return {
    totalMedicamentos,
    totalVitaminas,
    totalSuplementos,
    totalCosmeticosCorrelatos,
    totalOutros,
    totalMonofasicos,
    totalComLote,
    totalComAnvisa,
    totalDescontoNfd: Math.round(totalDescontoNfd * 100) / 100,
    totalDescontoNfoProporcional: Math.round(totalDescontoNfoProporcional * 100) / 100,
    temDivergenciaDesconto,
  };
}
