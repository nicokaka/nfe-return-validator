import { DFeReferenciadoAudit, IbsCbsAudit, NDOSuggestion, NFeDocument, NFeItem, ValidationIssue } from '../types/nfe';

/**
 * Matriz de Mapeamento de CFOPs para Integração no ERP Pirâmide
 * Fonte: DIRETRIZES_FISCAIS_GERENCIA.md & docs/polliana/produtos ean cest base.xlsx
 */
export function suggestNDO(nfd: NFeDocument, nfo?: NFeDocument): NDOSuggestion {
  const ufNfdEmit = nfd.emit.uf || '';
  const ufNfdDest = nfd.dest.uf || '';
  const isInterstate = ufNfdEmit !== '' && ufNfdDest !== '' && ufNfdEmit.toUpperCase() !== ufNfdDest.toUpperCase();

  // 1. Identificar CFOP da Origem e da Devolução
  const nfoCfopRaw = nfo && nfo.items.length > 0 ? nfo.items[0].cfop.replace(/\D/g, '') : '';
  const nfdCfopRaw = nfd.items.length > 0 ? nfd.items[0].cfop.replace(/\D/g, '') : (isInterstate ? '6202' : '5202');

  // A. Bonificação (5910 ➔ 5949 ➔ 1949 / 2949)
  const isBonificacao =
    nfoCfopRaw === '5910' ||
    nfoCfopRaw === '6910' ||
    nfdCfopRaw === '5949' ||
    nfdCfopRaw === '6949' ||
    /BONIFICA/i.test(nfd.natOp) ||
    (nfo ? /BONIFICA/i.test(nfo.natOp) : false);

  if (isBonificacao) {
    const entryCfop = isInterstate ? '2949' : '1949';
    return {
      ndoCode: isInterstate ? 'DEV-BONIF-INTER' : 'DEV-BONIF-ESTADUAL',
      ndoDescription: isInterstate
        ? 'Devolução de Bonificação Interestadual (NDO 2.949 / 1.949)'
        : 'Devolução de Bonificação Estadual (NDO 1.949)',
      cfop: `${entryCfop[0]}.${entryCfop.slice(1)}`,
      operationType: 'DEV_BONIFICACAO',
      isInterstate,
      explanation: `Bonificação | Saída: ${nfoCfopRaw || '5910'} ➔ Devolução Cliente: ${nfdCfopRaw || '5949'} ➔ Entrada Pirâmide: ${entryCfop[0]}.${entryCfop.slice(1)}`,
    };
  }

  // B. Suframa Produção (6109 ➔ 6202 ➔ 2203)
  if (nfoCfopRaw === '6109') {
    return {
      ndoCode: 'DEV-SUFRAMA-PROD',
      ndoDescription: 'Devolução de Venda de Produção - Suframa (NDO 2.203)',
      cfop: '2.203',
      operationType: 'DEV_VENDA',
      isInterstate: true,
      explanation: `Venda Suframa Produção | Saída: 6109 ➔ Devolução: ${nfdCfopRaw} ➔ Entrada Pirâmide: 2.203`,
    };
  }

  // C. Suframa Mercadoria Adquirida (6110 ➔ 6202 ➔ 2204)
  if (nfoCfopRaw === '6110') {
    return {
      ndoCode: 'DEV-SUFRAMA-REV',
      ndoDescription: 'Devolução de Compra para Comercialização - Suframa (NDO 2.204)',
      cfop: '2.204',
      operationType: 'DEV_VENDA',
      isInterstate: true,
      explanation: `Venda Suframa Mercadoria | Saída: 6110 ➔ Devolução: ${nfdCfopRaw} ➔ Entrada Pirâmide: 2.204`,
    };
  }

  // D. Substituição Tributária (5401, 54011, 5403, 54031 ➔ 5411 ➔ 1411 | 6403, 64031 ➔ 6411 ➔ 2411)
  const isST =
    ['5401', '54011', '5403', '54031', '6403', '64031'].includes(nfoCfopRaw) ||
    ['5411', '6411', '1411', '2411'].includes(nfdCfopRaw) ||
    /SUBST|ST/i.test(nfd.natOp);

  if (isST) {
    const entryCfop = isInterstate ? '2.411' : '1.411';
    return {
      ndoCode: isInterstate ? 'DEV-ST-INTER' : 'DEV-ST-ESTADUAL',
      ndoDescription: isInterstate
        ? 'Devolução de Venda Sujeito a ST Interestadual (NDO 2.411)'
        : 'Devolução de Venda Sujeito a ST Estadual (NDO 1.411)',
      cfop: entryCfop,
      operationType: 'DEV_ST',
      isInterstate,
      explanation: `Substituição Tributária | Saída: ${nfoCfopRaw || '5401/5403'} ➔ Devolução: ${nfdCfopRaw || '5411'} ➔ Entrada Pirâmide: ${entryCfop}`,
    };
  }

  // E. Produção do Estabelecimento (5101, 51011 ➔ 5202 ➔ 1201 | 6101, 61011 ➔ 6202 ➔ 2202)
  const isProducao = ['5101', '51011'].includes(nfoCfopRaw);
  if (isProducao) {
    const entryCfop = isInterstate ? '2.202' : '1.201';
    return {
      ndoCode: isInterstate ? 'DEV-VDA-PROD-INTER' : 'DEV-VDA-PROD-ESTADUAL',
      ndoDescription: isInterstate
        ? 'Devolução de Venda de Produção Interestadual (NDO 2.202)'
        : 'Devolução de Venda de Produção do Estabelecimento (NDO 1.201)',
      cfop: entryCfop,
      operationType: 'DEV_VENDA',
      isInterstate,
      explanation: `Venda de Produção | Saída: ${nfoCfopRaw || '5101'} ➔ Devolução: ${nfdCfopRaw || '5202'} ➔ Entrada Pirâmide: ${entryCfop}`,
    };
  }

  // F. Comercialização / Revenda Padrão (5102, 51021 ➔ 5202 ➔ 1202 | 6102, 61021 ➔ 6202 ➔ 2202)
  const entryCfop = isInterstate ? '2.202' : '1.202';
  return {
    ndoCode: isInterstate ? 'DEV-VDA-REV-INTER' : 'DEV-VDA-REV-ESTADUAL',
    ndoDescription: isInterstate
      ? 'Devolução de Compra para Comercialização Interestadual (NDO 2.202)'
      : 'Devolução de Compra para Comercialização Estadual (NDO 1.202)',
    cfop: entryCfop,
    operationType: 'DEV_VENDA',
    isInterstate,
    explanation: `Comercialização | Saída: ${nfoCfopRaw || '5102/6102'} ➔ Devolução: ${nfdCfopRaw || '5202/6202'} ➔ Entrada Pirâmide: ${entryCfop}`,
  };
}

