import React from 'react';
import { ReconciliationResult } from '../types/nfe';
import { generateDiscrepancyReport } from '../services/reportGenerator';
import { useClipboard } from '../hooks/useClipboard';
import { X, Copy, Check, FileText, Download } from './Icons';

interface DiscrepancyReportModalProps {
  result: ReconciliationResult;
  onClose: () => void;
}

export const DiscrepancyReportModal: React.FC<DiscrepancyReportModalProps> = ({ result, onClose }) => {
  const reportText = generateDiscrepancyReport(result);
  const { copiedKey, copyToClipboard } = useClipboard(2500);

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Laudo_Divergencia_NFD_${result.nfd.nNF}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadCsv = () => {
    const csvRows: string[] = [
      'Item;Status;Produto NFD;NCM;Categoria;ANVISA;EAN;Qtd Devolvida;Preco NFD;Preco NFO;Desc NFD;Desc Esperado NFO;Desc Proporcional;Lote NFD;Lote NFO;Almoxarifado Piramide;Inconsistencias',
    ];

    result.itemComparisons.forEach(c => {
      const nfdItem = c.nfdItem;
      const nfoItem = c.nfoItem;
      const status = c.issues.some(i => i.severity === 'CRITICAL')
        ? 'REJEITADO'
        : c.issues.some(i => i.severity === 'WARNING')
        ? 'ATENCAO'
        : 'OK';
      const ncm = nfdItem.ncm || '';
      const categoria = c.ncmProfile?.categoryLabel || 'Geral';
      const anvisa = nfdItem.med?.cProdANVISA || '';
      const descNfd = (nfdItem.vDesc || 0).toFixed(2);
      const descEsperado = c.discountAudit ? c.discountAudit.expectedDiscount.toFixed(2) : '0.00';
      const descPropOk = c.discountAudit ? (c.discountAudit.isProportional ? 'SIM' : 'NAO') : 'SIM';
      const lotesNfd = nfdItem.batches.map(b => b.nLote).join('/') || 'SEM LOTE';
      const lotesNfo = nfoItem ? nfoItem.batches.map(b => b.nLote).join('/') || 'SEM LOTE' : 'N/A';
      const almox = c.piramideResolution?.almoxarifado || result.piramideResolution?.almoxarifado || 'ALMOX';
      const issuesStr = c.issues.map(i => i.title).join(' | ') || 'Nenhuma';

      csvRows.push(
        `${nfdItem.nItem};"${status}";"${nfdItem.xProd.replace(/"/g, '""')}";"${ncm}";"${categoria}";"${anvisa}";"${nfdItem.cEAN}";${nfdItem.qCom};${nfdItem.vUnCom.toFixed(2)};${nfoItem ? nfoItem.vUnCom.toFixed(2) : 0};${descNfd};${descEsperado};"${descPropOk}";"${lotesNfd}";"${lotesNfo}";"${almox}";"${issuesStr}"`
      );
    });


    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM for Excel
    const element = document.createElement('a');
    const file = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Laudo_Divergencia_NFD_${result.nfd.nNF}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText className="icon danger" />
            <div>
              <h3 className="modal-title">Laudo de Divergência Fiscal (Pró-Coleta)</h3>
              <p className="modal-subtitle">
                Notificação formal para ser enviada ao cliente via E-mail ou WhatsApp antes da coleta físico-fiscal.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="icon" />
          </button>
        </div>

        <div className="modal-body">
          <pre className="report-text-area font-mono">{reportText}</pre>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={handleDownloadTxt} className="btn btn-secondary">
            <Download className="icon-xs" /> Baixar em .TXT
          </button>

          <button type="button" onClick={handleDownloadCsv} className="btn btn-secondary">
            <Download className="icon-xs" /> Baixar Excel (.CSV)
          </button>

          <button
            type="button"
            className={`btn btn-primary ${copiedKey === 'report' ? 'btn-success' : ''}`}
            onClick={() => copyToClipboard(reportText, 'report')}
          >
            {copiedKey === 'report' ? <Check className="icon-xs" /> : <Copy className="icon-xs" />}
            {copiedKey === 'report' ? 'Laudo Copiado!' : 'Copiar Texto do Laudo'}
          </button>
        </div>
      </div>
    </div>
  );
};
