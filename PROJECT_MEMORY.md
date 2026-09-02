# 🧠 PROJECT MEMORY & KNOWLEDGE BASE
> **Projeto:** Validador Fiscal & Conciliador de Devoluções de NF-e (NFO x NFD) — Hebron & ERP Pirâmide  
> **Status:** Ativo | 100% Testes Aprovados (55/55) | Integração TI Oracle em Andamento  
> **Última Atualização:** 2026-09-01 (Checkpoint de Integração Pirâmide Homologação `.61`)  

---

## 📌 1. DIRETRIZES DE ATUAÇÃO (DEV SENIOR DE ELITE)

Este documento centraliza todas as memórias, regras de negócio, arquitetura técnica e padrões de governança do projeto. Toda e qualquer ação no código deve seguir rigorosamente os seguintes pilares:

### 1.1. Engenharia de Software & Arquitetura
* **Backend & Lógica de Domínio:** Código desacoplado, funções puras para motores de cálculo e validação fiscal, tipagem estrita com TypeScript, tratamento defensivo de erros (`try/catch` estruturado, logs contextuais, validações de fronteira).
* **Frontend & UX:** Interfaces modernas, responsivas, alta usabilidade para operadores fiscais e conferentes de logística. Zero tolerância para interfaces lentas ou mal diagramadas. Uso consistente do sistema de design, micro-interações claras, feedback de status instantâneo e acessibilidade.
* **Banco de Dados & MySQL:**
  * Schemas normalizados (3FN) quando transacional, com indexação estratégica em chaves primárias e de busca frequente (`chNFe`, `nNF`, `cnpjEmit`, `cnpjDest`, `dEmi`, `status`).
  * Integridade referencial com chaves estrangeiras, `ON DELETE RESTRICT` em tabelas fiscais de auditoria.
  * Transações ACID explícitas (`START TRANSACTION` / `COMMIT` / `ROLLBACK`) em operações de conciliação e lançamento em lote.
  * Consultas otimizadas evitando `SELECT *`, uso de queries preparadas (PreparedStatement) contra SQL Injection.

### 1.2. Especialidade Fiscal Nacional (Brasil / SEFAZ)
* **Padrão NF-e v4.00 (MOC - Manual de Orientação do Contribuinte):**
  * Estrutura XML completa: `<ide>`, `<emit>`, `<dest>`, `<det>`, `<prod>`, `<imposto>` (`<ICMS>`, `<IPI>`, `<PIS>`, `<COFINS>`), `<rastro>`, `<total>`, `<infAdic>`.
  * **Regras de Devolução (finNFe = 4):**
    * Obrigatoriedade da tag `<NFref><refNFe>` referenciando a chave de 44 dígitos da NF de Origem (NFO).
    * Cruzamento de Emissor da NFD sendo idêntico ao Destinatário da NFO e vice-versa.
    * CFOPs específicos de devolução (1.201, 1.202, 1.411, 2.201, 2.202, 2.411, 5.201, 5.202, 6.201, 6.202, etc.).
    * Simetria tributária: O valor unitário (`vUnCom`), alíquota de ICMS (`pICMS`), alíquota de IPI (`pIPI`) e redução de base de cálculo devem refletir com precisão a operação de saída faturada.
    * Validação de lotes farmacêuticos/produtos controlados via tag `<rastro>` (`nLote`, `qLote`, `dFab`, `dVal`).
  * Atualização permanente sobre notas técnicas da SEFAZ, Reforma Tributária (IBS/CBS futuramente), DIFAL e substituição tributária (ICMS-ST).

### 1.3. Especialidade em Logística, WMS & Logística Reversa
* **Fluxo Operacional de Recebimento de Devolução:**
  1. **Triagem de Portaria & Chegada Física:** Entrada da carga e conferência da chave da NFD.
  2. **Validação Sistêmica Pré-Descarga:** Execução do validador (NFD x NFO). Se houver discrepância crítica (preço unitário acima do faturado, lote não faturado, falta de chave referenciada), o caminhão/mercadoria é retido ou recusado com canhoto assinado e manifesto.
  3. **Conferência Física & Rastreabilidade (Lote e Validade):** Comparação entre o que está no XML da NFD, no XML da NFO e a mercadoria física (conferência cega/assistida).
  4. **Entrada no WMS / ERP:** Se aprovado, geração de espelho de entrada e conciliação de saldo em estoque (estoque disponível ou quarentena/avariado dependendo do motivo da devolução).

