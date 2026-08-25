import {
  HeaderValidation,
  ItemComparison,
  NFeDocument,
  NFeItem,
  ReconciliationResult,
  ReturnType,
  ValidationIssue,
} from '../types/nfe';
import { calculateStringSimilarity } from '../utils/textSimilarity';
import { detectPiramideMotivo } from './piramideService';
import { suggestNDO, validateTaxReformAndBonificacao, auditIbsCbsReform, auditDFeReferenciado2026 } from './ndoTaxEngine';
import {
  auditDiscount,
  auditPharmaceuticalItem,
  auditIcmsAndBaseReduction,
  auditIcmsStProportionality,
  buildPharmaceuticalSummary,
  classifyNcm,
} from './pharmaFiscalEngine';
import { identifyCompany } from '../data/companyData';

function isCleanEanValid(ean: string): boolean {
  if (!ean) return false;
  const clean = ean.trim().toUpperCase();
  return clean !== '' && clean !== 'SEM GTIN' && clean !== 'SEMGTIN' && clean !== '0';
}

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function reconcileNFeDocuments(docA: NFeDocument, docB: NFeDocument): ReconciliationResult {
  // Determine which is NFD and which is NFO
  let nfd: NFeDocument;
  let nfo: NFeDocument;

  if (docA.nfeType === 'NFD' && docB.nfeType !== 'NFD') {
    nfd = docA;
    nfo = docB;
  } else if (docB.nfeType === 'NFD' && docA.nfeType !== 'NFD') {
    nfd = docB;
    nfo = docA;
  } else {
    // Fallback: If both or neither identified, check refNFeList
    if (docA.refNFeList.length > 0) {
      nfd = docA;
      nfo = docB;
    } else {
      nfd = docB;
      nfo = docA;
    }
  }

  // Identificar Empresa do Grupo Emissora da NFO
  const companyProfile = identifyCompany(nfo.emit.cnpj, nfo.emit.uf, nfo.emit.xNome);

  // 1. Header Validations
  const headerIssues: ValidationIssue[] = [];

  // H1: NFO Authorized / Cancelled
  if (nfo.cStat !== undefined && nfo.cStat !== 100) {
    const isCancelled = nfo.cStat === 101 || nfo.cStat === 135 || /CANCELAD/i.test(nfo.xMotivoSEFAZ || '');
    headerIssues.push({
      id: 'H1',
      code: isCancelled ? 'NFO_CANCELLED' : 'NFO_NOT_AUTHORIZED',
      title: isCancelled ? 'Nota de Origem Cancelada na SEFAZ' : 'Nota de Origem não Autorizada',
      description: isCancelled
        ? `A NFO foi CANCELADA na SEFAZ (Status ${nfo.cStat}: ${nfo.xMotivoSEFAZ || 'Cancelamento registrado'}).`
        : `A NFO tem status SEFAZ ${nfo.cStat} (${nfo.xMotivoSEFAZ || 'Não autorizado'}).`,
      severity: 'CRITICAL',
    });
  }

  // H2: NFD Authorized / Cancelled
  if (nfd.cStat !== undefined && nfd.cStat !== 100) {
    const isCancelled = nfd.cStat === 101 || nfd.cStat === 135 || /CANCELAD/i.test(nfd.xMotivoSEFAZ || '');
    headerIssues.push({
      id: 'H2',
      code: isCancelled ? 'NFD_CANCELLED' : 'NFD_NOT_AUTHORIZED',
      title: isCancelled ? 'Nota de Devolução Cancelada na SEFAZ' : 'Nota de Devolução não Autorizada',
      description: isCancelled
        ? `A NFD foi CANCELADA na SEFAZ (Status ${nfd.cStat}: ${nfd.xMotivoSEFAZ || 'Cancelamento registrado'}).`
        : `A NFD tem status SEFAZ ${nfd.cStat} (${nfd.xMotivoSEFAZ || 'Não autorizado'}).`,
      severity: 'CRITICAL',
    });
  }

  // H3: Reference key match
  let isRefKeyMatching = false;
  if (nfd.refNFeList.includes(nfo.chNFe)) {
    isRefKeyMatching = true;
  } else if (nfd.parsedNfoRefNumber && nfd.parsedNfoRefNumber === nfo.nNF) {
    isRefKeyMatching = true;
  } else if (nfd.infCpl && nfd.infCpl.includes(nfo.chNFe)) {
    isRefKeyMatching = true;
  }

  if (!isRefKeyMatching) {
    headerIssues.push({
      id: 'H3',
      code: 'REF_KEY_MISMATCH',
      title: 'Sem Referência Cruzada Explícita',
      description: `A NFD nº ${nfd.nNF} não faz referência à chave de acesso da NFO nº ${nfo.nNF} (<refNFe>).`,
      severity: 'CRITICAL',
    });
  }

  // H4 / H5: Participants matching
  const cnpjNfdEmit = cleanCnpj(nfd.emit.cnpj);
  const cnpjNfoDest = cleanCnpj(nfo.dest.cnpj);
  const cnpjNfdDest = cleanCnpj(nfd.dest.cnpj);
  const cnpjNfoEmit = cleanCnpj(nfo.emit.cnpj);

  const isEmitDestOk = cnpjNfdEmit === cnpjNfoDest;
  const isDestEmitOk = cnpjNfdDest === cnpjNfoEmit;
  const isParticipantsMatching = isEmitDestOk && isDestEmitOk;

  if (!isParticipantsMatching) {
    headerIssues.push({
      id: 'H4_H5',
      code: 'PARTICIPANTS_MISMATCH',
      title: 'CNPJs de Emissor/Destinatário Incompatíveis',
      description: `O emissor da NFD (${nfd.emit.xNome} - ${nfd.emit.cnpj}) não coincide com o destinatário da NFO (${nfo.dest.xNome} - ${nfo.dest.cnpj}).`,
      severity: 'CRITICAL',
    });
  }

  // H6: finNFe check
  if (nfd.finNFe !== 4) {
    headerIssues.push({
      id: 'H6',
      code: 'FIN_NFE_NOT_RETURN',
      title: 'Finalidade da NFD não é Devolução',
      description: `A NFD está marcada com finNFe=${nfd.finNFe} (esperado finNFe=4).`,
      severity: 'WARNING',
    });
  }

  // H8: Dates
  if (nfd.dhEmi && nfo.dhEmi) {
    const dateNfd = new Date(nfd.dhEmi);
    const dateNfo = new Date(nfo.dhEmi);
    if (dateNfd < dateNfo) {
      headerIssues.push({
        id: 'H8',
        code: 'INVALID_EMISSION_DATE',
        title: 'Data de Emissão Incoerente',
        description: `A NFD foi emitida (${dateNfd.toLocaleDateString()}) antes da NFO (${dateNfo.toLocaleDateString()}).`,
        severity: 'WARNING',
      });
    }
  }

  // NDO and Tax Reform (CBS/IBS & Bonificação)
  const ndoSuggestion = suggestNDO(nfd, nfo);
  const taxReformIssues = validateTaxReformAndBonificacao(nfd, nfo);
  headerIssues.push(...taxReformIssues);

  // Pirâmide Reason & Warehouse resolution
  const piramideResolution = detectPiramideMotivo(nfd.parsedMotivoDevolucao || nfd.infCpl || nfd.natOp) || undefined;

  const headerValidation: HeaderValidation = {
    isRefKeyMatching,
    isParticipantsMatching,
    isSefazAuthorized: (nfd.cStat === 100 || nfd.cStat === undefined) && (nfo.cStat === 100 || nfo.cStat === undefined),
    issues: headerIssues,
  };

  // 2. Item Matching & Reconciliation
  const matchedNfoItemsSet = new Set<number>();
  const itemComparisons: ItemComparison[] = [];


  for (const nfdItem of nfd.items) {
    let matchedNfoItem: NFeItem | undefined;
    let matchType: ItemComparison['matchType'] = 'NONE';
    let matchConfidence = 0;

    // Priority 1: EAN exact
    if (isCleanEanValid(nfdItem.cEAN)) {
      matchedNfoItem = nfo.items.find(
        item => !matchedNfoItemsSet.has(item.nItem) && isCleanEanValid(item.cEAN) && item.cEAN === nfdItem.cEAN
      );
      if (matchedNfoItem) {
        matchType = 'EAN_EXACT';
        matchConfidence = 1.0;
      }
    }

    // Priority 2: EANTrib exact
    if (!matchedNfoItem && isCleanEanValid(nfdItem.cEANTrib)) {
      matchedNfoItem = nfo.items.find(
        item => !matchedNfoItemsSet.has(item.nItem) && isCleanEanValid(item.cEANTrib) && item.cEANTrib === nfdItem.cEANTrib
      );
      if (matchedNfoItem) {
        matchType = 'EAN_TRIB';
        matchConfidence = 0.98;
      }
    }

    // Priority 3: Description similarity + NCM
    if (!matchedNfoItem) {
      let bestSim = 0;
      let candidate: NFeItem | undefined;

      for (const nfoItem of nfo.items) {
        if (matchedNfoItemsSet.has(nfoItem.nItem)) continue;
        const sim = calculateStringSimilarity(nfdItem.xProd, nfoItem.xProd);
        const isSameNcm = nfdItem.ncm && nfoItem.ncm && nfdItem.ncm === nfoItem.ncm;

        if (isSameNcm && sim >= 0.75 && sim > bestSim) {
          bestSim = sim;
          candidate = nfoItem;
        } else if (sim >= 0.88 && sim > bestSim) {
          bestSim = sim;
          candidate = nfoItem;
        }
      }

      if (candidate) {
        matchedNfoItem = candidate;
        matchType = 'DESCRIPTION_SIMILARITY';
        matchConfidence = bestSim;
      }
    }

    if (matchedNfoItem) {
      matchedNfoItemsSet.add(matchedNfoItem.nItem);
    }

    // Perform item-level validation rules
    const itemIssues: ValidationIssue[] = [];

    // Classificação NCM e perfil regulatório
    const ncmProfile = classifyNcm(nfdItem.ncm || (matchedNfoItem ? matchedNfoItem.ncm : ''));

    // Auditoria especializada de Desconto (Fórmula Oficial Polliana)
    const { discountAudit, issues: discountIssues } = auditDiscount(nfdItem, matchedNfoItem);
    itemIssues.push(...discountIssues);

    // Auditoria farmacêutica regulatória (NT 2021.004, ANVISA, PIS/COFINS Monofásico)
    const { issues: pharmaIssues } = auditPharmaceuticalItem(nfdItem, matchedNfoItem, nfd, nfo);
    itemIssues.push(...pharmaIssues);

    // Auditoria de ICMS e Redução de Base (ex: INFAN 9.90% e 10.49%) com Princípio da Nota Espelho
    const { icmsAudit, issues: icmsIssues } = auditIcmsAndBaseReduction(nfdItem, matchedNfoItem, companyProfile, nfd.dest.uf);
    itemIssues.push(...icmsIssues);

    // Auditoria de ICMS-ST Proporcional
    const { icmsStAudit, issues: stIssues } = auditIcmsStProportionality(nfdItem, matchedNfoItem);
    itemIssues.push(...stIssues);

    // Auditoria da Reforma Tributária (IBS e CBS)
    const { ibsCbsAudit, issues: ibsCbsIssues } = auditIbsCbsReform(nfdItem, nfd);
    itemIssues.push(...ibsCbsIssues);

    // Auditoria DFeReferenciado SEFAZ 2026 (NT RTC v1.40 / Regra VC02-14)
    const { dfeReferenciadoAudit, issues: dfeIssues } = auditDFeReferenciado2026(nfdItem, matchedNfoItem, nfd, nfo);
    itemIssues.push(...dfeIssues);

    if (!matchedNfoItem) {
      itemIssues.push({
        id: `ITEM_${nfdItem.nItem}_UNMATCHED`,
        code: 'ITEM_NOT_FOUND_IN_NFO',
        title: 'Produto Não Encontrado na Nota de Origem',
        description: `O produto "${nfdItem.xProd}" (cProd: ${nfdItem.cProd}, EAN: ${nfdItem.cEAN || 'S/EAN'}) não consta na NFO.`,
        severity: 'CRITICAL',
      });
    } else {
      // I1: Unit Price
      const diffPrice = Math.abs(nfdItem.vUnCom - matchedNfoItem.vUnCom);
      if (diffPrice > 0.001) {
        itemIssues.push({
          id: `I1_${nfdItem.nItem}`,
          code: 'UNIT_PRICE_MISMATCH',
          title: 'Preço Unitário Divergente',
          description: `Preço na devolução (R$ ${nfdItem.vUnCom.toFixed(4)}) diverge do faturado na origem (R$ ${matchedNfoItem.vUnCom.toFixed(4)}).`,
          severity: 'CRITICAL',
          field: 'vUnCom',
        });
      }

      // I2: Quantity
      if (nfdItem.qCom > matchedNfoItem.qCom + 0.0001) {
        itemIssues.push({
          id: `I2_${nfdItem.nItem}`,
          code: 'QUANTITY_EXCEEDED',
          title: 'Quantidade Devolvida Excede a Venda',
          description: `Quantidade devolvida (${nfdItem.qCom}) é maior do que a faturada na origem (${matchedNfoItem.qCom}).`,
          severity: 'CRITICAL',
          field: 'qCom',
        });
      }

      // I3: Product total (tolerância de R$ 0.05 para arredondamentos de 4 casas decimais)
      const expectedProdTotal = nfdItem.qCom * nfdItem.vUnCom;
      if (Math.abs(nfdItem.vProd - expectedProdTotal) > 0.05) {
        itemIssues.push({
          id: `I3_${nfdItem.nItem}`,
          code: 'PROD_TOTAL_MISMATCH',
          title: 'Valor Total do Item Incoerente',
          description: `Valor total do produto (R$ ${nfdItem.vProd.toFixed(2)}) não condiz com qCom × vUnCom (R$ ${expectedProdTotal.toFixed(2)}).`,
          severity: 'CRITICAL',
          field: 'vProd',
        });
      }

      // I5 & I6: Batch / Lote check
      const hasNfoBatches = matchedNfoItem.batches.length > 0;
      const hasNfdBatches = nfdItem.batches.length > 0;

      if (hasNfoBatches && !hasNfdBatches) {
        const expectedBatchesStr = matchedNfoItem.batches.map(b => b.nLote).join(', ');
        // Conforme NT 2021.004, devolução (finNFe=4) ou vitaminas/suplementos não são rejeitados na SEFAZ sem tag <rastro>
        const isExempt = nfd.finNFe === 4 || ncmProfile.category === 'VITAMINA' || ncmProfile.category === 'SUPLEMENTO';
        itemIssues.push({
          id: `I5_${nfdItem.nItem}`,
          code: 'BATCH_MISSING',
          title: isExempt ? 'Lote Ausente no XML (Dispensado pela SEFAZ)' : 'Lote Ausente na Nota de Devolução',
          description: isExempt
            ? `A NFD omitiu a tag <rastro>. Conforme NT 2021.004, a SEFAZ autoriza a nota, porém o lote faturado na origem foi: ${expectedBatchesStr}. Realize a conferência física na doca.`
            : `A NFD omitiu a tag de lote (<rastro>). A NFO original registrava o(s) lote(s): ${expectedBatchesStr}.`,
          severity: isExempt ? 'INFO' : 'CRITICAL',
          field: 'nLote',
        });
      } else if (hasNfoBatches && hasNfdBatches) {
        const nfoBatchList = matchedNfoItem.batches.map(b => b.nLote.trim());
        const nfdBatchList = nfdItem.batches.map(b => b.nLote.trim());

        const isBatchMatching = nfdBatchList.some(b => nfoBatchList.includes(b));
        if (!isBatchMatching) {
          itemIssues.push({
            id: `I6_${nfdItem.nItem}`,
            code: 'BATCH_MISMATCH',
            title: 'Lote Divergente da Nota de Origem',
            description: `Lote informado na NFD (${nfdBatchList.join(', ')}) não consta nos lotes faturados na origem (${nfoBatchList.join(', ')}).`,
            severity: 'CRITICAL',
            field: 'nLote',
          });
        }
      }

      // I16: Batch expiration check
      nfdItem.batches.forEach(b => {
        if (b.dVal) {
          const expDate = new Date(b.dVal);
          if (!isNaN(expDate.getTime()) && expDate < new Date()) {
            itemIssues.push({
              id: `I16_${nfdItem.nItem}_${b.nLote}`,
              code: 'BATCH_EXPIRED',
              title: 'Lote de Produto Vencido',
              description: `O lote "${b.nLote}" informado na NFD está com data de validade VENCIDA (${expDate.toLocaleDateString('pt-BR')}).`,
              severity: 'WARNING',
              field: 'nLote',
            });
          }
        }
      });

      // I7: CFOP Validation
      const isReturnCfop = /^[1-7](20[1-9]|411|910|949)/.test(nfdItem.cfop);
      if (nfdItem.cfop && !isReturnCfop) {
        itemIssues.push({
          id: `I7_${nfdItem.nItem}`,
          code: 'CFOP_INVALID_FOR_RETURN',
          title: 'CFOP Incompatível com Operação de Devolução',
          description: `O CFOP ${nfdItem.cfop} do item não é um CFOP de devolução (esperado: x201, x202, x411, x949, etc.).`,
          severity: 'WARNING',
          field: 'cfop',
        });
      }

      // I8: ICMS CST
      if (nfdItem.icms && matchedNfoItem.icms) {
        if (nfdItem.icms.cst !== matchedNfoItem.icms.cst) {
          itemIssues.push({
            id: `I8_${nfdItem.nItem}`,
            code: 'ICMS_CST_MISMATCH',
            title: 'CST de ICMS Divergente',
            description: `CST ICMS devolvido (${nfdItem.icms.cst}) difere do faturado na origem (${matchedNfoItem.icms.cst}).`,
            severity: 'WARNING',
            field: 'cst',
          });
        }
      }

      // I12 & I13: IPI Validation
      if (nfdItem.ipi && matchedNfoItem.ipi) {
        if (Math.abs(nfdItem.ipi.pIPI - matchedNfoItem.ipi.pIPI) > 0.001) {
          itemIssues.push({
            id: `I12_${nfdItem.nItem}`,
            code: 'IPI_RATE_MISMATCH',
            title: 'Alíquota de IPI Divergente',
            description: `Alíquota de IPI devolvida (${nfdItem.ipi.pIPI}%) diverge da origem (${matchedNfoItem.ipi.pIPI}%).`,
            severity: 'CRITICAL',
            field: 'pIPI',
          });
        }

        if (nfdItem.ipi.cst !== matchedNfoItem.ipi.cst) {
          itemIssues.push({
            id: `I14_${nfdItem.nItem}`,
            code: 'IPI_CST_INFO',
            title: 'CST de IPI Diferente (Normal em Devolução)',
            description: `CST IPI na NFD é ${nfdItem.ipi.cst} e na NFO era ${matchedNfoItem.ipi.cst}.`,
            severity: 'INFO',
            field: 'ipiCst',
          });
        }
      }

      // I15: uCom Info
      if (nfdItem.uCom && matchedNfoItem.uCom && nfdItem.uCom.toUpperCase() !== matchedNfoItem.uCom.toUpperCase()) {
        itemIssues.push({
          id: `I15_${nfdItem.nItem}`,
          code: 'UCOM_DIFFERENT',
          title: 'Unidade de Medida Comercial com Grafia Diferente',
          description: `Unidade na NFD: "${nfdItem.uCom}" vs NFO: "${matchedNfoItem.uCom}".`,
          severity: 'INFO',
          field: 'uCom',
        });
      }
    }

    const isMatchOk = itemIssues.filter(i => i.severity === 'CRITICAL').length === 0;

    const qDevolvida = nfdItem.qCom;
    const qFaturada = matchedNfoItem ? matchedNfoItem.qCom : undefined;
    let percentageReturned: number | undefined;
    let returnType: ReturnType | undefined;

    if (matchedNfoItem) {
      percentageReturned = matchedNfoItem.qCom > 0 ? (nfdItem.qCom / matchedNfoItem.qCom) * 100 : 100;
      if (nfdItem.qCom > matchedNfoItem.qCom + 0.0001) {
        returnType = 'EXCESS';
      } else if (Math.abs(nfdItem.qCom - matchedNfoItem.qCom) <= 0.0001) {
        returnType = 'TOTAL';
      } else {
        returnType = 'PARTIAL';
      }
    }

    const itemPiramideResolution = nfdItem.infAdProd
      ? detectPiramideMotivo(nfdItem.infAdProd) || piramideResolution
      : piramideResolution;

    itemComparisons.push({
      nfdItem,
      nfoItem: matchedNfoItem,
      matchType,
      matchConfidence,
      qFaturada,
      qDevolvida,
      percentageReturned,
      returnType,
      piramideResolution: itemPiramideResolution,
      ncmProfile,
      discountAudit,
      icmsAudit,
      icmsStAudit,
      ibsCbsAudit,
      dfeReferenciadoAudit,
      issues: itemIssues,
      isMatchOk,
    });
  }

  // Find unmatched NFO items
  const unmatchedNfoItems = nfo.items.filter(item => !matchedNfoItemsSet.has(item.nItem));
  const unmatchedNfdItems = itemComparisons.filter(c => !c.nfoItem).map(c => c.nfdItem);

  // Totals & Summary
  const allIssues = [
    ...headerValidation.issues,
    ...itemComparisons.flatMap(c => c.issues),
  ];

  const totalCriticalErrors = allIssues.filter(i => i.severity === 'CRITICAL').length;
  const totalWarnings = allIssues.filter(i => i.severity === 'WARNING').length;

  let overallStatus: 'APPROVED' | 'HAS_WARNINGS' | 'REJECTED' = 'APPROVED';
  if (totalCriticalErrors > 0) {
    overallStatus = 'REJECTED';
  } else if (totalWarnings > 0) {
    overallStatus = 'HAS_WARNINGS';
  }

  const totalQuantityNfd = nfd.items.reduce((acc, i) => acc + (i.qCom || 0), 0);
  const totalQuantityNfo = nfo.items.reduce((acc, i) => acc + (i.qCom || 0), 0);
  let overallReturnType: ReturnType = 'TOTAL';
  if (itemComparisons.some(c => c.returnType === 'EXCESS')) {
    overallReturnType = 'EXCESS';
  } else if (itemComparisons.some(c => c.returnType === 'PARTIAL') || totalQuantityNfd < totalQuantityNfo - 0.0001) {
    overallReturnType = 'PARTIAL';
  }

  const pharmaceuticalSummary = buildPharmaceuticalSummary(itemComparisons, nfd, nfo);

  // Totais da Reforma Tributária
  const totalCbs = itemComparisons.reduce((acc, c) => acc + (c.ibsCbsAudit?.vCbs || 0), 0);
  const totalIbs = itemComparisons.reduce((acc, c) => acc + (c.ibsCbsAudit?.vIbs || 0), 0);
  const isCreditGuaranteed = !itemComparisons.some(c => c.ibsCbsAudit?.isCreditAtRisk);
  const is2026Compliant = itemComparisons.every(c => c.dfeReferenciadoAudit?.isCompliant2026 !== false);

  return {
    nfd,
    nfo,
    headerValidation,
    itemComparisons,
    unmatchedNfoItems,
    unmatchedNfdItems,
    ndoSuggestion,
    piramideResolution,
    pharmaceuticalSummary,
    companyProfile: {
      key: companyProfile.key,
      tradeName: companyProfile.tradeName,
      uf: companyProfile.uf,
      isIndustry: companyProfile.isIndustry,
      internalIcmsRate: companyProfile.internalIcmsRate,
      hasBaseReduction: companyProfile.hasBaseReduction,
      notes: companyProfile.notes,
    },
    taxReformSummary: {
      totalIbs,
      totalCbs,
      isCreditGuaranteed,
      is2026Compliant,
      riskMessage: isCreditGuaranteed
        ? undefined
        : 'Aviso de Reforma Tributária: cliente em Regime Normal sem destaque de IBS/CBS.',
    },
    summary: {
      totalItemsNfd: nfd.items.length,
      totalMatched: itemComparisons.filter(c => c.nfoItem).length,
      totalQuantityNfd,
      totalQuantityNfo,
      overallReturnType,
      totalCriticalErrors,
      totalWarnings,
      overallStatus,
      motivoDevolucao: piramideResolution?.motivoDesc || nfd.parsedMotivoDevolucao,
    },
  };
}

