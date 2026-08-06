import {
  BatchReconciliationResult,
  BatchSummary,
  NFeDocument,
  PairedResult,
} from '../types/nfe';
import { reconcileNFdAgainstMultipleNfos } from './reconciliationEngine';

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function executeBatchPairing(documents: NFeDocument[]): BatchReconciliationResult {
  const nfos = documents.filter(doc => doc.nfeType === 'NFO');
  const nfds = documents.filter(doc => doc.nfeType === 'NFD');
  const unknown = documents.filter(doc => doc.nfeType === 'UNKNOWN');

  // Fallback classification for UNKNOWN if any
  for (const doc of unknown) {
    if (doc.refNFeList.length > 0 || /DEV|DEVOLUC/i.test(doc.natOp)) {
      doc.nfeType = 'NFD';
      nfds.push(doc);
    } else {
      doc.nfeType = 'NFO';
      nfos.push(doc);
    }
  }

  const consumedNfoIds = new Set<string>();
  const pairs: PairedResult[] = [];

  // Phase 1 & 2: Match each NFD to its corresponding NFO(s)
  nfds.forEach((nfd, idx) => {
    let matchedNfos: NFeDocument[] = [];
    let pairMethod: PairedResult['pairMethod'] = 'UNPAIRED';

    // 1. Deterministic Match by refNFeList in NFD
    if (nfd.refNFeList.length > 0) {
      matchedNfos = nfos.filter(nfo => nfd.refNFeList.includes(nfo.chNFe));
      if (matchedNfos.length > 0) {
        pairMethod = 'REF_KEY';
      }
    }

    // 2. Fallback Match by parsedNfoRefNumber or infCpl key search
    if (matchedNfos.length === 0) {
      const matchByRefNum = nfos.find(nfo => {
        if (nfd.parsedNfoRefNumber && nfd.parsedNfoRefNumber === nfo.nNF) return true;
        if (nfd.infCpl && nfd.infCpl.includes(nfo.chNFe)) return true;
        return false;
      });

      if (matchByRefNum) {
        matchedNfos = [matchByRefNum];
        pairMethod = 'REF_KEY';
      }
    }

    // 3. Fallback Match by CNPJ participant matching
    if (matchedNfos.length === 0) {
      const cnpjNfdEmit = cleanCnpj(nfd.emit.cnpj);
      const candidatesByCnpj = nfos.filter(
        nfo => !consumedNfoIds.has(nfo.id) && cleanCnpj(nfo.dest.cnpj) === cnpjNfdEmit
      );

      if (candidatesByCnpj.length === 1) {
        matchedNfos = candidatesByCnpj;
        pairMethod = 'CNPJ_NNF';
      }
    }

    // Mark matched NFOs as consumed
    matchedNfos.forEach(nfo => consumedNfoIds.add(nfo.id));

    // Run reconciliation for this pair / group
    const reconciliation = reconcileNFdAgainstMultipleNfos(nfd, matchedNfos);

    pairs.push({
      id: `pair-${nfd.id || idx}-${Date.now()}`,
      nfd,
      nfoList: matchedNfos,
      pairMethod,
      reconciliation,
    });
  });

  const unpairedNfos = nfos.filter(nfo => !consumedNfoIds.has(nfo.id));
  const unpairedNfds = pairs.filter(p => p.nfoList.length === 0).map(p => p.nfd);

  const totalValueNfd = nfds.reduce((sum, d) => sum + d.totals.vNF, 0);
  const totalApproved = pairs.filter(
    p => p.reconciliation?.summary.overallStatus === 'APPROVED'
  ).length;
  const totalWithWarnings = pairs.filter(
    p => p.reconciliation?.summary.overallStatus === 'HAS_WARNINGS'
  ).length;
  const totalRejected = pairs.filter(
    p => p.reconciliation?.summary.overallStatus === 'REJECTED'
  ).length;

  const summary: BatchSummary = {
    totalFiles: documents.length,
    totalNfo: nfos.length,
    totalNfd: nfds.length,
    totalPaired: pairs.filter(p => p.nfoList.length > 0).length,
    totalUnpaired: pairs.filter(p => p.nfoList.length === 0).length,
    totalApproved,
    totalWithWarnings,
    totalRejected,
    totalValueNfd,
  };

  return {
    pairs,
    unpairedNfos,
    unpairedNfds,
    summary,
    processedAt: new Date().toISOString(),
  };
}
