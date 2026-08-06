import React, { useEffect } from 'react';
import { ReconciliationResult } from '../types/nfe';
import { useClipboard } from '../hooks/useClipboard';
import { Copy, Check, Keyboard, Sparkles } from './Icons';

interface DataBridgeCopilotProps {
  result: ReconciliationResult;
}

export const DataBridgeCopilot: React.FC<DataBridgeCopilotProps> = ({ result }) => {
  const { nfd, nfo, itemComparisons } = result;
  const { copiedKey, copyToClipboard } = useClipboard(2000);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (val: number) => {
    return val.toFixed(2).replace('.', ',');
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          copyToClipboard(nfd.chNFe, 'chave');
        } else if (e.key === '2') {
          e.preventDefault();
          copyToClipboard(nfd.nProt || '', 'protocolo');
        } else if (e.key === '3') {
          e.preventDefault();
          copyToClipboard(nfd.nNF, 'nNF');
        } else if (e.key === '4') {
          e.preventDefault();
          copyToClipboard(nfo.nNF, 'nfoNf');
        } else if (e.key === '5') {
          e.preventDefault();
          copyToClipboard(formatCurrency(nfd.totals.vNF), 'total');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nfd, nfo, copyToClipboard]);

  // Format all items for 1-click batch copy into ERP
  const generateFormattedItemsBatchText = () => {
    return itemComparisons
      .map(c => {
        const item = c.nfdItem;
        const lote = item.batches.map(b => b.nLote).join('/') || 'S/LOTE';
        return `Item: ${item.nItem} | Cod: ${item.cProd} | EAN: ${item.cEAN} | Qtd: ${item.qCom} ${item.uCom} | Preço: ${formatCurrency(item.vUnCom)} | Total: ${formatCurrency(item.vProd)} | Lote: ${lote}`;
      })
      .join('\n');
  };

  return (
    <div className="copilot-section">
      <div className="copilot-header">
        <div className="copilot-title-group">
          <div className="copilot-icon-box">
            <Sparkles className="icon" />
          </div>
          <div>
            <h3 className="copilot-title">Assistente de Lançamento Tático (Ponte ERP CIEG)</h3>
            <p className="copilot-subtitle">
              Valores conferidos e prontos para cópia em 1-clique. Elimina a digitação manual de notas no sistema.
            </p>
          </div>
        </div>

        <div className="keyboard-shortcuts-hint">
          <Keyboard className="icon-xs" />
          <span>Atalhos: Ctrl+1 (Chave) | Ctrl+2 (Protocolo) | Ctrl+3 (Nº NFD) | Ctrl+4 (Nº NFO)</span>
        </div>
      </div>

      {/* Grid of Copy Fields */}
      <div className="copilot-fields-grid">
        {/* Chave de Acesso */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">1. Chave de Acesso NFD</span>
            <span className="shortcut-badge">Ctrl+1</span>
          </div>
          <div className="field-input-group">
            <input type="text" readOnly value={nfd.chNFe} className="field-input font-mono" />
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

        {/* Protocolo SEFAZ */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">2. Protocolo de Autorização</span>
            <span className="shortcut-badge">Ctrl+2</span>
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

        {/* Número NFD */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">3. Nº da Nota de Devolução (NFD)</span>
            <span className="shortcut-badge">Ctrl+3</span>
          </div>
          <div className="field-input-group">
            <input type="text" readOnly value={nfd.nNF} className="field-input font-mono" />
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

        {/* Número NFO Origem */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">4. Nº da Nota de Origem (NFO)</span>
            <span className="shortcut-badge">Ctrl+4</span>
          </div>
          <div className="field-input-group">
            <input type="text" readOnly value={nfo.nNF} className="field-input font-mono" />
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

        {/* Data de Emissão */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">5. Data de Emissão</span>
          </div>
          <div className="field-input-group">
            <input type="text" readOnly value={formatDate(nfd.dhEmi)} className="field-input font-mono" />
            <button
              type="button"
              className={`btn-copy ${copiedKey === 'dtEmi' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(formatDate(nfd.dhEmi), 'dtEmi')}
            >
              {copiedKey === 'dtEmi' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
              {copiedKey === 'dtEmi' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Valor Total Devolvido */}
        <div className="copilot-field-card">
          <div className="field-meta">
            <span className="field-label">6. Valor Total Devolvido (R$)</span>
            <span className="shortcut-badge">Ctrl+5</span>
          </div>
          <div className="field-input-group">
            <input type="text" readOnly value={formatCurrency(nfd.totals.vNF)} className="field-input font-mono" />
            <button
              type="button"
              className={`btn-copy ${copiedKey === 'total' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(formatCurrency(nfd.totals.vNF), 'total')}
            >
              {copiedKey === 'total' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
              {copiedKey === 'total' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Copy Section for Items */}
      <div className="batch-items-copy-box">
        <div className="batch-header">
          <div>
            <h4 className="batch-title">Cópia em Lote dos Itens Validados</h4>
            <p className="batch-sub">Copia a lista estruturada de itens e lotes formatada para colagem direta.</p>
          </div>

          <button
            type="button"
            className={`btn btn-primary ${copiedKey === 'batchItems' ? 'btn-success' : ''}`}
            onClick={() => copyToClipboard(generateFormattedItemsBatchText(), 'batchItems')}
          >
            {copiedKey === 'batchItems' ? <Check className="icon-sm" /> : <Copy className="icon-sm" />}
            {copiedKey === 'batchItems' ? 'Lista Completa Copiada!' : 'Copiar Todos os Itens em Bloco'}
          </button>
        </div>

        <pre className="batch-preview-code font-mono">{generateFormattedItemsBatchText()}</pre>
      </div>
    </div>
  );
};
