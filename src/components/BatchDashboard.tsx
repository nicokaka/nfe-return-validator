import React, { useState } from 'react';
import { BatchReconciliationResult, PairedResult } from '../types/nfe';
import { ExecutiveSummary } from './ExecutiveSummary';
import { DataBridgeCopilot } from './DataBridgeCopilot';
import { ItemsTable } from './ItemsTable';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Link,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileText,
} from './Icons';

interface BatchDashboardProps {
  batchResult: BatchReconciliationResult;
  onGenerateReportForPair: (pair: PairedResult) => void;
  onReset: () => void;
}

export const BatchDashboard: React.FC<BatchDashboardProps> = ({
  batchResult,
  onGenerateReportForPair,
  onReset,
}) => {
  const { pairs, summary } = batchResult;

  const [expandedPairId, setExpandedPairId] = useState<string | null>(
    pairs.length > 0 ? pairs[0].id : null
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'HAS_WARNINGS' | 'REJECTED' | 'UNPAIRED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleExpand = (pairId: string) => {
    setExpandedPairId(prev => (prev === pairId ? null : pairId));
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filter pairs
  const filteredPairs = pairs.filter(pair => {
    const recStatus = pair.reconciliation?.summary.overallStatus;
    const isUnpaired = pair.pairMethod === 'UNPAIRED';

    if (statusFilter === 'APPROVED' && recStatus !== 'APPROVED') return false;
    if (statusFilter === 'HAS_WARNINGS' && recStatus !== 'HAS_WARNINGS') return false;
    if (statusFilter === 'REJECTED' && recStatus !== 'REJECTED') return false;
    if (statusFilter === 'UNPAIRED' && !isUnpaired) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const nfdNum = pair.nfd.nNF.toLowerCase();
      const nfoNums = pair.nfoList.map(n => n.nNF.toLowerCase()).join(' ');
      const emitName = pair.nfd.emit.xNome.toLowerCase();
      const destName = pair.nfd.dest.xNome.toLowerCase();

      return (
        nfdNum.includes(term) ||
        nfoNums.includes(term) ||
        emitName.includes(term) ||
        destName.includes(term)
      );
    }

    return true;
  });

  // Batch CSV Export for all pairs
  const handleExportBatchCsv = () => {
    const csvRows: string[] = [
      'ID Par;Status;Tipo Vinculo;NFD Numero;NFD Chave;NFO(s) Numero;Cliente Emitente;Qtd Itens NFD;Medicamentos (30xx);Vitaminas (2936);Suplementos (2106);Valor Devolvido R$;Desconto NFD R$;Desconto Esperado R$;NDO Entrada;Almoxarifado;Erros Criticos;Alertas;Motivo Devolucao',
    ];

    pairs.forEach(p => {
      const nfd = p.nfd;
      const rec = p.reconciliation;
      const status = rec?.summary.overallStatus || 'SEM_PAR';
      const nfoNums = p.nfoList.map(n => n.nNF).join(' + ') || 'NENHUMA';
      const emitName = nfd.emit.xNome.replace(/"/g, '""');
      const valDev = nfd.totals.vNF.toFixed(2);
      const pharmaSum = rec?.pharmaceuticalSummary;
      const totalMeds = pharmaSum?.totalMedicamentos || 0;
      const totalVits = pharmaSum?.totalVitaminas || 0;
      const totalSupls = pharmaSum?.totalSuplementos || 0;
      const descNfd = (pharmaSum?.totalDescontoNfd || nfd.totals.vDesc || 0).toFixed(2);
      const descEsp = (pharmaSum?.totalDescontoNfoProporcional || 0).toFixed(2);
      const ndo = rec?.ndoSuggestion?.cfop || 'N/A';
      const almox = rec?.piramideResolution?.almoxarifado || 'ALMOX';
      const errCrit = rec?.summary.totalCriticalErrors || 0;
      const errWarn = rec?.summary.totalWarnings || 0;
      const motivo = rec?.summary.motivoDevolucao || nfd.parsedMotivoDevolucao || 'Nao informado';

      csvRows.push(
        `"${p.id}";"${status}";"${p.nfoList.length > 1 ? '1:N' : p.nfoList.length === 1 ? '1:1' : 'SEM_VINCULO'}";"${nfd.nNF}";"${nfd.chNFe}";"${nfoNums}";"${emitName}";${nfd.items.length};${totalMeds};${totalVits};${totalSupls};${valDev};${descNfd};${descEsp};"${ndo}";"${almox}";${errCrit};${errWarn};"${motivo.replace(/"/g, '""')}"`
      );
    });


    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = `Auditoria_Lote_Devolucoes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="batch-dashboard-container">
      {/* Header Banner */}
      <div className="batch-header-banner">
        <div className="batch-header-info">
          <div className="batch-badge">
            <ShieldCheck className="icon-xs" /> Auditoria Fiscal em Lote
          </div>
          <h2 className="batch-title">Painel de Auditoria Fiscal</h2>
          <p className="batch-subtitle">
            {summary.totalFiles} notas processadas em lote • {summary.totalPaired} pares validados automaticamente
          </p>
        </div>

        <div className="batch-header-actions">
          <button type="button" onClick={handleExportBatchCsv} className="btn btn-secondary btn-sm">
            <Download className="icon-xs" /> Exportar CSV do Lote (.CSV)
          </button>
          <button type="button" onClick={onReset} className="btn btn-secondary btn-sm">
            <RefreshCw className="icon-xs" /> Nova Análise em Lote
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="batch-kpi-grid">
        <div className="kpi-card kpi-approved">
          <div className="kpi-icon-box success">
            <CheckCircle2 className="icon" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{summary.totalApproved}</span>
            <span className="kpi-label">Pares Conformes</span>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon-box warning">
            <AlertTriangle className="icon" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{summary.totalWithWarnings}</span>
            <span className="kpi-label">Com Alertas Leves</span>
          </div>
        </div>

        <div className="kpi-card kpi-rejected">
          <div className="kpi-icon-box danger">
            <XCircle className="icon" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{summary.totalRejected}</span>
            <span className="kpi-label">Entradas Bloqueadas</span>
          </div>
        </div>

        <div className="kpi-card kpi-unpaired">
          <div className="kpi-icon-box muted">
            <Link className="icon" />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{summary.totalUnpaired}</span>
            <span className="kpi-label">Sem Vínculo (Órfãs)</span>
          </div>
        </div>

        <div className="kpi-card kpi-total-val">
          <div className="kpi-content full-width">
            <span className="kpi-label">Valor Total Devolvido no Lote</span>
            <span className="kpi-value highlight">{formatCurrency(summary.totalValueNfd)}</span>
          </div>
        </div>
      </div>

      {/* Filter Pills & Search Controls Bar */}
      <div className="batch-controls-bar">
        <div className="batch-filter-pills">
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Todos ({pairs.length})
          </button>
          <button
            type="button"
            className={`pill-btn pill-success ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('APPROVED')}
          >
            ✅ Conformes ({summary.totalApproved})
          </button>
          <button
            type="button"
            className={`pill-btn pill-warning ${statusFilter === 'HAS_WARNINGS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('HAS_WARNINGS')}
          >
            ⚠️ Alertas ({summary.totalWithWarnings})
          </button>
          <button
            type="button"
            className={`pill-btn pill-danger ${statusFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
          >
            ❌ Bloqueados ({summary.totalRejected})
          </button>
          {summary.totalUnpaired > 0 && (
            <button
              type="button"
              className={`pill-btn pill-neutral ${statusFilter === 'UNPAIRED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UNPAIRED')}
            >
              🔗 Sem Vínculo ({summary.totalUnpaired})
            </button>
          )}
        </div>

        <div className="batch-search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por Nº de Nota ou Cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Pairs List */}
      <div className="batch-pairs-list">
        {filteredPairs.length === 0 ? (
          <div className="batch-empty-filter">
            <FileText className="icon muted" />
            <p>Nenhum par encontrado com o filtro/busca selecionado.</p>
          </div>
        ) : (
          filteredPairs.map((pair) => {
            const isExpanded = expandedPairId === pair.id;
            const rec = pair.reconciliation;
            const status = rec?.summary.overallStatus || 'REJECTED';
            const isMultiNfo = pair.nfoList.length > 1;
            const isUnpaired = pair.pairMethod === 'UNPAIRED';

            return (
              <div
                key={pair.id}
                className={`batch-pair-card ${status.toLowerCase()} ${isExpanded ? 'is-expanded' : ''}`}
              >
                {/* Pair Card Summary Row */}
                <div className="pair-card-header" onClick={() => toggleExpand(pair.id)}>
                  <div className="pair-status-indicator">
                    {status === 'APPROVED' && <CheckCircle2 className="icon success" />}
                    {status === 'HAS_WARNINGS' && <AlertTriangle className="icon warning" />}
                    {status === 'REJECTED' && <XCircle className="icon danger" />}
                  </div>

                  <div className="pair-main-info">
                    <div className="pair-title-row">
                      <span className="pair-nfd-badge">
                        NFD nº <strong>{pair.nfd.nNF}</strong>
                      </span>

                      <ArrowRight className="icon-xs muted" />

                      {isUnpaired ? (
                        <span className="pair-nfo-badge unpaired">Nenhuma NFO Vinculada</span>
                      ) : (
                        <span className={`pair-nfo-badge ${isMultiNfo ? 'multi' : ''}`}>
                          {isMultiNfo ? (
                            <>
                              <Layers className="icon-xs" /> {pair.nfoList.length} NFOs (nº {pair.nfoList.map(n => n.nNF).join(', ')})
                            </>
                          ) : (
                            <>NFO nº {pair.nfoList[0]?.nNF}</>
                          )}
                        </span>
                      )}

                      <span className={`method-tag tag-${pair.pairMethod.toLowerCase()}`}>
                        {isMultiNfo ? 'VÍNCULO 1:N' : pair.pairMethod === 'REF_KEY' ? 'VÍNCULO 1:1 (REF)' : pair.pairMethod === 'CNPJ_NNF' ? 'VÍNCULO CNPJ' : 'SEM PAR'}
                      </span>
                    </div>

                    <div className="pair-sub-row">
                      <span className="customer-name">{pair.nfd.emit.xNome}</span>
                      <span className="dot-divider">•</span>
                      <span className="item-count">{pair.nfd.items.length} item(ns) devolvidos</span>
                    </div>
                  </div>

                  <div className="pair-meta-info">
                    <div className="pair-value-box font-mono">
                      {formatCurrency(pair.nfd.totals.vNF)}
                    </div>
                    {rec && rec.summary.totalCriticalErrors > 0 && (
                      <span className="error-count-pill danger">
                        {rec.summary.totalCriticalErrors} erro(s)
                      </span>
                    )}
                    {rec && rec.summary.totalWarnings > 0 && (
                      <span className="error-count-pill warning">
                        {rec.summary.totalWarnings} alerta(s)
                      </span>
                    )}
                  </div>

                  <button type="button" className="btn-icon expand-toggle">
                    {isExpanded ? <ChevronUp className="icon-xs" /> : <ChevronDown className="icon-xs" />}
                  </button>
                </div>

                {/* Expanded Detail View */}
                {isExpanded && rec && (
                  <div className="pair-expanded-body">
                    <div className="pair-expanded-top-bar">
                      <h4 className="pair-detail-title">
                        Detalhamento Auditado do Par NFD nº {pair.nfd.nNF}
                      </h4>
                    </div>

                    {/* Reusable Executive Summary */}
                    <ExecutiveSummary
                      result={rec}
                      onGenerateReport={() => onGenerateReportForPair(pair)}
                    />

                    {/* Reusable Tactical Data Bridge Copilot */}
                    <DataBridgeCopilot result={rec} />

                    {/* Reusable Items Table */}
                    <ItemsTable result={rec} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
