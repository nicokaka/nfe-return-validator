import { parseNFeXml } from './nfeParser';
import { reconcileNFeDocuments, reconcileNFdAgainstMultipleNfos } from './reconciliationEngine';
import { executeBatchPairing } from './batchPairingEngine';
import { sampleNfdXml, sampleNfoXml } from '../data/sampleXmls';
import { calculateStringSimilarity } from '../utils/textSimilarity';

export function runExhaustiveTestSuite(): { total: number; passed: number; failed: number; log: string[] } {
  const log: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, failureDetail?: string) {
    if (condition) {
      passed++;
      log.push(`✅ [PASS] ${testName}`);
    } else {
      failed++;
      log.push(`❌ [FAIL] ${testName} - ${failureDetail || 'Assertion failed'}`);
    }
  }

  // --- Test Suite Execution ---

  // 1. Parsing Real Dataset
  try {
    const docNfd = parseNFeXml(sampleNfdXml, 'NFD_Tapajos.xml');
    const docNfo = parseNFeXml(sampleNfoXml, 'NFO_Quesalon.xml');

    assert(docNfd.nfeType === 'NFD', 'T1.1: Identificação de Tipo NFD');
    assert(docNfo.nfeType === 'NFO', 'T1.2: Identificação de Tipo NFO');
    assert(docNfd.nNF === '663338', 'T1.3: Extração de nNF da NFD');
    assert(docNfo.nNF === '280748', 'T1.4: Extração de nNF da NFO');
    assert(docNfd.parsedMotivoDevolucao === 'AVARIA DE MERCADORIA DETECTADO NO ATO DO RECEBIMENTO', 'T1.5: Extração do Motivo de Devolução em infCpl');

    // 2. Real Dataset Reconciliation
    const res = reconcileNFeDocuments(docNfd, docNfo);

    assert(res.headerValidation.isRefKeyMatching, 'T2.1: Vinculação de NFref determinística');
    assert(res.headerValidation.isParticipantsMatching, 'T2.2: Cruzamento de CNPJs de Emissor/Destinatário');
    assert(res.itemComparisons.length === 2, 'T2.3: Contagem de itens pareados (2 de devolução)');

    // Item 1 (IMUNOGLUCAN PRO) - Should be OK
    const item1 = res.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(!!item1, 'T2.4: Match por EAN do Item 1');
    assert(item1 ? item1.isMatchOk : false, 'T2.5: Item 1 Aprovado sem erros críticos');
    assert(item1 ? item1.nfdItem.batches[0]?.nLote === '2606039' : false, 'T2.6: Presença e conferência do lote no Item 1');

    // Item 2 (IMUNOGLUCAN DS) - Should fail for missing lote
    const item2 = res.itemComparisons.find(c => c.nfdItem.cEAN === '7896685303467');
    assert(!!item2, 'T2.7: Match por EAN do Item 2');
    assert(item2 ? !item2.isMatchOk : false, 'T2.8: Item 2 Rejeitado por Lote Ausente');
    assert(
      item2 ? item2.issues.some(i => i.code === 'BATCH_MISSING' && i.severity === 'CRITICAL') : false,
      'T2.9: Flag de Erro Crítico BATCH_MISSING no Item 2'
    );

    // Overall Status
    assert(res.summary.overallStatus === 'REJECTED', 'T2.10: Status Geral da Nota = BLOQUEADO (devido ao erro do lote no item 2)');

    // 3. Simulated Edge Cases & User Errors

    // Scenario 3.1: Quantity Exceeded
    const tamperedNfdQty = parseNFeXml(sampleNfdXml.replace('<qCom>3.0000</qCom>', '<qCom>30.0000</qCom>'), 'NFD_QtyExceeded.xml');
    const resQty = reconcileNFeDocuments(tamperedNfdQty, docNfo);
    const itemQty = resQty.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(
      itemQty ? itemQty.issues.some(i => i.code === 'QUANTITY_EXCEEDED') : false,
      'T3.1: Captura de erro quando Quantidade Devolvida (30) > Venda (24)'
    );

    // Scenario 3.2: Unit Price Mismatch
    const tamperedNfdPrice = parseNFeXml(sampleNfdXml.replace('<vUnCom>99.2500000000</vUnCom>', '<vUnCom>120.0000000000</vUnCom>'), 'NFD_PriceMismatch.xml');
    const resPrice = reconcileNFeDocuments(tamperedNfdPrice, docNfo);
    const itemPrice = resPrice.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(
      itemPrice ? itemPrice.issues.some(i => i.code === 'UNIT_PRICE_MISMATCH') : false,
      'T3.2: Captura de erro quando Preço Unitário (R$120) diverge da Venda (R$99,25)'
    );

    // Scenario 3.3: Missing NFref and missing infCpl reference
    const tamperedNfdRef = parseNFeXml(
      sampleNfdXml
        .replace(/<NFref>[\s\S]*?<\/NFref>/, '')
        .replace(/<infCpl>[\s\S]*?<\/infCpl>/, ''),
      'NFD_NoRef.xml'
    );
    const resRef = reconcileNFeDocuments(tamperedNfdRef, docNfo);
    assert(
      resRef.headerValidation.issues.some(i => i.code === 'REF_KEY_MISMATCH'),
      'T3.3: Captura de erro quando NFD não possui referência à NFO'
    );

    // Scenario 3.4: ICMS Rate Divergence
    const tamperedNfdIcms = parseNFeXml(sampleNfdXml.replace('<pICMS>12.0000</pICMS>', '<pICMS>18.0000</pICMS>'), 'NFD_IcmsMismatch.xml');
    const resIcms = reconcileNFeDocuments(tamperedNfdIcms, docNfo);
    const itemIcms = resIcms.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(
      itemIcms ? itemIcms.issues.some(i => i.code === 'ICMS_RATE_MISMATCH') : false,
      'T3.4: Captura de erro quando Alíquota ICMS na NFD (18%) != NFO (12%)'
    );

    // Scenario 3.5: Malformed XML Error Handling
    let thrownError = false;
    try {
      parseNFeXml('<xml>broken content without closing tags', 'Broken.xml');
    } catch {
      thrownError = true;
    }
    assert(thrownError, 'T3.5: Lançamento de exceção em XML malformado');

    // Scenario 3.6: Levenshtein Distance & Similarity Calculation
    const simHigh = calculateStringSimilarity('IMUNOGLUCAN PRO 30 CAP', 'IMUNOGLUCAN PRO 30 CAPSULAS');
    assert(simHigh > 0.7, 'T3.6: Similaridade de Levenshtein elevada para nomes de produtos semelhantes');

    // Scenario 3.7: Cancelled NFe Detection (cStat 101)
    const tamperedCancelledNfd = parseNFeXml(sampleNfdXml.replace('<cStat>100</cStat>', '<cStat>101</cStat><xMotivo>Cancelamento de NF-e homologado</xMotivo>'), 'NFD_Cancelled.xml');
    const resCancelled = reconcileNFeDocuments(tamperedCancelledNfd, docNfo);
    assert(
      resCancelled.headerValidation.issues.some(i => i.code === 'NFD_CANCELLED'),
      'T3.7: Captura de erro em Nota de Devolução Cancelada na SEFAZ (cStat 101)'
    );

    // Scenario 3.8: Expired Batch Detection (dVal < today)
    const tamperedExpiredBatchNfd = parseNFeXml(
      sampleNfdXml.replace('<dVal>2028-06-30</dVal>', '<dVal>2020-01-01</dVal>'),
      'NFD_ExpiredBatch.xml'
    );
    const resExpired = reconcileNFeDocuments(tamperedExpiredBatchNfd, docNfo);
    assert(
      resExpired.itemComparisons.some(c => c.issues.some(i => i.code === 'BATCH_EXPIRED')),
      'T3.8: Captura de alerta para Lote com Data de Validade Vencida'
    );

    // Scenario 3.9: Invalid Return CFOP Detection (CFOP 6102 instead of 6202/1202/2202)
    const tamperedCfopNfd = parseNFeXml(sampleNfdXml.replace('<CFOP>6202</CFOP>', '<CFOP>6102</CFOP>'), 'NFD_BadCfop.xml');
    const resCfop = reconcileNFeDocuments(tamperedCfopNfd, docNfo);
    assert(
      resCfop.itemComparisons.some(c => c.issues.some(i => i.code === 'CFOP_INVALID_FOR_RETURN')),
      'T3.9: Captura de alerta para CFOP incompatível com devolução'
    );

    // Scenario 4.1: Batch Pairing Engine Execution
    const batchRes = executeBatchPairing([docNfd, docNfo]);
    assert(batchRes.summary.totalFiles === 2, 'T4.1: Execução do Motor de Pareamento em Lote (2 arquivos)');
    assert(batchRes.summary.totalPaired === 1, 'T4.2: Identificação determinística do par no lote (1:1)');

    // Scenario 4.2: Multi-NFO Reconciliation (1:N)
    const docNfo2 = { ...docNfo, id: 'NFO2', nNF: '280749' };
    const multiRes = reconcileNFdAgainstMultipleNfos(docNfd, [docNfo, docNfo2]);
    assert(multiRes.nfd.nNF === '663338', 'T4.3: Reconciliação Multi-NFO (1:N) executada com sucesso');

    // 5. Novas Validações Pirâmide & NDO (Reunião Glécia)
    // T5.1: Motivo Automático Avaria -> Almoxarifado AVARIA
    assert(res.piramideResolution?.almoxarifado === 'AVARIA', 'T5.1: Detecção de Motivo Pirâmide (Avaria ➔ Almoxarifado AVARIA)');

    // T5.2: NDO Sugerida
    assert(res.ndoSuggestion !== undefined && res.ndoSuggestion.operationType === 'DEV_VENDA', 'T5.2: Sugestão de NDO de Devolução');

    // T5.3: Auditoria de Quantidades
    const itemImuno = res.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(itemImuno?.qDevolvida === 3 && itemImuno?.qFaturada === 24, 'T5.3: Comparação de Quantidade Devolvida (3) vs Faturada (24)');
    assert(itemImuno?.returnType === 'PARTIAL', 'T5.4: Identificação de Devolução Parcial (3 de 24 faturados)');

    // T5.5: Quantidade Total da Nota (3 + 3 = 6 un)
    assert(res.summary.totalQuantityNfd === 6, 'T5.5: Totalizador de Quantidade Devolvida na NFD (6 un)');


  } catch (err: any) {
    failed++;
    log.push(`❌ Exceção não capturada durante a execução da suíte: ${err.message}`);
  }

  return {
    total: passed + failed,
    passed,
    failed,
    log,
  };
}