---

## 🏛️ 2. MAPA DE ARQUITETURA DO PROJETO

### 2.1. Visão Geral dos Módulos
```
gleciaAlhandra1/
├── electron/
│   └── main.cjs                     # Entrypoint Desktop Electron
├── src/
│   ├── components/
│   │   ├── BatchDashboard.tsx       # Visão geral de conciliações em lote
│   │   ├── DataBridgeCopilot.tsx    # Copiloto tático do ERP Pirâmide (1-clique)
│   │   ├── DiscrepancyReportModal.tsx # Modal de visualização de divergências
│   │   ├── DualFileUploadZone.tsx   # Zona Drag & Drop para XMLs NFO e NFD
│   │   ├── ExecutiveSummary.tsx     # Resumo executivo com métricas fiscais
│   │   ├── Icons.tsx                # Ícones padronizados (Lucide)
│   │   ├── InstructionsModal.tsx    # Manual de instrução de uso
│   │   ├── ItemsTable.tsx           # Tabela comparativa de itens (NFD x NFO + Qtd + Almox)
│   │   └── ThemeToggle.tsx          # Alternador de tema Claro / Escuro
│   ├── data/
│   │   ├── piramideData.ts          # Base mestre de 51 motivos e 12 almoxarifados do Pirâmide
│   │   └── sampleXmls.ts            # Amostras de XML para testes locais
│   ├── hooks/
│   │   ├── useClipboard.ts          # Utilitário de cópia para área de transferência
│   │   └── useReconciliation.ts     # Hook central de estado e orquestração do lote
│   ├── services/
│   │   ├── batchPairingEngine.ts    # Motor de pareamento automático 1:1 e 1:N
│   │   ├── ndoTaxEngine.ts          # Motor de sugestão de NDO, Bonificação e CBS/IBS
│   │   ├── nfeParser.ts             # Parser universal de XML (Browser & Node/xmldom)
│   │   ├── piramideService.ts       # Motor preditivo de Motivos x Almoxarifados
│   │   ├── reconciliationEngine.test.ts # Suíte exaustiva de testes unitários (32 testes)
│   │   ├── reconciliationEngine.ts  # Motor de regras fiscais e validações profundas
│   │   └── reportGenerator.ts       # Exportação de relatórios (Laudo pré-coleta e CSV)
│   ├── types/
│   │   └── nfe.ts                   # Modelos de tipos (Document, Item, Piramide, NDO, Batch)
│   ├── utils/
│   │   └── textSimilarity.ts        # Algoritmos de Levenshtein e Dice Coefficient
│   ├── testRunner.ts                # Runner CLI para execução automatizada de testes
│   ├── App.tsx                      # Componente raiz da aplicação
│   ├── App.css                      # Estilos principais da aplicação
│   └── index.css                    # Design system, tokens e resets
├── PROJECT_MEMORY.md                # [ESTE ARQUIVO] Base de conhecimento permanente
└── package.json                     # Scripts e dependências
```

---

## 🔍 3. REGRAS DO MOTOR DE CONCILIAÇÃO FISCAL (RECONCILIATION ENGINE)

