import { PIRAMIDE_MOTIVOS, PIRAMIDE_WAREHOUSES } from '../data/piramideData';
import { PiramideMotivo, PiramideResolution, PiramideWarehouse, ReconciliationResult, ItemComparison } from '../types/nfe';
import { calculateStringSimilarity } from '../utils/textSimilarity';
import { normalizeUnit } from './reconciliationEngine';

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

/**
 * Gera o Script PL/SQL completo e transacional para carga direta nas
 * Tabelas de Integração (TI) do Oracle do ERP Pirâmide (Procenge).
 */
export function generatePiramideOracleTiInsertScript(
  result: ReconciliationResult,
  options?: {
    empresa?: string;
    filial?: string;
    sistemaOrigem?: string;
    selectedWarehouse?: string;
    customNDO?: string;
  }
): string {
  const nfd = result.nfd;
  const nfo = result.nfo;
  const empresa = options?.empresa || (result.companyProfile?.isIndustry ? '003' : '001');
  const filial = options?.filial || (result.companyProfile?.isIndustry ? '003' : '001');
  const sistema = options?.sistemaOrigem || 'VAL';
  const ndo = options?.customNDO || result.ndoSuggestion?.ndoCode || '2202';
  const warehouse = options?.selectedWarehouse || result.piramideResolution?.almoxarifado || 'GQ';

  const dEmi = nfd.dhEmi ? nfd.dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const vNF = nfd.totals.vNF.toFixed(2);
  const vDesc = (nfd.totals.vDesc || 0).toFixed(2);
  const cnpjCliente = nfd.emit.cnpj.replace(/\D/g, '');

  let sql = `-- =========================================================================\n`;
  sql += `-- SCRIPT DE CARGA AUTOMÁTICA NAS TABELAS DE INTEGRAÇÃO (TI) - ERP PIRÂMIDE\n`;
  sql += `-- Nota de Devolução: NF nº ${nfd.nNF} (Série ${nfd.serie}) | Cliente CNPJ: ${cnpjCliente}\n`;
  sql += `-- Empresa: ${empresa} | Filial: ${filial} | Sistema Integrante: ${sistema}\n`;
  sql += `-- Gerado pelo Validador Fiscal Hebron em ${new Date().toLocaleString('pt-BR')}\n`;
  sql += `-- =========================================================================\n\n`;

  sql += `DECLARE\n`;
  sql += `  v_seq_entrada NUMBER := TO_NUMBER(TO_CHAR(SYSDATE, 'YYYYMMDD') || '${nfd.nNF.replace(/\D/g, '')}');\n`;
  sql += `BEGIN\n\n`;

  sql += `  -- 1. CABEÇALHO DA NOTA FISCAL DE ENTRADA (TI_NOTA_FISCAL_ENTRADA)\n`;
  sql += `  INSERT INTO TI_NOTA_FISCAL_ENTRADA (\n`;
  sql += `    COD_FILIAL_ORIGEM,\n`;
  sql += `    COD_UNIDADE_NEGOCIO_ORIGEM,\n`;
  sql += `    NUM_SEQUENCIAL_ENTRADA_ORIGEM,\n`;
  sql += `    COD_SISTEMA_ORIGEM,\n`;
  sql += `    COD_EMPRESA_ORIGEM,\n`;
  sql += `    COD_SERIE,\n`;
  sql += `    COD_NOTA_FISCAL,\n`;
  sql += `    COD_FATURA,\n`;
  sql += `    COD_SIST_SOLIC_OPER_REGISTRO,\n`;
  sql += `    COD_OPERACAO_REGISTRO,\n`;
  sql += `    COD_STATUS_REGISTRO,\n`;
  sql += `    COD_CLIENTE_ORIGEM,\n`;
  sql += `    COD_TIPO_ENTRADA,\n`;
  sql += `    COD_EMITENTE,\n`;
  sql += `    IND_CIF_FOB,\n`;
  sql += `    IND_EMISSAO,\n`;
  sql += `    VAL_TOTAL_NOTA,\n`;
  sql += `    VAL_DESCONTO,\n`;
  sql += `    DAT_EMISSAO,\n`;
  sql += `    DAT_ENTRADA,\n`;
  sql += `    DAT_ENTRADA_EMPRESA,\n`;
  sql += `    COD_CHAVE_ACESSO_NFEL,\n`;
  sql += `    COD_PROTOCOLO_NFEL,\n`;
  sql += `    COD_CLASSIFICACAO_ENTRADA\n`;
  sql += `  ) VALUES (\n`;
  sql += `    '${filial}',\n`;
  sql += `    '${filial}',\n`;
  sql += `    v_seq_entrada,\n`;
  sql += `    '${sistema}',\n`;
  sql += `    '${empresa}',\n`;
  sql += `    '${nfd.serie}',\n`;
  sql += `    '${nfd.nNF}',\n`;
  sql += `    '${nfd.nNF}',\n`;
  sql += `    '${sistema}',\n`;
  sql += `    'I',\n`;
  sql += `    'NP',\n`;
  sql += `    '${cnpjCliente}',\n`;
  sql += `    'D',\n`;
  sql += `    'T',\n`;
  sql += `    '1',\n`;
  sql += `    'N',\n`;
  sql += `    ${vNF},\n`;
  sql += `    ${vDesc},\n`;
  sql += `    TO_DATE('${dEmi}', 'YYYY-MM-DD'),\n`;
  sql += `    TRUNC(SYSDATE),\n`;
  sql += `    TRUNC(SYSDATE),\n`;
  sql += `    '${nfd.chNFe.replace(/\D/g, '')}',\n`;
  sql += `    '${nfd.nProt || 'SEFAZ_AUT'}',\n`;
  sql += `    'NR'\n`;
  sql += `  );\n\n`;

  sql += `  -- 2. ITENS DA NOTA FISCAL DE ENTRADA (TI_ITEM_NOTA_FISCAL_ENTRADA)\n`;
  result.itemComparisons.forEach((c: ItemComparison, idx: number) => {
    const item = c.nfdItem;
    const itemNum = idx + 1;
    const vUn = (c.discountAudit?.isEmbeddedInUnitPrice
      ? item.vUnCom
      : item.vUnCom - (item.vDesc ? item.vDesc / item.qCom : 0)).toFixed(4);
    const vProd = (item.qCom * parseFloat(vUn)).toFixed(2);
    const vDescItem = (item.vDesc || 0).toFixed(2);
    const uCom = normalizeUnit(item.uCom);
    const cfopEntrada = c.expectedClientCfop || item.cfop;
    const lote = item.batches[0]?.nLote || c.nfoItem?.batches[0]?.nLote || '';
    const dVal = item.batches[0]?.dVal || c.nfoItem?.batches[0]?.dVal || '';
    const dFab = item.batches[0]?.dFab || c.nfoItem?.batches[0]?.dFab || '';

    sql += `  -- Item ${itemNum}: ${item.xProd.replace(/'/g, "''")} (Cód: ${item.cProd})\n`;
    sql += `  INSERT INTO TI_ITEM_NOTA_FISCAL_ENTRADA (\n`;
    sql += `    COD_FILIAL_ORIGEM,\n`;
    sql += `    NUM_SEQUENCIAL_ENTRADA_ORIGEM,\n`;
    sql += `    NUM_SEQUENCIAL_ITEM_ENTRADA,\n`;
    sql += `    COD_SIST_SOLIC_OPER_REGISTRO,\n`;
    sql += `    COD_OPERACAO_REGISTRO,\n`;
    sql += `    COD_STATUS_REGISTRO,\n`;
    sql += `    COD_PRODUTO_ORIGEM,\n`;
    sql += `    COD_UNIDADE_MEDIDA_ORIGEM,\n`;
    sql += `    COD_NDO_ORIGEM,\n`;
    sql += `    COD_CFOP,\n`;
    sql += `    COD_DEPOSITO,\n`;
    sql += `    QTD_ITEM,\n`;
    sql += `    QTD_NOTA_FISCAL,\n`;
    sql += `    QTD_RECEBIDA,\n`;
    sql += `    VAL_ITEM,\n`;
    sql += `    VAL_PRECO_UNITARIO_ITEM,\n`;
    sql += `    VAL_DESCONTO_ITEM,\n`;
    sql += `    VAL_OUTRAS_DESPESAS,\n`;
    sql += `    VAL_CONTABIL_ESTOQUE,\n`;
    sql += `    COD_NOTA_FISCAL_SAIDA,\n`;
    sql += `    COD_SERIE_NOTA_FISCAL_SAIDA,\n`;
    sql += `    NUM_ITEM_NOTA_FISCAL_SAIDA,\n`;
    sql += `    COD_LOTE_CONF,\n`;
    sql += `    DAT_VALIDADE_LOTE_CONF,\n`;
    sql += `    IND_RESERVA,\n`;
    sql += `    IND_COMPRA_DIRETA,\n`;
    sql += `    IND_TIPO_DESCONTO,\n`;
    sql += `    COD_CLASSIFICACAO_ITEM\n`;
    sql += `  ) VALUES (\n`;
    sql += `    '${filial}',\n`;
    sql += `    v_seq_entrada,\n`;
    sql += `    ${itemNum},\n`;
    sql += `    '${sistema}',\n`;
    sql += `    'I',\n`;
    sql += `    'NP',\n`;
    sql += `    '${item.cProd}',\n`;
    sql += `    '${uCom}',\n`;
    sql += `    '${ndo}',\n`;
    sql += `    '${cfopEntrada}',\n`;
    sql += `    '${warehouse}',\n`;
    sql += `    ${item.qCom},\n`;
    sql += `    ${item.qCom},\n`;
    sql += `    ${item.qCom},\n`;
    sql += `    ${vProd},\n`;
    sql += `    ${vUn},\n`;
    sql += `    ${vDescItem},\n`;
    sql += `    0,\n`;
    sql += `    ${vProd},\n`;
    sql += `    '${nfo.nNF}',\n`;
    sql += `    '${nfo.serie}',\n`;
    sql += `    ${c.nfoItem ? c.nfoItem.nItem : itemNum},\n`;
    sql += `    ${lote ? `'${lote}'` : 'NULL'},\n`;
    sql += `    ${dVal ? `TO_DATE('${dVal}', 'YYYY-MM-DD')` : 'NULL'},\n`;
    sql += `    'N',\n`;
    sql += `    'N',\n`;
    sql += `    'V',\n`;
    sql += `    'NR'\n`;
    sql += `  );\n\n`;

    if (lote) {
      sql += `  -- 3. RASTREABILIDADE POR LOTE (TI_ITEM_ENTRADA_LOTE) - Item ${itemNum}\n`;
      sql += `  INSERT INTO TI_ITEM_ENTRADA_LOTE (\n`;
      sql += `    COD_FILIAL_ORIGEM,\n`;
      sql += `    COD_ENTRADA_ORIGEM,\n`;
      sql += `    COD_ITEM_ENTRADA_ORIGEM,\n`;
      sql += `    COD_LOTE,\n`;
      sql += `    COD_FABRICANTE,\n`;
      sql += `    DAT_VALIDADE,\n`;
      sql += `    DAT_FABRICACAO,\n`;
      sql += `    QTD_LOTE\n`;
      sql += `  ) VALUES (\n`;
      sql += `    '${filial}',\n`;
      sql += `    v_seq_entrada,\n`;
      sql += `    ${itemNum},\n`;
      sql += `    '${lote}',\n`;
      sql += `    '${empresa}',\n`;
      sql += `    ${dVal ? `TO_DATE('${dVal}', 'YYYY-MM-DD')` : 'SYSDATE + 730'},\n`;
      sql += `    ${dFab ? `TO_DATE('${dFab}', 'YYYY-MM-DD')` : 'NULL'},\n`;
      sql += `    ${item.qCom}\n`;
      sql += `  );\n\n`;
    }
  });

  sql += `  COMMIT;\n`;
  sql += `  DBMS_OUTPUT.PUT_LINE('SUCESSO: Nota ' || '${nfd.nNF}' || ' inserida nas TIs do Pirâmide com status NP.');\n`;
  sql += `EXCEPTION\n`;
  sql += `  WHEN OTHERS THEN\n`;
  sql += `    ROLLBACK;\n`;
  sql += `    DBMS_OUTPUT.PUT_LINE('ERRO AO INTEGRAR NOTA: ' || SQLERRM);\n`;
  sql += `    RAISE;\n`;
  sql += `END;\n/\n`;

  return sql;
}

