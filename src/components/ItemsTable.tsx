import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info, PackageCheck, ShieldCheck, DollarSign, Package } from './Icons';
import { formatFiscalDate } from '../utils/dateUtils';
import { normalizeUnit } from '../services/reconciliationEngine';

interface ItemsTableProps {
  result: ReconciliationResult;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({ result }) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [showInfoRows, setShowInfoRows] = useState<Record<number, boolean>>({});
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
          <div className="title-left">
            <span className="title-badge-indicator" />
            <h3 className="section-heading">Itens</h3>
          </div>
          <p className="table-subtitle">
            Matriz de Validação de Produtos (Item a Item) • Auditoria de preços, descontos, lotes e almoxarifados do Pirâmide.
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
                            {c.issues.some(i => i.code === 'CFOP_CLIENT_MISMATCH') && (
                              <span className="badge-tag ml-1 badge-tag-warn" title="CFOP divergente da NFO. Solicite Carta de Correção (CC-e) ao cliente">
                                ⚠️ Pedir CC-e (Esperado {c.expectedClientCfop})
                              </span>
                            )}
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
                          <span className="unit-label font-mono">{normalizeUnit(nfdItem.uCom)}</span>
                        </div>
                        {nfoItem && (
                          <div className="quantity-sub">
                            <span className="text-muted text-xs">de {nfoItem.qCom} {normalizeUnit(nfoItem.uCom)}</span>
                            {c.returnType === 'TOTAL' && (
                              <span className="badge-qty badge-qty-total" title="Devolução 100% Total">
                                Total 100%
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

                    {/* Preço Unitário */}
                    <td className="font-mono text-cell-price">
                      <span className="price-main">{formatCurrency(nfdItem.vUnCom)}</span>
                      {nfoItem && Math.abs(nfdItem.vUnCom - nfoItem.vUnCom) > 0.001 && (
                        <span className="diff-highlight danger block">
                          Origem: {formatCurrency(nfoItem.vUnCom)}
                        </span>
                      )}
                    </td>

                    {/* Desconto / Unidade */}
                    <td className="font-mono text-cell-desc">
                      <span className="desc-main">{formatCurrency(nfdDescUnit)}</span>
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

                    {/* LOTE NFD (com suporte estruturado e sem quebra feia) */}
                    <td className="cell-lote">
                      {nfdItem.batches.length > 0 ? (
                        <div className="batch-card batch-card-ok">
                          <span className="batch-number font-mono">{nfdItem.batches[0].nLote}</span>
                          {nfdItem.batches[0].dVal && (
                            <span className="batch-val text-xs font-mono">
                              Val: {formatFiscalDate(nfdItem.batches[0].dVal)}
                            </span>
                          )}
                        </div>
                      ) : c.ncmProfile?.category === 'VITAMINA' || c.ncmProfile?.category === 'SUPLEMENTO' || result.nfd.finNFe === 4 ? (
                        <div className="batch-card batch-card-exempt" title="Dispensado pela NT 2021.004 na SEFAZ (Conferência física na doca)">
                          <span className="batch-exempt-label">ℹ️ S/ LOTE XML</span>
                          <span className="batch-exempt-sub">NT 2021.004</span>
                        </div>
                      ) : (
                        <div className="batch-card batch-card-missing" title="Lote ausente na nota fiscal">
                          <span className="batch-missing-label">❌ NÃO INFORMADO</span>
                        </div>
                      )}
                    </td>

                    {/* LOTE NFO (com suporte estruturado e sem quebra feia) */}
                    <td className="cell-lote">
                      {nfoItem && nfoItem.batches.length > 0 ? (
                        <div className="batch-card batch-card-nfo">
                          <span className="batch-number font-mono">{nfoItem.batches[0].nLote}</span>
                          {nfoItem.batches[0].dVal && (
                            <span className="batch-val text-xs font-mono">
                              Val: {formatFiscalDate(nfoItem.batches[0].dVal)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs font-mono">{nfoItem ? 'Sem lote' : 'N/A'}</span>
                      )}
                    </td>

                    <td className="cell-center">
                      <button
                        type="button"
                        className={`btn-icon chevron-toggle ${isExpanded ? 'is-rotated' : ''}`}
                        title="Ver detalhes do item"
                      >
                        <ChevronDown className="icon-xs chevron-animated" />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="expanded-detail-row">
                      <td colSpan={11}>
                        <div className="expanded-detail-box">
                          {/* Diagnóstico Inteligente de Inconsistências */}
                          {(() => {
                            const criticalIssues = c.issues.filter(i => i.severity === 'CRITICAL');
                            const warningIssues = c.issues.filter(i => i.severity === 'WARNING');
                            const infoIssues = c.issues.filter(i => i.severity === 'INFO');
                            const hasProblems = criticalIssues.length > 0 || warningIssues.length > 0;

                            return (
                              <div className="diagnosis-container mb-3">
                                {hasProblems ? (
                                  <div className="issues-box">
                                    <h5 className="issues-title flex items-center gap-2">
                                      <AlertTriangle className="icon-xs warning" /> Inconsistências Identificadas no Item:
                                    </h5>
                                    <ul className="issues-list">
                                      {criticalIssues.map((issue, iIdx) => (
                                        <li key={`crit-${iIdx}`} className="issue-item issue-critical">
                                          <XCircle className="icon-xs danger" />
                                          <div>
                                            <strong>{issue.title}:</strong> {issue.description}
                                          </div>
                                        </li>
                                      ))}
                                      {warningIssues.map((issue, iIdx) => (
                                        <li key={`warn-${iIdx}`} className="issue-item issue-warning">
                                          <AlertTriangle className="icon-xs warning" />
                                          <div>
                                            <strong>{issue.title}:</strong> {issue.description}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <div className="item-valid-strip">
                                    <div className="flex items-center gap-3">
                                      <span className="badge-tick-circle">✓</span>
                                      <div className="valid-strip-text">
                                        <div className="font-weight-600 text-sm text-success">Item 100% em Conformidade com a Nota de Origem</div>
                                        <div className="text-xs text-muted mt-0.5">Preço unitário, descontos rateados e tributos conferem com a saída.</div>
                                      </div>
                                    </div>
                                    {infoIssues.length > 0 && (
                                      <button
                                        type="button"
                                        className="btn-info-toggle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowInfoRows(prev => ({ ...prev, [idx]: !prev[idx] }));
                                        }}
                                      >
                                        <Info className="icon-xs" />
                                        <span>{showInfoRows[idx] ? `Ocultar Notas (${infoIssues.length})` : `${infoIssues.length} Observações Regulatórias`}</span>
                                        {showInfoRows[idx] ? <ChevronUp className="icon-xs" /> : <ChevronDown className="icon-xs" />}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Acordeão Retrátil de Notas Informativas (sem poluir a tela quando fechado) */}
                                {infoIssues.length > 0 && (showInfoRows[idx] || hasProblems) && (
                                  <div className="info-accordion-panel mt-2">
                                    <div className="info-accordion-header">
                                      <Info className="icon-xs text-info" /> Notas Regulatórias e Informativas (SEFAZ / Reforma):
                                    </div>
                                    <ul className="info-accordion-list">
                                      {infoIssues.map((issue, iIdx) => (
                                        <li key={`info-${iIdx}`} className="info-accordion-item">
                                          <span className="info-bullet">•</span>
                                          <div>
                                            <strong>{issue.title}:</strong> {issue.description}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Título Padronizado: Impostos Item */}
                          <div className="item-details-section-header">
                            <div className="title-left">
                              <span className="title-badge-indicator item-tax" />
                              <h5 className="item-details-title">Impostos Item</h5>
                            </div>
                            <span className="item-details-sub">CFOP de Devolução, Alíquotas de ICMS, Base de Cálculo Reduzida/Cheia e Destaque Fiscal</span>
                          </div>

                          {/* Resumo Específico do Item (Compacto, sem repetição com o topo) */}
                          <div className="item-detail-grid mt-2 mb-2">
                            {/* Card 1: Tributação do Item */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header">
                                <span><ShieldCheck className="icon-xs text-primary" /> Impostos Item • CFOP & ICMS</span>
                                {c.expectedClientCfop && nfdItem.cfop.replace(/\D/g, '') === c.expectedClientCfop.replace(/\D/g, '') ? (
                                  <span className="badge-pill-success">✓ CFOP Conforme</span>
                                ) : (
                                  <span className="badge-pill-neutral" style={{ background: '#fef3c7', color: '#92400e' }}>⚠️ Pedir CC-e</span>
                                )}
                              </h6>
                              <div className="detail-field">
                                <span>CFOP Devolução:</span>
                                <strong>
                                  {nfdItem.cfop} <span className="text-xs opacity-75">(Esperado: {c.expectedClientCfop || '6202'})</span>
                                </strong>
                              </div>
                              <div className="detail-field">
                                <span>ICMS Alíquota / CST:</span>
                                <strong>{(nfdItem.icms?.pICMS || 12).toFixed(2)}% (CST {nfdItem.icms?.cst || '00'})</strong>
                              </div>
                              <div className="detail-field">
                                <span>Base de Cálculo:</span>
                                <strong>
                                  {formatCurrency(nfdItem.icms?.vBC || (nfdItem.qCom * nfdItem.vUnCom - (nfdItem.vDesc || 0)))}
                                  {c.icmsAudit?.baseReductionApplied && (
                                    <span className="badge-reduction ml-1">Red. {c.icmsAudit.reductionPercentage.toFixed(2)}%</span>
                                  )}
                                </strong>
                              </div>
                              <div className="detail-field">
                                <span>ICMS Destacado:</span>
                                <strong className="text-primary font-mono">{formatCurrency(nfdItem.icms?.vICMS || 0)}</strong>
                              </div>
                            </div>

                            {/* Card 2: Precificação & Desconto */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header">
                                <span><DollarSign className="icon-xs text-primary" /> Preço & Desconto</span>
                                {c.discountAudit?.isEmbeddedInUnitPrice ? (
                                  <span className="badge-pill-success">✓ Desc. Embutido</span>
                                ) : c.discountAudit?.isProportional ? (
                                  <span className="badge-pill-success">✓ Proporcional</span>
                                ) : null}
                              </h6>
                              <div className="detail-field">
                                <span>Preço Informado:</span>
                                <strong>{formatCurrency(nfdItem.vUnCom)} / {normalizeUnit(nfdItem.uCom)}</strong>
                              </div>
                              {c.discountAudit?.isEmbeddedInUnitPrice ? (
                                <div className="detail-field">
                                  <span>Desconto Embutido:</span>
                                  <strong className="text-success">
                                    {formatCurrency(c.discountAudit.embeddedUnitPriceDiff || 0)} / {normalizeUnit(nfdItem.uCom)} (Líquido OK)
                                  </strong>
                                </div>
                              ) : (
                                <div className="detail-field">
                                  <span>Desconto Rateado:</span>
                                  <strong className="text-success">
                                    {formatCurrency(nfdItem.vDesc ? nfdItem.vDesc / nfdItem.qCom : 0)} / {normalizeUnit(nfdItem.uCom)}
                                  </strong>
                                </div>
                              )}
                              <div className="detail-field">
                                <span>Preço Líquido Efetivo:</span>
                                <strong className="font-mono">
                                  {formatCurrency(
                                    c.discountAudit?.isEmbeddedInUnitPrice
                                      ? nfdItem.vUnCom
                                      : nfdItem.vUnCom - (nfdItem.vDesc ? nfdItem.vDesc / nfdItem.qCom : 0)
                                  )} / {normalizeUnit(nfdItem.uCom)}
                                </strong>
                              </div>
                            </div>

                            {/* Card 3: Rastreabilidade & Almoxarifado */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header">
                                <span><Package className="icon-xs text-primary" /> Rastreabilidade & Destino</span>
                                <span className="badge-pill-neutral">Pirâmide</span>
                              </h6>
                              <div className="detail-field">
                                <span>Lote / Validade:</span>
                                <strong>
                                  {nfdItem.batches[0]?.nLote || 'Sem Lote'} {nfdItem.batches[0]?.dVal ? `(Val: ${formatFiscalDate(nfdItem.batches[0].dVal)})` : ''}
                                </strong>
                              </div>
                              <div className="detail-field">
                                <span>Almoxarifado Destino:</span>
                                <strong className="text-primary font-bold">{c.piramideResolution?.almoxarifado || 'AVARIA'}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Classificação NCM:</span>
                                <span>{c.ncmProfile ? `${c.ncmProfile.categoryLabel} (${c.ncmProfile.ncm})` : nfdItem.ncm}</span>
                              </div>
                            </div>
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