| Código | Categoria | Severidade | Descrição da Regra |
| :--- | :--- | :--- | :--- |
| **H1** | Cabeçalho | `CRITICAL` | Nota de Origem (NFO) autorizada na SEFAZ (`cStat == 100`). Alerta se cancelada (101/135). |
| **H2** | Cabeçalho | `CRITICAL` | Nota de Devolução (NFD) autorizada na SEFAZ (`cStat == 100`). Alerta se cancelada. |
| **H3** | Cabeçalho | `CRITICAL` | Chave de Origem vinculada na tag `<refNFe>` da NFD ou informada nas informações complementares (`<infCpl>`). |
| **H4_H5**| Cabeçalho | `CRITICAL` | Inversão simétrica dos CNPJs: `NFD.emit == NFO.dest` e `NFD.dest == NFO.emit`. |
| **H6** | Cabeçalho | `WARNING` | Finalidade da NFD deve ser Devolução (`finNFe = 4`). |
| **H8** | Cabeçalho | `WARNING` | Data de emissão da NFD deve ser igual ou posterior à emissão da NFO. |
| **BONIF_MISMATCH** | Cabeçalho/Tributo | `WARNING` | Operação de devolução como bonificação (CFOP 1.910/2.910) divergindo de venda na origem. |
| **CBS_IBS** | Tributo | `INFO` | Detecção de incidência ou menção de CBS/IBS (Reforma Tributária). |
| **I1** | Item | `CRITICAL` | Preço Unitário (`vUnCom`) da NFD não pode divergir do faturado na NFO. |
| **I2** | Item | `CRITICAL` | Quantidade devolvida (`qCom`) não pode exceder a quantidade faturada na NFO. |
| **I3** | Item | `CRITICAL` | Valor total do item (`vProd`) deve coincidir com `qCom * vUnCom`. |
| **I4** | Item | `WARNING` | Desconto proporcional (`vDesc`) por unidade deve manter simetria com a venda original. |
| **I5** | Item / Lote | `CRITICAL` | Se a NFO possuía tag `<rastro>`, a NFD obrigatoriamente deve informar o lote. |
| **I6** | Item / Lote | `CRITICAL` | Lote informado na NFD (`nLote`) deve constar nos lotes faturados da NFO. |
| **I16** | Item / Lote | `WARNING` | Validade do lote (`dVal`) não deve estar expirada na data da devolução. |
| **I7** | Item | `WARNING` | CFOP da NFD deve ser do grupo de devolução (`x201`, `x202`, `x411`, etc.). |
| **I8** | Item / ICMS | `WARNING` | CST / CSOSN de ICMS compatível com a operação de devolução. |
| **I9** | Item / ICMS | `CRITICAL` | Alíquota de ICMS (`pICMS`) da NFD idêntica à da NFO. |
| **I12** | Item / IPI | `CRITICAL` | Alíquota de IPI (`pIPI`) da NFD idêntica à da NFO (quando tributado). |
| **I14** | Item / IPI | `INFO` | CST de IPI na devolução (normalmente 49/99 para entrada ou espelho). |
| **I15** | Item | `INFO` | Notificação sobre divergência de grafia na unidade de medida comercial (`uCom`). |

---

## 📦 4. FLUXO DE PAREAMENTO AUTOMÁTICO (BATCH ENGINE)

1. **Separação de Documentos:** Classificação de arquivos XML em `NFO` (Saídas) e `NFD` (Entradas de Devolução).
2. **Estratégia de Pareamento:**
   * **Nível 1 (Chave de Acesso):** Busca direta pelo valor em `<refNFe>` da NFD igual ao `<chNFe>` da NFO.
   * **Nível 2 (Informações Complementares):** Extração via Regex de número de nota ou chave contida em `<infCpl>`.
   * **Nível 3 (CNPJ Cruzado + Número de NF):** Cruzamento de CNPJs participantes + número referenciado.
   * **Nível 4 (Suporte a 1:N):** Quando uma única NFD devolve itens de múltiplas notas fiscais de origem.

---

## 📝 5. LOG DE DECISÕES & HISTÓRICO EVOLUTIVO

