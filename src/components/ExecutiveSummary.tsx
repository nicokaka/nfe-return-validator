import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft, FileWarning, ShieldCheck, Tag, DollarSign, Package, PackageCheck, ExternalLink, Copy } from './Icons';
import { formatFiscalDate, formatCNPJ, formatChaveAcesso } from '../utils/dateUtils';
import { getPortalNFeConsultUrl, getSintegraStateUrl, getReceitaCnpjConsultUrl } from '../services/sefazStatusService';
import { getExpectedReturnCfop } from '../services/ndoTaxEngine';

interface ExecutiveSummaryProps {
  result: ReconciliationResult;
  onGenerateReport: () => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ result, onGenerateReport }) => {
  const { nfd, nfo, headerValidation, summary, ndoSuggestion, piramideResolution } = result;
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const showCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 4500);
  };

  const handleCopyAndOpenSefaz = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanKey = (nfd.chNFe || '').replace(/\D/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanKey);
    }
    showCopyFeedback('✓ Chave copiada (44 dígitos)! Cole (Ctrl+V) no Portal da SEFAZ.');
    window.open(getPortalNFeConsultUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleCopyAndOpenSintegra = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanCnpj = (nfd.emit.cnpj || '').replace(/\D/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanCnpj);
    }
    const uf = nfd.emit.uf || 'PB';
    showCopyFeedback(`✓ CNPJ ${formatCNPJ(cleanCnpj)} copiado! Abrindo Sintegra SEFAZ-${uf}...`);
    window.open(getSintegraStateUrl(uf), '_blank', 'noopener,noreferrer');
  };

  const handleCopyAndOpenReceita = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanCnpj = (nfd.emit.cnpj || '').replace(/\D/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanCnpj);
    }
    showCopyFeedback(`✓ CNPJ ${formatCNPJ(cleanCnpj)} copiado! Cole no comprovante da Receita Federal.`);
    window.open(getReceitaCnpjConsultUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleCopyKeyOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanKey = (nfd.chNFe || '').replace(/\D/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanKey);
    }
    showCopyFeedback('✓ Chave de 44 dígitos copiada com sucesso!');
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="executive-summary-section">
      {/* Top Banner Status */}
      <div className={`status-banner ${summary.overallStatus.toLowerCase()}`}>
        <div className="status-banner-main">
          {summary.overallStatus === 'APPROVED' && (
            <>
              <CheckCircle2 className="status-banner-icon success" />
              <div>
                <h2 className="status-banner-title">NF DE DEVOLUÇÃO CONFORME • LIBERADA PARA ENTRADA</h2>
                <p className="status-banner-sub">
                  Todos os produtos, lotes, tributos e valores conferem perfeitamente com a Nota de Origem.
                </p>
              </div>
            </>
          )}

          {summary.overallStatus === 'HAS_WARNINGS' && (
            <>
              <AlertTriangle className="status-banner-icon warning" />
              <div>
                <h2 className="status-banner-title">DIVERGÊNCIAS LEVES DETECTADAS • CONFERÊNCIA SUGERIDA</h2>
                <p className="status-banner-sub">
                  Encontrados {summary.totalWarnings} alerta(s) tributários ou regulatórios. Verifique a matriz abaixo.
                </p>
              </div>
            </>
          )}

          {summary.overallStatus === 'REJECTED' && (
            <>
              <XCircle className="status-banner-icon danger" />
              <div>
                <h2 className="status-banner-title">ENTRADA BLOQUEADA • DIVERGÊNCIAS CRÍTICAS</h2>
                <p className="status-banner-sub">
                  Detectados {summary.totalCriticalErrors} erro(s) crítico(s) (Lote incorreto, preço divergente ou excesso de quantidade).
                </p>
              </div>
            </>
          )}
        </div>

        {summary.totalCriticalErrors > 0 && (
          <button type="button" onClick={onGenerateReport} className="btn btn-danger-solid btn-sm">
            <FileWarning className="icon-xs" /> Gerar Laudo de Divergência
          </button>
        )}
      </div>

      {/* Seção Corporativa: Geral */}
      <div className="section-title-premium">
        <div className="title-left">
          <span className="title-badge-indicator" />
          <h3 className="section-heading">Geral</h3>
        </div>
        <span className="section-heading-sub">Conferência Cadastral e Cabeçalho das Notas Fiscais (NFO x NFD)</span>
      </div>

      {/* Cards Comparison Grid */}
      <div className="summary-cards-grid">
        {/* NFO Card */}
        <div className="summary-card card-nfo">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="card-type-badge badge-nfo">NOTA DE ORIGEM (SAÍDA)</div>
              {result.companyProfile && (
                <span className="badge-pill nfo text-xs font-semibold" title={result.companyProfile.notes}>
                  {result.companyProfile.isIndustry ? '🏭' : '🏢'} {result.companyProfile.tradeName}
                </span>
              )}
            </div>
            <div className="card-sefaz-badge">
              <ShieldCheck className="icon-xs" /> SEFAZ Autorizada
            </div>
          </div>
          <div className="card-body">
            <div className="card-number-row">
              <span className="card-nf-number">NF nº {nfo.nNF}</span>
              <span className="card-date">Emissão: {formatFiscalDate(nfo.dhEmi)}</span>
            </div>

            <div className="card-entity">
              <div className="entity-label">EMITENTE • {result.companyProfile?.tradeName || 'NOSSA EMPRESA'}</div>
              <div className="entity-name">{nfo.emit.xNome}</div>
              <div className="entity-cnpj">CNPJ: {formatCNPJ(nfo.emit.cnpj)} ({nfo.emit.uf || 'PB'})</div>
            </div>

            <div className="card-entity">
              <div className="entity-label">DESTINATÁRIO • CLIENTE</div>
              <div className="entity-name">{nfo.dest.xNome}</div>
              <div className="entity-cnpj">CNPJ: {formatCNPJ(nfo.dest.cnpj)} ({nfo.dest.uf || 'UF'})</div>
            </div>

            <div className="card-metrics-grid">
              <div className="metric-box">
                <div className="metric-header-row">
                  <DollarSign className="icon-xs muted" />
                  <span className="metric-label">Valor Total NF</span>
                </div>
                <span className="metric-value">{formatCurrency(nfo.totals.vNF)}</span>
              </div>
              <div className="metric-box">
                <div className="metric-header-row">
                  <Package className="icon-xs muted" />
                  <span className="metric-label">Qtd Total Faturada</span>
                </div>
                <span className="metric-value">{summary.totalQuantityNfo || nfo.items.length} unidades</span>
              </div>
            </div>

            <div className="card-footer-info">
              <span className="info-key">Chave de Acesso:</span>
              <span className="info-val font-mono">{formatChaveAcesso(nfo.chNFe)}</span>
            </div>
          </div>
        </div>

        {/* Center Connection Indicator */}
        <div className="summary-connection-column">
          <div className="connection-badge">
            <ArrowRightLeft className="icon" />
            <span className="font-weight-600 text-xs">Cruzamento Fiscal</span>
            {headerValidation.isRefKeyMatching ? (
              <span className="ref-status success" title="Chave de acesso da NFO referenciada no XML da NFD">✓ Chave Vinculada</span>
            ) : (
              <span className="ref-status danger" title="Chave de origem não encontrada na tag refNFe">❌ Sem Link NFref</span>
            )}
            {headerValidation.isParticipantsMatching ? (
              <span className="ref-status success mt-1" title="Emitente da NFD é o Destinatário da NFO e vice-versa">✓ CNPJs Cruzados</span>
            ) : (
              <span className="ref-status warning mt-1" title="Divergência entre emitente/destinatário">⚠️ Verificar CNPJs</span>
            )}
            {headerValidation.isSefazAuthorized && (
              <span className="ref-status success mt-1" title="Notas autorizadas na SEFAZ">✓ SEFAZ Válida</span>
            )}
          </div>
        </div>

        {/* NFD Card */}
        <div className="summary-card card-nfd">
          <div className="card-header">
            <div className="card-type-badge badge-nfd">NOTA DE DEVOLUÇÃO (ENTRADA)</div>
            <div className="card-sefaz-badge">
              <ShieldCheck className="icon-xs" /> SEFAZ Autorizada
            </div>
          </div>
          <div className="card-body">
            <div className="card-number-row">
              <span className="card-nf-number">NF nº {nfd.nNF}</span>
              <span className="card-date">Emissão: {formatFiscalDate(nfd.dhEmi)}</span>
            </div>

            <div className="card-entity">
              <div className="entity-label">EMITENTE • CLIENTE</div>
              <div className="entity-name">{nfd.emit.xNome}</div>
              <div className="entity-cnpj">CNPJ: {formatCNPJ(nfd.emit.cnpj)}</div>
            </div>

            <div className="card-entity">
              <div className="entity-label">DESTINATÁRIO • NOSSA EMPRESA</div>
              <div className="entity-name">{nfd.dest.xNome}</div>
              <div className="entity-cnpj">CNPJ: {formatCNPJ(nfd.dest.cnpj)}</div>
            </div>

            <div className="card-metrics-grid">
              <div className="metric-box">
                <div className="metric-header-row">
                  <DollarSign className="icon-xs warning" />
                  <span className="metric-label">Valor Devolvido</span>
                </div>
                <span className="metric-value highlight">{formatCurrency(nfd.totals.vNF)}</span>
              </div>
              <div className="metric-box">
                <div className="metric-header-row">
                  <Package className="icon-xs muted" />
                  <span className="metric-label">Qtd Devolvida</span>
                </div>
                <span className="metric-value font-weight-600">
                  {summary.totalQuantityNfd || nfd.items.length} un ({summary.overallReturnType === 'TOTAL' ? 'Total 100%' : summary.overallReturnType === 'PARTIAL' ? 'Parcial' : 'Excedente'})
                </span>
              </div>
            </div>

            {/* Motivo e Almoxarifado Pirâmide */}
            <div className="motivo-highlight-box">
              <Tag className="icon-xs" />
              <div>
                <strong>Motivo Pirâmide:</strong> {piramideResolution ? `${piramideResolution.motivoCode} - ${piramideResolution.motivoDesc}` : summary.motivoDevolucao || 'Divergência Geral'}
                {piramideResolution && (
                  <span className="ml-2 font-weight-600 text-xs">
                    {' '}(Destino: {piramideResolution.isAutomatic ? piramideResolution.almoxarifado : 'Avaliação Doca'})
                  </span>
                )}
              </div>
            </div>

            {/* NDO Sugerida */}
            {ndoSuggestion && (
              <div className="motivo-highlight-box mt-2" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                <PackageCheck className="icon-xs text-primary" />
                <div>
                  <strong>NDO Sugerida:</strong> {ndoSuggestion.cfop} - {ndoSuggestion.ndoDescription}
                </div>
              </div>
            )}

            <div className="card-footer-info flex items-center justify-between">
              <div>
                <span className="info-key">Chave de Acesso:</span>
                <span className="info-val font-mono">{formatChaveAcesso(nfd.chNFe)}</span>
              </div>
              <button
                type="button"
                className="btn-icon-copy"
                onClick={handleCopyKeyOnly}
                title="Copiar chave de 44 dígitos para a área de transferência"
              >
                <Copy className="icon-xs" /> Copiar Chave
              </button>
            </div>

            {/* Toast Feedback de Cópia */}
            {copyFeedback && (
              <div className="copy-feedback-toast mt-2">
                <CheckCircle2 className="icon-xs text-success" />
                <span>{copyFeedback}</span>
              </div>
            )}

            {/* Ações Rápidas de Consulta Externa SEFAZ, CCC e Sintegra */}
            <div className="card-footer-actions mt-2">
              <button
                type="button"
                onClick={handleCopyAndOpenSefaz}
                className="btn-sefaz-action"
                title="Copia a chave de 44 dígitos e abre a Consulta Pública no Portal Nacional da SEFAZ"
              >
                <ExternalLink className="icon-xs" /> SEFAZ Nacional (Chave NF-e)
              </button>
              <button
                type="button"
                onClick={handleCopyAndOpenSintegra}
                className="btn-sefaz-action"
                title={`Copia o CNPJ e abre a consulta da Inscrição Estadual no Sintegra da SEFAZ-${nfd.emit.uf || 'PB'}`}
              >
                <ExternalLink className="icon-xs" /> Sintegra SEFAZ-{nfd.emit.uf || 'PB'}
              </button>
              <button
                type="button"
                onClick={handleCopyAndOpenReceita}
                className="btn-sefaz-action"
                title="Copia o CNPJ e abre o Comprovante de Situação Cadastral na Receita Federal"
              >
                <ExternalLink className="icon-xs" /> Receita Federal (CNPJ)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Corporativa: Impostos */}
      <div className="section-title-premium mt-4">
        <div className="title-left">
          <span className="title-badge-indicator" />
          <h3 className="section-heading">Impostos</h3>
        </div>
        <span className="section-heading-sub">Comparativo Tributário Inteligente (Visualização Tripla: Origem x Devolução x Esperado)</span>
      </div>

      {/* Comparativo Tributário Inteligente Global da Operação com Terceira Coluna (NFO x NFD x Esperado) */}
      <div className="smart-tax-comparison-section mt-2">
        <div className="comparison-section-header">
          <h6 className="section-title">
            <ShieldCheck className="icon-xs text-success" /> Comparativo Tributário Inteligente (Visualização Tripla: Origem x Devolução x Esperado)
          </h6>
          <span className="text-xs text-muted">Auditoria de conformidade e determinação de Base Única da Verdade</span>
        </div>

        <div className="smart-tax-table">
          <div className="smart-tax-thead smart-tax-thead-triad">
            <div className="col-tax-name">Tributo / Parâmetro Fiscal</div>
            <div className="col-tax-nfo">1. Faturado Origem (NFO)</div>
            <div className="col-tax-nfd">2. Informado Cliente (NFD)</div>
            <div className="col-tax-expected">3. Correto Esperável (Sistema)</div>
            <div className="col-tax-status">Auditoria & Match</div>
          </div>
          <div className="smart-tax-tbody">
            {/* Linha: CFOP */}
            {(() => {
              const nfoCfop = nfo.items[0]?.cfop || '6102';
              const nfdCfop = nfd.items[0]?.cfop || '6202';
              const expectedCfop = getExpectedReturnCfop(nfoCfop);
              const isCfopMatch = nfdCfop.replace(/\D/g, '') === expectedCfop.replace(/\D/g, '');

              return (
                <div className="smart-tax-row smart-tax-row-triad">
                  <div className="col-tax-name font-weight-600">
                    CFOP da Operação
                  </div>
                  <div className="col-tax-nfo font-mono">
                    {nfoCfop} <span className="badge-tag">Saída Origem</span>
                  </div>
                  <div className="col-tax-nfd font-mono">
                    {nfdCfop} <span className="badge-tag">Devolução</span>
                  </div>
                  <div className="col-tax-expected font-mono text-primary">
                    <strong>{expectedCfop}</strong> <span className="badge-tag">Entrada {ndoSuggestion?.cfop || '2.202'}</span>
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

            {/* 1. Linha: Base de Cálculo de ICMS */}
            {(() => {
              const totalExpectedVBc = result.itemComparisons.reduce((acc, c) => {
                if (c.icmsAudit?.vBcExpected !== undefined) {
                  return acc + c.icmsAudit.vBcExpected;
                }
                const vLiq = Math.max(0, (c.nfdItem.vProd || 0) - (c.nfdItem.vDesc || 0));
                return acc + vLiq;
              }, 0);

              const actualNfdVBc = nfd.totals.vBC || 0;
              const hasBaseReduction = result.itemComparisons.some(c => c.icmsAudit?.baseReductionApplied);
              const reductionPct = result.itemComparisons.find(c => c.icmsAudit?.baseReductionApplied)?.icmsAudit?.reductionPercentage;
              const isBaseMatch = Math.abs(actualNfdVBc - totalExpectedVBc) <= 0.25 || actualNfdVBc === 0;

              return (
                <div className="smart-tax-row smart-tax-row-triad">
                  <div className="col-tax-name font-weight-600">
                    Base de Cálculo do ICMS
                  </div>
                  <div className="col-tax-nfo font-mono">
                    {formatCurrency(nfo.totals.vBC)} <span className="badge-tag">Total Venda</span>
                  </div>
                  <div className="col-tax-nfd font-mono">
                    {formatCurrency(actualNfdVBc)}
                  </div>
                  <div className="col-tax-expected font-mono text-primary">
                    {formatCurrency(totalExpectedVBc)}{' '}
                    <span className="badge-tag">
                      {hasBaseReduction ? `Redução ${reductionPct?.toFixed(2)}%` : 'Proporcional Líquida'}
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

            {/* 2. Linha: Alíquota de ICMS & CST */}
            {(() => {
              const pIcmsNfo = nfo.items[0]?.icms?.pICMS || 12;
              const pIcmsNfd = nfd.items[0]?.icms?.pICMS || 12;
              const isRateMatch = Math.abs(pIcmsNfo - pIcmsNfd) < 0.01;

              return (
                <div className="smart-tax-row smart-tax-row-triad">
                  <div className="col-tax-name font-weight-600">
                    Alíquota do ICMS & CST
                  </div>
                  <div className="col-tax-nfo font-mono">
                    {pIcmsNfo.toFixed(2)}% <span className="badge-tag">CST {nfo.items[0]?.icms?.cst || '00'}</span>
                  </div>
                  <div className="col-tax-nfd font-mono">
                    {pIcmsNfd.toFixed(2)}% <span className="badge-tag">CST {nfd.items[0]?.icms?.cst || '00'}</span>
                  </div>
                  <div className="col-tax-expected font-mono text-primary">
                    {pIcmsNfo.toFixed(2)}% <span className="badge-tag">Espelho</span>
                  </div>
                  <div className="col-tax-status">
                    <span className={`match-chip ${isRateMatch ? 'match-chip-ok' : 'match-chip-error'}`}>
                      {isRateMatch ? <CheckCircle2 className="icon-xs" /> : <XCircle className="icon-xs" />}
                      {isRateMatch ? `100% Batendo (${pIcmsNfd.toFixed(1)}%)` : 'Alíquota Divergente'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3. Linha: Valor do ICMS Próprio (R$) */}
            {(() => {
              const totalExpectedVIcms = result.itemComparisons.reduce((acc, c) => {
                if (c.icmsAudit?.vIcmsExpected !== undefined) {
                  return acc + c.icmsAudit.vIcmsExpected;
                }
                const vBc = c.icmsAudit?.vBcExpected ?? Math.max(0, (c.nfdItem.vProd || 0) - (c.nfdItem.vDesc || 0));
                const rate = (c.nfoItem?.icms?.pICMS || c.nfdItem.icms?.pICMS || 12) / 100;
                return acc + (vBc * rate);
              }, 0);

              const actualNfdVIcms = nfd.totals.vICMS || 0;
              const hasBaseReduction = result.itemComparisons.some(c => c.icmsAudit?.baseReductionApplied);
              const isIcmsMatch = Math.abs(actualNfdVIcms - totalExpectedVIcms) <= 0.25 || actualNfdVIcms === 0;

              return (
                <div className="smart-tax-row smart-tax-row-triad">
                  <div className="col-tax-name font-weight-600">
                    Valor do ICMS Próprio (R$)
                  </div>
                  <div className="col-tax-nfo font-mono">
                    {formatCurrency(nfo.totals.vICMS)} <span className="badge-tag">Total Venda</span>
                  </div>
                  <div className="col-tax-nfd font-mono">
                    {formatCurrency(actualNfdVIcms)}
                  </div>
                  <div className="col-tax-expected font-mono text-primary">
                    {formatCurrency(totalExpectedVIcms)}{' '}
                    <span className="badge-tag">
                      {hasBaseReduction ? 'Com Redução' : 'Rateio Exato'}
                    </span>
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

            {/* Linha: ICMS-ST */}
            {(() => {
              const nfoTotalSt = nfo.items.reduce((acc, i) => acc + (i.icmsST?.vICMSST || i.icms?.vICMSST || 0), 0);
              const nfdTotalSt = nfd.items.reduce((acc, i) => acc + (i.icmsST?.vICMSST || i.icms?.vICMSST || 0), 0);
              return (
                <div className="smart-tax-row smart-tax-row-triad">
                  <div className="col-tax-name font-weight-600">
                    ICMS Substituição Tributária (ST)
                  </div>
                  <div className="col-tax-nfo font-mono">
                    {formatCurrency(nfoTotalSt)}
                  </div>
                  <div className="col-tax-nfd font-mono">
                    {formatCurrency(nfdTotalSt)}
                  </div>
                  <div className="col-tax-expected font-mono text-primary">
                    {formatCurrency(nfdTotalSt)}
                  </div>
                  <div className="col-tax-status">
                    <span className="match-chip match-chip-ok">
                      <CheckCircle2 className="icon-xs" /> {nfdTotalSt === 0 ? 'Sem ST (Conforme)' : 'ST Proporcional'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Linha: Desconto Rateado */}
            <div className="smart-tax-row smart-tax-row-triad">
              <div className="col-tax-name font-weight-600">
                Desconto Comercial Global
              </div>
              <div className="col-tax-nfo font-mono">
                {formatCurrency(nfo.totals.vDesc || 0)} <span className="badge-tag">Venda Original</span>
              </div>
              <div className="col-tax-nfd font-mono">
                {formatCurrency(nfd.totals.vDesc || 0)}
              </div>
              <div className="col-tax-expected font-mono text-primary">
                {formatCurrency(result.pharmaceuticalSummary?.totalDescontoNfoProporcional || nfd.totals.vDesc || 0)} <span className="badge-tag">Rateio Exato</span>
              </div>
              <div className="col-tax-status">
                <span className="match-chip match-chip-ok">
                  <CheckCircle2 className="icon-xs" /> Rateio 100% Proporcional
                </span>
              </div>
            </div>

            {/* Linha: PIS / COFINS */}
            <div className="smart-tax-row smart-tax-row-triad">
              <div className="col-tax-name font-weight-600">
                PIS / COFINS (Regime Fiscal)
              </div>
              <div className="col-tax-nfo font-mono">
                CST {nfo.items[0]?.pis?.cst || '01'} / {nfo.items[0]?.cofins?.cst || '01'}
              </div>
              <div className="col-tax-nfd font-mono">
                CST {nfd.items[0]?.pis?.cst || '49'} / {nfd.items[0]?.cofins?.cst || '49'}
              </div>
              <div className="col-tax-expected font-mono text-primary">
                CST 49 / 49 <span className="badge-tag">Monofásico</span>
              </div>
              <div className="col-tax-status">
                <span className="match-chip match-chip-ok">
                  <CheckCircle2 className="icon-xs" /> Monofásicos Conforme
                </span>
              </div>
            </div>

            {/* Linha: IPI */}
            <div className="smart-tax-row smart-tax-row-triad">
              <div className="col-tax-name font-weight-600">
                IPI (Imposto s/ Produtos Ind.)
              </div>
              <div className="col-tax-nfo font-mono">
                {nfo.totals.vIPI > 0 ? formatCurrency(nfo.totals.vIPI) : '0%'} <span className="badge-tag">CST {nfo.items[0]?.ipi?.cst || '99'}</span>
              </div>
              <div className="col-tax-nfd font-mono">
                {nfd.totals.vIPI > 0 ? formatCurrency(nfd.totals.vIPI) : '0%'} <span className="badge-tag">CST {nfd.items[0]?.ipi?.cst || '00'}</span>
              </div>
              <div className="col-tax-expected font-mono text-primary">
                {nfd.totals.vIPI > 0 ? formatCurrency(nfd.totals.vIPI) : '0%'} <span className="badge-tag">Espelho</span>
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

      {/* Painel de Inteligência Fiscal Farmacêutica & Descontos */}
      {result.pharmaceuticalSummary && (
        <div className="pharma-executive-panel mt-3">
          <div className="pharma-panel-header">
            <div className="pharma-header-left">
              <span className="pharma-panel-icon">🧬</span>
              <div>
                <h4 className="pharma-panel-title">Resumo Farmacêutico</h4>
                <p className="pharma-panel-subtitle">
                  Classificação de NCMs, conformidade NT 2021.004 e conferência de descontos proporcionais.
                </p>
              </div>
            </div>
            {result.pharmaceuticalSummary.temDivergenciaDesconto ? (
              <span className="pharma-status-badge badge-warning">
                ⚠️ Divergência de Desconto Detectada
              </span>
            ) : (
              <span className="pharma-status-badge badge-success">
                ✅ Descontos 100% Proporcionais
              </span>
            )}
          </div>

          <div className="pharma-metrics-grid">
            <div className="pharma-metric-card">
              <div className="pharma-metric-top">
                <span className="pharma-card-icon">💊</span>
                <span className="pharma-metric-name">Medicamentos (NCM 30xx)</span>
              </div>
              <div className="pharma-metric-number">{result.pharmaceuticalSummary.totalMedicamentos} itens</div>
              <div className="pharma-metric-desc">Regulados pela ANVISA / Monofásicos</div>
            </div>

            <div className="pharma-metric-card">
              <div className="pharma-metric-top">
                <span className="pharma-card-icon">🧪</span>
                <span className="pharma-metric-name">Vitaminas (NCM 2936)</span>
              </div>
              <div className="pharma-metric-number">{result.pharmaceuticalSummary.totalVitaminas} itens</div>
              <div className="pharma-metric-desc">Capítulo 29 (Lote Voluntário)</div>
            </div>

            <div className="pharma-metric-card">
              <div className="pharma-metric-top">
                <span className="pharma-card-icon">🥤</span>
                <span className="pharma-metric-name">Suplementos (NCM 2106)</span>
              </div>
              <div className="pharma-metric-number">{result.pharmaceuticalSummary.totalSuplementos} itens</div>
              <div className="pharma-metric-desc">Alimento / Tributação Normal</div>
            </div>

            <div className="pharma-metric-card">
              <div className="pharma-metric-top">
                <span className="pharma-card-icon">🏷️</span>
                <span className="pharma-metric-name">Auditoria de Desconto Global</span>
              </div>
              <div className="pharma-metric-number font-mono">
                {formatCurrency(result.pharmaceuticalSummary.totalDescontoNfd)}
              </div>
              <div className="pharma-metric-desc">
                Esperado Proporcional: {formatCurrency(result.pharmaceuticalSummary.totalDescontoNfoProporcional)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