/**
 * Realiza auditoria dos campos da Reforma Tributária (IBS e CBS) e Rejeição UB12-10_1115
 */
export function auditIbsCbsReform(nfdItem: NFeItem, nfdDoc: NFeDocument): { ibsCbsAudit: IbsCbsAudit; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const rawXml = nfdDoc.rawXml || '';

  // CRT=3: Regime Normal de Apuração
  const isCrt3Normal = nfdDoc.emit.crt === 3 || nfdDoc.emit.crt === undefined; // default regime normal
  const hasIbsCbsInDoc = /<(?:IBS|CBS|gIBS|gCBS|vCBS|vIBS|detIBSCBS)/i.test(rawXml);

  // Alíquotas-teste de transição 2026/2027
  const expectedCbsRate = 0.009; // 0.90%
  const expectedIbsEstRate = 0.001; // 0.10%

  // Se o emissor é Regime Normal e não informou IBS/CBS
  const emissionYear = nfdDoc.dhEmi ? new Date(nfdDoc.dhEmi).getFullYear() : new Date().getFullYear();
  const is2027OrLater = emissionYear >= 2027;
  const isCreditAtRisk = isCrt3Normal && !hasIbsCbsInDoc && is2027OrLater;

  if (isCrt3Normal && !hasIbsCbsInDoc) {
    issues.push({
      id: `REFORMA_IBS_CBS_MISSING_${nfdItem.nItem}`,
      code: 'REFORMA_TRIBUTARIA_IBS_CBS_OMITIDO',
      title: is2027OrLater
        ? 'IBS / CBS Omitido na Devolução (Risco de Perda de Crédito Fiscal)'
        : 'Aviso Reforma Tributária: IBS / CBS Não Destacado (Vigência 2027)',
      description: is2027OrLater
        ? `O emissor é do Regime Normal (CRT=3), mas não destacou os grupos de IBS/CBS na devolução. A ausência desse destaque impede a tomada de crédito tributário na apuração, gerando prejuízo financeiro direto ao caixa.`
        : `Nota fiscal sem grupos de IBS/CBS. A partir de 2027, notas em Regime Normal exigirão destaque de CBS (0,90%) e IBS (0,10%) para apropriação de créditos.`,
      severity: is2027OrLater ? 'WARNING' : 'INFO',
      field: 'det/imposto/IBSCBS',
    });
  }

  return {
    ibsCbsAudit: {
      hasIbsCbs: hasIbsCbsInDoc,
      isCrt3Normal,
      isCreditAtRisk,
      pCbs: expectedCbsRate * 100,
      pIbs: expectedIbsEstRate * 100,
      issues,
    },
    issues,
  };
}