/**
 * Gera o Script PL/SQL de Limpeza / Delete seguro nas Tabelas de Integração (TI)
 * para remover a nota de teste sem deixar registros órfãos no banco Oracle.
 */
export function generatePiramideOracleTiDeleteScript(result: ReconciliationResult): string {
  const nfd = result.nfd;
  return `-- =========================================================================
-- SCRIPT DE LIMPEZA / DELETE DA NOTA DE TESTE NAS TABELAS DE INTEGRAÇÃO (TI)
-- Nota de Devolução: NF nº ${nfd.nNF} (Série ${nfd.serie})
-- =========================================================================
BEGIN
  -- 1. Deleta os lotes
  DELETE FROM TI_ITEM_ENTRADA_LOTE 
  WHERE COD_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
    FROM TI_NOTA_FISCAL_ENTRADA 
    WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '${nfd.nNF}'
  );

  -- 2. Deleta os itens
  DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
  WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '${nfd.nNF}';

  -- 3. Deleta o cabeçalho
  DELETE FROM TI_NOTA_FISCAL_ENTRADA 
  WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '${nfd.nNF}';

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('LIMPEZA CONCLUÍDA: Registros da nota ${nfd.nNF} excluídos da TI com sucesso.');
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('ERRO NA LIMPEZA: ' || SQLERRM);
    RAISE;
END;
/
`;
}