export function reconcileNFdAgainstMultipleNfos(
  nfd: NFeDocument,
  nfoList: NFeDocument[]
): ReconciliationResult {
  if (nfoList.length === 0) {
    // Unpaired NFD dummy fallback
    const dummyNfo: NFeDocument = {
      id: 'DUMMY_NFO',
      rawXml: '',
      fileName: 'Nenhuma_NFO_Localizada.xml',
      nfeType: 'NFO',
      chNFe: '00000000000000000000000000000000000000000000',
      nNF: '000000',
      serie: '1',
      dhEmi: new Date().toISOString(),
      natOp: 'VENDA DE MERCADORIA',
      finNFe: 1,
      refNFeList: [],
      emit: { cnpj: nfd.dest.cnpj, xNome: nfd.dest.xNome },
      dest: { cnpj: nfd.emit.cnpj, xNome: nfd.emit.xNome },
      items: [],
      totals: { vBC: 0, vICMS: 0, vProd: 0, vDesc: 0, vIPI: 0, vPIS: 0, vCOFINS: 0, vNF: 0 },
    };
    return reconcileNFeDocuments(nfd, dummyNfo);
  }

  if (nfoList.length === 1) {
    return reconcileNFeDocuments(nfd, nfoList[0]);
  }

  // Multi-NFO combination (1:N)
  const combinedItems: NFeItem[] = nfoList.flatMap(nfo => nfo.items);
  const totalVNF = nfoList.reduce((acc, curr) => acc + curr.totals.vNF, 0);

  const virtualNfo: NFeDocument = {
    ...nfoList[0],
    nNF: nfoList.map(n => n.nNF).join(' / '),
    chNFe: nfoList[0].chNFe,
    items: combinedItems,
    totals: {
      vBC: nfoList.reduce((acc, n) => acc + n.totals.vBC, 0),
      vICMS: nfoList.reduce((acc, n) => acc + n.totals.vICMS, 0),
      vProd: nfoList.reduce((acc, n) => acc + n.totals.vProd, 0),
      vDesc: nfoList.reduce((acc, n) => acc + n.totals.vDesc, 0),
      vIPI: nfoList.reduce((acc, n) => acc + n.totals.vIPI, 0),
      vPIS: nfoList.reduce((acc, n) => acc + n.totals.vPIS, 0),
      vCOFINS: nfoList.reduce((acc, n) => acc + n.totals.vCOFINS, 0),
      vNF: totalVNF,
    },
  };

  return reconcileNFeDocuments(nfd, virtualNfo);
}
