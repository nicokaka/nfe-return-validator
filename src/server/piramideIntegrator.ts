import oracledb from 'oracledb';
import { getOraclePool, getOracleConfig } from './oracleDbPool';
import { ReconciliationResult } from '../types/nfe';
import { normalizePiramideNdo, normalizePiramideWarehouse } from '../services/piramideService';

export interface IntegrationResponse {
  success: boolean;
  message: string;
  nNF: string;
  seqEntrada?: number;
  status?: string;
  error?: string;
  details?: {
    headerInserted: boolean;
    itemsCount: number;
    batchesCount: number;
  };
}

export interface ReturnNoteStatusResponse {
  success: boolean;
  nNF: string;
  found: boolean;
  message?: string;
  status?: string;
  statusDescription?: string;
  errorMessage?: string;
  seqEntrada?: number;
  filial?: string;
  valorTotal?: number;
  items?: Array<{
    itemNum: number;
    produto: string;
    ndo: string;
    deposito: string;
    status: string;
    erro?: string;
  }>;
}

function isValidDateYMD(dStr?: string | null): boolean {
  if (!dStr || typeof dStr !== 'string') return false;
  const match = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function normalizeUnit(unit: string): string {
  if (!unit) return 'UN';
  const u = unit.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  if (['UN', 'UND', 'UNID', 'UNIDADE', 'UNI', 'U', 'PC', 'PCA', 'PECA'].includes(u)) return 'UN';
  if (['CX', 'CXA', 'CAIXA', 'BOX'].includes(u)) return 'CX';
  if (['FR', 'FRS', 'FRASCO', 'FRASC'].includes(u)) return 'FR';
  if (['TB', 'TUBO', 'TUB'].includes(u)) return 'TB';
  if (['BL', 'BLIST', 'BLISTER'].includes(u)) return 'BL';
  if (['ENV', 'ENVELOPE', 'SACHE'].includes(u)) return 'ENV';
  if (['AMP', 'AMPL', 'AMPOLA'].includes(u)) return 'AMP';
  return u.substring(0, 3) || 'UN';
}

export async function integrateReturnNoteToPiramide(
  result: ReconciliationResult,
  options?: {
    filialOverride?: string;
    warehouseOverride?: string;
    ndoOverride?: string;
    overrideData?: {
      approver: string;
      justification: string;
    };
  }
): Promise<IntegrationResponse> {
  const config = getOracleConfig();
  const pool = await getOraclePool();
  let connection: any = null;

  const nfd = result.nfd;
  const nfo = result.nfo;
  const companyKey = result.companyProfile?.key;
  const destCnpjClean = (nfd.dest?.cnpj || '').replace(/\D/g, '');
  const emitCnpjClean = (nfd.emit?.cnpj || '').replace(/\D/g, '').slice(0, 14);
  const nfoEmitCnpjClean = (nfo.emit?.cnpj || '').replace(/\D/g, '');

  const isExtrema = companyKey === 'QUESALON_EXTREMA' || destCnpjClean === '04792134000496' || nfoEmitCnpjClean === '04792134000496';
  const isQuesalonMatriz = companyKey === 'QUESALON_PB' || (!isExtrema && (destCnpjClean.startsWith('04792134') || nfoEmitCnpjClean.startsWith('04792134')));
  const isQuedes = companyKey === 'QUEDES' || destCnpjClean.startsWith('10565860') || nfoEmitCnpjClean.startsWith('10565860');
  const isIndustry = companyKey === 'INFAN' || destCnpjClean.startsWith('08939548') || nfoEmitCnpjClean.startsWith('08939548') || (!isExtrema && !isQuesalonMatriz && !isQuedes);

  let defaultFilial = '001';
  if (isIndustry) {
    defaultFilial = '003';
  } else if (isExtrema) {
    defaultFilial = '004';
  } else if (isQuedes) {
    defaultFilial = '005';
  } else {
    defaultFilial = '001';
  }
  
  const rawFilial = (options?.filialOverride || defaultFilial).trim();
  const filialDigits = rawFilial.replace(/\D/g, '');
  const filial = (filialDigits ? filialDigits.slice(0, 3).padStart(3, '0') : defaultFilial);
  const empresa = filial;
  const warehouse = normalizePiramideWarehouse(options?.warehouseOverride);
  const ndo = normalizePiramideNdo(options?.ndoOverride, isIndustry);
  const sistema = (config.sistemaOrigem || 'VAL').slice(0, 3);

  const cleanNumNF = (nfd.nNF || '1').replace(/\D/g, '').slice(0, 9) || '1';
  const cleanSerie = (nfd.serie || '1').replace(/\D/g, '').slice(0, 3) || '1';
  const seqSuffix = cleanNumNF.slice(-6).padStart(6, '0');
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqEntrada = parseInt(`${datePrefix}${seqSuffix}`, 10);

  const vNFTotal = typeof nfd.totals?.vNF === 'number' ? nfd.totals.vNF : parseFloat(String(nfd.totals?.vNF || 0));
  const vNF = isNaN(vNFTotal) ? 0 : parseFloat(vNFTotal.toFixed(2));
  const vDescTotal = typeof nfd.totals?.vDesc === 'number' ? nfd.totals.vDesc : parseFloat(String(nfd.totals?.vDesc || 0));
  const vDesc = isNaN(vDescTotal) ? 0 : parseFloat(vDescTotal.toFixed(2));

  let dEmi = new Date().toISOString().substring(0, 10);
  if (nfd.dhEmi && typeof nfd.dhEmi === 'string') {
    const match = nfd.dhEmi.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match && isValidDateYMD(`${match[1]}-${match[2]}-${match[3]}`)) {
      dEmi = `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const chNFeClean = (nfd.chNFe || '').replace(/\D/g, '').slice(0, 44);
  const nProt = (nfd.nProt || 'SEFAZ_AUT').replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || 'SEFAZ_AUT';

  try {
    connection = await pool.getConnection();

    try {
      await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = PIRAMIDE`);
    } catch {
      // continua caso já esteja no schema PIRAMIDE
    }

    // 1. Limpeza preventiva se a mesma nota já existir na TI como 'NP' ou 'ER' (proteção contra ORA-00001)
    try {
      await connection.execute(
        `DELETE FROM TI_ITEM_ENTRADA_LOTE 
         WHERE COD_ENTRADA_ORIGEM = :seqEntrada 
            OR COD_ENTRADA_ORIGEM IN (
              SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
              FROM TI_NOTA_FISCAL_ENTRADA 
              WHERE COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :cleanNumNF
            )`,
        { seqEntrada, sistema, cleanNumNF }
      );
      await connection.execute(
        `DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
         WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM = :seqEntrada
            OR NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
              SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
              FROM TI_NOTA_FISCAL_ENTRADA 
              WHERE COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :cleanNumNF
            )`,
        { seqEntrada, sistema, cleanNumNF }
      );
      await connection.execute(
        `DELETE FROM TI_NOTA_FISCAL_ENTRADA 
         WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM = :seqEntrada
            OR (COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :cleanNumNF)`,
        { seqEntrada, sistema, cleanNumNF }
      );
    } catch {
      // ignore deletion errors
    }

    // 2. Inserção do Cabeçalho (TI_NOTA_FISCAL_ENTRADA)
    const headerSql = `
      INSERT INTO TI_NOTA_FISCAL_ENTRADA (
        COD_FILIAL_ORIGEM,
        COD_UNIDADE_NEGOCIO_ORIGEM,
        NUM_SEQUENCIAL_ENTRADA_ORIGEM,
        COD_SISTEMA_ORIGEM,
        COD_EMPRESA_ORIGEM,
        COD_SERIE,
        COD_NOTA_FISCAL,
        COD_FATURA,
        COD_SIST_SOLIC_OPER_REGISTRO,
        COD_OPERACAO_REGISTRO,
        COD_STATUS_REGISTRO,
        COD_CLIENTE_ORIGEM,
        COD_TIPO_ENTRADA,
        COD_EMITENTE,
        IND_CIF_FOB,
        IND_EMISSAO,
        VAL_TOTAL_NOTA,
        VAL_DESCONTO,
        DAT_EMISSAO,
        DAT_ENTRADA,
        DAT_ENTRADA_EMPRESA,
        COD_CHAVE_ACESSO_NFEL,
        COD_PROTOCOLO_NFEL,
        COD_CLASSIFICACAO_ENTRADA
      ) VALUES (
        :filial,
        :unidadeNegocio,
        :seqEntrada,
        :sistema,
        :empresa,
        :serie,
        :notaFiscal,
        :fatura,
        :sistema,
        'I',
        'NP',
        :clienteCnpj,
        'D',
        'T',
        '1',
        'N',
        :valTotal,
        :valDesconto,
        TO_DATE(:dEmi, 'YYYY-MM-DD'),
        TRUNC(SYSDATE),
        TRUNC(SYSDATE),
        :chaveAcesso,
        :protocolo,
        'NR'
      )
    `;

    await connection.execute(headerSql, {
      filial,
      unidadeNegocio: filial,
      seqEntrada,
      sistema,
      empresa,
      serie: cleanSerie,
      notaFiscal: cleanNumNF,
      fatura: cleanNumNF,
      clienteCnpj: emitCnpjClean,
      valTotal: vNF,
      valDesconto: vDesc,
      dEmi,
      chaveAcesso: chNFeClean,
      protocolo: nProt,
    });

    // 3. Inserção dos Itens e Lotes
    let itemsCount = 0;
    let batchesCount = 0;

    for (let idx = 0; idx < result.itemComparisons.length; idx++) {
      const c = result.itemComparisons[idx];
      const item = c.nfdItem;
      const itemNum = idx + 1;

      const vUnNum = c.discountAudit?.isEmbeddedInUnitPrice
        ? item.vUnCom
        : item.vUnCom - (item.vDesc ? item.vDesc / item.qCom : 0);
      const vProdNum = item.qCom * vUnNum;
      const vDescItemNum = item.vDesc || 0;
      const uCom = normalizeUnit(item.uCom);
      const rawCfop = result.ndoSuggestion?.cfop || c.expectedClientCfop || item.cfop || '2202';
      const cfopEntrada = rawCfop.replace(/\D/g, '').slice(0, 4) || '2202';

      const lote = item.batches && item.batches[0]?.nLote ? item.batches[0].nLote : (c.nfoItem?.batches && c.nfoItem.batches[0]?.nLote ? c.nfoItem.batches[0].nLote : null);
      const cleanLote = lote ? String(lote).trim().slice(0, 20) : null;

      const dValRaw = item.batches && item.batches[0]?.dVal ? item.batches[0].dVal : (c.nfoItem?.batches && c.nfoItem.batches[0]?.dVal ? c.nfoItem.batches[0].dVal : null);
      let cleanDVal: string | null = null;
      if (dValRaw) {
        const match = String(dValRaw).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match && isValidDateYMD(`${match[1]}-${match[2]}-${match[3]}`)) {
          cleanDVal = `${match[1]}-${match[2]}-${match[3]}`;
        }
      }

      const cleanCProd = String(item.cProd || '').trim().slice(0, 20);
      const cleanNfoNum = (nfo.nNF || '1').replace(/\D/g, '').slice(0, 9);
      const cleanNfoSerie = (nfo.serie || '1').replace(/\D/g, '').slice(0, 3) || '1';
      const nfoItemNum = typeof (c.nfoItem ? c.nfoItem.nItem : itemNum) === 'number' ? (c.nfoItem ? c.nfoItem.nItem : itemNum) : itemNum;

      const vProd = isNaN(vProdNum) ? 0 : parseFloat(vProdNum.toFixed(2));
      const vUn = isNaN(vUnNum) ? 0 : parseFloat(vUnNum.toFixed(4));
      const vDescItem = isNaN(vDescItemNum) ? 0 : parseFloat(vDescItemNum.toFixed(2));
      const qCom = typeof item.qCom === 'number' && !isNaN(item.qCom) ? item.qCom : parseFloat(String(item.qCom || 1));

      const itemSql = `
        INSERT INTO TI_ITEM_NOTA_FISCAL_ENTRADA (
          COD_FILIAL_ORIGEM,
          NUM_SEQUENCIAL_ENTRADA_ORIGEM,
          NUM_SEQUENCIAL_ITEM_ENTRADA,
          COD_SIST_SOLIC_OPER_REGISTRO,
          COD_OPERACAO_REGISTRO,
          COD_STATUS_REGISTRO,
          COD_PRODUTO_ORIGEM,
          COD_UNIDADE_MEDIDA_ORIGEM,
          COD_NDO_ORIGEM,
          COD_CFOP,
          COD_DEPOSITO,
          QTD_ITEM,
          QTD_NOTA_FISCAL,
          QTD_RECEBIDA,
          VAL_ITEM,
          VAL_PRECO_UNITARIO_ITEM,
          VAL_DESCONTO_ITEM,
          VAL_OUTRAS_DESPESAS,
          VAL_CONTABIL_ESTOQUE,
          COD_NOTA_FISCAL_SAIDA,
          COD_SERIE_NOTA_FISCAL_SAIDA,
          NUM_ITEM_NOTA_FISCAL_SAIDA,
          COD_LOTE_CONF,
          DAT_VALIDADE_LOTE_CONF,
          IND_RESERVA,
          IND_COMPRA_DIRETA,
          IND_TIPO_DESCONTO,
          COD_CLASSIFICACAO_ITEM
        ) VALUES (
          :filial,
          :seqEntrada,
          :itemNum,
          :sistema,
          'I',
          'NP',
          :cProd,
          :uCom,
          :ndo,
          :cfop,
          :deposito,
          :qCom,
          :qCom,
          :qCom,
          :vProd,
          :vUn,
          :vDescItem,
          0,
          :vProd,
          :nfoNum,
          :nfoSerie,
          :nfoItemNum,
          :lote,
          ${cleanDVal ? `TO_DATE(:dVal, 'YYYY-MM-DD')` : 'NULL'},
          'N',
          'N',
          'V',
          'NR'
        )
      `;

      const itemBinds: any = {
        filial,
        seqEntrada,
        itemNum,
        sistema,
        cProd: cleanCProd,
        uCom,
        ndo,
        cfop: cfopEntrada,
        deposito: warehouse,
        qCom,
        vProd,
        vUn,
        vDescItem,
        nfoNum: cleanNfoNum,
        nfoSerie: cleanNfoSerie,
        nfoItemNum,
        lote: cleanLote,
      };

      if (cleanDVal) {
        itemBinds.dVal = cleanDVal;
      }

      await connection.execute(itemSql, itemBinds);
      itemsCount++;

      // Inserção da Rastreabilidade de Lote
      if (cleanLote && cleanDVal) {
        const batchSql = `
          INSERT INTO TI_ITEM_ENTRADA_LOTE (
            COD_FILIAL_ORIGEM,
            COD_ENTRADA_ORIGEM,
            COD_ITEM_ENTRADA_ORIGEM,
            COD_LOTE,
            COD_FABRICANTE,
            DAT_VALIDADE,
            QTD_LOTE
          ) VALUES (
            :filial,
            :seqEntrada,
            :itemNum,
            :lote,
            :filial,
            TO_DATE(:dVal, 'YYYY-MM-DD'),
            :qCom
          )
        `;

        await connection.execute(batchSql, {
          filial,
          seqEntrada,
          itemNum,
          lote: cleanLote,
          dVal: cleanDVal,
          qCom,
        });
        batchesCount++;
      }
    }

    // 4. Commit da transação completa
    await connection.commit();

    return {
      success: true,
      message: `Nota de devolução ${nfd.nNF} gravada com sucesso nas tabelas de integração do Pirâmide com status NP!`,
      nNF: nfd.nNF,
      seqEntrada,
      status: 'NP',
      details: {
        headerInserted: true,
        itemsCount,
        batchesCount,
      },
    };
  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback error
      }
    }
    return {
      success: false,
      message: `Falha ao gravar nota no Pirâmide: ${err.message}`,
      nNF: nfd.nNF,
      error: err.message,
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {
        // ignore close error
      }
    }
  }
}

