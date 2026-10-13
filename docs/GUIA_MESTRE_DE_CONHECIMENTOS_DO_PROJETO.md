# 🏛️ GUIA MESTRE DE CONHECIMENTOS, ARQUITETURA E OPERAÇÃO
## Sistema Validador Fiscal de Devoluções & Integração ERP Pirâmide (Oracle Procenge)
> **Organização:** Hebron Farmacêutica & HebronVet  
> **Empresas do Grupo:** INFAN S/A (PB), QUESALON Matriz (PB), QUESALON Filial Extrema (MG), QUEDES Distribuidora (AL)  
> **Status do Projeto:** Homologado em Banco de Testes (.61) com Suíte de Testes 100% Verde (88/88)  
> **Data de Consolidação:** 13 de Outubro de 2026  
> **Público-Alvo:** Desenvolvedores Full-Stack, Analistas de Sistemas ERP, DBA Oracle, Auditores Fiscais e Engenheiros DevOps  

---

## 📑 SUMÁRIO EXECUTIVO

1. [Propósito do Sistema & Gargalo Operacional Eliminado](#1-propósito-do-sistema--gargalo-operacional-eliminado)
2. [Estrutura Corporativa do Grupo Hebron & Regras Fiscais](#2-estrutura-corporativa-do-grupo-hebron--regras-fiscais)
3. [Arquitetura de Software & Fluxo de Dados](#3-arquitetura-de-software--fluxo-de-dados)
4. [Motores de Validação & Inteligência Tributária](#4-motores-de-validação--inteligência-tributária)
5. [Integração com ERP Pirâmide (Procenge / Oracle Database)](#5-integração-com-erp-pirâmide-procenge--oracle-database)
6. [Catálogo de Constraints & "Gotchas" Técnicos do Banco](#6-catálogo-de-constraints--gotchas-técnicos-do-banco)
7. [Scripts Oficiais PL/SQL (Carga, Auditoria e Rollback)](#7-scripts-oficiais-plsql-carga-auditoria-e-rollback)
8. [Guia de Desenvolvimento, Testes e Deploy](#8-guia-de-desenvolvimento-testes-e-deploy)
9. [Próximos Passos & Roteiro de Implantação](#9-próximos-passos--roteiro-de-implantação)

---

## 🎯 1. PROPÓSITO DO SISTEMA & GARGALO OPERACIONAL ELIMINADO

### 1.1. O Cenário Anterior (Processo Manual)
Historicamente, as devoluções de mercadorias faturadas pela Hebron Farmacêutica dependiam de conferência visual e digitação manual no ERP Pirâmide (Procenge) pelas analistas fiscais (Glécia/Polliana):
* **Risco de Glosa Fiscal:** Clientes frequentemente emitem a Nota Fiscal de Devolução (NFD) com alíquotas erradas, preço unitário divergente, falta de rateio de descontos comerciais da venda, ou ausência de destaque de ICMS-ST.
* **Sobrecarga de Digitação:** Para cada nota aprovada, era necessário digitar manualmente no ERP: Chave de Acesso (44 dígitos), Série, Número, CNPJ, Protocolo SEFAZ, CFOP, NDO de entrada, Almoxarifado contábil e todos os lotes de medicamentos com datas de fabricação e validade sanitária (ANVISA).
* **Falso Erros e Rejeições:** Operadores fiscais gastavam horas tentando reconciliar XMLs com dados de DANFE em PDF enviados por transportadoras ou distribuidores farmacêuticos (ex: Tapajós, Santa Cruz, Profarma).

### 1.2. A Solução: O Validador Fiscal Automatizado
O Validador Fiscal Hebron automatizou 100% desse fluxo através de uma esteira inteligente:
1. **Ingestão Híbrida:** Suporta simultaneamente arquivos XML da NFO/NFD e DANFEs em PDF (extraídos nativamente via PDF.js com renderização via Web Workers em memória Blob).
2. **Auditoria Algorítmica (Princípio da Nota Espelho):** Audita campo a campo, lote a lote e imposto por imposto, garantindo que nada seja devolvido em desacordo com a Nota Fiscal de Origem (NFO).
3. **Carga em 1 Clique no ERP Pirâmide:** Ao ser aprovada na auditoria, os dados são convertidos na estrutura relacional do Procenge e injetados nas tabelas intermediárias de staging (`TI_NOTA_FISCAL_ENTRADA`, `TI_ITEM_NOTA_FISCAL_ENTRADA` e `TI_ITEM_ENTRADA_LOTE`) com status `'NP'` (*Não Processado*).
4. **Processamento Assíncrono:** O Job periódico do Pirâmide consome a fila a cada ~60 segundos e oficializa a entrada contábil/estoque no ERP sem qualquer digitação humana.

---

## 🏢 2. ESTRUTURA CORPORATIVA DO GRUPO HEBRON & REGRAS FISCAIS

Cada empresa do grupo possui perfil tributário único, que o sistema detecta e parametriza dinamicamente:

| Código | Unidade / Empresa | CNPJ Raiz / Completo | UF | Perfil Fiscal & Regras Tributárias |
| :---: | :--- | :--- | :---: | :--- |
| **`001`** | **QUESALON Matriz** | `04.792.134/0001-43` | PB | **Distribuidora Comercial.** Base Cheia (100%). Alíquota interna PB: 20,00%. Interestadual: 12,00%. NDO Padrão Pirâmide: **`COM032`**. |
| **`003`** | **INFAN Indústria Química Farmacêutica S/A** | `08.939.548/0001-03` | PB | **Indústria Farmacêutica.**<br>• Interna PB: 20,50% com **Redução de Base** para Medicamentos NCM 3004 (redução de 9,90%, base efetiva 90,10%) e Cosméticos/Higiene NCM 3401/3304/3307 (redução de 10,49%, base efetiva 89,51%).<br>• Interestadual: 12,00%.<br>• **PIS/COFINS Monofásico (Lei 10.147/00):** Cliente devolve com CST 04 (sem destaque). O sistema credita automaticamente PIS (2,10%) e COFINS (9,90%) sob **CST 50** no Pirâmide.<br>• NDO Padrão Pirâmide: **`COM206`** (Produção Própria). |
| **`004`** | **QUESALON Filial Extrema** | `04.792.134/0004-96` | MG | **Distribuidora Filial MG (Termo de Acordo MG).**<br>• Interna MG: 12,00% ou 18,00%.<br>• Interestadual: 12,00% (Sul/Sudeste exceto ES) e 7,00% (Norte, Nordeste, Centro-Oeste e ES).<br>• NDO Padrão Pirâmide: **`COM032`**. |
| **`005`** | **QUEDES Distribuidora** | `10.565.860/0001-08` | AL | **Distribuidora Comercial em Alagoas.** Linha exclusiva de medicamentos. Interestadual: 12,00%. |
| **🐾** | **Linha HebronVet** | Vinculada às Unidades | Diversas | **Saúde Animal.** Produtos regulados pelo MAPA e SEFAZ. Rastreabilidade sanitária estrita por lote e data de validade. |

---

## 💻 3. ARQUITETURA DE SOFTWARE & FLUXO DE DADOS

O sistema é construído em **TypeScript Estrito (Strict Mode)**, dividindo-se entre Frontend de Alta Densidade e Backend Conector Oracle.

```
                          ┌───────────────────────────┐
                          │     OPERADOR FISCAL       │
                          │   (Glécia / Polliana)     │
                          └─────────────┬─────────────┘
                                        │ Upload NFO + NFD (XML / PDF)
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (SPA)                                │
│                                                                           │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌───────────────┐   │
│   │   danfePdfParser    │   │      xmlParser      │   │  sefazClient  │   │
│   │ (PDF.js Blob Worker)│   │  (DOMParser W3C)    │   │ (Status SEFAZ)│   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └───────┬───────┘   │
│              │                         │                      │           │
│              └────────────┬────────────┘                      │           │
│                           ▼                                   │           │
│              ┌───────────────────────────┐                    │           │
│              │   reconciliationEngine    │◄───────────────────┘           │
│              │   (10 Regras Hebron)      │                                │
│              └────────────┬──────────────┘                                │
│                           │                                               │
│                           ▼                                               │
│              ┌───────────────────────────┐                                │
│              │    DataBridge Copilot     │                                │
│              │ (Resumo, Auditoria, TIs)  │                                │
│              └────────────┬──────────────┘                                │
└───────────────────────────┼───────────────────────────────────────────────┘
                            │ Chamada REST /api/piramide/integrate
                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + node-oracledb)                      │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │  piramideViteMiddleware.ts / standaloneServer.ts                  │   │
│   │  • GET  /api/piramide/health                                      │   │
│   │  • POST /api/piramide/integrate                                   │   │
│   │  • GET  /api/piramide/status/:notaFiscal                          │   │
│   │  • DELETE /api/piramide/rollback/:notaFiscal                      │   │
│   └─────────────────────────────────┬─────────────────────────────────┘   │
│                                     │ Pool de Conexões                    │
│                                     ▼                                     │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │  piramideIntegrator.ts & oracleDbPool.ts                          │   │
│   │  • Geração de NUM_SEQUENCIAL_ENTRADA_ORIGEM                       │   │
│   │  • Sanitização de Constraints (NDO <= 6, Almox <= 5)              │   │
│   │  • Inserção atômica em Transação Única com COMMIT/ROLLBACK        │   │
│   └─────────────────────────────────┬─────────────────────────────────┘   │
└─────────────────────────────────────┼─────────────────────────────────────┘
                                      │ TCP 1521 (TNS Listener)
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     ORACLE DATABASE (19c Enterprise)                      │
│                                                                           │
│       🧪 HOMOLOGAÇÃO: 192.169.97.61:1521/TESTE (Schema PIRAMIDE)           │
│       🏭 PRODUÇÃO:    192.169.97.60:1521/PROD  (Schema PIRAMIDE)           │
│                                                                           │
│   ┌───────────────────────────────┐   1:N ┌───────────────────────────┐   │
│   │    TI_NOTA_FISCAL_ENTRADA     │──────▶│TI_ITEM_NOTA_FISCAL_ENTRADA│   │
│   │     (Status: 'NP')            │       │ (NDO: COM032, Almox: AVCD)│   │
│   └───────────────────────────────┘       └─────────────┬─────────────┘   │
│                                                         │ 1:N             │
│                                                         ▼                 │
│                                           ┌───────────────────────────┐   │
│                                           │   TI_ITEM_ENTRADA_LOTE    │   │
│                                           │ (Rastreabilidade ANVISA)  │   │
│                                           └───────────────────────────┘   │
│                                                         │                 │
│                                                         ▼                 │
│                                            [ Job Procenge Pirâmide ]      │
│                                            (Promove 'NP' para 'P')        │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Mapa dos Principais Arquivos do Repositório
* `src/types/nfe.ts`: Interfaces de tipagem estrita de NFe, Itens, Impostos, Lotes e Reconciliação.
* `src/services/reconciliationEngine.ts`: O coração algorítmico da auditoria fiscal Hebron.
* `src/services/danfePdfParser.ts`: Extrator de alta precisão de DANFE em PDF (OCR estruturado).
* `src/services/xmlParser.ts`: Extrator de XML de NFe (distribuição nacional, SEFAZ).
* `src/services/ndoTaxEngine.ts`: Matriz inteligente de CFOPs de saída vs devolução vs entrada no ERP.
* `src/services/hebronBusinessRules.ts`: Regras de negócio de rateio de desconto, monofásico e filiais.
* `src/services/piramideService.ts`: Gerador de scripts PL/SQL de staging do ERP Pirâmide.
* `src/server/piramideIntegrator.ts`: Conector Oracle nativo (`oracledb`) com execução transacional.
* `src/server/oracleDbPool.ts`: Gerenciador de conexão Oracle com fallback seguro para homologação.
* `src/components/DataBridgeCopilot.tsx`: Painel visual de comando para carga e conferência do operador.
* `src/components/ItemsTable.tsx`: Tabela com comparativo triplo de impostos (Origem x Cliente x Sistema).

---

## ⚖️ 4. MOTORES DE VALIDAÇÃO & INTELIGÊNCIA TRIBUTÁRIA

### 4.1. O Princípio da Nota Espelho
Nenhuma Nota Fiscal de Devolução (NFD) pode transferir mais crédito fiscal ou alterar valores unitários da Nota Fiscal de Origem (NFO):
1. **Preço Unitário Imutável:** $vUn_{NFD} = vUn_{NFO}$. Se o cliente informar preço unitário divergente, o validador bloqueia com erro crítico impeditivo.
2. **Trava de Quantidade:** A quantidade devolvida nunca pode ser superior à quantidade faturada na venda ($q_{NFD} \le q_{NFO}$). O sistema suporta perfeitamente **devoluções parciais** (ex: faturou 24 un, devolveu 3 un).
3. **Chave de Referência Obrigatória:** Toda devolução deve conter na tag `<NFref>` ou no campo `infCpl` a menção à NFO original faturada pela Hebron.

### 4.2. Rateio Proporcional de Desconto Comercial
Se a venda original teve desconto comercial global ou por item, a devolução parcial DEVE estornar o desconto estritamente proporcional:
$$\text{Desconto Esperado} = \frac{\text{Desconto Original NFO}}{\text{Qtd Faturada NFO}} \times \text{Qtd Devolvida NFD}$$
* **Tolerância Matemática:** O motor tolera uma variação de até **$\pm\text{R\$}~0,05$** decorrente de arredondamento de centavos dos sistemas dos clientes.
* **Desconto Embutido no Preço Unitário:** Se o cliente emitir a NFD com o preço unitário já líquido (abatendo o desconto no valor unitário em vez de usar o campo de desconto), o sistema detecta a equivalência financeira e não gera falso erro de preço.

### 4.3. Regime Monofásico de PIS/COFINS da INFAN (Lei nº 10.147/2000)
* **Cenário:** A INFAN (indústria) recolhe PIS/COFINS concentrado na fábrica com alíquotas majoradas (PIS 2,10% e COFINS 9,90%, total 12,00%). Nas devoluções de medicamentos monofásicos (NCM 3004), o cliente devolve com CST `04` ou `49` (Alíquota Zero).
* **Solução Hebron:** O validador reconhece que não há divergência, calcula o crédito devido à INFAN ($2,10\%$ e $9,90\%$) e sugere a escrituração no Pirâmide sob o **CST `50` (Operação com Direito a Crédito)**.

### 4.4. Reforma Tributária (Transição CBS e IBS - EC 132/2023)
O validador já inclui suporte nativo aos novos tributos federais e estaduais:
* Parse automático dos grupos `<IBSCBS>` e `<IBSCBSTot>`.
* Auditoria da alíquota de teste da **CBS (0,90%)** e do **IBS (0,10%)**.

---

## 🗄️ 5. INTEGRAÇÃO COM ERP PIRÂMIDE (PROCENGE / ORACLE DATABASE)

A integração oficial segue o **Método C** do manual de integração da Procenge (carga via tabelas staging intermediárias no schema `PIRAMIDE`).

### 5.1. Topologia de Ambientes e Servidores
| Ambiente | Host / IP | Porta | Serviço / SID | Schema | Função |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **🧪 Homologação (TESTE)** | **`192.169.97.61`** | **`1521`** | **`TESTE`** | **`PIRAMIDE`** | **Ambiente Oficial de Testes**. Destino exclusivo de todas as cargas e simulações. |
| **🏭 Produção (OFICIAL)** | `192.169.97.60` | `1521` | `PROD` | `PIRAMIDE` | **Produção Corporativa**. Permanece em Standby até a validação com a Gerência Fiscal. |
| **🖥️ Servidor Web (VM)** | `192.168.97.10` | `5002` | `HTTP` | N/A | Máquina Virtual Debian Hebron executando o container Docker da aplicação. |

### 5.2. As 3 Tabelas Staging de Integração
1. **`TI_NOTA_FISCAL_ENTRADA` (Cabeçalho da NF):**
   * Identifica a nota, série, emissor (CNPJ do cliente), chave de 44 dígitos, datas e valores totais.
   * Chave Lógica: `(COD_SISTEMA_ORIGEM, NUM_SEQUENCIAL_ENTRADA_ORIGEM)`.
   * Identificador do Sistema: `COD_SISTEMA_ORIGEM = 'VAL'` (Validador Fiscal).
   * Status Inicial: `COD_STATUS_REGISTRO = 'NP'` (*Não Processado*).
2. **`TI_ITEM_NOTA_FISCAL_ENTRADA` (Itens Faturados):**
   * Contém os itens faturados, produto, quantidade devolvida, valor líquido, CFOP, NDO e Almoxarifado contábil.
   * Amarrada ao cabeçalho pelo campo `NUM_SEQUENCIAL_ENTRADA_ORIGEM`.
   * Identificador de Sistema: `COD_SIST_SOLIC_OPER_REGISTRO = 'VAL'`.
3. **`TI_ITEM_ENTRADA_LOTE` (Rastreabilidade Sanitária ANVISA):**
   * Garante a rastreabilidade farmacêutica exigida pela ANVISA (RDC 430/2020 e NT 2021.004).
   * Grava o número do lote, data de validade sanitária, data de fabricação e quantidade devolvida daquele lote.
   * Amarrada por `COD_ENTRADA_ORIGEM` e `COD_ITEM_ENTRADA_ORIGEM`.

---

## ⚠️ 6. CATÁLOGO DE CONSTRAINTS & "GOTCHAS" TÉCNICOS DO BANCO

Durante a homologação prática no banco Oracle `192.169.97.61`, foram mapeadas e blindadas no código 4 restrições severas de catálogo:

### Gotcha 1: Tamanho Máximo da NDO (`ORA-12899`)
* **Coluna:** `TI_ITEM_NOTA_FISCAL_ENTRADA.COD_NDO_ORIGEM`
* **Tipo no Catálogo:** **`VARCHAR2(6)`** (Aceita estritamente até 6 caracteres).
* **Erro Ocorrido:** `ORA-12899: valor muito grande para a coluna COD_NDO_ORIGEM (real: 17, máximo: 6)` ao enviar descrições como `'DEV-VDA-REV-INTER'`.
* **Solução Implementada:** O sistema injeta os códigos mnemônicos oficiais Hebron:
  * **`COM032`**: Devolução de Mercadorias para Comercialização (Quesalon PB `001` e Extrema MG `004`).
  * **`COM206`**: Retorno de Produção Própria (INFAN Indústria `003`).
  * **`COM200`**: Entrada em Bonificação (Infan e Quesalon).
  * Ou o CFOP limpo com 4 dígitos (`2202`, `1202`, `2201`, `1201`).

### Gotcha 2: Tamanho Máximo do Almoxarifado / Depósito (`ORA-12899`)
* **Coluna:** `TI_ITEM_NOTA_FISCAL_ENTRADA.COD_DEPOSITO`
* **Tipo no Catálogo:** **`VARCHAR2(5)`** (Aceita estritamente até 5 caracteres).
* **Erro Ocorrido:** A palavra literal `'AVARIA'` possui 6 caracteres e causa estouro de coluna.
* **Solução Implementada:** Normalização automática no conector e no gerador SQL:
  * `'AVARIA'` (6 chars) $\rightarrow$ **`'AVCD'`** (Avaria de CD - 4 chars) ou **`'GQ'`** (Garantia da Qualidade - 2 chars).
  * Outros almoxarifados permitidos: `'ALMOX'` (5), `'CQ'` (2), `'EXTRV'` (5), `'EXPED'` (5).

### Gotcha 3: Coluna `COD_SISTEMA_ORIGEM` Inexistente na Tabela de Itens (`ORA-00904`)
* **Erro Ocorrido:** `ORA-00904: "COD_SISTEMA_ORIGEM": identificador inválido` ao consultar ou deletar direto na tabela de itens.
* **Causa:** A coluna `COD_SISTEMA_ORIGEM` existe **apenas** na tabela de cabeçalho (`TI_NOTA_FISCAL_ENTRADA`).
* **Solução Implementada:** Na tabela de itens, a vinculação relacional é feita exclusivamente por `NUM_SEQUENCIAL_ENTRADA_ORIGEM`, e a coluna de sistema chama-se `COD_SIST_SOLIC_OPER_REGISTRO = 'VAL'`.

### Gotcha 4: Campos NOT NULL Obrigatórios
* `TI_NOTA_FISCAL_ENTRADA.COD_UNIDADE_NEGOCIO_ORIGEM`: Deve sempre conter o código da filial Hebron (`'001'`, `'003'`, `'004'` ou `'005'`).
* `TI_ITEM_NOTA_FISCAL_ENTRADA.VAL_OUTRAS_DESPESAS`: Não aceita `NULL`. Se não houver despesas adicionais, deve receber explicitamente `0`.

---

## 📜 7. SCRIPTS OFICIAIS PL/SQL (CARGA, AUDITORIA E ROLLBACK)

Todos os scripts abaixo foram executados e homologados com sucesso no banco de testes `192.169.97.61:1521/TESTE` sob o schema `PIRAMIDE`:

### 7.1. Script de Auditoria e Inspeção das TIs
Utilizado para verificar se a nota fiscal foi inserida e qual seu status atual:
```sql
-- 1. Inspeciona o Cabeçalho da Nota
SELECT 
    COD_SISTEMA_ORIGEM,
    NUM_SEQUENCIAL_ENTRADA_ORIGEM AS SEQ,
    COD_UNIDADE_NEGOCIO_ORIGEM AS FILIAL,
    COD_NOTA_FISCAL AS NOTA,
    COD_SERIE_NOTA_FISCAL AS SERIE,
    COD_EMITENTE_ENTRADA AS CNPJ_EMISSOR,
    VAL_TOTAL_NOTA,
    VAL_TOTAL_DESCONTO,
    COD_STATUS_REGISTRO AS STATUS,
    DSC_ERRO_REGISTRO AS ERRO,
    DAT_DIGITACAO
FROM TI_NOTA_FISCAL_ENTRADA
WHERE COD_SISTEMA_ORIGEM = 'VAL'
ORDER BY DAT_DIGITACAO DESC;

-- 2. Inspeciona os Itens Faturados
SELECT 
    NUM_SEQUENCIAL_ENTRADA_ORIGEM AS SEQ,
    NUM_SEQUENCIAL_ITEM_ENTRADA AS ITEM,
    COD_PRODUTO_ORIGEM AS PRODUTO,
    COD_NDO_ORIGEM AS NDO,
    COD_DEPOSITO AS ALMOX,
    QTD_ENTRADA AS QTD,
    VAL_UNITARIO_ITEM AS V_UN,
    VAL_CONTABIL_ESTOQUE AS V_LIQ,
    COD_STATUS_REGISTRO AS STATUS
FROM TI_ITEM_NOTA_FISCAL_ENTRADA
WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
    FROM TI_NOTA_FISCAL_ENTRADA 
    WHERE COD_SISTEMA_ORIGEM = 'VAL'
)
ORDER BY NUM_SEQUENCIAL_ENTRADA_ORIGEM, NUM_SEQUENCIAL_ITEM_ENTRADA;

-- 3. Inspeciona os Lotes Farmacêuticos (ANVISA)
SELECT 
    COD_ENTRADA_ORIGEM AS SEQ,
    COD_ITEM_ENTRADA_ORIGEM AS ITEM,
    COD_LOTE AS LOTE,
    TO_CHAR(DAT_VALIDADE, 'DD/MM/YYYY') AS VALIDADE,
    TO_CHAR(DAT_FABRICACAO, 'DD/MM/YYYY') AS FABRICACAO,
    QTD_LOTE AS QTD
FROM TI_ITEM_ENTRADA_LOTE
WHERE COD_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
    FROM TI_NOTA_FISCAL_ENTRADA 
    WHERE COD_SISTEMA_ORIGEM = 'VAL'
);
```

### 7.2. Script Transacional de Limpeza e Rollback Higienizado
Utilizado para remover qualquer nota de teste sem deixar registros órfãos:
```sql
BEGIN
  -- 1. Deleta os lotes da nota de teste
  DELETE FROM TI_ITEM_ENTRADA_LOTE 
  WHERE COD_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
    FROM TI_NOTA_FISCAL_ENTRADA 
    WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
  );

  -- 2. Deleta os itens da nota de teste
  DELETE FROM TI_ITEM_NOTA_FISCAL_ENTRADA 
  WHERE NUM_SEQUENCIAL_ENTRADA_ORIGEM IN (
    SELECT NUM_SEQUENCIAL_ENTRADA_ORIGEM 
    FROM TI_NOTA_FISCAL_ENTRADA 
    WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338'
  );

  -- 3. Deleta o cabeçalho da nota de teste
  DELETE FROM TI_NOTA_FISCAL_ENTRADA 
  WHERE COD_SISTEMA_ORIGEM = 'VAL' AND COD_NOTA_FISCAL = '663338';

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('LIMPEZA CONCLUÍDA: Registros removidos com sucesso das TIs.');
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('ERRO NA LIMPEZA: ' || SQLERRM);
END;
/
```

---

## 🛠️ 8. GUIA DE DESENVOLVIMENTO, TESTES E DEPLOY

### 8.1. Pré-Requisitos
* Node.js v20+ e npm 10+.
* Acesso à VPN Hebron para comunicação com os servidores `192.169.97.61` e `192.168.97.10`.

### 8.2. Comandos do Dia a Dia
```bash
# Instalar dependências
npm install

# Executar a suíte completa de testes automatizados (88 testes)
npm test

# Compilar para produção (TypeScript estrito + Vite bundle)
npm run build

# Executar servidor de desenvolvimento local
npm run dev
```

### 8.3. Variáveis de Ambiente (`.env`)
```ini
# Configuração do Banco Oracle Pirâmide
ORACLE_USER=piramide
ORACLE_PASSWORD=sua_senha_aqui
ORACLE_CONNECT_STRING=192.169.97.61:1521/TESTE
ORACLE_SCHEMA=PIRAMIDE
ORACLE_SISTEMA_ORIGEM=VAL

# Porta da API Integradora
PORT=5002
```

---

## 🚀 9. PRÓXIMOS PASSOS & ROTEIRO DE IMPLANTAÇÃO

Com a homologação no banco de testes `.61` 100% validada e a integridade de dados garantida, o cronograma operacional divide-se em 4 etapas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ROTEIRO DE ENTRADA EM PRODUÇÃO                       │
├────────────────────────────────────────────────────────────────────────┤
│  [ PASSO 1 ] Habilitar o Backend API no Docker da VM (192.168.97.10)   │
│              Configurar o Nginx da VM para repassar /api/piramide/*    │
│              para o processo Node.js integrador.                       │
├────────────────────────────────────────────────────────────────────────┤
│  [ PASSO 2 ] Teste de Ponta a Ponta no Navegador com Glécia            │
│              Acessar http://192.168.97.10:5002, carregar um par de     │
│              notas reais e clicar em "🚀 Lançar no Pirâmide".          │
├────────────────────────────────────────────────────────────────────────┤
│  [ PASSO 3 ] Acompanhamento do Job Procenge no ERP                     │
│              Observar a transição do status 'NP' para 'P' no Pirâmide   │
│              e verificar a geração da pré-nota/nota de entrada.        │
├────────────────────────────────────────────────────────────────────────┤
│  [ PASSO 4 ] Homologação Gerencial & Virada Oficial para Produção      │
│              Obter aceite formal de Polliana e apontar o conector      │
│              para o host de produção oficial (192.169.97.60).          │
└────────────────────────────────────────────────────────────────────────┘
```

---
*Este documento é parte integrante do acervo técnico e patrimônio de software do Grupo Hebron Farmacêutica.*
