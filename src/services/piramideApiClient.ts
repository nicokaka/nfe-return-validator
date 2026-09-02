import { ReconciliationResult } from '../types/nfe';

export interface OracleConnectionStatus {
  success: boolean;
  message: string;
  serverVersion?: string;
  banner?: string;
  error?: string;
}

export interface DirectIntegrationResult {
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

export interface ReturnNoteStatusResult {
  success: boolean;
  nNF: string;
  found: boolean;
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

export interface RollbackResult {
  success: boolean;
  message: string;
  nNF: string;
}

/**
 * Testa a conexão com o banco de dados Oracle do ERP Pirâmide.
 */
export async function testOracleConnection(): Promise<OracleConnectionStatus> {
  try {
    const res = await fetch('/api/piramide/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao comunicar com o conector Oracle: ${err.message}`,
      error: err.message,
    };
  }
}

/**
 * Envia a nota fiscal de devolução auditada diretamente para as Tabelas de Integração (TI) do Pirâmide.
 */
export async function sendReturnNoteToPiramide(
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
): Promise<DirectIntegrationResult> {
  try {
    const res = await fetch('/api/piramide/integrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, options }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na integração direta: ${err.message}`,
      nNF: result.nfd.nNF,
      error: err.message,
    };
  }
}

/**
 * Consulta o status atual da nota fiscal de devolução no ERP Pirâmide (NP, P, ER).
 */
export async function fetchReturnNoteStatus(notaFiscal: string): Promise<ReturnNoteStatusResult> {
  try {
    const cleanNNF = encodeURIComponent(notaFiscal);
    const res = await fetch(`/api/piramide/status/${cleanNNF}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      nNF: notaFiscal,
      found: false,
      errorMessage: err.message,
    };
  }
}

/**
 * Executa a limpeza da nota de teste do banco Oracle.
 */
export async function rollbackTestNote(notaFiscal: string): Promise<RollbackResult> {
  try {
    const cleanNNF = encodeURIComponent(notaFiscal);
    const res = await fetch(`/api/piramide/rollback/${cleanNNF}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao executar limpeza: ${err.message}`,
      nNF: notaFiscal,
    };
  }
}
