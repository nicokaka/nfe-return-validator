import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info, PackageCheck, ShieldCheck } from './Icons';
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
                      <button type="button" className="btn-icon" title="Ver detalhes do item">
                        {isExpanded ? <ChevronUp className="icon-xs" /> : <ChevronDown className="icon-xs" />}
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

                          {/* Comparador Tributário Inteligente Lado a Lado (Smart Match Matrix com Ticks Verdes) */}
                          {nfoItem && (
                            <div className="smart-tax-comparison-section mb-3">
                              <div className="comparison-section-header">
                                <h6 className="section-title">
                                  <ShieldCheck className="icon-xs text-success" /> Comparativo Tributário Inteligente (NFD Devolução x NFO Origem)
                                </h6>
                                <span className="text-xs text-muted">Conferência automática campo a campo</span>
                              </div>

                              <div className="smart-tax-table">
                                <div className="smart-tax-thead">
                                  <div className="col-tax-name">Tributo / Campo Fiscal</div>
                                  <div className="col-tax-nfo">Faturado na Origem (NFO)</div>
                                  <div className="col-tax-nfd">Devolvido pelo Cliente (NFD)</div>
                                  <div className="col-tax-status">Auditoria Automática</div>
                                </div>
                                <div className="smart-tax-tbody">
                                  {/* Linha: CFOP da Operação */}
                                  {(() => {
                                    const nfoCfop = nfoItem.cfop || '6102';
                                    const nfdCfop = nfdItem.cfop || '6202';
                                    const isReturnCfop = ['1201', '1202', '1411', '1949', '2201', '2202', '2411', '2949', '5201', '5202', '5411', '5949', '6201', '6202', '6411', '6949'].some(cf => nfdCfop.includes(cf.replace('.', '')));
                                    const suggestedCfop = result.ndoSuggestion?.cfop || '2.202';

                                    return (
                                      <div className="smart-tax-row">
                                        <div className="col-tax-name font-weight-600">
                                          CFOP da Operação
                                        </div>
                                        <div className="col-tax-nfo font-mono">
                                          {nfoCfop} <span className="badge-tag">Saída Faturada</span>
                                        </div>
                                        <div className="col-tax-nfd font-mono">
                                          {nfdCfop} <span className="badge-tag">Devolução Cliente</span>
                                        </div>
                                        <div className="col-tax-status">
                                          {isReturnCfop ? (
                                            <span className="match-chip match-chip-ok" title={`CFOP legítimo de devolução. Escrituração sugerida: ${suggestedCfop} no Pirâmide`}>
                                              <CheckCircle2 className="icon-xs" /> CFOP Conforme (Entrada {suggestedCfop})
                                            </span>
                                          ) : (
                                            <span className="match-chip match-chip-error" title="CFOP não é de devolução">
                                              <XCircle className="icon-xs" /> CFOP Inválido
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Linha: Alíquota e CST ICMS */}
                                  {(() => {
                                    const nfdIcmsRate = nfdItem.icms?.pICMS || 0;
                                    const nfoIcmsRate = nfoItem.icms?.pICMS || 0;
                                    const isIcmsMatch = Math.abs(nfdIcmsRate - nfoIcmsRate) < 0.001;
                                    return (
                                      <div className="smart-tax-row">
                                        <div className="col-tax-name font-weight-600">
                                          ICMS Próprio (CST & Alíquota)
                                        </div>
                                        <div className="col-tax-nfo font-mono">
                                          {nfoIcmsRate.toFixed(2)}% <span className="badge-tag">CST {nfoItem.icms?.cst || '00'}</span>
                                        </div>
                                        <div className="col-tax-nfd font-mono">
                                          {nfdIcmsRate.toFixed(2)}% <span className="badge-tag">CST {nfdItem.icms?.cst || '00'}</span>
                                        </div>
                                        <div className="col-tax-status">
                                          {isIcmsMatch ? (
                                            <span className="match-chip match-chip-ok" title="Alíquota espelha a saída perfeitamente">
                                              <CheckCircle2 className="icon-xs" /> 100% Batendo ({nfdIcmsRate.toFixed(1)}%)
                                            </span>
                                          ) : (
                                            <span className="match-chip match-chip-error" title="Divergência de alíquota">
                                              <XCircle className="icon-xs" /> Alíquota Divergente
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Linha: Base de Cálculo ICMS & Reduções */}
                                  {(() => {
                                    const isBaseOk = c.icmsAudit?.isBaseMatching ?? true;
                                    const redApplied = c.icmsAudit?.baseReductionApplied;
                                    const nfoQCom = nfoItem.qCom || 1;
                                    const nfdQCom = nfdItem.qCom || 1;
                                    const ratio = nfoQCom > 0 ? nfdQCom / nfoQCom : 1;
                                    const nfoTotalBc = nfoItem.icms?.vBC || (nfoItem.qCom * nfoItem.vUnCom - (nfoItem.vDesc || 0));
                                    const nfoProportionalBc = Math.round(nfoTotalBc * ratio * 100) / 100;
                                    const nfdBc = nfdItem.icms?.vBC || (nfdItem.qCom * nfdItem.vUnCom - (nfdItem.vDesc || 0));
                                    const isPartial = nfdQCom < nfoQCom;

                                    return (
                                      <div className="smart-tax-row">
                                        <div className="col-tax-name font-weight-600">
                                          Base de Cálculo de ICMS
                                        </div>
                                        <div className="col-tax-nfo font-mono">
                                          {formatCurrency(nfoProportionalBc)}
                                          {isPartial && (
                                            <span className="text-xs text-muted ml-1" title={`Base total na saída: ${formatCurrency(nfoTotalBc)}`}>
                                              (prop. {nfdQCom} un)
                                            </span>
                                          )}
                                        </div>
                                        <div className="col-tax-nfd font-mono">
                                          {formatCurrency(nfdBc)}
                                          {redApplied && (
                                            <span className="badge-reduction ml-1">
                                              Red. {c.icmsAudit?.reductionPercentage.toFixed(2)}%
                                            </span>
                                          )}
                                        </div>
                                        <div className="col-tax-status">
                                          {isBaseOk ? (
                                            <span className="match-chip match-chip-ok">
                                              <CheckCircle2 className="icon-xs" /> {redApplied ? `Base Reduzida (${c.icmsAudit?.reductionPercentage}%)` : 'Base Cheia 100% (Conforme)'}
                                            </span>
                                          ) : (
                                            <span className="match-chip match-chip-warn">
                                              <AlertTriangle className="icon-xs" /> Verificar Base
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Linha: ICMS-ST */}
                                  {(() => {
                                    const nfoStVal = nfoItem.icmsST?.vICMSST || nfoItem.icms?.vICMSST || 0;
                                    const nfdStVal = nfdItem.icmsST?.vICMSST || nfdItem.icms?.vICMSST || 0;
                                    const hasSt = nfoStVal > 0;
                                    const isStOk = c.icmsStAudit?.isProportional ?? (nfoStVal === 0 && nfdStVal === 0);

                                    return (
                                      <div className="smart-tax-row">
                                        <div className="col-tax-name font-weight-600">
                                          ICMS Substituição Tributária (ST)
                                        </div>
                                        <div className="col-tax-nfo font-mono">
                                          {formatCurrency(nfoStVal)}
                                        </div>
                                        <div className="col-tax-nfd font-mono">
                                          {formatCurrency(nfdStVal)}
                                        </div>
                                        <div className="col-tax-status">
                                          {isStOk ? (
                                            <span className="match-chip match-chip-ok">
                                              <CheckCircle2 className="icon-xs" /> {hasSt ? `ST Proporcional (${formatCurrency(nfdStVal)})` : 'Sem ST (Conforme)'}
                                            </span>
                                          ) : (
                                            <span className="match-chip match-chip-error">
                                              <XCircle className="icon-xs" /> ST Divergente
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Linha: Desconto Comercial Rateado */}
                                  {(() => {
                                    const isDiscOk = c.discountAudit?.isProportional ?? true;
                                    return (
                                      <div className="smart-tax-row">
                                        <div className="col-tax-name font-weight-600">
                                          Desconto Unitário Rateado
                                        </div>
                                        <div className="col-tax-nfo font-mono">
                                          {formatCurrency(nfoDescUnit)} / un
                                        </div>
                                        <div className="col-tax-nfd font-mono">
                                          {formatCurrency(nfdDescUnit)} / un
                                        </div>
                                        <div className="col-tax-status">
                                          {isDiscOk ? (
                                            <span className="match-chip match-chip-ok">
                                              <CheckCircle2 className="icon-xs" /> Rateio 100% Proporcional
                                            </span>
                                          ) : (
                                            <span className="match-chip match-chip-warn">
                                              <AlertTriangle className="icon-xs" /> Rateio Divergente
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Linha: PIS / COFINS */}
                                  <div className="smart-tax-row">
                                    <div className="col-tax-name font-weight-600">
                                      PIS / COFINS (Regime Regulatória)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      CST {nfoItem.pis?.cst || '01'} / {nfoItem.cofins?.cst || '01'}
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      CST {nfdItem.pis?.cst || '49'} / {nfdItem.cofins?.cst || '49'}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> {c.ncmProfile?.pisCofinsRegime === 'MONOFASICO_ALÍQUOTA_ZERO' ? 'Monofásico Alíq. Zero' : 'Tributação Normal'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Linha: IPI */}
                                  <div className="smart-tax-row">
                                    <div className="col-tax-name font-weight-600">
                                      IPI (Imposto s/ Produtos Industrializados)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {nfoItem.ipi?.pIPI ? `${nfoItem.ipi.pIPI}%` : '0%'} <span className="badge-tag">CST {nfoItem.ipi?.cst || '99'}</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {nfdItem.ipi?.pIPI ? `${nfdItem.ipi.pIPI}%` : '0%'} <span className="badge-tag">CST {nfdItem.ipi?.cst || '00'}</span>
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> Espelho de Devolução
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Operação Pirâmide & Perfil Farmacêutico (Cards Limpos e Simétricos) */}
                          <div className="item-detail-grid">
                            {/* Card 1: Direcionamento ERP Pirâmide */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header flex items-center justify-between">
                                <span>Direcionamento no ERP Pirâmide</span>
                                {c.piramideResolution?.isAutomatic && (
                                  <span className="badge-pill-success text-xs">⚡ Direcionamento Automático</span>
                                )}
                              </h6>
                              <div className="detail-field">
                                <span>Motivo de Devolução:</span>
                                <strong>{c.piramideResolution ? `${c.piramideResolution.motivoCode} - ${c.piramideResolution.motivoDesc}` : 'Não especificado no item'}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Almoxarifado Destino:</span>
                                <strong className="text-primary font-mono font-bold text-sm">
                                  {c.piramideResolution?.almoxarifado || 'ALMOX'}
                                </strong>
                              </div>
                              <div className="detail-field">
                                <span>CFOP de Entrada no Pirâmide:</span>
                                <strong className="font-mono">{result.ndoSuggestion?.cfop || '2.202'}</strong>
                              </div>
                              {c.piramideResolution?.notes && (
                                <div className="detail-note text-xs text-muted mt-2">
                                  ℹ️ {c.piramideResolution.notes}
                                </div>
                              )}
                            </div>

                            {/* Card 2: Perfil Regulatória ANVISA / NCM */}
                            <div className="item-detail-card">
                              <h6 className="detail-card-header flex items-center justify-between">
                                <span>Auditoria Regulatória & ANVISA</span>
                                <span className="badge-pill-neutral text-xs">NT 2021.004</span>
                              </h6>
                              <div className="detail-field">
                                <span>Classificação NCM:</span>
                                <strong>{c.ncmProfile ? `${c.ncmProfile.categoryLabel} (${c.ncmProfile.ncm})` : nfdItem.ncm}</strong>
                              </div>
                              <div className="detail-field">
                                <span>Regime PIS/COFINS:</span>
                                <span>{c.ncmProfile?.pisCofinsRegime === 'MONOFASICO_ALÍQUOTA_ZERO' ? 'Monofásico (Alíquota Zero na revenda)' : 'Tributação Normal'}</span>
                              </div>
                              {nfdItem.med?.vPMC && (
                                <div className="detail-field">
                                  <span>Preço Máximo Consumidor (PMC):</span>
                                  <strong>{formatCurrency(nfdItem.med.vPMC)}</strong>
                                </div>
                              )}
                              <div className="detail-field">
                                <span>Rastreabilidade de Lote:</span>
                                <span>
                                  {nfdItem.batches.length > 0 ? (
                                    <span className="text-success font-weight-600">✓ Lote Informado no XML ({nfdItem.batches[0].nLote})</span>
                                  ) : c.ncmProfile?.category === 'VITAMINA' || c.ncmProfile?.category === 'SUPLEMENTO' || result.nfd.finNFe === 4 ? (
                                    <span className="text-muted">ℹ️ Dispensado no XML pela NT 2021.004 (Conferir na doca)</span>
                                  ) : (
                                    <span className="text-danger font-weight-600">❌ Não informado</span>
                                  )}
                                </span>
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
