import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Info, PackageCheck, DollarSign, Package } from './Icons';
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
              <th style={{ width: '28px' }} className="cell-center">#</th>
              <th style={{ width: '68px' }} className="cell-center">Status</th>
              <th>Produto Devolvido</th>
              <th style={{ width: '105px' }}>EAN / GTIN</th>
              <th style={{ width: '110px' }}>Qtd (Dev / Orig)</th>
              <th style={{ width: '95px' }}>Almoxarifado</th>
              <th style={{ width: '85px' }} className="cell-right">Preço Un.</th>
              <th style={{ width: '85px' }} className="cell-right">Desc. / Un</th>
              <th style={{ width: '100px' }}>Lote NFD</th>
              <th style={{ width: '100px' }}>Lote NFO</th>
              <th style={{ width: '32px' }} className="cell-center"></th>
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
                        <span className="product-meta-pill">Cód: <strong>{nfdItem.cProd}</strong></span>
                        {nfoItem && (
                          <span className="product-meta-pill">Origem: <strong>{nfoItem.cProd}</strong></span>
                        )}
                        {nfdItem.cfop && (
                          <span className="product-meta-pill cfop">CFOP <strong>{nfdItem.cfop}</strong></span>
                        )}
                        {c.issues.some(i => i.code === 'CFOP_CLIENT_MISMATCH') && (
                          <span className="badge-tag ml-1 badge-tag-warn" title="CFOP divergente da NFO. Solicite Carta de Correção (CC-e) ao cliente">
                            ⚠️ Pedir CC-e (Esperado {c.expectedClientCfop})
                          </span>
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
                            <span className="font-mono text-xs opacity-85 ml-1">[{nfdItem.ncm || 'S/NCM'}]</span>
                          </span>
                          {nfdItem.med?.cProdANVISA && (
                            <span className="badge-anvisa ml-1" title="Código de Registro ANVISA (NT 2021.004)">
                              ANVISA: {nfdItem.med.cProdANVISA}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Badge de Redução de Base Omitida */}
                      {c.icmsAudit?.baseReductionApplied && Math.abs((nfdItem.icms?.vBC || 0) - (c.icmsAudit?.vBcExpected || 0)) > 0.15 && (
                        <div className="mt-1">
                          <span
                            className="badge-tag badge-tag-warn"
                            title={`Cliente destacou Base Cheia R$ ${(nfdItem.icms?.vBC || 0).toFixed(2)}. Base correta com redução da INFAN: ${formatCurrency(c.icmsAudit.vBcExpected)}`}
                          >
                            ⚠️ Redução Omitida (Esperado {formatCurrency(c.icmsAudit.vBcExpected)})
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="cell-ean">
                      <span className="ean-badge font-mono">{nfdItem.cEAN || 'Sem GTIN'}</span>
                    </td>

                    {/* Quantidades e Indicador de Devolução */}
                    <td>
                      <div className="quantity-cell">
                        <div className="quantity-main">
                          <span className="quantity-val font-mono">{nfdItem.qCom}</span>
                          <span className="unit-label font-mono">{normalizeUnit(nfdItem.uCom)}</span>
                        </div>
                        {nfoItem && (
                          <div className="quantity-sub">
                            <span className="quantity-faturado">Faturado: {nfoItem.qCom} {normalizeUnit(nfoItem.uCom)}</span>
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
                    <td className="font-mono text-cell-price cell-right">
                      <span className="price-main">{formatCurrency(nfdItem.vUnCom)}</span>
                      {nfoItem && Math.abs(nfdItem.vUnCom - nfoItem.vUnCom) > 0.001 && (
                        <span className="diff-highlight danger block">
                          Origem: {formatCurrency(nfoItem.vUnCom)}
                        </span>
                      )}
                    </td>

                    {/* Desconto / Unidade */}
                    <td className="font-mono text-cell-desc cell-right">
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
                              ✓ Proporcional
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
                            <span className="batch-val font-mono">
                              Val: {formatFiscalDate(nfdItem.batches[0].dVal)}
                            </span>
                          )}
                        </div>
                      ) : c.ncmProfile?.category === 'VITAMINA' || c.ncmProfile?.category === 'SUPLEMENTO' || result.nfd.finNFe === 4 ? (
                        <div className="batch-card batch-card-exempt" title="Dispensado pela NT 2021.004 na SEFAZ (Conferência física na doca)">
                          <span className="batch-exempt-label">ℹ️ Dispensado NT</span>
                          <span className="batch-exempt-sub">Conferência Doca</span>
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
                            <span className="batch-val font-mono">
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
                              <h5 className="item-details-title">Impostos Item • Comparativo Tributário Inteligente</h5>
                            </div>
                            <span className="item-details-sub">Visualização Tripla (1. Faturado Origem x 2. Informado Cliente x 3. Sugerido Sistema)</span>
                          </div>

                          {/* Comparativo de 3 Colunas/Linhas no Detalhe do Produto */}
                          <div className="smart-tax-table smart-tax-table-item mt-2 mb-3">
                            <div className="smart-tax-thead smart-tax-thead-triad">
                              <div className="col-tax-name">Tributo / Parâmetro Fiscal</div>
                              <div className="col-tax-nfo">1. Faturado Origem (NFO)</div>
                              <div className="col-tax-nfd">2. Informado Cliente (NFD)</div>
                              <div className="col-tax-expected">3. Correto Esperável (Sistema)</div>
                              <div className="col-tax-status">Auditoria & Match</div>
                            </div>
                            <div className="smart-tax-tbody">
                              {/* 1. CFOP */}
                              {(() => {
                                const nfoCfop = nfoItem?.cfop || '6102';
                                const nfdCfop = nfdItem.cfop;
                                const expectedCfop = c.expectedClientCfop || '6202';
                                const isCfopMatch = nfdCfop.replace(/\D/g, '') === expectedCfop.replace(/\D/g, '');
                                const entrySuggested = result.ndoSuggestion?.cfop || '2.202';

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      CFOP da Operação
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {nfoCfop} <span className="badge-tag">Saída</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {nfdCfop} <span className="badge-tag">Devolução</span>
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      <strong>{expectedCfop}</strong> <span className="badge-tag">Entrada {entrySuggested}</span>
                                    </div>
                                    <div className="col-tax-status">
                                      {isCfopMatch ? (
                                        <span className="match-chip match-chip-ok">
                                          <CheckCircle2 className="icon-xs" /> CFOP Conforme
                                        </span>
                                      ) : (
                                        <span className="match-chip match-chip-warn" title="Solicite Carta de Correção (CC-e) ao cliente">
                                          <AlertTriangle className="icon-xs" /> Incorreto (Pedir CC-e)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 2. Base de Cálculo de ICMS */}
                              {(() => {
                                const vBcOrigProportional = nfoItem
                                  ? (nfoItem.icms?.vBC ? (nfoItem.icms.vBC / nfoItem.qCom) * nfdItem.qCom : ((nfoItem.vProd - (nfoItem.vDesc || 0)) / nfoItem.qCom) * nfdItem.qCom)
                                  : undefined;
                                const vBcNfd = nfdItem.icms?.vBC || 0;
                                const vBcExpected = c.icmsAudit?.vBcExpected !== undefined
                                  ? c.icmsAudit.vBcExpected
                                  : Math.max(0, nfdItem.qCom * nfdItem.vUnCom - (nfdItem.vDesc || 0));
                                const hasRed = c.icmsAudit?.baseReductionApplied;
                                const isBaseMatch = Math.abs(vBcNfd - vBcExpected) <= 0.20 || vBcNfd === 0;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      Base de Cálculo do ICMS
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {vBcOrigProportional !== undefined ? formatCurrency(vBcOrigProportional) : 'N/A'}{' '}
                                      <span className="badge-tag">Proporcional</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(vBcNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {formatCurrency(vBcExpected)}{' '}
                                      <span className="badge-tag">
                                        {hasRed ? `Red. ${c.icmsAudit?.reductionPercentage.toFixed(2)}%` : 'Base Cheia'}
                                      </span>
                                    </div>
                                    <div className="col-tax-status">
                                      <span className={`match-chip ${isBaseMatch ? 'match-chip-ok' : 'match-chip-warn'}`}>
                                        {isBaseMatch ? <CheckCircle2 className="icon-xs" /> : <AlertTriangle className="icon-xs" />}
                                        {isBaseMatch ? 'Base Conforme' : 'Base Divergente'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 3. Alíquota de ICMS & CST */}
                              {(() => {
                                const pIcmsNfo = nfoItem?.icms?.pICMS || 12;
                                const pIcmsNfd = nfdItem.icms?.pICMS || 12;
                                const cstNfo = nfoItem?.icms?.cst || '00';
                                const cstNfd = nfdItem.icms?.cst || '00';
                                const isRateMatch = Math.abs(pIcmsNfo - pIcmsNfd) < 0.01;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      Alíquota do ICMS & CST
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {pIcmsNfo.toFixed(2)}% <span className="badge-tag">CST {cstNfo}</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {pIcmsNfd.toFixed(2)}% <span className="badge-tag">CST {cstNfd}</span>
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {pIcmsNfo.toFixed(2)}% <span className="badge-tag">CST {c.icmsAudit?.baseReductionApplied ? '20' : cstNfo}</span>
                                    </div>
                                    <div className="col-tax-status">
                                      <span className={`match-chip ${isRateMatch ? 'match-chip-ok' : 'match-chip-error'}`}>
                                        {isRateMatch ? <CheckCircle2 className="icon-xs" /> : <XCircle className="icon-xs" />}
                                        {isRateMatch ? `Alíquota OK (${pIcmsNfd.toFixed(1)}%)` : 'Divergente'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 4. Valor do ICMS Próprio (R$) */}
                              {(() => {
                                const vIcmsOrigProportional = nfoItem
                                  ? ((nfoItem.icms?.vICMS || 0) / nfoItem.qCom) * nfdItem.qCom
                                  : undefined;
                                const vIcmsNfd = nfdItem.icms?.vICMS || 0;
                                const vIcmsExpected = c.icmsAudit?.vIcmsExpected !== undefined
                                  ? c.icmsAudit.vIcmsExpected
                                  : (c.icmsAudit?.vBcExpected || 0) * (nfdItem.icms?.pICMS || 12) / 100;
                                const isIcmsMatch = Math.abs(vIcmsNfd - vIcmsExpected) <= 0.15 || vIcmsNfd === 0;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      Valor do ICMS Próprio (R$)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {vIcmsOrigProportional !== undefined ? formatCurrency(vIcmsOrigProportional) : 'N/A'}
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(vIcmsNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {formatCurrency(vIcmsExpected)}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className={`match-chip ${isIcmsMatch ? 'match-chip-ok' : 'match-chip-warn'}`}>
                                        {isIcmsMatch ? <CheckCircle2 className="icon-xs" /> : <AlertTriangle className="icon-xs" />}
                                        {isIcmsMatch ? 'Valor Conforme' : 'Valor Divergente'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 5. ICMSS (Substituição Tributária) */}
                              {(() => {
                                const stNfoProp = c.icmsStAudit?.expectedVIcmsSt || c.icmsStAudit?.vIcmsStNfo || 0;
                                const stNfd = nfdItem.icmsST?.vICMSST || 0;
                                const stExpected = c.icmsStAudit?.expectedVIcmsSt || 0;
                                const hasSt = stNfd > 0 || stNfoProp > 0;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      ICMSS (Subst. Tributária)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {formatCurrency(stNfoProp)}
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(stNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {formatCurrency(stExpected)}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> {hasSt ? 'ST Proporcional' : 'Sem ICMSS (OK)'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 6. Desconto Comercial Rateado */}
                              {(() => {
                                const descNfoProp = c.discountAudit?.expectedDiscount || 0;
                                const descNfd = nfdItem.vDesc || 0;
                                const isProp = c.discountAudit?.isProportional || descNfd === 0;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      Desconto Comercial
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {formatCurrency(descNfoProp)} <span className="badge-tag">Rateio</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(descNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {formatCurrency(descNfoProp)}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className={`match-chip ${isProp ? 'match-chip-ok' : 'match-chip-warn'}`}>
                                        {isProp ? <CheckCircle2 className="icon-xs" /> : <AlertTriangle className="icon-xs" />}
                                        {isProp ? 'Rateio Exato' : 'Não Proporcional'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 7. PIS (CST & Crédito Automático) */}
                              {(() => {
                                const pisCstNfo = nfoItem?.pis?.cst || '01';
                                const pisCstNfd = nfdItem.pis?.cst || '49';
                                const vPisNfd = nfdItem.pis?.vPIS || 0;
                                const creditAudit = c.pisCofinsCreditAudit;
                                const isMonofasico = creditAudit?.isMonofasicoRecovery;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      PIS (CST & Crédito)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      CST {pisCstNfo} {nfoItem?.pis?.pPIS ? `(${nfoItem.pis.pPIS.toFixed(2)}%)` : ''}
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      CST {pisCstNfd} <span className="badge-tag ml-1">{vPisNfd > 0 ? formatCurrency(vPisNfd) : 'Sem Destaque'}</span>
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {isMonofasico && creditAudit ? (
                                        <span>
                                          CST 50 • <strong>{formatCurrency(creditAudit.vPisCredit)}</strong>{' '}
                                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                                            Crédito INFAN ({creditAudit.pPis.toFixed(2)}%)
                                          </span>
                                        </span>
                                      ) : (
                                        <span>CST {pisCstNfd}</span>
                                      )}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> {isMonofasico ? 'Crédito Apurado' : 'CST Validado'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 8. COFINS (CST & Crédito Automático) */}
                              {(() => {
                                const cofinsCstNfo = nfoItem?.cofins?.cst || '01';
                                const cofinsCstNfd = nfdItem.cofins?.cst || '49';
                                const vCofinsNfd = nfdItem.cofins?.vCOFINS || 0;
                                const creditAudit = c.pisCofinsCreditAudit;
                                const isMonofasico = creditAudit?.isMonofasicoRecovery;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      COFINS (CST & Crédito)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      CST {cofinsCstNfo} {nfoItem?.cofins?.pCOFINS ? `(${nfoItem.cofins.pCOFINS.toFixed(2)}%)` : ''}
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      CST {cofinsCstNfd} <span className="badge-tag ml-1">{vCofinsNfd > 0 ? formatCurrency(vCofinsNfd) : 'Sem Destaque'}</span>
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {isMonofasico && creditAudit ? (
                                        <span>
                                          CST 50 • <strong>{formatCurrency(creditAudit.vCofinsCredit)}</strong>{' '}
                                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                                            Crédito INFAN ({creditAudit.pCofins.toFixed(2)}%)
                                          </span>
                                        </span>
                                      ) : (
                                        <span>CST {cofinsCstNfd}</span>
                                      )}
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> {isMonofasico ? 'Crédito Apurado' : 'CST Validado'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 9. CBS (Reforma Tributária - Federal) */}
                              {(() => {
                                const cbsNfo = nfoItem?.ibsCbs?.vCbs !== undefined ? nfoItem.ibsCbs.vCbs : undefined;
                                const cbsNfd = nfdItem.ibsCbs?.vCbs !== undefined ? nfdItem.ibsCbs.vCbs : 0;
                                const cbsExpected = c.ibsCbsAudit?.vCbs || cbsNfd;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      CBS (Reforma Tributária)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {cbsNfo !== undefined ? formatCurrency(cbsNfo) : '0,90%'} <span className="badge-tag">Transição</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(cbsNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {cbsExpected > 0 ? formatCurrency(cbsExpected) : '0,90%'}{' '}
                                      <span className="badge-tag">Alíquota 0,90%</span>
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> Reforma 2026/27
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 10. IBS (Reforma Tributária - Estadual) */}
                              {(() => {
                                const ibsNfo = nfoItem?.ibsCbs?.vIbs !== undefined ? nfoItem.ibsCbs.vIbs : undefined;
                                const ibsNfd = nfdItem.ibsCbs?.vIbs !== undefined ? nfdItem.ibsCbs.vIbs : 0;
                                const ibsExpected = c.ibsCbsAudit?.vIbs || ibsNfd;

                                return (
                                  <div className="smart-tax-row smart-tax-row-triad">
                                    <div className="col-tax-name font-weight-600">
                                      IBS (Reforma Tributária)
                                    </div>
                                    <div className="col-tax-nfo font-mono">
                                      {ibsNfo !== undefined ? formatCurrency(ibsNfo) : '0,10%'} <span className="badge-tag">Transição</span>
                                    </div>
                                    <div className="col-tax-nfd font-mono">
                                      {formatCurrency(ibsNfd)}
                                    </div>
                                    <div className="col-tax-expected font-mono text-primary">
                                      {ibsExpected > 0 ? formatCurrency(ibsExpected) : '0,10%'}{' '}
                                      <span className="badge-tag">Alíquota 0,10%</span>
                                    </div>
                                    <div className="col-tax-status">
                                      <span className="match-chip match-chip-ok">
                                        <CheckCircle2 className="icon-xs" /> Reforma 2026/27
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Resumo Específico do Item: Preço & Desconto + Rastreabilidade & Pirâmide */}
                          <div className="item-detail-grid mt-2 mb-2">
                            {/* Card 1: Precificação & Desconto */}
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

                            {/* Card 2: Rastreabilidade & Almoxarifado */}
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