export async function getReturnNoteStatusFromPiramide(notaFiscal: string): Promise<ReturnNoteStatusResponse> {
  const config = getOracleConfig();
  const pool = await getOraclePool();
  let connection: any = null;

  try {
    connection = await pool.getConnection();

    try {
      await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = PIRAMIDE`);
    } catch {
      // continua caso já esteja no schema PIRAMIDE
    }

    const cleanNNF = (notaFiscal || '').replace(/\D/g, '') || notaFiscal;

    const sql = `
      SELECT 
        COD_FILIAL_ORIGEM,
        COD_SISTEMA_ORIGEM,
        COD_NOTA_FISCAL,
        COD_STATUS_REGISTRO,
        DSC_ERRO_REGISTRO,
        NUM_SEQUENCIAL_ENTRADA_ORIGEM,
        VAL_TOTAL_NOTA
      FROM TI_NOTA_FISCAL_ENTRADA
      WHERE COD_SISTEMA_ORIGEM = :sistema
        AND (COD_NOTA_FISCAL = :notaFiscal OR COD_NOTA_FISCAL = :cleanNNF)
      ORDER BY NUM_SEQUENCIAL_ENTRADA_ORIGEM DESC
    `;

    const result = await connection.execute(
      sql,
      { sistema: config.sistemaOrigem, notaFiscal, cleanNNF },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return {
        success: true,
        nNF: notaFiscal,
        found: false,
        message: `Nota ${notaFiscal} não encontrada nas tabelas de integração do Pirâmide.`,
      };
    }

    const row = result.rows[0];
    const status = row.COD_STATUS_REGISTRO;
    const seqEntrada = row.NUM_SEQUENCIAL_ENTRADA_ORIGEM;
    const errorMessage = row.DSC_ERRO_REGISTRO || undefined;

    let statusDescription = 'Aguardando Processamento pelo ERP (Não Processado)';
    if (status === 'P') {
      statusDescription = 'Processado com Sucesso pelo ERP Pirâmide!';
    } else if (status === 'ER') {
      statusDescription = 'Rejeitado / Erro no ERP Pirâmide';
    }

    // Consulta os itens
    const itemsSql = `
      SELECT 
        NUM_SEQUENCIAL_ITEM_ENTRADA,
        COD_PRODUTO_ORIGEM,
        COD_NDO_ORIGEM,
        COD_DEPOSITO,
        COD_STATUS_REGISTRO,
        DSC_ERRO_REGISTRO
      FROM TI_ITEM_NOTA_FISCAL_ENTRADA
      WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM = :seqEntrada
      ORDER BY NUM_SEQUENCIAL_ITEM_ENTRADA
    `;

    const itemsResult = await connection.execute(
      itemsSql,
      { seqEntrada },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const items = (itemsResult.rows || []).map((r: any) => ({
      itemNum: r.NUM_SEQUENCIAL_ITEM_ENTRADA,
      produto: r.COD_PRODUTO_ORIGEM,
      ndo: r.COD_NDO_ORIGEM,
      deposito: r.COD_DEPOSITO,
      status: r.COD_STATUS_REGISTRO,
      erro: r.DSC_ERRO_REGISTRO || undefined,
    }));

    return {
      success: true,
      nNF: notaFiscal,
      found: true,
      status,
      statusDescription,
      errorMessage,
      seqEntrada,
      filial: row.COD_FILIAL_ORIGEM,
      valorTotal: row.VAL_TOTAL_NOTA,
      items,
    };
  } catch (err: any) {
    return {
      success: false,
      nNF: notaFiscal,
      found: false,
      errorMessage: err.message,
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {
        // ignore close error
      }
    }
  }
}

export async function rollbackReturnNoteFromPiramide(notaFiscal: string): Promise<{
  success: boolean;
  message: string;
  nNF: string;
}> {
  const config = getOracleConfig();
  const pool = await getOraclePool();
  let connection: any = null;

  try {
    connection = await pool.getConnection();

    try {
      await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = PIRAMIDE`);
    } catch {
      // continua caso já esteja no schema PIRAMIDE
    }

    const cleanNNF = (notaFiscal || '').replace(/\D/g, '') || notaFiscal;

    await connection.execute(
      `DELETE FROM TI_ITEM_ENTRADA_LOTE 
       WHERE COD_ENTRADA_ORIGEM IN (
         SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
         FROM TI_NOTA_FISCAL_ENTRADA 
         WHERE COD_SISTEMA_ORIGEM = :sistema 
           AND (COD_NOTA_FISCAL = :notaFiscal OR COD_NOTA_FISCAL = :cleanNNF)
       )`,
      { sistema: config.sistemaOrigem, notaFiscal, cleanNNF }
    );

    await connection.execute(
      `DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
       WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
         SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
         FROM TI_NOTA_FISCAL_ENTRADA 
         WHERE COD_SISTEMA_ORIGEM = :sistema 
           AND (COD_NOTA_FISCAL = :notaFiscal OR COD_NOTA_FISCAL = :cleanNNF)
       )`,
      { sistema: config.sistemaOrigem, notaFiscal, cleanNNF }
    );

    await connection.execute(
      `DELETE FROM TI_NOTA_FISCAL_ENTRADA 
       WHERE COD_SISTEMA_ORIGEM = :sistema 
         AND (COD_NOTA_FISCAL = :notaFiscal OR COD_NOTA_FISCAL = :cleanNNF)`,
      { sistema: config.sistemaOrigem, notaFiscal, cleanNNF }
    );

    await connection.commit();

    return {
      success: true,
      message: `Nota ${notaFiscal} excluída com sucesso das tabelas de integração do Pirâmide. Banco limpo!`,
      nNF: notaFiscal,
    };
  } catch (err: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback error
      }
    }
    return {
      success: false,
      message: `Erro ao excluir nota: ${err.message}`,
      nNF: notaFiscal,
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {
        // ignore close error
      }
    }
  }
}