| Data | Autor | Ação Realizada / Decisão Arquitetural |
| :--- | :--- | :--- |
| **2026-08-20** | Senior Elite Dev | Criação da base de memória `PROJECT_MEMORY.md` com diretrizes técnicas e operacionais. |
| **2026-08-20** | Senior Elite Dev | Mapeamento integral da reunião operacional com Glécia e ingestão dos dados da planilha `Informação Nicollas.xlsx` (51 motivos x 12 almoxarifados). |
| **2026-08-20** | Senior Elite Dev | Implementação completa dos 4 requisitos da homologação Pirâmide: (1) `piramideData.ts` e `piramideService.ts` com motor preditivo de motivos e almoxarifados, (2) `ndoTaxEngine.ts` com sugestão de NDO e validação de Bonificação/CBS/IBS, (3) Auditoria visual de quantidades devolvidas x faturadas (`TOTAL`, `PARTIAL`, `EXCESS`) no `ItemsTable.tsx`, (4) Painel turbinado do `DataBridgeCopilot.tsx` com 1-clique para cabeçalho, NDO, centavos e itens, (5) Suíte exaustiva de testes unitários com 32/32 testes aprovados (`npm test`) e build de produção validado (`npm run build`). |
| **2026-08-21** | Senior Elite Dev | Auditoria visual rigorosa das capturas de tela e refatoração de elite: (1) Correção do texto truncado `Copi` ➔ `Copiar` com `white-space: nowrap` e `flex-shrink: 0`, (2) Correção do bug de timezone UTC que retroagia a data de validade `30/06/2028` para `29/06/2028` com o novo helper `formatFiscalDate`, (3) Correção da NDO sugerida para indicar o CFOP de entrada no ERP (`2.202`) e não a saída do cliente (`6.202`), (4) Correção do filtro de itens `Conformes (1)` que excluía itens com `INFO`, (5) Layout simétrico 2x2 no Direcionamento Logístico e uniformização dos cards de valores na Seção 3. |



---

## 🏢 6. INTEGRAÇÃO ERP PIRÂMIDE (REGRAS DA OPERAÇÃO GLÉCIA)

### 6.1. Requisitos Identificados na Homologação
1. **Vínculo Automático (Motivo de Devolução ➔ Almoxarifado Destino):**
   * Preenchimento preditivo automático quando o motivo for determinístico (ex: 30 "Produto vazando" -> `GQ`, 11 "AVARIA" -> `AVARIA`, 03 "Vencido" -> `VC`, 10 "EXTRAVIO" -> `EXPEDI`).
   * Sinalização de avaliação física/visual obrigatória para motivos subjetivos (ex: 26 "PEDIDO CANCELADO", 01 "Divergência Comercial").
2. **Visualização Direta da Quantidade Devolvida x Faturada:**
   * Comparação lado a lado com cálculo de devolução total/parcial e destaque visual de excessos.
3. **DataBridge Copilot Especializado para Pirâmide (Copy-Paste de 1-Clique):**
   * Botões dedicados para Série, Número, Data de Emissão (DD/MM/AAAA), Chave SEFAZ, Protocolo, Base de Cálculo, Impostos e Valor Total.
   * Cópia facilitada do Código de Motivo + Sigla do Almoxarifado para preenchimento ágil.
4. **Validação de NDO e Tributação CBS/IBS (Reforma Tributária / Bonificação):**
   * Sugestão de NDO com base na UF de origem/destino e CFOP.
   * Suporte preventivo a notas de bonificação e detecção de incidência/estorno de tributos.

### 6.2. Tabela Mestra: Motivo de Devolução ➔ Almoxarifado Destino (ERP Pirâmide)

