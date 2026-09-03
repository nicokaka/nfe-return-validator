import { parseNFeXml } from './nfeParser';
import { parseDanfeText } from './danfePdfParser';
import { reconcileNFeDocuments, reconcileNFdAgainstMultipleNfos } from './reconciliationEngine';
import { executeBatchPairing } from './batchPairingEngine';
import { sampleNfdXml, sampleNfoXml } from '../data/sampleXmls';
import { sampleDanfePdfText } from '../data/sampleDanfeText';
import { samplePollianaDanfeNfoText, samplePollianaDanfeNfdText } from '../data/samplePollianaDanfeText';
import { samplePollianaNfdXml, samplePollianaNfoXml } from '../data/samplePolliana0309';
import { calculateStringSimilarity } from '../utils/textSimilarity';
import { calculateExpectedIcms, identifyCompany } from '../data/companyData';
import { findProductByEan, findProductByCode } from '../data/productCatalog';
import { auditIcmsStProportionality } from './pharmaFiscalEngine';
import { validateCnpjChecksum } from './cnpjValidator';
import { validateNFeKey } from './sefazStatusService';
import { generatePiramideOracleTiInsertScript, generatePiramideOracleTiDeleteScript } from './piramideService';

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

    // Item 2 (IMUNOGLUCAN DS - NCM 2936 Vitamina) - Conforme NT 2021.004, tag <rastro> não é mandatória
    const item2 = res.itemComparisons.find(c => c.nfdItem.cEAN === '7896685303467');
    assert(!!item2, 'T2.7: Match por EAN do Item 2');
    assert(item2 ? item2.isMatchOk : false, 'T2.8: Item 2 em Conformidade Fiscal (Vitamina NCM 2936 dispensa tag <rastro> na SEFAZ)');
    assert(
      item2 ? item2.issues.some(i => i.code === 'BATCH_MISSING' && i.severity === 'INFO') : false,
      'T2.9: Aviso Informativo de Conferência Física (INFO) sem bloquear a nota'
    );

    // Overall Status
    assert(res.summary.overallStatus === 'APPROVED', 'T2.10: Status Geral da Nota = APROVADO (com inteligência farmacêutica de NCM)');

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

    // 6. Inteligência Fiscal Farmacêutica, NCM, NT 2021.004 e Descontos

    // T6.1: Classificação NCM Inteligente (NCM 29362990 = Vitamina)
    assert(item1?.ncmProfile?.category === 'VITAMINA', 'T6.1: Perfil NCM 2936 classificado com precisão como Vitamina');

    // T6.2: Auditoria de Desconto Proporcional
    assert(item1?.discountAudit !== undefined, 'T6.2: Auditoria de Desconto Proporcional gerada');
    assert(item1?.discountAudit?.isProportional === true, 'T6.3: Desconto proporcional em conformidade (R$ 41,68 devolvido = proporcional de R$ 333,47 / 24 * 3)');

    // T6.4: Simulação de Desconto com Rejeição 483 SEFAZ (vDesc > vProd)
    const tamperedDiscount483 = parseNFeXml(
      sampleNfdXml.replace('<vDesc>41.68</vDesc>', '<vDesc>500.00</vDesc>'),
      'NFD_Discount483.xml'
    );
    const resDisc483 = reconcileNFeDocuments(tamperedDiscount483, docNfo);
    const itemDisc483 = resDisc483.itemComparisons[0];
    assert(
      itemDisc483?.issues.some(i => i.code === 'DISCOUNT_EXCEEDS_PRODUCT_VALUE'),
      'T6.4: Captura da Rejeição SEFAZ 483 (Desconto R$500 > Valor Produto R$297.75)'
    );

    // T6.5: Simulação de Desconto Proporcional na Devolução Parcial
    // Venda de 10 un a R$100 com R$200 de desconto (R$20/un). Devolução de 3 un deve ter R$60 de desconto.
    const customNfoXml = sampleNfoXml
      .replace(/<qCom>24\.0000<\/qCom>/g, '<qCom>10.0000</qCom>')
      .replace('<vDesc>333.47</vDesc>', '<vDesc>200.00</vDesc>');
    const customNfdXml = sampleNfdXml
      .replace('<qCom>3.0000</qCom>', '<qCom>3.0000</qCom>')
      .replace('<vDesc>41.68</vDesc>', '<vDesc>60.00</vDesc>');
    const docCustomNfo = parseNFeXml(customNfoXml, 'NFO_CustomDisc.xml');
    const docCustomNfd = parseNFeXml(customNfdXml, 'NFD_CustomDisc.xml');
    const resCustomDisc = reconcileNFeDocuments(docCustomNfd, docCustomNfo);
    const itemCustomDisc = resCustomDisc.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(
      itemCustomDisc?.discountAudit?.isProportional === true,
      'T6.5: Reconhecimento de Desconto Proporcional Exato (3/10 * R$200 = R$60)'
    );

    // T6.6: Simulação de Desconto Não Proporcional (esperado R$60, informado R$150)
    const customNfdBadDiscXml = sampleNfdXml
      .replace('<qCom>3.0000</qCom>', '<qCom>3.0000</qCom>')
      .replace('<vDesc>41.68</vDesc>', '<vDesc>150.00</vDesc>');
    const docBadDiscNfd = parseNFeXml(customNfdBadDiscXml, 'NFD_BadDisc.xml');
    const resBadDisc = reconcileNFeDocuments(docBadDiscNfd, docCustomNfo);
    const itemBadDisc = resBadDisc.itemComparisons[0];
    assert(
      itemBadDisc?.issues.some(i => i.code === 'DISCOUNT_NOT_PROPORTIONAL'),
      'T6.6: Alerta para Desconto Não Proporcional (informado R$150 vs esperado R$60)'
    );

    // T6.7: Resumo Executivo Farmacêutico
    assert(res.pharmaceuticalSummary !== undefined, 'T6.7: Resumo Executivo Farmacêutico gerado');
    assert(
      res.pharmaceuticalSummary?.totalMedicamentos !== undefined &&
      res.pharmaceuticalSummary?.totalDescontoNfd !== undefined,
      'T6.8: Métricas de medicamentos e total de descontos consolidadas'
    );

    // 7. Diretrizes da Gerência Fiscal (Polliana) e Reforma Tributária
    // T7.1: Identificação de Empresa
    assert(res.companyProfile?.key === 'QUESALON_PB', 'T7.1: Identificação automática de empresa (QUESALON PB)');

    // T7.2: INFAN PB - Redução de Base 9,90% (NCM 3004)
    const infanCompany = identifyCompany('08825857000138', 'PB', 'INFAN INDUSTRIA QUIMICA FARMACEUTICA');
    const icmsInfan3004 = calculateExpectedIcms(infanCompany, 'PB', '30049099');
    assert(
      icmsInfan3004.expectedRate === 0.205 && icmsInfan3004.reductionPercentage === 9.90 && icmsInfan3004.baseMultiplier === 0.901,
      'T7.2: INFAN (PB) com Redução de Base de ICMS de 9,90% para NCM 3004'
    );

    // T7.3: INFAN PB - Redução de Base 10,49% (Cosméticos 3401/3304)
    const icmsInfanCosm = calculateExpectedIcms(infanCompany, 'PB', '34012010');
    assert(
      icmsInfanCosm.reductionPercentage === 10.49 && icmsInfanCosm.baseMultiplier === 0.8951,
      'T7.3: INFAN (PB) com Redução de Base de ICMS de 10,49% para Cosméticos e Higiene'
    );

    // T7.4: QUESALON EXTREMA MG - Alíquotas Interestaduais (12% Sul/Sudeste vs 7% Demais)
    const extremaCompany = identifyCompany('04792134000496', 'MG', 'QUESALON EXTREMA');
    const icmsExtremaSP = calculateExpectedIcms(extremaCompany, 'SP', '30049099');
    const icmsExtremaBA = calculateExpectedIcms(extremaCompany, 'BA', '30049099');
    assert(icmsExtremaSP.expectedRate === 0.12, 'T7.4: QUESALON Extrema MG ➔ SP (Sul/Sudeste): Alíquota 12,00%');
    assert(icmsExtremaBA.expectedRate === 0.07, 'T7.5: QUESALON Extrema MG ➔ BA (Nordeste/CO/N/ES): Alíquota 7,00%');

    // T7.6: Catálogo Oficial de 90 Produtos da Polliana
    const floraxProduct = findProductByEan('7896685300183');
    assert(
      floraxProduct !== undefined && floraxProduct.ncm === '30049099' && floraxProduct.cest === '13.004.01',
      'T7.6: Catálogo de Produtos: Localização por EAN (FLORAX NCM 30049099 / CEST 13.004.01)'
    );
    const prodByCode = findProductByCode(18);
    assert(prodByCode !== undefined && prodByCode.cod === 18, 'T7.7: Catálogo de Produtos: Localização por Código Interno (Cód 18)');

    // T7.8: Matriz de CFOPs do ERP Pirâmide
    assert(res.ndoSuggestion?.cfop === '2.202', 'T7.8: Matriz de CFOPs do Pirâmide: Saída 6102 ➔ Devolução 6202 ➔ Entrada 2.202');

    // T7.9: Auditoria de ICMS-ST Proporcional
    const mockNfoStItem = { ...res.nfd.items[0], qCom: 10, icms: { orig: '0', cst: '10', pICMS: 12, vBC: 1000, vICMS: 120, vBCST: 1500, vICMSST: 180 } };
    const mockNfdStItem = { ...res.nfd.items[0], qCom: 3, icms: { orig: '0', cst: '10', pICMS: 12, vBC: 300, vICMS: 36, vBCST: 450, vICMSST: 54 } };
    const stAuditRes = auditIcmsStProportionality(mockNfdStItem, mockNfoStItem);
    assert(stAuditRes.icmsStAudit.isProportional === true, 'T7.9: ICMS-ST Proporcional Exato (3/10 de R$ 180 = R$ 54)');

    // T7.10: Reforma Tributária (IBS e CBS) & DFeReferenciado
    assert(res.taxReformSummary !== undefined, 'T7.10: Resumo e Telemetria da Reforma Tributária (IBS/CBS) gerados');

    // 8. Novas Diretrizes da Gerência Fiscal (Desconto Embutido, CFOP NFO Estrito, CC-e e CNPJ)
    // T8.1: Desconto Embutido no Preço Unitário (vUnCom R$85.36 sem tag vDesc, original venda R$99.25 com R$13.89 de desconto)
    const embeddedDiscNfdXml = sampleNfdXml
      .replace('<vUnCom>99.2500000000</vUnCom>', '<vUnCom>85.3600000000</vUnCom>')
      .replace('<vProd>297.75</vProd>', '<vProd>256.08</vProd>')
      .replace('<vDesc>41.68</vDesc>', '<vDesc>0.00</vDesc>');
    const docEmbeddedDisc = parseNFeXml(embeddedDiscNfdXml, 'NFD_EmbeddedDisc.xml');
    const resEmbedded = reconcileNFeDocuments(docEmbeddedDisc, docNfo);
    const itemEmbedded = resEmbedded.itemComparisons.find(c => c.nfdItem.cEAN === '7896685304945');
    assert(
      itemEmbedded?.discountAudit?.isEmbeddedInUnitPrice === true && !itemEmbedded?.issues.some(i => i.code === 'UNIT_PRICE_MISMATCH'),
      'T8.1: Reconhecimento Inteligente de Desconto Embutido no Preço Unitário (Sem Falso Erro de Preço)'
    );

    // T8.2: CFOP Incorreto Enviado pelo Cliente (Dispara Alerta de CC-e e Mantém Entrada Pirâmide 2.202)
    const badCfopNfdXml = sampleNfdXml.replace('<CFOP>6202</CFOP>', '<CFOP>6102</CFOP>');
    const docBadCfop = parseNFeXml(badCfopNfdXml, 'NFD_BadCfop.xml');
    const resBadCfop = reconcileNFeDocuments(docBadCfop, docNfo);
    const itemBadCfop = resBadCfop.itemComparisons[0];
    assert(
      itemBadCfop?.issues.some(i => i.code === 'CFOP_CLIENT_MISMATCH') && resBadCfop.ndoSuggestion?.cfop === '2.202',
      'T8.2: CFOP Incorreto do Cliente Dispara Alerta de CC-e e Mantém NDO/CFOP 2.202 Correto na Entrada'
    );

    // T8.3: Validação de CNPJ Módulo 11 (Rejeição de CNPJ Inválido com Dígito Incorreto)
    const invalidCnpjCheck = validateCnpjChecksum('04792134000199'); // DVs corretos seriam 43
    const validCnpjCheck = validateCnpjChecksum('04792134000143');
    assert(
      invalidCnpjCheck.isValidChecksum === false && validCnpjCheck.isValidChecksum === true,
      'T8.3: Validador de CNPJ Módulo 11 da Receita Federal Aprovando CNPJ Válido e Rejeitando Inválido'
    );

    // T8.4: Validação de Chave de Acesso SEFAZ (44 dígitos e Módulo 11 da Chave)
    const keyCheck = validateNFeKey(docNfd.chNFe);
    assert(
      keyCheck.isValidLength === true && keyCheck.isValidChecksum === true,
      'T8.4: Validação Estrutural e Dígito Verificador Módulo 11 da Chave de Acesso da SEFAZ (44 dígitos)'
    );

    // T8.5: Fonte Única da Verdade para o CFOP da Devolução (getExpectedReturnCfop derivado 100% da NFO)
    const expectedCfop6102 = res.itemComparisons[0]?.expectedClientCfop;
    assert(
      expectedCfop6102 === '6202',
      'T8.5: Determinação do CFOP de Devolução Esperado Baseada Exclusivamente na Nota de Origem (6102 ➔ 6202)'
    );

    // =========================================================================
    // SUÍTE 9: CONECTOR & INTEGRAÇÃO DIRETA ERP PIRÂMIDE (ORACLE TI)
    // =========================================================================
    const tiScript = generatePiramideOracleTiInsertScript(res, { selectedWarehouse: 'GQ' });
    const tiDeleteScript = generatePiramideOracleTiDeleteScript(res);

    // T9.1: Presença obrigatória de COD_UNIDADE_NEGOCIO_ORIGEM no Cabeçalho
    assert(
      tiScript.includes('COD_UNIDADE_NEGOCIO_ORIGEM') && tiScript.includes('TI_NOTA_FISCAL_ENTRADA'),
      'T9.1: Inclusão obrigatória de COD_UNIDADE_NEGOCIO_ORIGEM no cabeçalho da TI'
    );

    // T9.2: Presença obrigatória de VAL_OUTRAS_DESPESAS na tabela de Itens
    assert(
      tiScript.includes('VAL_OUTRAS_DESPESAS') && tiScript.includes('TI_ITEM_NOTA_FISCAL_ENTRADA'),
      'T9.2: Inclusão obrigatória de VAL_OUTRAS_DESPESAS nos itens da TI conforme constraint NOT NULL'
    );

    // T9.3: Script de Rollback seguro com amarração por subquery sequencial
    assert(
      tiDeleteScript.includes('NUM_SEQUENCIAL_ENTRADA_ORIGEM IN') && tiDeleteScript.includes('TI_ITEM_NOTA_FISCAL_ENTRADA'),
      'T9.3: Script de limpeza/rollback usando subquery segura de sequencial sem erro de ORA-00904'
    );

    // T9.4: Rastreabilidade de Lotes com amarração de TI_ITEM_ENTRADA_LOTE
    assert(
      tiScript.includes('TI_ITEM_ENTRADA_LOTE') && tiScript.includes('2606039'),
      'T9.4: Rastreabilidade de Lote e Validade gerada para TI_ITEM_ENTRADA_LOTE'
    );

    // T9.5: Identificador Oficial do Sistema 'VAL' no Cabeçalho e Itens
    assert(
      tiScript.includes("'VAL'") && tiScript.includes("'NP'"),
      "T9.5: Carga nas TIs parametrizada com Sistema Integrante 'VAL' e status 'NP'"
    );

    // =========================================================================
    // SUÍTE 10: GOVERNANÇA FISCAL & CIRCUITO DE BLOQUEIO (CIRCUIT BREAKER)
    // =========================================================================
    // T10.1: Nota com divergência crítica de preço unitário é bloqueada pelo circuito de segurança
    const badPriceNfdXml = sampleNfdXml.replace('<vUnCom>99.2500000000</vUnCom>', '<vUnCom>120.0000000000</vUnCom>');
    const docBadPrice = parseNFeXml(badPriceNfdXml, 'NFD_BadPrice.xml');
    const resBadPrice = reconcileNFeDocuments(docBadPrice, docNfo);
    const criticalsBadPrice = [
      ...resBadPrice.headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
      ...resBadPrice.itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
    ];
    assert(
      criticalsBadPrice.length > 0 && criticalsBadPrice.some(i => i.code === 'UNIT_PRICE_MISMATCH'),
      'T10.1: Circuito de Segurança bloqueia nota com divergência crítica de preço unitário (R$ 120 vs R$ 99,25)'
    );

    // T10.2: Nota em conformidade (amostra homologada) possui zero inconsistências críticas e é liberada
    const criticalsApproved = [
      ...res.headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
      ...res.itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
    ];
    assert(
      criticalsApproved.length === 0,
      'T10.2: Nota 100% auditada possui zero divergências críticas e obtém liberação direta no Pirâmide'
    );

    // =========================================================================
    // SUÍTE 11: INGESTÃO E PROCESSAMENTO NATIVO DE DANFE EM PDF (HEBRON & CLIENTES)
    // =========================================================================
    // T11.1: Extração de Metadados e Participantes a partir do PDF da DANFE
    const docDanfePdf = parseDanfeText(sampleDanfePdfText, 'DANFE_Devolucao_663338.pdf');
    assert(
      docDanfePdf.chNFe === '15260784521053000490550010006633381403148640' &&
      docDanfePdf.nNF === '663338' &&
      docDanfePdf.nfeType === 'NFD' &&
      docDanfePdf.emit.cnpj === '84521053000490' &&
      docDanfePdf.dest.cnpj === '04792134000143',
      'T11.1: Extração de Chave de Acesso, nNF, Tipo NFD, Emitente e Destinatário de DANFE PDF'
    );

    // T11.2: Extração de Itens, Preços Unitários, NCM e Lotes ANVISA a partir de DANFE PDF
    const pdfItem1 = docDanfePdf.items.find(it => it.cProd === '172424');
    assert(
      !!pdfItem1 &&
      pdfItem1.qCom === 3 &&
      pdfItem1.vUnCom === 99.25 &&
      pdfItem1.ncm === '29362990' &&
      pdfItem1.batches.some(b => b.nLote === '2606039' && b.dVal === '2028-06-30'),
      'T11.2: Extração de Itens, Preços Unitários, NCM e Lotes ANVISA a partir de DANFE PDF'
    );

    // T11.3: Extração de NFref e Motivo de Devolução em Informações Complementares da DANFE PDF
    assert(
      docDanfePdf.refNFeList.includes('25260704792134000143550010002807481662339838') &&
      docDanfePdf.parsedNfoRefNumber === '280748' &&
      Boolean(docDanfePdf.parsedMotivoDevolucao?.includes('AVARIA')),
      'T11.3: Extração de NFref e Motivo de Devolução em Informações Complementares de DANFE PDF'
    );

    // T11.4: Reconciliação Híbrida 100% Aprovada: DANFE PDF de Devolução (663338) x XML de Origem (280748)
    const hybridReconciliation = reconcileNFeDocuments(docDanfePdf, docNfo);
    const hybridCriticals = [
      ...hybridReconciliation.headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
      ...hybridReconciliation.itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
    ];
    assert(
      hybridReconciliation.headerValidation.isRefKeyMatching &&
      hybridCriticals.length === 0 &&
      hybridReconciliation.itemComparisons.length === 2,
      'T11.4: Reconciliação Híbrida 100% Aprovada: DANFE PDF de Devolução (663338) x XML de Origem (280748)'
    );

    // =========================================================================
    // SUÍTE 12: PAREAMENTO INTELIGENTE MULTI-LOTE & CASO REAL GERÊNCIA FISCAL
    // (Amostra INFAN NF 82691 x Devolução Medicamental NF 154693)
    // =========================================================================
    const docPollianaNfd = parseNFeXml(samplePollianaNfdXml, 'NFD_Medicamental_154693.xml');
    const docPollianaNfo = parseNFeXml(samplePollianaNfoXml, 'NFO_Infan_082691.xml');

    // T12.1: Identificação de 2 itens na NFO com o mesmo EAN mas lotes distintos
    const nfoEanItems = docPollianaNfo.items.filter(it => it.cEAN === '7896685301227');
    assert(
      nfoEanItems.length === 2 &&
      nfoEanItems[0].batches[0]?.nLote === '2606045' &&
      nfoEanItems[1].batches[0]?.nLote === '2606046',
      'T12.1: Detecção de múltiplos itens na NFO com o mesmo EAN (7896685301227) em lotes distintos (2606045 e 2606046)'
    );

    // Reconciliação do caso real da Polliana
    const resPolliana = reconcileNFeDocuments(docPollianaNfd, docPollianaNfo);

    // T12.2: Pareamento determinístico guiado por lote: NFD Item 2 (Lote 2606046) deve parear com NFO Item 2 (Lote 2606046)
    const nfdItemProstokos = resPolliana.itemComparisons.find(c => c.nfdItem.cEAN === '7896685301227');
    assert(
      !!nfdItemProstokos &&
      nfdItemProstokos.nfoItem?.nItem === 2 &&
      nfdItemProstokos.nfoItem?.batches[0]?.nLote === '2606046',
      'T12.2: Pareamento inteligente vincula NFD Item 2 ao NFO Item 2 (Lote 2606046) em vez de travar no NFO Item 1'
    );

    // T12.3: Ausência total de falso erro de divergência de lote (BATCH_MISMATCH)
    const pollianaBatchMismatch = resPolliana.itemComparisons.some(c =>
      c.issues.some(i => i.code === 'BATCH_MISMATCH')
    );
    assert(
      !pollianaBatchMismatch,
      'T12.3: Eliminação de falso erro de lote - ambos os itens pareados com seus respectivos lotes com 100% de conformidade'
    );

    // T12.4: Suporte e cruzamento com o grupo DFeReferenciado da SEFAZ
    const prostokosDfeRef = docPollianaNfd.items.find(it => it.cEAN === '7896685301227')?.dfeReferenciado;
    assert(
      prostokosDfeRef?.nItem === 2 &&
      prostokosDfeRef?.chaveAcesso === '26260808939548000103550010000826911840270693',
      'T12.4: Leitura precisa do grupo DFeReferenciado (nItem=2) conforme NT SEFAZ 2024.002 / RTC VC02-14'
    );

    // =========================================================================
    // SUÍTE 13: RECONCILIAÇÃO FISCAL COMPLETA DE DANFE PDF x DANFE PDF
    // (Amostra Real Quesalon NF 279117 x Santa Cruz / Hypera NF 20841)
    // =========================================================================
    // T13.1: Parsing da DANFE NFO de Saída da Quesalon (NF 279117)
    const docPollianaDanfeNfo = parseDanfeText(samplePollianaDanfeNfoText, 'DANFE_279117.pdf');
    assert(
      docPollianaDanfeNfo.chNFe === '25260504792134000143550010002791171892645222' &&
      docPollianaDanfeNfo.nNF === '279117' &&
      docPollianaDanfeNfo.nfeType === 'NFO' &&
      docPollianaDanfeNfo.items.length === 3 &&
      docPollianaDanfeNfo.items.some(it => it.xProd.includes('GAMAX') && it.batches[0]?.nLote === '2511009'),
      'T13.1: Extração precisa de DANFE NFO em PDF (Quesalon NF 279117, 3 itens farmacêuticos com lotes)'
    );

    // T13.2: Parsing da DANFE NFD de Devolução do Cliente (NF 20841)
    const docPollianaDanfeNfd = parseDanfeText(samplePollianaDanfeNfdText, '20841.pdf');
    assert(
      docPollianaDanfeNfd.chNFe === '25260661940292006410550850000208411289861770' &&
      docPollianaDanfeNfd.nNF === '20841' &&
      docPollianaDanfeNfd.nfeType === 'NFD' &&
      docPollianaDanfeNfd.refNFeList.includes('25260504792134000143550010002791171892645222') &&
      docPollianaDanfeNfd.items.length === 1 &&
      docPollianaDanfeNfd.items[0].xProd.includes('GAMAX') &&
      docPollianaDanfeNfd.items[0].batches[0]?.nLote === '2511009',
      'T13.2: Extração precisa de DANFE NFD em PDF (Santa Cruz NF 20841, Lote 2511009 e NF-e REF)'
    );

    // T13.3: Reconciliação Fiscal Híbrida PDF x PDF 100% Aprovada
    const resPollianaPdf = reconcileNFeDocuments(docPollianaDanfeNfd, docPollianaDanfeNfo);
    const criticalIssuesPdf = [
      ...resPollianaPdf.headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
      ...resPollianaPdf.itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
    ];
    assert(
      resPollianaPdf.headerValidation.isRefKeyMatching &&
      resPollianaPdf.headerValidation.isParticipantsMatching &&
      criticalIssuesPdf.length === 0 &&
      resPollianaPdf.summary.overallStatus === 'APPROVED' &&
      resPollianaPdf.itemComparisons[0].nfoItem !== undefined,
      'T13.3: Reconciliação Fiscal PDF x PDF 100% Aprovada com Pareamento Determinístico de Lote e Zero Erros'
    );

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


