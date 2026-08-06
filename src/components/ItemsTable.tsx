import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info } from './Icons';

interface ItemsTableProps {
  result: ReconciliationResult;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ result }) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | 'ERRORS' | 'OK'>('ALL');

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredComparisons = result.itemComparisons.filter(c => {
    const hasCritical = c.issues.some(i => i.severity === 'CRITICAL');
    const hasWarning = c.issues.some(i => i.severity === 'WARNING');

    if (filter === 'ERRORS') {
      return hasCritical || hasWarning;
    }
    if (filter === 'OK') {
      return !hasCritical && !hasWarning;
    }
    return true;
  });

  const formatCurrency = (val?: number) => {
    if (val === undefined) return 'N/A';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="items-table-section">
      <div className="table-header-bar">
        <div>
          <h3 className="table-title">Matriz de Validação de Produtos (Item a Item)</h3>
          <p className="table-subtitle">
            Comparação detalhada entre os itens devolvidos pelo cliente (NFD) e os itens faturados na venda (NFO).
          </p>
        </div>

        {/* Filter buttons */}
        <div className="table-filter-group">
          <button
            type="button"
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todos ({result.itemComparisons.length})
          </button>
          <button
            type="button"
            className={`filter-btn filter-danger ${filter === 'ERRORS' ? 'active' : ''}`}
            onClick={() => setFilter('ERRORS')}
          >
            Apenas Inconsistências ({result.itemComparisons.filter(c => c.issues.length > 0).length})
          </button>
          <button
            type="button"
            className={`filter-btn filter-success ${filter === 'OK' ? 'active' : ''}`}
            onClick={() => setFilter('OK')}
          >
            Conformes ({result.itemComparisons.filter(c => c.issues.length === 0).length})
          </button>
        </div>
      </div>

      <div className="table-responsive-container">
        <table className="reconciliation-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Status</th>
              <th>Produto Devolvido (NFD)</th>
              <th>EAN / GTIN</th>
              <th>Qtd Dev / Sold</th>
              <th>Preço Unitário</th>
              <th>Desc. / Unidade</th>
              <th>Lote NFD (Cliente)</th>
              <th>Lote NFO (Origem)</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredComparisons.map((c, idx) => {
              const isExpanded = !!expandedRows[idx];
              const hasCritical = c.issues.some(i => i.severity === 'CRITICAL');
              const hasWarning = c.issues.some(i => i.severity === 'WARNING');
              const nfdItem = c.nfdItem;
              const nfoItem = c.nfoItem;

              const nfdDescUnit = nfdItem.qCom > 0 ? nfdItem.vDesc / nfdItem.qCom : 0;
              const nfoDescUnit = nfoItem && nfoItem.qCom > 0 ? nfoItem.vDesc / nfoItem.qCom : 0;

              const nfdLotesStr = nfdItem.batches.map(b => b.nLote).join(', ') || 'NÃO INFORMADO';
              const nfoLotesStr = nfoItem ? nfoItem.batches.map(b => b.nLote).join(', ') || 'Sem lote' : 'N/A';

              let rowClass = 'row-approved';
              if (hasCritical) rowClass = 'row-critical';
              else if (hasWarning) rowClass = 'row-warning';

              return (
                <React.Fragment key={idx}>
                  <tr className={`item-row ${rowClass}`} onClick={() => toggleRow(idx)}>
                    <td className="cell-center text-muted font-mono">{nfdItem.nItem}</td>
                    <td className="cell-center">
                      {hasCritical ? (
                        <span className="status-chip chip-critical" title="Erro Crítico">
                          <XCircle className="icon-xs" /> Rejeitado
                        </span>
                      ) : hasWarning ? (
                        <span className="status-chip chip-warning" title="Alerta de Inconsistência">
                          <AlertTriangle className="icon-xs" /> Atenção
                        </span>
                      ) : (
                        <span className="status-chip chip-approved" title="Item em Conformidade">
                          <CheckCircle2 className="icon-xs" /> Ok
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="product-title">{nfdItem.xProd}</div>
                      <div className="product-sub">
                        Cod. Cliente: <span className="font-mono">{nfdItem.cProd}</span>
                        {nfoItem && (
                          <>
                            {' | '}Cod. Origem: <span className="font-mono">{nfoItem.cProd}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="font-mono text-sm">{nfdItem.cEAN || 'Sem GTIN'}</td>

                    <td>
                      <span className="font-weight-600">{nfdItem.qCom} {nfdItem.uCom}</span>
                      {nfoItem && (
                        <span className="text-muted text-xs block">
                          (de {nfoItem.qCom} {nfoItem.uCom} faturados)
                        </span>
                      )}
                    </td>

                    <td className="font-mono">
                      {formatCurrency(nfdItem.vUnCom)}
                      {nfoItem && Math.abs(nfdItem.vUnCom - nfoItem.vUnCom) > 0.001 && (
                        <span className="diff-highlight danger block">
                          Origem: {formatCurrency(nfoItem.vUnCom)}
                        </span>
                      )}
                    </td>

                    <td className="font-mono">
                      {formatCurrency(nfdDescUnit)}
                      {nfoItem && Math.abs(nfdDescUnit - nfoDescUnit) > 0.05 && (
                        <span className="diff-highlight warning block">
                          Origem: {formatCurrency(nfoDescUnit)}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`batch-pill ${nfdItem.batches.length === 0 ? 'batch-missing' : 'batch-ok'}`}>
                        {nfdLotesStr}
                      </span>
                    </td>

                    <td>
                      <span className="batch-pill batch-nfo-pill">{nfoLotesStr}</span>
                    </td>

                    <td className="cell-center">
                      <button type="button" className="btn-icon">
                        {isExpanded ? <ChevronUp className="icon-xs" /> : <ChevronDown className="icon-xs" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="expanded-detail-row">
                      <td colSpan={10}>
                        <div className="expanded-detail-box">
                          {/* Issues List */}
                          {c.issues.length > 0 ? (
                            <div className="issues-box">
                              <h5 className="issues-title">Diagnóstico de Inconsistências do Item:</h5>
                              <ul className="issues-list">
                                {c.issues.map((issue, iIdx) => (
                                  <li key={iIdx} className={`issue-item issue-${issue.severity.toLowerCase()}`}>
                                    {issue.severity === 'CRITICAL' && <XCircle className="icon-xs danger" />}
                                    {issue.severity === 'WARNING' && <AlertTriangle className="icon-xs warning" />}
                                    {issue.severity === 'INFO' && <Info className="icon-xs info" />}
                                    <div>
                                      <strong>{issue.title}:</strong> {issue.description}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="no-issues-box">
                              <CheckCircle2 className="icon-sm success" />
                              <span>Item 100% em conformidade com a nota de origem.</span>
                            </div>
                          )}

                          {/* Side-by-side Tax Comparison */}
                          {nfoItem && (
                            <div className="tax-comparison-grid">
                              <div className="tax-column">
                                <h6 className="tax-column-header">Tributação NFD (Devolução Cliente)</h6>
                                <div className="tax-item">
                                  <span>ICMS CST:</span> <strong>{nfdItem.icms?.cst || 'N/A'}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Alíquota ICMS:</span> <strong>{nfdItem.icms?.pICMS}%</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Valor ICMS:</span> <strong>{formatCurrency(nfdItem.icms?.vICMS)}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>IPI CST:</span> <strong>{nfdItem.ipi?.cst || 'N/A'}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Valor IPI:</span> <strong>{formatCurrency(nfdItem.ipi?.vIPI)}</strong>
                                </div>
                              </div>

                              <div className="tax-column">
                                <h6 className="tax-column-header">Tributação NFO (Venda Origem)</h6>
                                <div className="tax-item">
                                  <span>ICMS CST:</span> <strong>{nfoItem.icms?.cst || 'N/A'}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Alíquota ICMS:</span> <strong>{nfoItem.icms?.pICMS}%</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Valor ICMS:</span> <strong>{formatCurrency(nfoItem.icms?.vICMS)}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>IPI CST:</span> <strong>{nfoItem.ipi?.cst || 'N/A'}</strong>
                                </div>
                                <div className="tax-item">
                                  <span>Valor IPI:</span> <strong>{formatCurrency(nfoItem.ipi?.vIPI)}</strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
