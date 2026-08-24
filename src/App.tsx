import { useState, useEffect } from 'react';
import { useReconciliation } from './hooks/useReconciliation';
import { ThemeToggle } from './components/ThemeToggle';
import { DualFileUploadZone } from './components/DualFileUploadZone';
import { BatchDashboard } from './components/BatchDashboard';
import { DiscrepancyReportModal } from './components/DiscrepancyReportModal';
import { InstructionsModal } from './components/InstructionsModal';
import { sampleNfdXml, sampleNfoXml } from './data/sampleXmls';
import { runExhaustiveTestSuite } from './services/reconciliationEngine.test';
import { PairedResult, ReconciliationResult } from './types/nfe';
import { PackageCheck, AlertCircle, RefreshCw, ShieldCheck, CheckCircle2, XCircle, HelpCircle } from './components/Icons';
import './App.css';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [activeReportResult, setActiveReportResult] = useState<ReconciliationResult | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<{ total: number; passed: number; failed: number; log: string[] } | null>(null);

  const {
    loadedFiles,
    result,
    batchResult,
    error,
    isAnalyzing,
    addXmlFiles,
    removeFile,
    clearAll,
    runReconciliation,
    loadSampleDocs,
  } = useReconciliation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLoadSamples = () => {
    setTestResults(null);
    loadSampleDocs(sampleNfdXml, sampleNfoXml);
  };

  const handleRunTests = () => {
    const suiteRes = runExhaustiveTestSuite();
    setTestResults(suiteRes);
  };

  const handleGenerateReportForPair = (pair: PairedResult) => {
    if (pair.reconciliation) {
      setActiveReportResult(pair.reconciliation);
    }
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="brand-group">
          <div className="brand-logo-box">
            <PackageCheck className="icon" />
          </div>
          <div>
            <h1 className="brand-title">
              Validador Fiscal de Devoluções
              <span className="brand-badge">Enterprise v2.0</span>
            </h1>
            <p className="brand-subtitle">Auditoria Tributária em Lote (NFO x NFD) • ERP Pirâmide & NT 2021.004</p>
          </div>
        </div>

        <div className="header-controls">
          <button
            type="button"
            onClick={() => setIsInstructionsModalOpen(true)}
            className="btn btn-secondary btn-sm"
            title="Guia de Operação & Regras Fiscais"
          >
            <HelpCircle className="icon-xs muted" /> Como Usar
          </button>
          {import.meta.env.DEV && (
            <button type="button" onClick={handleRunTests} className="btn btn-secondary btn-sm" title="Executar Suíte de Testes Exaustivos">
              <ShieldCheck className="icon-xs success" /> Executar Testes Automatizados
            </button>
          )}
          {(batchResult || result) && (
            <button
              type="button"
              onClick={clearAll}
              className="btn btn-secondary btn-sm"
              title="Iniciar nova análise com outras notas"
            >
              <RefreshCw className="icon-xs" /> Nova Análise
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {error && (
          <div className="status-banner rejected">
            <div className="status-banner-main">
              <AlertCircle className="status-banner-icon danger" />
              <div>
                <h3 className="status-banner-title">Atenção no Processamento</h3>
                <p className="status-banner-sub">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Test Suite Results Display */}
        {testResults && (
          <div className="test-results-panel">
            <div className="test-results-header">
              <div className="test-title-group">
                {testResults.failed === 0 ? (
                  <CheckCircle2 className="icon success" />
                ) : (
                  <XCircle className="icon danger" />
                )}
                <div>
                  <h3 className="test-results-title">
                    Suíte de Testes Automatizados: {testResults.passed}/{testResults.total} Passaram
                  </h3>
                  <p className="test-results-sub">
                    Simulação exaustiva de erros humanos, omissões de lote, divergências tributárias e XMLs corrompidos.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setTestResults(null)} className="btn-text">
                Fechar Testes
              </button>
            </div>
            <div className="test-log-list font-mono">
              {testResults.log.map((logLine, idx) => (
                <div key={idx} className={`test-log-item ${logLine.startsWith('✅') ? 'pass' : 'fail'}`}>
                  {logLine}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch File Upload Zone */}
        <DualFileUploadZone
          loadedFiles={loadedFiles}
          onAddFiles={addXmlFiles}
          onRemoveFile={removeFile}
          onClearAll={clearAll}
          onRunReconciliation={runReconciliation}
          onLoadSamples={handleLoadSamples}
          isAnalyzing={isAnalyzing}
          hasResult={!!batchResult}
        />

        {/* Batch Results Dashboard */}
        {batchResult && (
          <BatchDashboard
            batchResult={batchResult}
            onGenerateReportForPair={handleGenerateReportForPair}
            onReset={clearAll}
          />
        )}
      </main>

      {/* Modal for Discrepancy Report */}
      {activeReportResult && (
        <DiscrepancyReportModal
          result={activeReportResult}
          onClose={() => setActiveReportResult(null)}
        />
      )}

      {/* Modal for Instructions */}
      {isInstructionsModalOpen && (
        <InstructionsModal onClose={() => setIsInstructionsModalOpen(false)} />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Validador Fiscal de Devoluções v2.0 • Automação Operacional de Devoluções em Lote (Quesalon)
        </p>
      </footer>
    </div>
  );
}

export default App;

