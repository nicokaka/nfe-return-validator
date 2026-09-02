import React, { useState } from 'react';
import { ReconciliationResult, ValidationIssue } from '../types/nfe';
import { X, AlertTriangle, ShieldAlert, Loader2 } from './Icons';

interface FiscalOverrideModalProps {
  result: ReconciliationResult;
  criticalIssues: ValidationIssue[];
  isLaunching: boolean;
  onConfirm: (overrideData: { approver: string; justification: string }) => void;
  onClose: () => void;
}

export const FiscalOverrideModal: React.FC<FiscalOverrideModalProps> = ({
  result,
  criticalIssues,
  isLaunching,
  onConfirm,
  onClose,
}) => {
  const [approver, setApprover] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  const isFormValid =
    approver.trim().length >= 3 &&
    justification.trim().length >= 10 &&
    acknowledged &&
    !isLaunching;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    onConfirm({
      approver: approver.trim(),
      justification: justification.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container fiscal-override-modal-container"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header border-b pb-3">
          <div className="modal-title-group flex items-center gap-3">
            <div className="p-2 rounded bg-warning-subtle text-warning">
              <ShieldAlert className="icon-md" />
            </div>
            <div>
              <h3 className="modal-title text-base font-weight-700 text-warning">
                Protocolo de Liberação Fiscal com Ressalva
              </h3>
              <p className="modal-subtitle text-xs text-muted">
                NFD {result.nfd.nNF} (Série {result.nfd.serie}) • Governança Corporativa Hebron
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon text-muted hover:text-primary"
            onClick={onClose}
            disabled={isLaunching}
          >
            <X className="icon-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body py-4 flex flex-col gap-4">
            {/* Banner de Aviso Legal */}
            <div className="p-3 rounded border bg-warning-subtle text-xs" style={{ borderColor: 'rgba(245, 158, 11, 0.35)' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="icon-xs text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-warning block font-weight-600">
                    Atenção: Lançamento em Regime Excepcional
                  </strong>
                  Esta nota fiscal possui <strong>{criticalIssues.length} divergência(s) fiscal(is) crítica(s)</strong> em relação à nota de origem faturada. A integração direta no ERP Pirâmide sob ressalva contábil registrará a liberação em regime de contingência com trilha de auditoria.
                </div>
              </div>
            </div>

            {/* Lista das Divergências Impeditivas */}
            <div>
              <span className="text-xs font-weight-600 text-muted block mb-2">
                INCONSISTÊNCIAS IDENTIFICADAS PELO AUDITOR FISCAL:
              </span>
              <div className="fiscal-issues-scroll-box p-2 rounded border bg-surface flex flex-col gap-2" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {criticalIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-danger font-mono">
                    <span className="font-weight-700 flex-shrink-0">✕</span>
                    <div>
                      <strong>{issue.title}:</strong> {issue.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário de Auditoria */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-weight-600 text-primary block mb-1">
                  Responsável pela Autorização Fiscal <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="field-input w-full text-xs font-mono"
                  placeholder="Ex: Polliana (Gerência Fiscal) ou Glécia Alhandra"
                  value={approver}
                  onChange={e => setApprover(e.target.value)}
                  disabled={isLaunching}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-weight-600 text-primary block mb-1">
                  Justificativa Operacional / Fiscal da Exceção <span className="text-danger">*</span>
                </label>
                <textarea
                  className="field-input w-full text-xs"
                  rows={3}
                  placeholder="Descreva o motivo comercial, acordo ou autorização que fundamenta a liberação desta nota com divergência (mínimo 10 caracteres)..."
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  disabled={isLaunching}
                  required
                />
              </div>

              {/* Checkbox de Termo de Responsabilidade */}
              <label className="flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-surface" style={{ borderColor: 'var(--border-color)' }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  disabled={isLaunching}
                />
                <span className="text-xs text-muted leading-relaxed">
                  Declaro que esta liberação foi devidamente autorizada pela supervisão fiscal e estou ciente da gravação de auditoria contábil nas tabelas de integração do ERP Pirâmide.
                </span>
              </label>
            </div>
          </div>

          <div className="modal-footer border-t pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={onClose}
              disabled={isLaunching}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn btn-warning text-xs font-weight-700 flex items-center gap-1.5"
              disabled={!isFormValid || isLaunching}
              style={{
                background: isFormValid ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : undefined,
                color: isFormValid ? '#ffffff' : undefined,
              }}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="icon-xs animate-spin" />
                  Gravando com Ressalva...
                </>
              ) : (
                <>
                  <ShieldAlert className="icon-xs" />
                  Confirmar Liberação com Ressalva
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
