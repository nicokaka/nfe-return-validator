import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, Play, Sparkles, CheckCircle2, Bot, ArrowRight, ArrowLeft, Cpu, X, Layers, ChevronDown, ChevronUp } from './Icons';
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

  const canAnalyze = loadedFiles.length >= 2;

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

        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCollapsed(false)}>
          <ChevronDown className="icon-xs" /> Gerenciar Notas Carregadas
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
            Suporta até <strong>250 notas fiscais misturadas</strong> (Venda NFO e Devolução NFD).
            O robô classifica e pareia automaticamente por referência fiscal.
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

              return (
                <div key={file.id} className={`file-chip chip-${file.doc.nfeType.toLowerCase()}`}>
                  <FileText className="chip-icon" />
                  <div className="chip-info">
                    <span className="chip-name" title={file.name}>
                      {displayName}
                    </span>
                    <span className="chip-meta">NF nº {file.doc.nNF}</span>
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

          {/* Robot Auditor Action Node */}
          <div className={`batch-robot-action-card ${canAnalyze ? 'ready' : ''} ${isAnalyzing ? 'analyzing' : ''}`}>
            <div className="robot-card-left-group">
              <div className="robot-avatar-box">
                <div className="robot-aura-ring"></div>
                <div className="robot-eye-lights">
                  <span className="eye left-eye"></span>
                  <span className="eye right-eye"></span>
                </div>
                <Bot className="robot-icon" />
                {isAnalyzing && <Cpu className="robot-cpu-spinner" />}
              </div>

              <div className="robot-action-details">
                <h4 className="robot-action-title">
                  Robô Auditor Fiscal
                  <span className={`status-badge-inline ${isAnalyzing ? 'working' : canAnalyze ? 'ready' : 'waiting'}`}>
                    {isAnalyzing ? '⚙️ Processando' : canAnalyze ? '⚡ Pronto' : 'Aguardando'}
                  </span>
                </h4>
                <p className="robot-action-sub">
                  {isAnalyzing
                    ? '⚙️ Cruzando dados tributários, lotes e referências fiscais em milissegundos...'
                    : canAnalyze
                    ? `⚡ Pronto para auditar e parear automaticamente as ${loadedFiles.length} notas carregadas.`
                    : '💡 Adicione pelo menos 1 NFO e 1 NFD para iniciar a auditoria.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRunReconciliation}
              disabled={!canAnalyze || isAnalyzing}
              className={`btn btn-robot-action ${canAnalyze ? 'btn-robot-pulse' : ''} ${isAnalyzing ? 'btn-analyzing' : ''}`}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner-dots">
                    <span></span><span></span><span></span>
                  </span>
                  AUDITANDO LOTE...
                </>
              ) : (
                <>
                  <Play className="icon-xs" /> INICIAR AUDITORIA EM LOTE
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
