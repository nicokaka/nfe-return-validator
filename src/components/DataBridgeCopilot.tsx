import React, { useState } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { useClipboard } from '../hooks/useClipboard';
import { Copy, Check, Sparkles, Building2, PackageCheck, AlertTriangle, Layers, Tag, ShieldCheck, ChevronDown, Database, Trash2 } from './Icons';
import { PIRAMIDE_MOTIVOS, PIRAMIDE_WAREHOUSES } from '../data/piramideData';
import { formatFiscalDate, formatCNPJ } from '../utils/dateUtils';
import { generatePiramideOracleTiInsertScript, generatePiramideOracleTiDeleteScript } from '../services/piramideService';

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

  const currentMotivo = PIRAMIDE_MOTIVOS.find(m => m.code === selectedMotivoCode);

  const handleMotivoChange = (code: string) => {
    setSelectedMotivoCode(code);
    const m = PIRAMIDE_MOTIVOS.find(item => item.code === code);
    if (m && m.isAutomatic) {
      setSelectedWarehouse(m.almoxarifado);
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
        </div>
      </div>

      {/* Seção 5: Integração Direta ERP Pirâmide (Oracle TI) */}
      <div className="copilot-block copilot-ti-integration-block">
        <div className="batch-header">
          <div>
            <h4 className="copilot-block-title">
              <Database className="icon-xs" /> 5. Carga Direta nas Tabelas de Integração (TI Oracle)
            </h4>
            <p className="batch-sub">
              Gera o script PL/SQL transacional pronto para o <strong>PL/SQL Developer</strong> (Servidor .61) com amarração automática de Cabeçalho, Itens, Lotes e NDO.
            </p>
          </div>

          <div className="batch-actions-group">
            <button
              type="button"
              className={`btn btn-secondary ${copiedKey === 'tiRollback' ? 'btn-danger' : ''}`}
              onClick={() => copyToClipboard(generatePiramideOracleTiDeleteScript(result), 'tiRollback')}
              title="Copia o script para deletar/limpar a nota de teste do banco Oracle sem deixar resíduos"
            >
              <Trash2 className="icon-xs" />
              {copiedKey === 'tiRollback' ? 'Script de Limpeza Copiado!' : 'Copiar Script Limpeza (Rollback)'}
            </button>

            <button
              type="button"
              className={`btn btn-accent ${copiedKey === 'tiScript' ? 'btn-success' : ''}`}
              onClick={() => copyToClipboard(generatePiramideOracleTiInsertScript(result, { selectedWarehouse }), 'tiScript')}
              title="Gera e copia o bloco PL/SQL completo com INSERTs em TI_NOTA_FISCAL_ENTRADA, TI_ITEM e TI_LOTE"
            >
              {copiedKey === 'tiScript' ? <Check className="icon-xs" /> : <Database className="icon-xs" />}
              {copiedKey === 'tiScript' ? 'Script PL/SQL Copiado!' : 'Copiar Script PL/SQL (Oracle TI)'}
            </button>
          </div>
        </div>

        <div className="ti-status-banner">
          <span className="badge badge-info font-mono">SISTEMA: 'VAL'</span>
          <span className="badge badge-neutral font-mono">STATUS: 'NP'</span>
          <span className="badge badge-purple font-mono">ALMOXARIFADO: {selectedWarehouse}</span>
          <span className="text-muted text-xs">
            💡 Cole na SQL Window do PL/SQL Developer e pressione <strong>F8</strong>. O Job do Pirâmide assumirá o processamento em ~60s.
          </span>
        </div>
      </div>
    </div>
  );
};
