import { ReconciliationResult } from '../types/nfe';

export function generateDiscrepancyReport(result: ReconciliationResult): string {
  const { nfd, nfo, headerValidation, itemComparisons, summary } = result;

  const dateStr = new Date().toLocaleDateString('pt-BR');
  const criticalIssues = [
    ...headerValidation.issues.filter(i => i.severity === 'CRITICAL'),
    ...itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'CRITICAL')),
  ];
  const warningIssues = [
    ...headerValidation.issues.filter(i => i.severity === 'WARNING'),
    ...itemComparisons.flatMap(c => c.issues.filter(i => i.severity === 'WARNING')),
  ];

  let lines: string[] = [];

  lines.push('================================================================');
  lines.push('          LAUDO DE DIVERGÊNCIA FISCAL - PRÉ-COLETA             ');
  lines.push('================================================================');
  lines.push(`Data do Diagnóstico: ${dateStr}`);
  lines.push(`Cliente/Emitente: ${nfd.emit.xNome} (CNPJ: ${nfd.emit.cnpj})`);
  lines.push(`Destinatário: ${nfd.dest.xNome} (CNPJ: ${nfd.dest.cnpj})`);
  lines.push(`Nota Fiscal de Devolução (NFD): Nº ${nfd.nNF} (Chave: ${nfd.chNFe})`);
  lines.push(`Nota Fiscal de Origem (NFO): Nº ${nfo.nNF} (Chave: ${nfo.chNFe})`);
  if (summary.motivoDevolucao) {
    lines.push(`Motivo Declarado pelo Cliente: ${summary.motivoDevolucao}`);
  }
  lines.push('----------------------------------------------------------------');
  lines.push(`DIAGNÓSTICO GERAL: ${summary.overallStatus === 'REJECTED' ? '❌ BLOQUEADO - CORREÇÃO NECESSÁRIA ANTES DA COLETA' : '⚠️ DIVERGÊNCIAS DETECTADAS'}`);
  lines.push(`Erros Críticos: ${summary.totalCriticalErrors} | Alertas: ${summary.totalWarnings}`);
  lines.push('================================================================\n');

  if (criticalIssues.length > 0) {
    lines.push('DIVERGÊNCIAS CRÍTICAS (EXIGEM CORREÇÃO OU REEMISSÃO):');
    lines.push('----------------------------------------------------------------');
    criticalIssues.forEach((issue, idx) => {
      lines.push(`${idx + 1}. [${issue.title}]`);
      lines.push(`   ${issue.description}`);
    });
    lines.push('');
  }

  if (warningIssues.length > 0) {
    lines.push('ALERTAS DE CONCORDÂNCIA (RECOMENDADA VERIFICAÇÃO):');
    lines.push('----------------------------------------------------------------');
    warningIssues.forEach((issue, idx) => {
      lines.push(`${idx + 1}. [${issue.title}]`);
      lines.push(`   ${issue.description}`);
    });
    lines.push('');
  }

  lines.push('RESUMO DOS ITENS ANALISADOS:');
  lines.push('----------------------------------------------------------------');
  itemComparisons.forEach((c, idx) => {
    const statusIcon = c.issues.some(i => i.severity === 'CRITICAL') ? '❌' : c.issues.length > 0 ? '⚠️' : '✅';
    const nfdItem = c.nfdItem;
    const nfoItem = c.nfoItem;
    lines.push(`${idx + 1}. ${statusIcon} ${nfdItem.xProd}`);
    lines.push(`   • EAN: ${nfdItem.cEAN || 'Sem GTIN'} | Qtd Devolvida: ${nfdItem.qCom} | Preço Un: R$ ${nfdItem.vUnCom.toFixed(2)}`);
    if (nfdItem.batches.length > 0) {
      lines.push(`   • Lote(s) NFD: ${nfdItem.batches.map(b => b.nLote).join(', ')}`);
    } else {
      lines.push(`   • Lote(s) NFD: ❌ NÃO INFORMADO NA NOTA`);
    }

    if (nfoItem) {
      lines.push(`   • Origem na NFO: Item #${nfoItem.nItem} (cProd: ${nfoItem.cProd}) - Lote(s) Origem: ${nfoItem.batches.map(b => b.nLote).join(', ') || 'Nenhum'}`);
    } else {
      lines.push(`   • Origem na NFO: ❌ NÃO LOCALIZADO NA NOTA DE ORIGEM`);
    }
  });

  lines.push('\n================================================================');
  lines.push('INSTRUÇÕES PARA O CLIENTE:');
  lines.push('Favor providenciar a Carta de Correção Eletrônica (CC-e) ou a');
  lines.push('reemissão da Nota Fiscal de Devolução sanando os pontos citados');
  lines.push('acima antes da liberação do veículo de coleta.');
  lines.push('================================================================');

  return lines.join('\n');
}
