import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  Sparkles,
  Layers,
  X,
} from './Icons';

interface InstructionsModalProps {
  onClose: () => void;
}

type TabType = 'PASSOS' | 'REGRAS' | 'STATUS' | 'PIRAMIDE';

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('PASSOS');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container instructions-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="help-icon-box">
              <HelpCircle className="icon" />
            </div>
            <div>
              <h2 className="modal-title">Como Usar • Manual Operacional do Validador Fiscal</h2>
              <p className="modal-subtitle">Guia prático para conferência fiscal, regras Hebron & INFAN e entrada no ERP Pirâmide</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar Guia">
            <X className="icon-xs" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="instructions-nav-tabs">
          <button
            type="button"
            className={`instructions-nav-btn ${activeTab === 'PASSOS' ? 'active' : ''}`}
            onClick={() => setActiveTab('PASSOS')}
          >
            <Sparkles className="icon-xs" /> 1. Passo a Passo Rápido
          </button>
          <button
            type="button"
            className={`instructions-nav-btn ${activeTab === 'REGRAS' ? 'active' : ''}`}
            onClick={() => setActiveTab('REGRAS')}
          >
            <ShieldCheck className="icon-xs" /> 2. Regras Hebron & INFAN
          </button>
          <button
            type="button"
            className={`instructions-nav-btn ${activeTab === 'STATUS' ? 'active' : ''}`}
            onClick={() => setActiveTab('STATUS')}
          >
            <CheckCircle2 className="icon-xs" /> 3. O que Fazer nos Status
          </button>
          <button
            type="button"
            className={`instructions-nav-btn ${activeTab === 'PIRAMIDE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PIRAMIDE')}
          >
            <Layers className="icon-xs" /> 4. Pirâmide & Dicas
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body instructions-body">
          {/* TAB 1: PASSO A PASSO */}
          {activeTab === 'PASSOS' && (
            <div className="instructions-content-pane">
              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <span className="instruction-step-pill">PASSO 1</span>
                  <h4>Carregar os Arquivos (XML ou DANFE em PDF)</h4>
                </div>
                <p className="instruction-card-desc">
                  Você pode arrastar vários arquivos de uma só vez para a área de upload ou clicar para selecionar.
                </p>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>📄</span>
                    <div>
                      <strong>Formatos aceitos:</strong> Arquivos <code>.xml</code> ou <code>.pdf</code> (DANFE gerado em UniDANFE, Danfe View, Crystal, etc.).
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>🤖</span>
                    <div>
                      <strong>Classificação Automática:</strong> O sistema detecta sozinho quem é <strong>NFO (Saída Hebron)</strong> e quem é <strong>NFD (Devolução do Cliente)</strong> pelo CNPJ e modelo fiscal.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>🔗</span>
                    <div>
                      <strong>Vínculo Inteligente:</strong> Pareia notas <strong>1:1</strong> (uma NFD para uma NFO) ou <strong>1:N</strong> (uma NFD que devolve produtos de 2 ou mais NFOs faturadas em datas diferentes).
                    </div>
                  </div>
                </div>
              </div>

              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <span className="instruction-step-pill">PASSO 2</span>
                  <h4>Auditoria Automática em 1 Segundo</h4>
                </div>
                <p className="instruction-card-desc">
                  O robô fiscal cruza todos os itens da devolução com o que realmente foi faturado na saída da Hebron.
                </p>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>🔍</span>
                    <div>
                      <strong>Pareamento Multi-Lote com o mesmo EAN:</strong> Se a venda tiver o mesmo medicamento em lotes diferentes, o sistema busca o lote exato e não trava no primeiro item.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>⚖️</span>
                    <div>
                      <strong>Descontos Comerciais:</strong> Rateia o desconto centavo a centavo pela quantidade devolvida, sem gerar falso erro de preço.
                    </div>
                  </div>
                </div>
              </div>

              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <span className="instruction-step-pill">PASSO 3</span>
                  <h4>Conferir o Resultado nas 4 Seções Padronizadas</h4>
                </div>
                <p className="instruction-card-desc">
                  A tela organiza a análise em 4 blocos visuais simples e objetivos:
                </p>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>📌</span>
                    <div>
                      <strong>1. GERAL:</strong> Cabeçalho com emitente, destinatário, valores totais e consulta oficial direta à SEFAZ Nacional.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📌</span>
                    <div>
                      <strong>2. IMPOSTOS:</strong> Tríade comparativa exibindo: <em>1. Faturado Origem</em> x <em>2. Informado Cliente</em> x <em>3. Correto Esperável (Sistema)</em> para CFOP, ICMS, Base de Cálculo, ICMSS e PIS/COFINS (CST).
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📌</span>
                    <div>
                      <strong>3. ITENS:</strong> Tabela produto a produto com quantidades, preços unitários, descontos rateados e lotes ANVISA.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📌</span>
                    <div>
                      <strong>4. IMPOSTOS ITEM:</strong> Abra qualquer item clicando na setinha para ver a tributação detalhada (CFOP, ICMS e Base Reduzida/Cheia).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGRAS FISCAIS */}
          {activeTab === 'REGRAS' && (
            <div className="instructions-content-pane">
              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <ShieldCheck className="icon-xs text-primary" />
                  <h4>Regras de ICMS da INFAN (Baseada no CFOP da Saída)</h4>
                </div>
                <p className="instruction-card-desc">
                  A fábrica <strong>INFAN (Indústria PB)</strong> possui regras tributárias específicas determinadas pelo CFOP faturado na nota de saída (NFO):
                </p>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>🏭</span>
                    <div>
                      <strong>Vendas Internas PB (CFOP 5101 / 5102 / 5401 / 5403):</strong> Alíquota padrão de <strong>20,50%</strong>.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>🚚</span>
                    <div>
                      <strong>Vendas Interestaduais (CFOP 6101 / 6102 / 6403):</strong> Alíquota padrão de <strong>12,00%</strong>.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>🌴</span>
                    <div>
                      <strong>Zona Franca / Suframa (CFOP 6109 / 6110):</strong> Alíquota de <strong>0,00% (Isenção / Desoneração de ICMS)</strong>.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📉</span>
                    <div>
                      <strong>Redução de Base para Medicamentos (NCM 3004):</strong> Benefício fiscal de <strong>9,90% de redução</strong> (Base Efetiva = <strong>90,10%</strong> do valor líquido).
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>🧴</span>
                    <div>
                      <strong>Redução de Base para Cosméticos (NCMs 3401/3304/3307):</strong> Benefício fiscal de <strong>10,49% de redução</strong> (Base Efetiva = <strong>89,51%</strong> do valor líquido).
                    </div>
                  </div>
                </div>
                <div className="formula-box">
                  Base Esperada INFAN = (Valor Produto - Desconto Rateado) × 90,10% (Medicamentos)
                </div>
              </div>

              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <ShieldCheck className="icon-xs text-primary" />
                  <h4>Regras das Distribuidoras (Quesalon PB, Quesalon Extrema e Quedes)</h4>
                </div>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>🏢</span>
                    <div>
                      <strong>Base Cheia (100%):</strong> Na Quesalon PB, Quesalon Extrema (MG) e Quedes (AL), todos os NCMs operam com <strong>Base Cheia de 100%</strong> (sem redução de base).
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📍</span>
                    <div>
                      <strong>Quesalon Extrema (MG):</strong> 12,00% para Sul/Sudeste (exceto ES) e 7,00% para Norte, Nordeste, Centro-Oeste e ES.
                    </div>
                  </div>
                </div>
              </div>

              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <ShieldCheck className="icon-xs text-primary" />
                  <h4>Fórmula Oficial do Desconto Comercial Proporcional</h4>
                </div>
                <p className="instruction-card-desc">
                  Em devoluções parciais, o cliente não pode devolver o desconto total da nota, mas sim a fração exata do item:
                </p>
                <div className="formula-box">
                  Desconto Unitário = Desconto da NFO ÷ Qtd Faturada na NFO<br />
                  Desconto Devolvido = Desconto Unitário × Qtd Devolvida na NFD
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: O QUE FAZER NOS STATUS */}
          {activeTab === 'STATUS' && (
            <div className="instructions-content-pane">
              <div className="status-guide-grid">
                <div className="status-guide-row approved">
                  <h4 className="status-guide-title">
                    <CheckCircle2 className="icon-xs success" /> 🟢 CONFORME • LIBERADA PARA ENTRADA
                  </h4>
                  <p className="instruction-card-desc">
                    <strong>Significado:</strong> Todos os preços unitários, quantidades, descontos rateados, lotes e tributos batem com a Nota de Origem.
                  </p>
                  <div className="instruction-bullet-item">
                    <span>👉</span>
                    <div>
                      <strong>O que fazer:</strong> Liberar o recebimento físico na doca e dar entrada no ERP Pirâmide com total tranquilidade.
                    </div>
                  </div>
                </div>

                <div className="status-guide-row warning">
                  <h4 className="status-guide-title">
                    <AlertTriangle className="icon-xs warning" /> 🟡 DIVERGÊNCIAS LEVES • CONFERÊNCIA SUGERIDA
                  </h4>
                  <p className="instruction-card-desc">
                    <strong>Significado:</strong> A nota está comercialmente correta, mas possui alertas operacionais (ex: cliente usou CFOP diferente do sugerido ou omitiu a redução de base da INFAN emitindo Base Cheia).
                  </p>
                  <div className="instruction-bullet-item">
                    <span>👉</span>
                    <div>
                      <strong>O que fazer:</strong> O sistema aponta o NDO de entrada correto no Pirâmide. Se necessário, solicitar Carta de Correção (CC-e) de CFOP ao cliente.
                    </div>
                  </div>
                </div>

                <div className="status-guide-row rejected">
                  <h4 className="status-guide-title">
                    <XCircle className="icon-xs danger" /> 🔴 ENTRADA BLOQUEADA • DIVERGÊNCIAS CRÍTICAS
                  </h4>
                  <p className="instruction-card-desc">
                    <strong>Significado:</strong> Erros graves que violam o Princípio da Nota Espelho (preço unitário diferente, quantidade devolvida maior que a venda, lote divergente ou lote inexistente).
                  </p>
                  <div className="instruction-bullet-item">
                    <span>👉</span>
                    <div>
                      <strong>O que fazer:</strong> Bloquear a descarga! Clique no botão vermelho <strong>"Gerar Laudo de Divergência"</strong> para baixar o laudo em TXT/CSV e notificar o cliente para refazer a nota antes do recebimento.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PIRÂMIDE & DICAS */}
          {activeTab === 'PIRAMIDE' && (
            <div className="instructions-content-pane">
              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <Layers className="icon-xs text-primary" />
                  <h4>Assistente Tático Copilot Pirâmide (1-Clique)</h4>
                </div>
                <p className="instruction-card-desc">
                  Na barra retrátil do Copilot, você tem acesso instantâneo a todos os campos necessários para digitação rápida:
                </p>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>⚡</span>
                    <div>
                      <strong>Atalhos de Teclado:</strong> Use <code>Ctrl+1</code> a <code>Ctrl+6</code> para copiar Chave de Acesso, Protocolo SEFAZ, Nº da NF, NDO de Entrada, Almoxarifado e Valores.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>💾</span>
                    <div>
                      <strong>Carga SQL Automática:</strong> O botão <em>"Copiar Carga SQL Pirâmide"</em> gera o comando INSERT completo pronto para rodar nas tabelas de integração do Pirâmide (<code>TI_ENTRADA_CAB</code>, <code>TI_ITEM_ENTRADA</code> e <code>TI_ITEM_ENTRADA_LOTE</code>).
                    </div>
                  </div>
                </div>
              </div>

              <div className="instruction-feature-card">
                <div className="instruction-card-header">
                  <FileText className="icon-xs text-primary" />
                  <h4>Exportação de Laudos e Planilhas</h4>
                </div>
                <div className="instruction-bullets">
                  <div className="instruction-bullet-item">
                    <span>📊</span>
                    <div>
                      <strong>Exportar Lote (CSV):</strong> Baixa uma planilha completa com todos os pares auditados, métricas fiscais, motivos de devolução e almoxarifados.
                    </div>
                  </div>
                  <div className="instruction-bullet-item">
                    <span>📄</span>
                    <div>
                      <strong>Laudo de Divergência em TXT/CSV:</strong> Quando uma nota for bloqueada, gere um documento formal com todos os itens reprovados para enviar por e-mail ao cliente.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-primary">
            Entendi, Voltar para a Operação
          </button>
        </div>
      </div>
    </div>
  );
};