/**
 * Validação do Grupo DFeReferenciado por Item (NT RTC v1.40 / Regra VC02-14 / Rejeição SEFAZ 321)
 */
export function auditDFeReferenciado2026(
  nfdItem: NFeItem,
  nfoItem?: NFeItem,
  nfdDoc?: NFeDocument,
  nfoDoc?: NFeDocument
): { dfeReferenciadoAudit: DFeReferenciadoAudit; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const rawXml = nfdDoc?.rawXml || '';

  // Verifica se existe o grupo DFeReferenciado ou tag com nItem da origem
  const hasDFeRefGroup = /<DFeReferenciado|<refNFeItem|<itemReferenciado/i.test(rawXml);
  const isCompliant2026 = hasDFeRefGroup || (nfdDoc?.refNFeList && nfdDoc.refNFeList.length > 0);

  if (!hasDFeRefGroup && nfdDoc && nfdDoc.finNFe === 4) {
    issues.push({
      id: `SEFAZ_2026_DFE_REF_${nfdItem.nItem}`,
      code: 'SEFAZ_2026_ITEM_REFERENCING_REQUIRED',
      title: 'Aviso SEFAZ 2026 (NT RTC v1.40): Referenciamento Item a Item',
      description: `A partir de 01/09/2026, a SEFAZ exige o grupo <DFeReferenciado> vinculando cada item da devolução ao item da nota de faturamento (nItem ${nfoItem?.nItem || nfdItem.nItem}). Risco de Rejeição 321.`,
      severity: 'INFO',
      field: 'DFeReferenciado',
    });
  }

  return {
    dfeReferenciadoAudit: {
      hasItemReference: hasDFeRefGroup,
      refNItem: nfoItem?.nItem,
      refChNFe: nfoDoc?.chNFe,
      isCompliant2026: Boolean(isCompliant2026),
      issues,
    },
    issues,
  };
}

export function validateTaxReformAndBonificacao(nfd: NFeDocument, nfo?: NFeDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for Bonificação consistency
  const isNfdBonificacao =
    nfd.items.some(i => ['1910', '2910', '5910', '6910', '5949', '6949'].includes(i.cfop.replace(/\D/g, ''))) ||
    /BONIFICA/i.test(nfd.natOp);

  const isNfoBonificacao = nfo
    ? nfo.items.some(i => ['1910', '2910', '5910', '6910'].includes(i.cfop.replace(/\D/g, ''))) ||
      /BONIFICA/i.test(nfo.natOp)
    : false;

  if (isNfdBonificacao && nfo && !isNfoBonificacao) {
    issues.push({
      id: 'TAX_BONIF_MISMATCH',
      code: 'BONIFICACAO_ORIGIN_MISMATCH',
      title: 'Divergência de Natureza: Bonificação na Devolução x Venda na Origem',
      description:
        'A NFD foi emitida como devolução de Bonificação (CFOP 5.949 / 6.949), mas a NFO original era de venda comercial. Verifique a escrituração no Pirâmide.',
      severity: 'WARNING',
      field: 'natOp',
    });
  }

  return issues;
}

