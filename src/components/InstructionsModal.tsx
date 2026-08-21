import React from 'react';
import { HelpCircle, CheckCircle2, X } from './Icons';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container instructions-modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="help-icon-box">
              <HelpCircle className="icon" />
            </div>
            <div>
              <h2 className="modal-title">Guia de Operação & Regras Fiscais</h2>
              <p className="modal-subtitle">Como utilizar o Validador Fiscal de Devoluções (NFO x NFD)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="icon-xs" />
          </button>
        </div>

        <div className="modal-body instructions-body">
          {/* Section 1: Objective */}
          <div className="guide-section">
            <h3 className="guide-section-title">🎯 Objetivo da Ferramenta</h3>
            <p className="guide-text">
              O <strong>Validador Fiscal de Devoluções</strong> foi desenvolvido para eliminar digitação manual no <strong>ERP Pirâmide</strong> e impedir a entrada física/fiscal de notas de devolução emitidas incorretamente pelos clientes. O sistema cruza <strong>item a item</strong> a Nota de Devolução (NFD) contra a Nota de Origem de Venda (NFO), sugerindo automaticamente NDO, Motivos de Devolução e Almoxarifados de Destino.
            </p>
          </div>

          {/* Section 2: Step by Step */}
          <div className="guide-section">
            <h3 className="guide-section-title">🚀 Passo a Passo de Uso</h3>

            <div className="steps-timeline">
              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Carregar a Nota de Origem (Slot Azul)</h4>
                  <p>
                    Arraste ou selecione o arquivo (XML, DANFE PDF ou TXT) da <strong>Nota de Venda original</strong> emitida pela nossa empresa (Quesalon) para o cliente.
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Carregar a Nota do Cliente (Slot Laranja)</h4>
                  <p>
                    Arraste ou selecione o arquivo da <strong>Nota de Devolução</strong> emitida pelo cliente (ex: Tapajós). Se arrastar ambos os arquivos de uma vez em qualquer lugar, o robô classifica automaticamente!
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Iniciar a Auditoria no Robô Central</h4>
                  <p>
                    Com os dois slots preenchidos, o <strong>Robô Auditor Fiscal</strong> será ativado. Clique em <strong>"INICIAR AUDITORIA"</strong> para executar o cruzamento em 4 camadas em milissegundos.
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>Lançamento Rápido no ERP (Copilot Pirâmide 1-Clique)</h4>
                  <p>
                    Utilize os botões do <strong>Assistente Tático Pirâmide</strong> ou atalhos de teclado (<code>Ctrl+1</code> a <code>Ctrl+6</code>) para copiar Chave, Protocolo SEFAZ, Nº da NF, NDO de Entrada, Almoxarifado Destino e Valores diretamente para o sistema.
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">5</div>
                <div className="step-content">
                  <h4>Notificar Cliente em Caso de Bloqueio</h4>
                  <p>
                    Se houver divergência crítica (como lote ausente ou preço diferente), clique em <strong>"Gerar Laudo Pró-Coleta"</strong> para emitir o relatório formal e enviar ao cliente antes do envio do caminhão.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Checked Rules */}
          <div className="guide-section">
            <h3 className="guide-section-title">🛡️ Regras de Validação Auditadas</h3>

            <div className="rules-grid">
              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Vínculo de Origem (NFref)
                </div>
                <p>Verifica se a NFD cita explicitamente a chave de 44 dígitos da NFO original.</p>
              </div>

              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Rastreabilidade de Lotes
                </div>
                <p>Garante que a NFD possui a tag <code>&lt;rastro&gt;</code> e que o lote bate com os lotes expedidos na venda.</p>
              </div>

              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Preço Unitário & Descontos
                </div>
                <p>Confere se o preço por unidade bate exatamente com o valor faturado originalmente.</p>
              </div>

              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Alíquotas de ICMS e IPI
                </div>
                <p>Valida alíquotas fiscais, reconhecendo variações normais de CST em devoluções.</p>
              </div>

              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Direcionamento de Almoxarifados
                </div>
                <p>Mapeia os 51 motivos da planilha oficial para os 12 almoxarifados do ERP Pirâmide (GQ, AVARIA, VC, EXPEDI, etc.).</p>
              </div>

              <div className="rule-card">
                <div className="rule-header">
                  <CheckCircle2 className="icon-xs success" /> Quantidade Devolvida vs Faturada
                </div>
                <p>Calcula devoluções totais (100%), parciais (% com saldo remanescente) e bloqueia devoluções com quantidades excedentes.</p>
              </div>
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-primary">
            Entendi, Voltar para Operação
          </button>
        </div>
      </div>
    </div>
  );
};
