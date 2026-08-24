import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info, PackageCheck } from './Icons';
import { formatFiscalDate } from '../utils/dateUtils';

interface ItemsTableProps {
  result: ReconciliationResult;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ result }) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'ALL' | 'ERRORS' | 'OK'>('ALL');

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalInconsistencies = result.itemComparisons.filter(c =>
    c.issues.some(i => i.severity === 'CRITICAL' || i.severity === 'WARNING')
  ).length;

  const totalConforms = result.itemComparisons.filter(c =>
    !c.issues.some(i => i.severity === 'CRITICAL' || i.severity === 'WARNING')
  ).length;

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
            Auditoria detalhada de itens devolvidos (NFD) x faturados (NFO), divergências fiscais, quantidades e almoxarifados do Pirâmide.
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
            Apenas Inconsistências ({totalInconsistencies})
          </button>
          <button
            type="button"
            className={`filter-btn filter-success ${filter === 'OK' ? 'active' : ''}`}
            onClick={() => setFilter('OK')}
          >
            Conformes ({totalConforms})
          </button>
        </div>
      </div>

      <div className="table-responsive-container">
        <table className="reconciliation-table">
          <thead>
            <tr>
              <th style={{ width: '35px' }}>#</th>
              <th>Status</th>
              <th>Produto Devolvido (NFD)</th>
              <th>EAN / GTIN</th>
              <th>Qtd Devolvida / Origem</th>
              <th>Almoxarifado Pirâmide</th>
              <th>Preço Unitário</th>
              <th>Desc. / Un</th>
              <th>Lote NFD</th>
              <th>Lote NFO</th>
              <th style={{ width: '40px' }}></th>
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

              const nfdLotesStr = nfdItem.batches.length > 0
                ? nfdItem.batches.map(b => `${b.nLote}${b.dVal ? ` (Val: ${formatFiscalDate(b.dVal)})` : ''}`).join(', ')
                : 'NÃO INFORMADO';
              const nfoLotesStr = nfoItem && nfoItem.batches.length > 0
                ? nfoItem.batches.map(b => `${b.nLote}${b.dVal ? ` (Val: ${formatFiscalDate(b.dVal)})` : ''}`).join(', ')
                : (nfoItem ? 'Sem lote' : 'N/A');

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
                        {nfdItem.cfop && (
                          <>
                            {' | '}CFOP: <span className="font-mono">{nfdItem.cfop}</span>
                          </>
                        )}
                      </div>
                      {/* NCM Category Badge */}
                      {c.ncmProfile && (
                        <div className="ncm-category-badge mt-1">
                          <span
                            className={`badge-ncm badge-ncm-${c.ncmProfile.category.toLowerCase()}`}
                            title={`NCM ${nfdItem.ncm}: ${c.ncmProfile.description}`}
                          >
                            <span className="badge-icon">{c.ncmProfile.icon}</span> {c.ncmProfile.categoryLabel}
                            <span className="font-mono text-xs opacity-75 ml-1">[{nfdItem.ncm || 'S/NCM'}]</span>
                          </span>
                          {nfdItem.med?.cProdANVISA && (
                            <span className="badge-anvisa ml-1" title="Código de Registro ANVISA (NT 2021.004)">
                              ANVISA: {nfdItem.med.cProdANVISA}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="font-mono text-sm">{nfdItem.cEAN || 'Sem GTIN'}</td>

                    {/* Quantidades e Indicador de Devolução */}
                    <td>
                      <div className="quantity-cell">
                        <div className="quantity-main">
                          <span className="font-weight-600 font-mono text-base">{nfdItem.qCom}</span>
                          <span className="text-muted text-xs ml-1 font-weight-500">{nfdItem.uCom}</span>
                        </div>
                        {nfoItem && (
                          <div className="quantity-sub">
                            <span className="text-muted text-xs">de {nfoItem.qCom} {nfoItem.uCom}</span>
                            {c.returnType === 'TOTAL' && (
                              <span className="badge-qty badge-qty-total" title="Devolução 100% Total">
                                Total (100%)
                              </span>
                            )}
                            {c.returnType === 'PARTIAL' && (
                              <span className="badge-qty badge-qty-partial" title={`Devolução Parcial. Saldo remanescente: ${(nfoItem.qCom - nfdItem.qCom).toFixed(2)} ${nfoItem.uCom}`}>
                                Parcial ({c.percentageReturned?.toFixed(0)}%)
                              </span>
                            )}
                            {c.returnType === 'EXCESS' && (
                              <span className="badge-qty badge-qty-excess" title="Quantidade devolvida excede o faturamento original!">
                                Excesso (+{(nfdItem.qCom - nfoItem.qCom).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Almoxarifado Pirâmide Sugerido */}
                    <td>
                      {c.piramideResolution ? (
                        c.piramideResolution.isAutomatic ? (
                          <span className="warehouse-badge warehouse-auto" title={`Motivo ${c.piramideResolution.motivoCode}: ${c.piramideResolution.motivoDesc}`}>
                            <PackageCheck className="icon-xs" /> {c.piramideResolution.almoxarifado}
                          </span>
                        ) : (
                          <span className="warehouse-badge warehouse-manual" title={c.piramideResolution.notes || 'Avaliação física necessária'}>
                            <AlertTriangle className="icon-xs" /> Avaliação Doca
                          </span>
                        )
                      ) : (
                        <span className="text-muted text-xs">Padrão ERP</span>
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
                      {c.discountAudit && (
                        <div className="discount-audit-container mt-1">
                          {c.discountAudit.isExceededProductValue ? (
                            <span className="badge-discount badge-discount-danger" title="Rejeição SEFAZ 483: Desconto maior que o produto">
                              ❌ &gt; Valor Prod
                            </span>
                          ) : !c.discountAudit.isProportional ? (
                            <span
                              className="badge-discount badge-discount-warning"
                              title={`Divergência de Desconto! Esperado proporcional: ${formatCurrency(c.discountAudit.expectedDiscount)}`}
                            >
                              ⚠️ Dif: {formatCurrency(c.discountAudit.diffDiscount)}
                            </span>
                          ) : nfdItem.vDesc > 0 ? (
                            <span className="badge-discount badge-discount-ok" title="Desconto proporcional perfeito com a origem">
                              ✅ Proporcional
                            </span>
                          ) : null}
                        </div>
                      )}
                      {nfoItem && Math.abs(nfdDescUnit - nfoDescUnit) > 0.05 && !c.discountAudit && (
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
                      <td colSpan={11}>
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

                          {/* Operação Pirâmide & Tributos */}
                          <div className="item-detail-grid">
                            <div className="item-detail-card">
                              <h6 className="detail-card-header">Direcionamento no ERP Pirâmide</h6>
                              <div className="detail-field">
                                <span>Motivo de Devolução:</span>
                                <strong>{c.piramideResolution ? `${c.piramideResolution.motivoCode} - ${c.piramideResolution.motivoDesc}` : 'Não especificado no item'}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Almoxarifado Destino:</span>
                                <strong>{c.piramideResolution?.almoxarifado || 'ALMOX'}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Tipo de Direcionamento:</span>
                                <span>{c.piramideResolution?.isAutomatic ? '⚡ Automático / Preditivo' : '🔍 Avaliação Física na Chegada'}</span>
                              </div>
                              {c.piramideResolution?.notes && (
                                <div className="detail-note text-xs text-muted mt-1">
                                  {c.piramideResolution.notes}
                                </div>
                              )}
                            </div>

                            {/* Cartão de Inteligência Farmacêutica & Descontos */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header">Auditoria Regulatória & Descontos</h6>
                              <div className="detail-field">
                                <span>Classificação NCM:</span>
                                <strong>{c.ncmProfile ? `${c.ncmProfile.categoryLabel} (${c.ncmProfile.ncm})` : nfdItem.ncm}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Regime PIS/COFINS:</span>
                                <span>{c.ncmProfile?.pisCofinsRegime === 'MONOFASICO_ALÍQUOTA_ZERO' ? 'Monofásico (Alíquota Zero na revenda)' : 'Tributação Normal'}</span>
                              </div>
                              {c.discountAudit && (
                                <div className="detail-field">
                                  <span>Auditoria de Desconto:</span>
                                  <strong>
                                    Devolvido: {formatCurrency(c.discountAudit.actualDiscount)} | Esperado: {formatCurrency(c.discountAudit.expectedDiscount)}
                                  </strong>
                                </div>
                              )}
                              {nfdItem.med?.vPMC && (
                                <div className="detail-field">
                                  <span>Preço Máximo Consumidor (PMC):</span>
                                  <strong>{formatCurrency(nfdItem.med.vPMC)}</strong>
                                </div>
                              )}
                              <div className="detail-field">
                                <span>Rastreabilidade (NT 2021.004):</span>
                                <span>{c.ncmProfile?.requiresMedTag ? (nfdItem.batches.length > 0 ? '✅ Lote Informado' : 'ℹ️ Dispensado na devolução (finNFe=4)') : 'ℹ️ Não obrigatório para este NCM'}</span>
                              </div>
                            </div>

                            {/* Side-by-side Tax Comparison */}
                            {nfoItem && (
                              <div className="tax-comparison-grid">
                                <div className="tax-column">
                                  <h6 className="tax-column-header">Tributação NFD (Devolução)</h6>
                                  <div className="tax-item">
                                    <span>ICMS CST:</span> <strong>{nfdItem.icms?.cst || 'N/A'}</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>Alíquota ICMS:</span> <strong>{nfdItem.icms?.pICMS}%</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>PIS CST / Alíq:</span> <strong>{nfdItem.pis?.cst || 'N/A'} {nfdItem.pis?.pPIS ? `(${nfdItem.pis.pPIS}%)` : ''}</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>COFINS CST:</span> <strong>{nfdItem.cofins?.cst || 'N/A'}</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>IPI CST:</span> <strong>{nfdItem.ipi?.cst || 'N/A'}</strong>
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
                                    <span>PIS CST / Alíq:</span> <strong>{nfoItem.pis?.cst || 'N/A'} {nfoItem.pis?.pPIS ? `(${nfoItem.pis.pPIS}%)` : ''}</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>COFINS CST:</span> <strong>{nfoItem.cofins?.cst || 'N/A'}</strong>
                                  </div>
                                  <div className="tax-item">
                                    <span>IPI CST:</span> <strong>{nfoItem.ipi?.cst || 'N/A'}</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
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
