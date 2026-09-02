import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { useClipboard } from '../hooks/useClipboard';
import { 
  Copy, Check, Sparkles, Building2, PackageCheck, AlertTriangle, Layers, Tag, 
  ShieldCheck, ChevronDown, Database, Trash2, Send, Loader2, Server, RefreshCw,
  Lock, ShieldAlert 
} from './Icons';
import { PIRAMIDE_MOTIVOS, PIRAMIDE_WAREHOUSES } from '../data/piramideData';
import { formatFiscalDate, formatCNPJ } from '../utils/dateUtils';
import { generatePiramideOracleTiInsertScript, generatePiramideOracleTiDeleteScript } from '../services/piramideService';
import { 
  sendReturnNoteToPiramide, fetchReturnNoteStatus, rollbackTestNote, testOracleConnection,
  DirectIntegrationResult, ReturnNoteStatusResult, OracleConnectionStatus 
} from '../services/piramideApiClient';
import { FiscalOverrideModal } from './FiscalOverrideModal';

interface DataBridgeCopilotProps {
  result: ReconciliationResult;
}

export const DataBridgeCopilot: React.FC<DataBridgeCopilotProps> = ({ result }) => {
  const { nfd, nfo, itemComparisons, ndoSuggestion, piramideResolution: initialPiramideResolution } = result;
  const { copiedKey, copyToClipboard } = useClipboard(2000);

  // Retractable Assistant state (collapsed by default to keep UI clean and compact)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Selected Motivo / Almoxarifado state (allows user override)
  const [selectedMotivoCode, setSelectedMotivoCode] = useState<string>(
    initialPiramideResolution?.motivoCode || '01'
  );
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    initialPiramideResolution?.isAutomatic ? initialPiramideResolution.almoxarifado : 'ALMOX'
  );

  // Modo Operacional: 'auto' (Cockpit 1-clique) vs 'manual' (Cópia campo a campo)
  const [launchMode, setLaunchMode] = useState<'auto' | 'manual'>('auto');
  const [showPlSqlScripts, setShowPlSqlScripts] = useState<boolean>(false);

  // Direct Oracle Integration states
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isCheckingLiveStatus, setIsCheckingLiveStatus] = useState<boolean>(false);
  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  
  const [integrationResult, setIntegrationResult] = useState<DirectIntegrationResult | null>(null);
  const [liveStatus, setLiveStatus] = useState<ReturnNoteStatusResult | null>(null);
  const [oracleHealth, setOracleHealth] = useState<OracleConnectionStatus | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Fiscal Safety Circuit Breaker: Verifica inconsistências críticas impeditivas
  const criticalIssues = [
    ...result.headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
    ...result.itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
  ];
  const isFiscalCompliant = criticalIssues.length === 0;

  const cnpjClean = (nfd.emit?.cnpj || '').replace(/\D/g, '');
  const isQuesalon = cnpjClean.startsWith('04443354') || (nfd.dest?.cnpj || '').replace(/\D/g, '').startsWith('04443354');

  const currentMotivo = PIRAMIDE_MOTIVOS.find(m => m.code === selectedMotivoCode);

  const handleMotivoChange = (code: string) => {
    setSelectedMotivoCode(code);
    const m = PIRAMIDE_MOTIVOS.find(item => item.code === code);
    if (m && m.isAutomatic) {
      setSelectedWarehouse(m.almoxarifado);
    }
  };

  // Actions for direct launch to Oracle Pirâmide with pre-flight check and override support
  const handleDirectLaunch = async (overrideData?: { approver: string; justification: string }) => {
    if (!isFiscalCompliant && !overrideData) {
      setActionFeedback({
        type: 'error',
        message: `⛔ Lançamento bloqueado: Esta nota possui ${criticalIssues.length} divergência(s) fiscal(is) crítica(s). Utilize a "Liberação com Ressalva Fiscal" caso autorizada pela supervisão.`,
      });
      return;
    }

    setIsLaunching(true);
    setActionFeedback(null);
    try {
      const res = await sendReturnNoteToPiramide(result, {
        warehouseOverride: selectedWarehouse,
        ndoOverride: ndoSuggestion?.ndoCode,
        overrideData,
      });
      setIntegrationResult(res);
      if (res.success) {
        setShowOverrideModal(false);
        setActionFeedback({
          type: 'success',
          message: overrideData
            ? `✅ Nota ${nfd.nNF} gravada com RESSALVA FISCAL (Autorizada por: ${overrideData.approver}) nas tabelas de integração do Pirâmide!`
            : `✅ Nota ${nfd.nNF} gravada com sucesso nas tabelas de integração do Pirâmide! Status: NP.`,
        });
        // Consulta o status inicial após 1 segundo
        setTimeout(() => handleCheckLiveStatus(), 1000);
      } else {
        setActionFeedback({
          type: 'error',
          message: `❌ ${res.message || res.error}`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Falha na integração direta: ${err.message}`,
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleCheckLiveStatus = async () => {
    setIsCheckingLiveStatus(true);
    try {
      const res = await fetchReturnNoteStatus(nfd.nNF);
      setLiveStatus(res);
      if (res.found) {
        if (res.status === 'P') {
          setActionFeedback({
            type: 'success',
            message: `🎉 Parabéns! A nota ${nfd.nNF} foi PROCESSADA com sucesso pelo Job do ERP Pirâmide!`,
          });
        } else if (res.status === 'ER') {
          setActionFeedback({
            type: 'error',
            message: `⚠️ ERP Pirâmide rejeitou o registro: ${res.errorMessage || 'Verifique as regras cadastrais no Pirâmide'}`,
          });
        } else {
          setActionFeedback({
            type: 'info',
            message: `⏳ Nota ${nfd.nNF} está na fila de processamento (Status: NP). O Job do Pirâmide roda a cada ~60s.`,
          });
        }
      } else {
        setActionFeedback({
          type: 'info',
          message: `Nota ${nfd.nNF} não consta atualmente nas tabelas de integração TI.`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Erro ao consultar status no Pirâmide: ${err.message}`,
      });
    } finally {
      setIsCheckingLiveStatus(false);
    }
  };

  const handleDirectRollback = async () => {
    if (!window.confirm(`Tem certeza que deseja apagar os registros da nota ${nfd.nNF} das tabelas de integração para limpar o banco?`)) {
      return;
    }
    setIsCleaningUp(true);
    setActionFeedback(null);
    try {
      const res = await rollbackTestNote(nfd.nNF);
      if (res.success) {
        setIntegrationResult(null);
        setLiveStatus(null);
        setActionFeedback({
          type: 'success',
          message: `🧹 ${res.message}`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `Falha na limpeza: ${res.message}`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Erro ao limpar nota: ${err.message}`,
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setActionFeedback(null);
    try {
      const res = await testOracleConnection();
      setOracleHealth(res);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `🟢 ${res.message} (${res.serverVersion || 'Oracle'})`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `🔴 ${res.message}`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Erro no teste de conexão: ${err.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toFixed(2).replace('.', ',');
  };

  const formatDecimal4 = (val: number) => {
    return val.toFixed(4).replace('.', ',');
  };

  // Format all items for 1-click batch copy into ERP Pirâmide
  const generateFormattedItemsBatchText = () => {
    return itemComparisons
      .map(c => {
        const item = c.nfdItem;
        const lote = item.batches.map(b => b.nLote).join('/') || 'S/LOTE';
        const val = item.batches[0]?.dVal ? formatFiscalDate(item.batches[0]?.dVal) : 'N/A';
        const descStr = item.vDesc > 0 ? ` | Desc: R$ ${formatCurrency(item.vDesc)}` : '';
        return `Item ${item.nItem} | Cod: ${item.cProd} | EAN: ${item.cEAN || 'SEM GTIN'} | NCM: ${item.ncm || 'S/NCM'} | Qtd: ${item.qCom} ${item.uCom} | Pr.Unit: R$ ${formatCurrency(item.vUnCom)}${descStr} | Total: R$ ${formatCurrency(item.vProd)} | Lote: ${lote} | Val: ${val} | Almox: ${selectedWarehouse}`;
      })
      .join('\n');
  };

  // Tab-delimited TSV for direct paste into spreadsheet / ERP grid
  const generateTsvItemsBatchText = () => {
    const header = 'Item\tCódigo\tDescrição\tNCM\tEAN\tQtd\tUn\tPreço Unit\tDesconto\tTotal\tLote\tValidade\tAlmoxarifado';
    const rows = itemComparisons.map(c => {
      const item = c.nfdItem;
      const lote = item.batches.map(b => b.nLote).join('/') || '';
      const val = item.batches[0]?.dVal ? formatFiscalDate(item.batches[0]?.dVal) : '';
      return `${item.nItem}\t${item.cProd}\t${item.xProd}\t${item.ncm || ''}\t${item.cEAN}\t${item.qCom}\t${item.uCom}\t${formatCurrency(item.vUnCom)}\t${formatCurrency(item.vDesc)}\t${formatCurrency(item.vProd)}\t${lote}\t${val}\t${selectedWarehouse}`;
    });
    return [header, ...rows].join('\n');
  };

  return (
    <div className={`copilot-section ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* Header Retrátil Interativo */}
      <div 
        className="copilot-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        title={isExpanded ? 'Clique para recolher o assistente' : 'Clique para abrir o assistente de lançamento'}
      >
        <div className="copilot-title-group">
          <div className="copilot-icon-box">
            <Sparkles className="icon" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="copilot-title">Assistente de Lançamento (ERP Pirâmide)</h3>
              <span className={`copilot-status-pill ${isExpanded ? 'active' : 'inactive'}`}>
                {isExpanded ? 'Ativo / Expandido' : 'Recolhido'}
              </span>
            </div>
            <p className="copilot-subtitle">
              Copie campos para o ERP, selecione motivos e almoxarifados.
            </p>
          </div>
        </div>

        <div className="copilot-header-actions">
          <button
            type="button"
            className={`btn-copilot-toggle ${isExpanded ? 'is-rotated' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronDown className="icon-xs chevron-animated" />
            <span>{isExpanded ? 'Recolher Assistente' : 'Abrir Assistente'}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Expansível / Retrátil com Transição Suave Bidirecional (Abrir e Fechar) */}
      <div className={`copilot-accordion-collapse ${isExpanded ? 'is-open' : ''}`}>
        <div className="copilot-accordion-inner">
          <div className="copilot-collapsible-content">
            {/* Seletor de Modo Operacional (Abas Segmentadas: Automático vs Manual) */}
            <div className="mode-segmented-tabs">
              <button
                type="button"
                className={`mode-tab-btn ${launchMode === 'auto' ? 'active auto-mode' : ''}`}
                onClick={() => setLaunchMode('auto')}
              >
                <Send className="icon-xs" />
                <span>🚀 Lançamento Automático (Direto no Oracle)</span>
                <span className="mode-badge-rec">RECOMENDADO</span>
              </button>

              <button
                type="button"
                className={`mode-tab-btn ${launchMode === 'manual' ? 'active manual-mode' : ''}`}
                onClick={() => setLaunchMode('manual')}
              >
                <Copy className="icon-xs" />
                <span>📋 Lançamento Manual (Cópia Campo a Campo)</span>
                <span className="mode-badge-contingency">CONTINGÊNCIA</span>
              </button>
            </div>

            {launchMode === 'auto' ? (
              /* COCKPIT EXECUTIVO DO MODO AUTOMÁTICO */
              <div className="copilot-auto-cockpit">
                {/* 1. Card de Configuração e Direcionamento Logístico & Fiscal */}
                <div className="auto-cockpit-config-card">
                  <div className="cockpit-config-grid">
                    <div className="cockpit-config-item">
                      <span className="cockpit-config-label">Empresa / Filial Hebron</span>
                      <div className="cockpit-config-value font-mono">
                        <Building2 className="icon-xs text-info" />
                        <span>{isQuesalon ? '001 - QUESALON MATRIZ (PB)' : '003 - INFAN QUÍMICA (PB)'}</span>
                      </div>
                    </div>

                    <div className="cockpit-config-item">
                      <span className="cockpit-config-label">Operação / NDO Pirâmide</span>
                      <div className="cockpit-config-value font-mono">
                        <Tag className="icon-xs text-purple" />
                        <span>{ndoSuggestion?.cfop || '2.202'} - {ndoSuggestion?.ndoCode || 'COM032'}</span>
                      </div>
                    </div>

                    <div className="cockpit-config-item">
                      <span className="cockpit-config-label">Almoxarifado de Destino</span>
                      <div className="cockpit-config-select-wrapper">
                        <select
                          value={selectedMotivoCode}
                          onChange={e => handleMotivoChange(e.target.value)}
                          className="field-input text-xs font-weight-600 font-mono w-full"
                        >
                          {PIRAMIDE_MOTIVOS.map(m => (
                            <option key={m.code} value={m.code}>
                              {m.code} - {m.description} ({m.almoxarifado})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Banner de Pre-Flight Checks: Conformidade vs Bloqueio Fiscal */}
                {isFiscalCompliant ? (
                  <div className="copilot-preflight-ok-banner mt-3 p-3 rounded border flex items-center justify-between gap-3" style={{ borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.08)' }}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="icon-sm success flex-shrink-0" />
                      <div>
                        <strong className="text-xs text-success block">Conformidade Fiscal Auditada: Zero Divergências</strong>
                        <span className="text-xs text-muted">Preço unitário, impostos e quantidades validados com a nota original. Liberado para integração direta.</span>
                      </div>
                    </div>
                    <span className="badge badge-success font-mono">100% AUDITADO</span>
                  </div>
                ) : (
                  <div className="copilot-preflight-blocked-card mt-3 p-3 rounded border" style={{ borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.08)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-danger font-mono flex items-center gap-1">
                          <Lock className="icon-xs" /> BLOQUEIO DE GOVERNANÇA FISCAL
                        </span>
                        <span className="text-xs text-danger font-weight-600">
                          {criticalIssues.length} inconsistência(s) crítica(s) impedem o lançamento padrão
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-warning hover:underline font-weight-600 flex items-center gap-1"
                        onClick={() => setShowOverrideModal(true)}
                      >
                        <ShieldAlert className="icon-xs" /> Solicitar Liberação com Ressalva &rarr;
                      </button>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
                      {criticalIssues.slice(0, 3).map((iss, i) => (
                        <div key={i} className="flex items-start gap-1.5 font-mono text-xs text-danger">
                          <span className="font-weight-700">•</span>
                          <span><strong>{iss.title}:</strong> {iss.description}</span>
                        </div>
                      ))}
                      {criticalIssues.length > 3 && (
                        <span className="text-muted text-xs italic">+ {criticalIssues.length - 3} outra(s) divergência(s)...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Hero Action Bar */}
                <div className="auto-cockpit-hero-bar mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      title="Testa a conectividade com o banco Oracle no host configurado"
                    >
                      {isTestingConnection ? <Loader2 className="icon-xs animate-spin" /> : <Server className="icon-xs" />}
                      {isTestingConnection ? 'Testando Conexão...' : 'Testar Conexão Oracle'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={handleCheckLiveStatus}
                      disabled={isCheckingLiveStatus}
                      title="Consulta em tempo real o status de processamento da nota no ERP Pirâmide"
                    >
                      {isCheckingLiveStatus ? <Loader2 className="icon-xs animate-spin" /> : <RefreshCw className="icon-xs" />}
                      {isCheckingLiveStatus ? 'Consultando...' : 'Consultar Status ERP'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFiscalCompliant ? (
                      <button
                        type="button"
                        className="btn btn-accent btn-launch-piramide"
                        onClick={() => handleDirectLaunch()}
                        disabled={isLaunching}
                        title="Conecta diretamente no Oracle e grava o Cabeçalho, Itens e Lotes com status NP"
                      >
                        {isLaunching ? <Loader2 className="icon-xs animate-spin" /> : <Send className="icon-xs" />}
                        {isLaunching ? 'Gravando nas TIs...' : '🚀 Lançar no Pirâmide'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs cursor-not-allowed opacity-75"
                          disabled={true}
                          title="Lançamento bloqueado devido a divergências fiscais com a NFO"
                        >
                          <Lock className="icon-xs text-danger" />
                          Lançamento Bloqueado
                        </button>

                        <button
                          type="button"
                          className="btn text-xs font-weight-700 flex items-center gap-1.5 shadow-sm"
                          onClick={() => setShowOverrideModal(true)}
                          disabled={isLaunching}
                          title="Abre o protocolo de governança para liberação fiscal com ressalva contábil"
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            border: '1px solid #fbbf24',
                            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)',
                          }}
                        >
                          <ShieldAlert className="icon-xs" />
                          ⚠️ Liberar com Ressalva Fiscal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Feedback Interativo da Ação */}
                {actionFeedback && (
                  <div className={`copilot-action-alert alert-${actionFeedback.type} mt-3`}>
                    <div className="flex items-center gap-2">
                      {actionFeedback.type === 'success' && <Check className="icon-xs success" />}
                      {actionFeedback.type === 'error' && <AlertTriangle className="icon-xs text-danger" />}
                      {actionFeedback.type === 'info' && <RefreshCw className="icon-xs text-info" />}
                      <span className="text-xs font-weight-600">{actionFeedback.message}</span>
                    </div>
                  </div>
                )}

                {/* 5. Card de Telemetria e Status ao Vivo da TI */}
                {(integrationResult || liveStatus?.found) && (
                  <div className="ti-live-tracker-card mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted font-weight-600">STATUS NO ERP:</span>
                        {(liveStatus?.status === 'NP' || (!liveStatus && integrationResult?.status === 'NP')) && (
                          <span className="badge badge-warning font-mono flex items-center gap-1 animate-pulse">
                            🟡 NP: NA FILA DE PROCESSAMENTO (DBMS_JOB ~60s)
                          </span>
                        )}
                        {liveStatus?.status === 'P' && (
                          <span className="badge badge-success font-mono flex items-center gap-1">
                            🟢 P: PROCESSADO COM SUCESSO NO PIRÂMIDE!
                          </span>
                        )}
                        {liveStatus?.status === 'ER' && (
                          <span className="badge badge-danger font-mono flex items-center gap-1">
                            🔴 ER: REJEITADO PELO ERP PIRÂMIDE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-text-action text-xs text-danger flex items-center gap-1"
                          onClick={handleDirectRollback}
                          disabled={isCleaningUp}
                          title="Remove todos os registros desta nota de teste das tabelas TI"
                        >
                          {isCleaningUp ? <Loader2 className="icon-xs animate-spin" /> : <Trash2 className="icon-xs" />}
                          {isCleaningUp ? 'Limpando...' : 'Excluir Nota de Teste (Rollback)'}
                        </button>
                      </div>
                    </div>

                    <div className="ti-live-details-grid mt-2">
                      <div>
                        <span className="text-muted text-xs block">Nº Sequencial Entrada:</span>
                        <strong className="font-mono text-xs">{liveStatus?.seqEntrada || integrationResult?.seqEntrada || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted text-xs block">Nota Fiscal / Série:</span>
                        <strong className="font-mono text-xs">NF {nfd.nNF} (Série {nfd.serie})</strong>
                      </div>
                      <div>
                        <span className="text-muted text-xs block">Filial / Sistema:</span>
                        <strong className="font-mono text-xs">{liveStatus?.filial || '001'} / 'VAL'</strong>
                      </div>
                      <div>
                        <span className="text-muted text-xs block">Almoxarifado / NDO:</span>
                        <strong className="font-mono text-xs">{selectedWarehouse} / {ndoSuggestion?.ndoCode || 'COM032'}</strong>
                      </div>
                    </div>

                    {liveStatus?.errorMessage && (
                      <div className="mt-2 p-2 rounded bg-danger-subtle text-danger text-xs font-mono">
                        <strong>CRÍTICA DO ERP:</strong> {liveStatus.errorMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Rodapé Minimalista com Scripts PL/SQL Retráteis */}
                <div className="auto-cockpit-footer mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted">
                    <div className="ti-status-tags flex items-center gap-2 flex-wrap">
                      <span className="badge badge-info font-mono">SISTEMA: 'VAL'</span>
                      <span className="badge badge-purple font-mono">ALMOXARIFADO: {selectedWarehouse}</span>
                      {oracleHealth && (
                        <span className={`badge ${oracleHealth.success ? 'badge-success' : 'badge-danger'} font-mono text-xs`}>
                          {oracleHealth.success ? `ORACLE: ${oracleHealth.serverVersion || 'ONLINE'}` : 'ORACLE OFFLINE'}
                        </span>
                      )}
                      <span>Servidor: <strong>.61 (Homologação TESTE)</strong> • Standby: <strong>.60 (Produção)</strong></span>
                    </div>

                    <button
                      type="button"
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-weight-600"
                      onClick={() => setShowPlSqlScripts(!showPlSqlScripts)}
                    >
                      <Database className="icon-xs" />
                      {showPlSqlScripts ? 'Ocultar Scripts PL/SQL ▴' : 'Exibir Scripts PL/SQL para DBA ▾'}
                    </button>
                  </div>

                  {showPlSqlScripts && (
                    <div className="mt-3 p-3 rounded bg-surface border flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
                      <div className="text-xs text-muted">
                        💡 Scripts transacionais gerados para execução manual no <strong>PL/SQL Developer</strong> caso a rede interna esteja inacessível:
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`btn btn-secondary text-xs ${copiedKey === 'tiScript' ? 'btn-success' : ''}`}
                          onClick={() => copyToClipboard(generatePiramideOracleTiInsertScript(result, { selectedWarehouse }), 'tiScript')}
                        >
                          {copiedKey === 'tiScript' ? <Check className="icon-xs" /> : <Database className="icon-xs" />}
                          {copiedKey === 'tiScript' ? 'Script Copiado!' : 'Copiar Script PL/SQL'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-secondary text-xs ${copiedKey === 'tiRollback' ? 'btn-danger' : ''}`}
                          onClick={() => copyToClipboard(generatePiramideOracleTiDeleteScript(result), 'tiRollback')}
                        >
                          <Trash2 className="icon-xs" />
                          {copiedKey === 'tiRollback' ? 'Limpeza Copiada!' : 'Copiar Limpeza'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* MODO MANUAL (Seções 1, 2, 3 e 4) */
              <div className="copilot-manual-mode">
                {/* Seção 1: Dados Mestres do Cabeçalho Pirâmide */}
                <div className="copilot-block">
        <h4 className="copilot-block-title">
          <Building2 className="icon-xs" /> 1. Dados de Cabeçalho da Nota de Devolução (NFD)
        </h4>

        <div className="copilot-fields-grid">
          {/* Número da Nota */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Número da NF</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={nfd.nNF} className="field-input font-mono font-weight-600" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'nNF' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfd.nNF, 'nNF')}
              >
                {copiedKey === 'nNF' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'nNF' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Série */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Série</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={nfd.serie || '1'} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'serie' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfd.serie || '1', 'serie')}
              >
                {copiedKey === 'serie' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'serie' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Data de Emissão */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Data Emissão (DD/MM/AAAA)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatFiscalDate(nfd.dhEmi)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'dtEmi' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatFiscalDate(nfd.dhEmi), 'dtEmi')}
              >
                {copiedKey === 'dtEmi' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'dtEmi' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Protocolo SEFAZ */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Protocolo SEFAZ</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={nfd.nProt || 'Não informado'} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'protocolo' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfd.nProt || '', 'protocolo')}
              >
                {copiedKey === 'protocolo' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'protocolo' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Chave de Acesso */}
          <div className="copilot-field-card col-span-2">
            <div className="field-meta">
              <span className="field-label">Chave de Acesso (44 dígitos)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={nfd.chNFe} className="field-input font-mono text-sm" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'chave' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfd.chNFe, 'chave')}
              >
                {copiedKey === 'chave' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'chave' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* CNPJ Emitente (Cliente) */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">CNPJ Emitente (Cliente)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCNPJ(nfd.emit.cnpj)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'cnpjEmit' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfd.emit.cnpj, 'cnpjEmit')}
              >
                {copiedKey === 'cnpjEmit' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'cnpjEmit' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* NF de Origem Referenciada */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">NF Origem Referenciada (NFO)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={nfo.nNF} className="field-input font-mono font-weight-600" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'nfoNf' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(nfo.nNF, 'nfoNf')}
              >
                {copiedKey === 'nfoNf' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'nfoNf' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Direcionamento Logístico & NDO do Pirâmide */}
      <div className="copilot-block">
        <h4 className="copilot-block-title">
          <PackageCheck className="icon-xs" /> 2. Direcionamento Logístico & NDO do Pirâmide
        </h4>

        <div className="copilot-fields-grid">
          {/* NDO Sugerida */}
          <div className="copilot-field-card col-span-2">
            <div className="field-meta">
              <span className="field-label">NDO Entrada Pirâmide</span>
            </div>
            <div className="field-input-group">
              <input
                type="text"
                readOnly
                value={`${ndoSuggestion?.cfop || '2.202'} - ${ndoSuggestion?.ndoDescription || 'Devolução Interestadual'}`}
                title={`${ndoSuggestion?.cfop || '2.202'} - ${ndoSuggestion?.ndoDescription || 'Devolução Interestadual'}`}
                className="field-input font-mono font-weight-600"
              />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'ndo' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(ndoSuggestion?.cfop || '2.202', 'ndo')}
              >
                {copiedKey === 'ndo' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'ndo' ? 'Copiado!' : 'Copiar NDO'}
              </button>
            </div>
            {ndoSuggestion?.explanation && (
              <span className="field-hint text-xs text-muted mt-1 block">
                {ndoSuggestion.explanation}
              </span>
            )}
          </div>

          {/* Motivo de Devolução (com Dropdown Interativo) */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Motivo da Devolução (Tabela Pirâmide)</span>
              <Tag className="icon-xs muted" />
            </div>
            <select
              className="field-select font-mono"
              value={selectedMotivoCode}
              onChange={e => handleMotivoChange(e.target.value)}
            >
              {PIRAMIDE_MOTIVOS.map(m => (
                <option key={m.code} value={m.code}>
                  {m.code} - {m.description} ({m.isAutomatic ? `➔ ${m.almoxarifado}` : '⚠️ Avaliação Doca'})
                </option>
              ))}
            </select>
            <span className="field-hint text-xs text-muted mt-1 block">
              Selecione o motivo oficial cadastrado no ERP Pirâmide.
            </span>
          </div>

          {/* Almoxarifado Destino */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Almoxarifado Destino</span>
            </div>
            <div className="field-input-group">
              <select
                className="field-select font-mono font-weight-600"
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
              >
                {PIRAMIDE_WAREHOUSES.map(w => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'almox' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(selectedWarehouse, 'almox')}
              >
                {copiedKey === 'almox' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'almox' ? 'Copiado!' : 'Copiar Almox'}
              </button>
            </div>
          </div>

          {/* Regra & Status de Recebimento */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Status de Destinação Física</span>
              <ShieldCheck className="icon-xs muted" />
            </div>
            <div className="p-2 border rounded" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
              {currentMotivo?.isAutomatic ? (
                <div className="flex items-center gap-2">
                  <span className="warehouse-badge warehouse-auto">
                    <Check className="icon-xs" /> {currentMotivo.almoxarifado}
                  </span>
                  <span className="text-xs text-success">
                    Destino automático para <strong>{currentMotivo.almoxarifado}</strong>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="warehouse-badge warehouse-manual">
                    <AlertTriangle className="icon-xs" /> Avaliação Doca
                  </span>
                  <span className="text-xs text-warning">
                    Inspeção física visual necessária na chegada.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3: Valores, Impostos e Ajustes de Centavos */}
      <div className="copilot-block">
        <h4 className="copilot-block-title">
          <Layers className="icon-xs" /> 3. Valores e Tributos (Ajuste de Centavos do Pirâmide)
        </h4>

        <div className="copilot-fields-grid grid-4-cols">
          {/* Valor dos Produtos */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Valor Produtos (vProd)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vProd)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vProd' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vProd), 'vProd')}
              >
                {copiedKey === 'vProd' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vProd' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Base de Cálculo ICMS */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Base ICMS (vBC)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vBC)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vBC' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vBC), 'vBC')}
              >
                {copiedKey === 'vBC' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vBC' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Valor ICMS */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Valor ICMS (vICMS)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vICMS)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vICMS' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vICMS), 'vICMS')}
              >
                {copiedKey === 'vICMS' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vICMS' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Valor IPI */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Valor IPI (vIPI)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vIPI)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vIPI' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vIPI), 'vIPI')}
              >
                {copiedKey === 'vIPI' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vIPI' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Valor Total da Nota */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Valor Total NF (vNF)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vNF)} className="field-input font-mono font-weight-600" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vNF' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vNF), 'vNF')}
              >
                {copiedKey === 'vNF' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vNF' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Valor Desconto */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Desconto Total (vDesc)</span>
            </div>
            <div className="field-input-group">
              <input type="text" readOnly value={formatCurrency(nfd.totals.vDesc)} className="field-input font-mono" />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'vDesc' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(formatCurrency(nfd.totals.vDesc), 'vDesc')}
              >
                {copiedKey === 'vDesc' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'vDesc' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Quantidade Total de Itens */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Qtd Total Devolvida</span>
            </div>
            <div className="field-input-group">
              <input
                type="text"
                readOnly
                value={result.summary.totalQuantityNfd?.toString() || '0'}
                className="field-input font-mono"
              />
              <button
                type="button"
                className={`btn-copy ${copiedKey === 'totQty' ? 'copied' : ''}`}
                onClick={() => copyToClipboard(result.summary.totalQuantityNfd?.toString() || '0', 'totQty')}
              >
                {copiedKey === 'totQty' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
                {copiedKey === 'totQty' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Status Geral de Quantidade */}
          <div className="copilot-field-card">
            <div className="field-meta">
              <span className="field-label">Tipo de Devolução</span>
            </div>
            <div className="field-input-group">
              <div className="field-input flex items-center justify-between">
                {result.summary.overallReturnType === 'TOTAL' && <span className="text-success font-weight-600">🟢 Devolução 100% Total</span>}
                {result.summary.overallReturnType === 'PARTIAL' && <span className="text-warning font-weight-600">🟡 Devolução Parcial</span>}
                {result.summary.overallReturnType === 'EXCESS' && <span className="text-danger font-weight-600">🔴 Quantidade Excedente!</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 4: Cópia dos Itens Item a Item */}
      <div className="copilot-block">
        <div className="batch-header">
          <div>
            <h4 className="copilot-block-title">
              <Layers className="icon-xs" /> 4. Lançamento Rápido dos Itens no Pirâmide
            </h4>
            <p className="batch-sub">Botões individuais para cada campo dos itens ou cópia tabular em bloco.</p>
          </div>

          <div className="batch-actions-group">
            <button
              type="button"
              className={`btn btn-secondary ${copiedKey === 'tsvItems' ? 'btn-success' : ''}`}
              onClick={() => copyToClipboard(generateTsvItemsBatchText(), 'tsvItems')}
              title="Copia formato compatível com colunas do Excel / ERP"
            >
              {copiedKey === 'tsvItems' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
              {copiedKey === 'tsvItems' ? 'Tabela Copiada (TSV)!' : 'Copiar Tabela (Excel/Pirâmide)'}
            </button>

            <button
              type="button"
              className={`btn btn-primary ${copiedKey === 'batchItems' ? 'btn-success' : ''}`}
              onClick={() => copyToClipboard(generateFormattedItemsBatchText(), 'batchItems')}
            >
              {copiedKey === 'batchItems' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
              {copiedKey === 'batchItems' ? 'Bloco Estruturado Copiado!' : 'Copiar Resumo dos Itens'}
            </button>
          </div>
        </div>

        <div className="items-quick-copy-table-wrap">
          <table className="items-quick-copy-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cód. Produto</th>
                <th>Descrição</th>
                <th>NCM</th>
                <th>Qtd</th>
                <th>Pr. Unit</th>
                <th>Desconto</th>
                <th>Lote</th>
                <th>Validade</th>
                <th>Almox</th>
              </tr>
            </thead>
            <tbody>
              {itemComparisons.map((c, i) => {
                const item = c.nfdItem;
                const lote = item.batches[0]?.nLote || '';
                const val = item.batches[0]?.dVal ? formatFiscalDate(item.batches[0]?.dVal) : '';

                return (
                  <tr key={i}>
                    <td className="font-mono text-center">{item.nItem}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-text-copy"
                        onClick={() => copyToClipboard(item.cProd, `cProd_${i}`)}
                        title="Clique para copiar o código do produto"
                      >
                        <span className="font-mono">{item.cProd}</span>
                        {copiedKey === `cProd_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                      </button>
                    </td>
                    <td className="text-sm max-w-xs truncate" title={item.xProd}>
                      {item.xProd}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-text-copy"
                        onClick={() => copyToClipboard(item.ncm || '', `ncm_${i}`)}
                        title="Clique para copiar o NCM"
                      >
                        <span className="font-mono text-xs">{item.ncm || 'S/NCM'}</span>
                        {copiedKey === `ncm_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-text-copy"
                        onClick={() => copyToClipboard(item.qCom.toString(), `qCom_${i}`)}
                        title="Clique para copiar a quantidade"
                      >
                        <span className="font-mono font-weight-600">{item.qCom}</span>
                        {copiedKey === `qCom_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-text-copy"
                        onClick={() => copyToClipboard(formatDecimal4(item.vUnCom), `vUn_${i}`)}
                        title="Clique para copiar o preço unitário"
                      >
                        <span className="font-mono">{formatCurrency(item.vUnCom)}</span>
                        {copiedKey === `vUn_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-text-copy"
                        onClick={() => copyToClipboard(formatCurrency(item.vDesc), `vDesc_${i}`)}
                        title="Clique para copiar o valor do desconto"
                      >
                        <span className="font-mono">{formatCurrency(item.vDesc)}</span>
                        {copiedKey === `vDesc_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                      </button>
                    </td>
                    <td>
                      {lote ? (
                        <button
                          type="button"
                          className="btn-text-copy"
                          onClick={() => copyToClipboard(lote, `lote_${i}`)}
                          title="Clique para copiar o lote"
                        >
                          <span className="font-mono batch-pill batch-ok">{lote}</span>
                          {copiedKey === `lote_${i}` ? <Check className="icon-xs success" /> : <Copy className="icon-xs" />}
                        </button>
                      ) : (
                        <span className="text-muted text-xs">S/LOTE</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">{val || 'N/A'}</td>
                    <td>
                      <span className="warehouse-badge warehouse-auto text-xs">{selectedWarehouse}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
          </div>
        </div>
      </div>

      {/* Modal de Governança e Liberação Fiscal com Ressalva */}
      {showOverrideModal && (
        <FiscalOverrideModal
          result={result}
          criticalIssues={criticalIssues}
          isLaunching={isLaunching}
          onConfirm={overrideData => handleDirectLaunch(overrideData)}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  );
};