| Código | Descrição do Motivo | Almoxarifado Sugerido | Tipo de Direcionamento |
| :--- | :--- | :--- | :--- |
| **01** | Divergência Comercial | *Avaliação Física Requerida* | Manual / Depende da condição |
| **02** | Divergência Fiscal | *Avaliação Física Requerida* | Manual / Depende da condição |
| **03** | Vencido | `VC` | Automático (Vencidos) |
| **04** | Avaria | `AVARIA` | Automático (Avaria) |
| **05** | Defeito Técnico | `GQ` | Automático (Garantia da Qualidade) |
| **06** | Erro de Expedição | *Avaliação Física Requerida* | Manual / Depende da condição |
| **07** | Erro de Faturamento | *Avaliação Física Requerida* | Manual / Depende da condição |
| **08** | Divergência no Transporte | *Avaliação Física Requerida* | Manual / Depende da condição |
| **09** | Amostra Grátis | *Avaliação Física Requerida* | Manual / Depende da condição |
| **10** | EXTRAVIO | `EXPEDI` | Automático (Expedição) |
| **11** | AVARIA | `AVARIA` | Automático (Avaria) |
| **12** | ERRO DE EXPEDIÇÃO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **13** | ERRO DE FATURAMENTO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **14** | DIVERGENCIA NO TRANSPORTE | *Avaliação Física Requerida* | Manual / Depende da condição |
| **15** | EXTRAVIO | `EXPEDI` | Automático (Expedição) |
| **16** | AMOSTRA GRÁTIS | *Avaliação Física Requerida* | Manual / Depende da condição |
| **19** | NF RECUSADA | *Avaliação Física Requerida* | Manual / Depende da condição |
| **23** | Acordo Comercial | *Avaliação Física Requerida* | Manual / Depende da condição |
| **24** | RECALL | `RECALL` | Automático (Recall) |
| **25** | DEMISSÃO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **26** | PEDIDO CANCELADO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **27** | ERRO NO SISTEMA | *Avaliação Física Requerida* | Manual / Depende da condição |
| **28** | ERRO NO XML | *Avaliação Física Requerida* | Manual / Depende da condição |
| **29** | Próximo ao vencimento | `CQ` | Automático (Controle de Qualidade) |
| **30** | Produto vazando | `GQ` | Automático (Garantia da Qualidade) |
| **31** | Cartonagem colada | `GQ` | Automático (Garantia da Qualidade) |
| **32** | Impressão do lote manchado | `GQ` | Automático (Garantia da Qualidade) |
| **33** | Cartucho amassado | `AVARIA` | Automático (Avaria) |
| **34** | S/Impressão Lote validade | `GQ` | Automático (Garantia da Qualidade) |
| **35** | Cartucho vazio | `GQ` | Automático (Garantia da Qualidade) |
| **36** | Tampa Aberta | `GQ` | Automático (Garantia da Qualidade) |
| **37** | Troca de volumes Transportadora | *Avaliação Física Requerida* | Manual / Depende da condição |
| **38** | Erro de Etiquetagem Expedição | *Avaliação Física Requerida* | Manual / Depende da condição |
| **39** | Falta de volume | `EXTRV` | Automático (Extravio) |
| **40** | MUDANÇA DE ENDEREÇO | *Avaliação Física Requerida* | Manual / Depende da condição |
| **41** | Erro de conferência/Cliente | *Avaliação Física Requerida* | Manual / Depende da condição |
| **42** | Desvio de Qualidade | `GQ` | Automático (Garantia da Qualidade) |
| **43** | Descontinuados | *Avaliação Física Requerida* | Manual / Depende da condição |
| **44** | Nota Fiscal Vencida | *Avaliação Física Requerida* | Manual / Depende da condição |
| **45** | Atender o SAC | *Avaliação Física Requerida* | Manual / Depende da condição |
| **46** | Pedidos em duplicidade | *Avaliação Física Requerida* | Manual / Depende da condição |
| **47** | Falta interna (caixa lacrada) | `GQ` | Automático (Garantia da Qualidade) |
| **48** | CQ Estabilidade | *Avaliação Física Requerida* | Manual / Depende da condição |
| **49** | Falta Parcial | `EXTRV` | Automático (Extravio) |
| **50** | Inversão de lote | *Avaliação Física Requerida* | Manual / Depende da condição |
| **51** | Atraso no transporte | *Avaliação Física Requerida* | Manual / Depende da condição |

### 6.3. Almoxarifados Oficiais do Sistema Pirâmide
* `ALMOX` - Almoxarifado Central / Estoque Regular
* `AVARIA` - Estoque de Produtos Danificados / Avariados
* `AVCD` - Avaria de Centro de Distribuição
* `CQ` - Controle de Qualidade
* `EXPEDI` - Expedição
* `EXTRV` - Extravio / Faltas
* `GQ` - Garantia da Qualidade
* `PENHOR` - Estoque em Penhor
* `QRTN` - Quarentena
* `RECALL` - Lotes em Processo de Recall
* `SERV` - Almoxarifado de Serviços
* `VC` - Produtos Vencidos

---

## 🧬 7. INTELIGÊNCIA FISCAL FARMACÊUTICA, NCM & REGRAS ESPECÍFICAS

