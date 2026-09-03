import { useState, useCallback } from 'react';
import { BatchReconciliationResult, NFeDocument, ReconciliationResult } from '../types/nfe';
import { parseNFeXml } from '../services/nfeParser';
import { parseDanfePdf } from '../services/danfePdfParser';
import { reconcileNFeDocuments } from '../services/reconciliationEngine';
import { executeBatchPairing } from '../services/batchPairingEngine';

export interface LoadedFile {
  id: string;
  name: string;
  doc: NFeDocument;
}

export function useReconciliation() {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [readingProgress, setReadingProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    stage: 'reading' | 'extracting_pdf' | 'parsing_xml';
  } | null>(null);

  const SUPPORTED_EXTENSIONS = ['.xml', '.pdf', '.txt', '.json'];

  const extractXmlFromContent = (rawContent: string, fileName: string): string => {
    if (rawContent.trimStart().startsWith('<')) {
      return rawContent;
    }

    const nfeMatch = rawContent.match(/<nfeProc[\s\S]*<\/nfeProc>/);
    if (nfeMatch) return nfeMatch[0];

    const nfeMatch2 = rawContent.match(/<NFe[\s\S]*<\/NFe>/);
    if (nfeMatch2) return nfeMatch2[0];

    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'json') {
      throw new Error(
        'Arquivo JSON não contém estrutura XML de NF-e reconhecível. ' +
        'Use o arquivo XML original.'
      );
    }

    throw new Error(
      'Nenhum conteúdo XML de NF-e encontrado neste arquivo. ' +
      'Use o arquivo XML original exportado do sistema emissor ou SEFAZ.'
    );
  };

  const addXmlFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsReadingFiles(true);
    const parsedResults = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.toLowerCase();
      const isSupported = SUPPORTED_EXTENSIONS.some(e => ext.endsWith(e));

      setReadingProgress({
        current: i + 1,
        total: fileList.length,
        fileName: file.name,
        stage: ext.endsWith('.pdf') ? 'extracting_pdf' : 'parsing_xml',
      });

      if (!isSupported) {
        parsedResults.push({
          error: `Formato não suportado: "${file.name}". Formatos aceitos: XML, PDF, TXT, JSON.`,
        });
        continue;
      }

      try {
        let doc: NFeDocument;
        if (ext.endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          doc = await parseDanfePdf(buffer, file.name);
        } else {
          const rawText = await file.text();
          const xmlContent = extractXmlFromContent(rawText, file.name);
          doc = parseNFeXml(xmlContent, file.name);
        }

        parsedResults.push({
          item: {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            name: file.name,
            doc,
          },
        });
      } catch (err: any) {
        parsedResults.push({
          error: `Erro no arquivo "${file.name}": ${err.message || 'Arquivo inválido.'}`,
        });
      }
    }

    const newLoaded: LoadedFile[] = [];
    for (const res of parsedResults) {
      if (res.item) newLoaded.push(res.item);
      if (res.error) setError(res.error);
    }

    if (newLoaded.length > 0) {
      setLoadedFiles(prev => [...prev, ...newLoaded]);
    }

    setIsReadingFiles(false);
    setReadingProgress(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== id));
    setResult(null);
    setBatchResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setLoadedFiles([]);
    setResult(null);
    setBatchResult(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  const runReconciliation = useCallback(() => {
    if (loadedFiles.length < 2) {
      setError('Carregue pelo menos 2 arquivos (uma Nota de Origem e uma Nota de Devolução).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    const docs = loadedFiles.map(f => f.doc);
    setProgress({ current: 0, total: docs.length });

    setTimeout(() => {
      try {
        const batchRes = executeBatchPairing(docs);
        setBatchResult(batchRes);
        if (batchRes.pairs.length > 0 && batchRes.pairs[0].reconciliation) {
          setResult(batchRes.pairs[0].reconciliation);
        }
        setProgress({ current: docs.length, total: docs.length });
      } catch (err: any) {
        setError(`Falha na conciliação: ${err.message}`);
      } finally {
        setIsAnalyzing(false);
      }
    }, 400);
  }, [loadedFiles]);

  const loadSampleDocs = useCallback((xmlNfdContent: string, xmlNfoContent: string) => {
    try {
      const docNfd = parseNFeXml(xmlNfdContent, 'Devolucao_Tapajos.xml');
      const docNfo = parseNFeXml(xmlNfoContent, 'Venda_Quesalon.xml');

      const samples = [
        { id: 'sample-nfd', name: 'Devolucao_Tapajos.xml', doc: docNfd },
        { id: 'sample-nfo', name: 'Venda_Quesalon.xml', doc: docNfo },
      ];

      setLoadedFiles(samples);
      const batchRes = executeBatchPairing([docNfd, docNfo]);
      setBatchResult(batchRes);

      const res = reconcileNFeDocuments(docNfd, docNfo);
      setResult(res);
      setError(null);
    } catch (err: any) {
      setError(`Erro ao carregar amostras: ${err.message}`);
    }
  }, []);

  return {
    loadedFiles,
    result,
    batchResult,
    error,
    isAnalyzing,
    progress,
    isReadingFiles,
    readingProgress,
    addXmlFiles,
    removeFile,
    clearAll,
    runReconciliation,
    loadSampleDocs,
  };
}
