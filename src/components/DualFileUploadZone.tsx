import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Trash2,
  Sparkles,
  CheckCircle2,
  Bot,
  ArrowRight,
  ArrowLeft,
  Cpu,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Building2,
  RefreshCw,
} from './Icons';
import { LoadedFile } from '../hooks/useReconciliation';

interface DualFileUploadZoneProps {
  loadedFiles: LoadedFile[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onRunReconciliation: () => void;
  onLoadSamples: () => void;
  isAnalyzing: boolean;
  hasResult?: boolean;
  isReadingFiles?: boolean;
  readingProgress?: {
    current: number;
    total: number;
    fileName: string;
    stage: 'reading' | 'extracting_pdf' | 'parsing_xml';
  } | null;
}

export const DualFileUploadZone: React.FC<DualFileUploadZoneProps> = ({
  loadedFiles,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  onRunReconciliation,
  onLoadSamples,
  isAnalyzing,
  hasResult = false,
  isReadingFiles = false,
  readingProgress = null,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically collapse when results are generated
  useEffect(() => {
    if (hasResult) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [hasResult]);

  const nfoFiles = loadedFiles.filter(f => f.doc.nfeType === 'NFO');
  const nfdFiles = loadedFiles.filter(f => f.doc.nfeType === 'NFD');
  const unknownFiles = loadedFiles.filter(f => f.doc.nfeType === 'UNKNOWN');

  const canAnalyze = loadedFiles.length >= 2 && nfoFiles.length > 0 && nfdFiles.length > 0;

  // Dynamic Tactical Telemetry
  const getRobotTelemetry = () => {
    if (isAnalyzing) {
      return {
        status: 'working',
        badge: 'Processando...',
        message: 'Cruzando dados das notas, lotes e referências fiscais...',
        actionText: 'PROCESSANDO...',
      };
    }

    if (nfoFiles.length > 0 && nfdFiles.length > 0) {
      return {
        status: 'ready',
        badge: 'Pronto',
        message: `Pronto para cruzar ${nfdFiles.length} Devolução(ões) com ${nfoFiles.length} Nota(s) de Origem.`,
        actionText: 'INICIAR AUDITORIA',
      };
    }

    if (nfoFiles.length > 0 && nfdFiles.length === 0) {
      return {
        status: 'waiting',
        badge: 'Falta NFD',
        message: `${nfoFiles.length} NFO carregada(s). Adicione a Nota de Devolução (NFD) para continuar.`,
        actionText: 'AGUARDANDO NFD',
      };
    }

    if (nfdFiles.length > 0 && nfoFiles.length === 0) {
      return {
        status: 'waiting',
        badge: 'Falta NFO',
        message: `${nfdFiles.length} NFD carregada(s). Adicione a Nota de Origem (NFO) para continuar.`,
        actionText: 'AGUARDANDO NFO',
      };
    }

    return {
      status: 'waiting',
      badge: 'Aguardando',
      message: 'Adicione pelo menos 1 NFO e 1 NFD para iniciar.',
      actionText: 'INICIAR AUDITORIA',
    };
  };

  const telemetry = getRobotTelemetry();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  if (hasResult && isCollapsed) {
    return (
      <div className="batch-collapsed-bar" onClick={() => setIsCollapsed(false)}>
        <div className="collapsed-bar-info">
          <CheckCircle2 className="icon-sm success" />
          <span>
            <strong>{loadedFiles.length} nota(s) auditada(s)</strong> ({nfoFiles.length} Origem + {nfdFiles.length} Devolução)
          </span>
        </div>

        <button type="button" className="btn btn-secondary btn-sm btn-manage-drawer" onClick={() => setIsCollapsed(false)}>
          <ChevronDown className="icon-xs chevron-animated" /> Gerenciar Notas Carregadas
        </button>
      </div>
    );
  }

  return (
    <div className="batch-upload-section">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".xml,.pdf,.txt,.json"
        style={{ display: 'none' }}
      />

      {/* Overlay Animado de Leitura de Arquivos (Feedback Visual Imediato) */}
      {isReadingFiles && (
        <div className="pdf-reading-overlay">
          <div className="pdf-reading-card">
            <div className="pdf-reading-spinner-box">
              <RefreshCw className="icon-spin text-primary" />
            </div>
            <div className="pdf-reading-info">
              <div className="pdf-reading-title">
                Lendo e Processando Documento Fiscal ({readingProgress?.current || 1} de {readingProgress?.total || 1})
              </div>
              <div className="pdf-reading-filename font-mono">
                📄 {readingProgress?.fileName || 'Carregando arquivo...'}
              </div>
              <div className="pdf-reading-desc">
                {readingProgress?.stage === 'extracting_pdf'
                  ? '⚡ Extraindo texto do DANFE em PDF via OCR vetorial... Identificando produtos, lotes ANVISA e tributos...'
                  : '⚡ Decodificando estrutura XML da NF-e e validando chaves de acesso da SEFAZ...'}
              </div>
              <div className="pdf-reading-progress-bar">
                <div
                  className="pdf-reading-progress-fill"
                  style={{
                    width: `${Math.round(((readingProgress?.current || 1) / (readingProgress?.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {loadedFiles.length === 0 ? (
        /* Empty State Drop Zone */
        <div
          className={`batch-empty-dropzone ${isDragOver ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-glow-aura"></div>
          <div className="dropzone-icon-box">
            <UploadCloud className="drop-icon" />
          </div>

          <h3 className="dropzone-main-title">Arraste suas Notas Fiscais em Lote aqui</h3>
          <p className="dropzone-sub-title">
            Suporta até <strong>250 notas fiscais (XML da SEFAZ ou DANFE em PDF)</strong> misturadas.
            O robô classifica, extrai lotes/impostos e pareia automaticamente por referência fiscal.
          </p>

          <div className="dropzone-actions-group">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={e => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <UploadCloud className="icon-sm" /> Selecionar Múltiplos Arquivos
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={e => {
                e.stopPropagation();
                onLoadSamples();
              }}
            >
              <Sparkles className="icon-sm success" /> Carregar Amostras (Demo)
            </button>
          </div>
        </div>
      ) : (
        /* Populated Batch File Manager + Central Robot Node */
        <div className="batch-populated-panel">
          {/* Top Classification Bar */}
          <div className="batch-panel-header">
            <div className="batch-counts-group">
              <h4 className="batch-panel-title">
                <Layers className="icon-sm" /> {loadedFiles.length} Arquivo(s) Carregado(s)
              </h4>
              <div className="classification-badges">
                <span className="badge-pill nfo">
                  <ArrowRight className="icon-xs" /> {nfoFiles.length} Origem (NFO)
                </span>
                <span className="badge-pill nfd">
                  <ArrowLeft className="icon-xs" /> {nfdFiles.length} Devolução (NFD)
                </span>
                {unknownFiles.length > 0 && (
                  <span className="badge-pill unknown">
                    {unknownFiles.length} Outro(s)
                  </span>
                )}
              </div>
            </div>

            <div className="batch-panel-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                + Adicionar Mais
              </button>
              {hasResult && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCollapsed(true)}
                >
                  <ChevronUp className="icon-xs" /> Ocultar Painel
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm btn-danger-outline" onClick={onClearAll}>
                <Trash2 className="icon-xs" /> Limpar Tudo
              </button>
            </div>
          </div>

          {/* Horizontally Scrollable Loaded File Chips */}
          <div className="batch-file-chips-container">
            {loadedFiles.map(file => {
              const isLongNumericKey = /^\d{20,}/.test(file.name.replace(/\D/g, ''));
              const displayName = isLongNumericKey ? `Nota nº ${file.doc.nNF}` : file.name;
              const typeLabel = file.doc.nfeType === 'NFO' ? 'NFO • SAÍDA' : file.doc.nfeType === 'NFD' ? 'NFD • DEVOLUÇÃO' : 'XML';

              return (
                <div key={file.id} className={`file-chip chip-${file.doc.nfeType.toLowerCase()}`}>
                  <span className={`chip-type-tag tag-${file.doc.nfeType.toLowerCase()}`}>
                    {typeLabel}
                  </span>
                  <div className="chip-info">
                    <span className="chip-name" title={file.name}>
                      {displayName}
                    </span>
                    <span className="chip-meta">
                      {file.doc.emit?.xNome ? file.doc.emit.xNome.slice(0, 20) + '...' : `NF nº ${file.doc.nNF}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => onRemoveFile(file.id)}
                    title="Remover este arquivo"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Futuristic Cybernetic AI Robot Action Hub */}
          <div className={`batch-robot-action-card status-${telemetry.status} ${isAnalyzing ? 'analyzing' : ''}`}>
            <div className="robot-card-left-group">
              {/* Animated AI Holographic Core */}
              <div className="robot-ai-avatar">
                <div className="robot-orbital-glow"></div>
                <div className="robot-pulse-ring"></div>
                <div className="robot-core-hex">
                  <Bot className="robot-core-icon" />
                </div>
                <div className="robot-sparkle-badge">
                  <Sparkles className="icon-xxs" />
                </div>
              </div>

              <div className="robot-action-details">
                <div className="robot-action-title-row">
                  <h4 className="robot-action-title">
                    Auditor Fiscal
                  </h4>
                  <span className={`robot-status-pill pill-${telemetry.status}`}>
                    {telemetry.badge}
                  </span>
                </div>

                <p className="robot-action-sub">
                  {telemetry.message}
                </p>

                {/* Telemetry Feature Badges */}
                <div className="robot-telemetry-tags">
                  <span className="telemetry-tag">
                    <ShieldCheck className="icon-xxs" /> NT 2021.004
                  </span>
                  <span className="telemetry-tag">
                    <Layers className="icon-xxs" /> Pareamento 1:1 / 1:N
                  </span>
                  <span className="telemetry-tag">
                    <Building2 className="icon-xxs" /> ERP Pirâmide
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRunReconciliation}
              disabled={!canAnalyze || isAnalyzing}
              className={`btn-cyber-audit ${canAnalyze ? 'btn-active-glow' : 'btn-disabled'} ${isAnalyzing ? 'btn-analyzing' : ''}`}
            >
              {isAnalyzing ? (
                <>
                  <Cpu className="icon-xs spin-infinite" />
                  <span>PROCESSANDO LOTE...</span>
                </>
              ) : (
                <>
                  <Zap className="icon-xs" />
                  <span>{telemetry.actionText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