### 7.1. Matriz Regulatória de NCMs Farmacêuticos vs Obrigações NF-e

| Faixa NCM | Categoria | Tag `<med>` | Tag `<rastro>` (Lote) | Regime PIS/COFINS | CST PIS Esperado | Base Legal / Observações |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **3001 a 3006** | **Medicamentos** | **Obrigatória** | Obrigatória na Venda | **Monofásico** (Alíquota Zero) | **04** (ou 06) | Lei 10.147/2000. Rejeição SEFAZ 840 se faltar `<med>`. Rejeição 873 se faltar `<rastro>` na venda. |
| **2936** | **Vitaminas / Provitaminas** | *Dispensada* | *Voluntária / Opcional* | Tributação Normal | 01, 02, 49, 99 | Capítulo 29 (Química Orgânica). Não sofre rejeição 840/873 na SEFAZ. |
| **2106 / 1901** | **Suplementos Alimentares** | *Dispensada* | *Voluntária / Opcional* | Tributação Normal | 01, 02, 49, 99 | Capítulo 21 (Preparações Alimentícias). Natureza de alimento. |
| **3304 a 3307** | **Cosméticos / Higiene** | *Dispensada* | *Voluntária / Opcional* | Tributação Normal | 01, 02, 04, 49 | Capítulo 33 (Perfumaria e Cosméticos). |

### 7.2. Exceções da Nota Técnica (NT) 2021.004 da SEFAZ
A NT 2021.004 introduziu exceções determinísticas para a validação da tag `<rastro>` (Lote, Fabricação e Validade):
1. **NF-e de Devolução (`finNFe = 4`):** A SEFAZ **NÃO REJEITA** a nota fiscal caso o cliente devolva sem a tag `<rastro>`. O validador emite alerta informativo (`INFO`) para auditoria física na doca sem travar indevidamente o espelho de devolução.
2. **Vendas Não Presenciais (`indPres = 2` ou `3`):** Vendas via internet/telefone.
3. **NF-e de Entrada (`tpNF = 0`):** Operações de emissão própria de entrada.

### 7.3. Motor de Auditoria de Descontos Proporcionais (`vDesc`)
Na devolução parcial de produtos, o desconto deve ser rigorosamente proporcional à quantidade devolvida:
* **Fórmula do Desconto Esperado:**
  $$\text{Desconto Esperado} = \text{Arredondar2Casas}\left( \text{vDesc}_{\text{origem}} \times \frac{\text{qCom}_{\text{devolvida}}}{\text{qCom}_{\text{faturada}}} \right)$$
* **Regras de Validação:**
  * **Rejeição SEFAZ 483 (`CRITICAL`):** Ocorre se $\text{vDesc}_{\text{item}} > \text{vProd}_{\text{item}}$. A SEFAZ bloqueia a autorização.
  * **Desconto Omitido na Devolução (`WARNING`):** Venda original teve desconto concedido e NFD zerou o campo.
  * **Divergência de Proporcionalidade (`WARNING` / `CRITICAL`):** Se $|\text{vDesc}_{\text{NFD}} - \text{vDesc}_{\text{Esperado}}| > \text{R\$} 0,05$.

---

## 🏛️ 8. INTEGRAÇÃO DIRETA VIA TABELAS INTERMEDIÁRIAS (TI ORACLE) DO ERP PIRÂMIDE

### 8.1. O Fluxo de Trabalho da Glécia (Gargalo Eliminado)
* **Antes:**
  1. Extração do Felipe gera planilha superficial (sem lotes, impostos, descontos; chave/NFO frequentemente erradas).
  2. Glécia copiava para planilha de controle.
  3. No módulo de Compras do Pirâmide, digitava manualmente: Série, Número, Data, Chave 44 dígitos, Protocolo, NDO, Motivo, Almoxarifado (`GQ`, `AVARIA`, `EXTRV`, etc.) e "Conta Cli".
