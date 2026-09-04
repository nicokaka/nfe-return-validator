import oracledb from 'oracledb';
import { getOraclePool, getOracleConfig } from './oracleDbPool';
import { ReconciliationResult } from '../types/nfe';

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

function normalizeUnit(unit: string): string {
  if (!unit) return 'UN';
  const u = unit.toUpperCase().trim();
  if (u === 'UNID' || u === 'UNIDADE' || u === 'UND') return 'UN';
  if (u === 'FR' || u === 'FRASCO') return 'FR';
  if (u === 'CX' || u === 'CAIXA') return 'CX';
  return u.substring(0, 6);
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
  const cnpjClean = nfd.emit.cnpj.replace(/\D/g, '');
  const isQuesalon = cnpjClean.startsWith('04443354') || nfd.dest.cnpj.replace(/\D/g, '').startsWith('04443354');
  
  const filial = options?.filialOverride || (isQuesalon ? '001' : '003');
  const empresa = filial;
  const warehouse = options?.warehouseOverride || 'GQ';
  const ndo = options?.ndoOverride || (isQuesalon ? 'COM032' : 'COM206');
  const sistema = config.sistemaOrigem;

  const cleanNumNF = nfd.nNF.replace(/\D/g, '');
  const seqSuffix = cleanNumNF.slice(-6).padStart(6, '0');
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqEntrada = parseInt(`${datePrefix}${seqSuffix}`, 10);

  const vNF = nfd.totals.vNF;
  const vDesc = nfd.totals.vDesc || 0;
  const dEmi = nfd.dhEmi ? nfd.dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const chNFeClean = nfd.chNFe.replace(/\D/g, '');
  const nProt = nfd.nProt || 'SEFAZ_AUT';

  try {
    connection = await pool.getConnection();

    try {
      await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = PIRAMIDE`);
    } catch {
      // continua caso já esteja no schema PIRAMIDE
    }

    // 1. Limpeza preventiva se a mesma nota já existir na TI como 'NP' ou 'ER'
    try {
      await connection.execute(
        `DELETE FROM TI_ITEM_ENTRADA_LOTE WHERE COD_ENTRADA_ORIGEM = :seqEntrada`,
        { seqEntrada }
      );
      await connection.execute(
        `DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM = :seqEntrada`,
        { seqEntrada }
      );
      await connection.execute(
        `DELETE FROM TI_NOTA_FISCAL_ENTRADA WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM = :seqEntrada`,
        { seqEntrada }
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
      serie: nfd.serie,
      notaFiscal: nfd.nNF,
      fatura: nfd.nNF,
      clienteCnpj: cnpjClean,
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
      const cfopEntrada = result.ndoSuggestion?.cfop ? result.ndoSuggestion.cfop.replace(/\D/g, '') : (c.expectedClientCfop || item.cfop);

      const lote = item.batches[0]?.nLote || c.nfoItem?.batches[0]?.nLote || null;
      const dValRaw = item.batches[0]?.dVal || c.nfoItem?.batches[0]?.dVal || null;
      const dVal = dValRaw ? dValRaw.substring(0, 10) : null;

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
          ${dVal ? `TO_DATE(:dVal, 'YYYY-MM-DD')` : 'NULL'},
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
        cProd: item.cProd,
        uCom,
        ndo,
        cfop: cfopEntrada,
        deposito: warehouse,
        qCom: item.qCom,
        vProd: parseFloat(vProdNum.toFixed(2)),
        vUn: parseFloat(vUnNum.toFixed(4)),
        vDescItem: parseFloat(vDescItemNum.toFixed(2)),
        nfoNum: nfo.nNF,
        nfoSerie: nfo.serie,
        nfoItemNum: c.nfoItem ? c.nfoItem.nItem : itemNum,
        lote,
      };

      if (dVal) {
        itemBinds.dVal = dVal;
      }

      await connection.execute(itemSql, itemBinds);
      itemsCount++;

      // Inserção da Rastreabilidade de Lote
      if (lote && dVal) {
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
          lote,
          dVal,
          qCom: item.qCom,
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
        AND COD_NOTA_FISCAL = :notaFiscal
      ORDER BY NUM_SEQUENCIAL_ENTRADA_ORIGEM DESC
    `;

    const result = await connection.execute(
      sql,
      { sistema: config.sistemaOrigem, notaFiscal },
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

    await connection.execute(
      `DELETE FROM TI_ITEM_ENTRADA_LOTE 
       WHERE COD_ENTRADA_ORIGEM IN (
         SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
         FROM TI_NOTA_FISCAL_ENTRADA 
         WHERE COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :notaFiscal
       )`,
      { sistema: config.sistemaOrigem, notaFiscal }
    );

    await connection.execute(
      `DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
       WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
         SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
         FROM TI_NOTA_FISCAL_ENTRADA 
         WHERE COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :notaFiscal
       )`,
      { sistema: config.sistemaOrigem, notaFiscal }
    );

    await connection.execute(
      `DELETE FROM TI_NOTA_FISCAL_ENTRADA 
       WHERE COD_SISTEMA_ORIGEM = :sistema AND COD_NOTA_FISCAL = :notaFiscal`,
      { sistema: config.sistemaOrigem, notaFiscal }
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