* **Depois (Com o Validador Integrado):**
  * O Validador lê o XML da NFD e cruza com a NFO original, validando preços, lotes, NDO e descontos rateados.
  * O Validador grava diretamente os registros nas tabelas de staging do Oracle (`TI_NOTA_FISCAL_ENTRADA`, `TI_ITEM_NOTA_FISCAL_ENTRADA`, `TI_ITEM_ENTRADA_LOTE`) com status `COD_STATUS_REGISTRO = 'NP'`.
  * O Job Oracle do Pirâmide processa a carga, efetua o lançamento automático e atualiza o status para `'P'` (Processado) ou `'ER'` (Erro).

### 8.2. Ambiente de Homologação & Servidores Oracle Pirâmide
* **Servidor de Produção Oracle / Pirâmide:** Final `.60` (Ambiente Oficial Hebron).
* **Servidor de Homologação / Testes (Clone da Produção):** Final `.61` (Ambiente de Testes / Acesso ADM Nicolas).
* **Ferramenta Oficial de Banco de Dados:** **PL/SQL Developer**.
* **Tabelas de Integração Staging Utilizadas:**
  * `TI_NOTA_FISCAL_ENTRADA` (Cabeçalho da NF de Entrada/Devolução)
  * `TI_ITEM_NOTA_FISCAL_ENTRADA` (Itens faturados e devolvidos, NDO, CFOP e Almoxarifado)
  * `TI_ITEM_ENTRADA_LOTE` (Lotes, Validade e Fabricação validados da NFO)
  * `TI_OBS_ENTRADA_DOC_FISCAL` (Referência da NF de Saída original)

### 8.3. Matriz de Direcionamento Automático de Almoxarifados
* Motivos `30`, `31`, `34`, `35`, `36` $\rightarrow$ **`GQ`** (Garantia de Qualidade).
* Motivos `11`, `33` $\rightarrow$ **`AVARIA`** (Avarias/Danos).
* Motivo `39` $\rightarrow$ **`EXTRV`** (Extravios/Faltas).
* Motivo `24` $\rightarrow$ **`RECALL`** (Recall Sanitário ANVISA).
* Motivo `01` $\rightarrow$ **`VENCIDO`** (Produtos Vencidos).
* Motivo `10` $\rightarrow$ **`DISPONIVEL`** (Retorno de Mercadoria Não Entregue).
* Motivos `26` (Pedido Cancelado) e `12` (Erro de Expedição) $\rightarrow$ Triagem na Doca (`ALMOX` ou `AVARIA`).

---

## 📌 9. CHECKPOINT DE PAUSA & PLANO DE RETOMADA (01/09/2026)

### 9.1. O que foi Concluído e Validado Hoje:
1. **Auditoria Visual & Micro-interações:**
   * Transições bidirecionais suaves (`0fr ➔ 1fr ➔ 0fr`) implementadas com CSS Grid em todos os acordeões e gavetas (`BatchDashboard`, `DataBridgeCopilot`, `DualFileUploadZone`, `ItemsTable`).
   * Rotação suave de 180° dos chevrons e alinhamento à direita dos selos/badges nos mini-cards de detalhe do item.
   * Correção do hover de alto contraste nos botões SEFAZ/Sintegra/Receita.
2. **Estudo Integral da Integração Procenge Pirâmide:**
   * Análise do manual oficial de 426 páginas (`docs/modelos-de-integracao-2.pdf`).
   * Validação do **Método C (TIs no Oracle)** como arquitetura oficial.
   * Confirmação dos sistemas integrados em `TI_SISTEMA` (`docs/testes/4_consultas.csv`).
3. **Mapeamento de Banco de Dados de Homologação (Servidor `.61`):**
   * Estrutura de colunas de `TI_ITEM_ENTRADA_LOTE` e `TI_ITEM_NOTA_FISCAL_ENTRADA` confirmada via `user_tab_cols`.
   * Empresas confirmadas: `001` (QUESALON Matriz) e `003` (INFAN S/A).
   * Almoxarifados confirmados: `GQ`, `ALMOX`, `AVCD`, `AVARIA`, `CQ`, `EXPEDI`, `DESCAR`, `PENHOR`, `REFUGO`, `NORLOG`.
4. **Motor de Geração de Script PL/SQL:**
   * Criada a função `generatePiramideOracleTiInsertScript` em `src/services/piramideService.ts` para carga transacional direta com tratamento de erros.

---

## 📌 10. DESCOBERTAS CRÍTICAS DE ENGENHARIA & HOMOLOGAÇÃO ORACLE (02/09/2026)

### 10.1. Mapeamento Oficial das NDOs da Hebron (Tabela `NDO`)
* **Estrutura Real da Tabela `NDO`:** Colunas `CODIGO`, `DESCRICAO`, `ESTOQUE`, `FINANCEIRO`, `CONTABIL`, `IND_NDO_COMPRA`.
* **Códigos Mnemônicos Oficiais de Devolução:**
  * **`COM206`:** `INFAN- RETORNO NOSSA NF_ PRODUTO ACABADO C MOV EST_ INTERESTADUAL (ICMS 7%) 2.949` (`ESTOQUE = S`, `FINANCEIRO = N`, `CONTABIL = S`).
  * **`COM032`:** `QUESALON - RETORNO DE AG POR DEVOLUCAO` (`ESTOQUE = S`, `FINANCEIRO = N`, `CONTABIL = S`).
  * **`COM033`:** `QUESALON - RETORNO DE LITERATURA POR DEVOLUCAO INTERESTADUAL` (`ESTOQUE = S`, `FINANCEIRO = N`, `CONTABIL = S`).
  * **`COM200`:** `INFAN - ENTRADA EM BONIFICAÇÃO MP, ME, MA 2.910 ICMS 7%` (`ESTOQUE = S`, `FINANCEIRO = N`, `CONTABIL = S`).
  * **`DEV008` / `DEV009` / `DEV010`:** `INFAN- DEVOLUCAO DE MAT LABORATORIO` (`ESTOQUE = S`, `FINANCEIRO = N`, `CONTABIL = S`).

### 10.2. Diagnóstico da Esteira de Jobs e Packages Oracle Pirâmide
* **Gerenciador de Fila:** `USER_JOBS` (`DBMS_JOB`).
* **Frequência de Processamento:** Intervalo ultra-rápido de **60 segundos (`SYSDATE + 60/(24*60*60)`)**.
* **Status das Packages de Integração:** 100% Válidas (`PCK_PIR_BASE_INTEGRA`, `PCK_PIR_BASE_NFE`, `PCK_PIR_ATRIBUTO_ENTRADA`, `PCK_PIR_CONST_INTEGRA`, `PCK_PIR_INTEGRA_BAIXA_TREC_NDO`).

### 10.3. Tabelas Cadastrais Confirmadas no Schema
* **Clientes:** `CLIENTES` (e tabelas filhas `CLIENTE_EMPRESA`, `CLIENTE_CONTATO`, `ENDERECO_CLIENTE`).
* **Fornecedores:** `FORNEC` (e `FORNEC_CONTA`, `FORNEC_EMPRESA`).
* **Pessoas/Entidades:** `PESSOA`.
* **Staging `TI_NOTA_FISCAL_ENTRADA`:** Totalmente limpa e pronta para receber as cargas de devolução.

### 10.4. Marco Histórico: Primeira Carga Completa Homologada com Sucesso no Oracle (.61)
* **Data:** 02/09/2026 10:07
* **Resultado:** Execução do bloco PL/SQL com **100% de sucesso** nas 3 tabelas de staging:
  1. `TI_NOTA_FISCAL_ENTRADA` (Cabeçalho com `COD_UNIDADE_NEGOCIO_ORIGEM = '001'`, `COD_SISTEMA_ORIGEM = 'VAL'`, status `'NP'`).
  2. `TI_ITEM_NOTA_FISCAL_ENTRADA` (Item com `VAL_OUTRAS_DESPESAS = 0`, NDO `COM032`, CFOP `2.202`, Almoxarifado `GQ`).
  3. `TI_ITEM_ENTRADA_LOTE` (Lote `2606039`, Validade `2028-06-30`, Fabricante `001`).
* **Transação:** Comitada com sucesso sem violação de constraints ou chaves estrangeiras.


