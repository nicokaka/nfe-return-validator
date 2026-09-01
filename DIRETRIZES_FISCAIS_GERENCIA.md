Aqui está o documento de especificação técnica completo e detalhado com todas as diretrizes explicadas pela **Polliana** nos áudios, enriquecido com as regras fiscais das planilhas de dados e as exigências oficiais da SEFAZ. O documento foi estruturado de forma extremamente técnica para que o seu programador compreenda exatamente quais validações, cálculos e fluxos lógicos devem ser inseridos no código-fonte do sistema.

---

# 📑 ESPECIFICAÇÃO TÉCNICA PARA DESENVOLVIMENTO: SISTEMA DE AUDITORIA DE DEVOLUÇÕES E REGRAS FISCAIS

Este documento consolida as regras de negócio, alíquotas por empresa, fórmulas matemáticas e as novas obrigações de leiaute da SEFAZ para o desenvolvimento do nosso módulo de auditoria de Notas Fiscais de Devolução (NF-e de finalidade 4).

---

## 1. O PRINCÍPIO DA "NOTA ESPELHO" (DIRETRIZ CORE)
A regra fundamental estabelecida nos áudios é que **a nota de devolução do cliente (Nota Y) deve ser um espelho exato da nota de faturamento/saída original (Nota X)**. 

### Lógica que o programador deve implementar:
* **Prioridade de Origem sobre a Regra Teórica:** O sistema de auditoria não deve validar o XML de devolução apenas com base em regras fiscais estáticas genéricas. Se, por qualquer erro de parametrização ou falta de configuração na época da venda, faturamos com alíquotas ou valores de impostos incorretos na nota de saída, **o cliente deve devolver exatamente com os mesmos valores incorretos destacados na saída**. Isso garante a anulação contábil exata da operação.
* **Tratamento de Correções e Notas Complementares:** No dia a dia, ocorrem muitas correções posteriores ao faturamento. Se houver uma **Carta de Correção Eletrônica (CC-e)** corrigindo um CFOP, ou se emitirmos uma **Nota Complementar de ICMS ST** destacando um imposto que faltou, a devolução do cliente deve refletir o cenário corrigido. Portanto, o programa deve ler a nota de saída, carregar seus históricos de complementos e correções associados e usá-los como base de cálculo real da auditoria.
* **Validação por Comparação Síncrona:** O programa do desenvolvedor deve realizar uma varredura item a item comparando a nota de devolução do cliente com o XML de saída. Se houver divergências de alíquotas, bases de cálculo ou lotes que não batam com o que saiu originalmente, o sistema deve emitir um alerta técnico impedindo o recebimento.

---

## 2. TRANSIÇÃO DA REFORMA TRIBUTÁRIA: IMPACTO CRÍTICO NO CAIXA (CBS E IBS)
A Polliana explicou uma mudança vital de fluxo de caixa que entra em vigor com a transição para a Reforma Tributária (IBS e CBS):

* **Atualmente (Modelo de Destaque):** A nossa empresa apenas destaca os impostos que é obrigada a informar no XML de saída, mas **não se credita oficialmente deles de forma direta nas devoluções ordinárias**.
* **A partir de Janeiro de 2027 (Modelo de Crédito Oficial):** O cenário muda drasticamente. Nós passaremos a **nos creditar oficialmente dos valores de IBS e CBS das mercadorias que os clientes nos devolverem**.
* **Regra de Validação Sistêmica (Ação Obrigatória do Sistema):** O programador deve implementar uma validação que verifique se o cliente preencheu corretamente os grupos de IBS e CBS no XML de devolução. **Se o cliente não destacar o IBS/CBS na nota de devolução, o sistema do nosso site deve rejeitar a nota imediatamente**. Caso contrário, não poderemos tomar o crédito fiscal na nossa apuração, o que representará um prejuízo financeiro direto para o caixa da empresa.
* **Alíquotas-Teste de Transição (Vigentes em 2026):**
  * **CBS (Federal):** **0,90%** (CST 09 na entrada / CST 01 na saída).
  * **IBS (Estadual):** **0,10%**.
  * **IBS (Municipal):** **0,00%** (zerado).

---

## 3. REGRAS DE ICMS E CONFIGURAÇÕES ESPECÍFICAS POR EMPRESA
A validação de alíquotas de ICMS deve cruzar as regras de negócio das quatro divisões corporativas com as regiões geográficas:

### A. Indústria INFAN
* **Operações Internas:** Alíquota padrão de **20,50%**.
* **Reduções de Base de Cálculo por NCM (Benefício Fiscal de Entrada):**
  * **NCM 3004** (Medicamentos): Tem **redução de base de cálculo de ICMS de 9,90%**. (O programador deve aplicar o cálculo: \\(BaseReduzida = ValorItem \times 0,901\\)).
  * **NCMs 3401.20.10, 3304.99.10, 3307.90.00 e 3401.30.00:** Têm **redução de base de cálculo de ICMS de 10,49%**. (Cálculo: \\(BaseReduzida = ValorItem \times 0,8951\\)).
  * **Demais NCMs** (como 2936, 2106, 2309, 34011900, 3306.90.00): **Base cheia** (sem redução).
* **Operações Interestaduais:** Alíquota padrão de **12,00%**.

### B. QUESALON PB (Paraíba)
* **Operações Internas:** Alíquota padrão de **20,00%**.
* **Operações Interestaduais:** Sempre **12,00%** para qualquer estado do Brasil.
* **Sem Reduções de Base:** Todos os produtos utilizam **Base Cheia** (sem reduções de NCM).

### C. QUESALON EXTREMA (Minas Gerais)
* **Operações Internas:** Pode ser **12,00% ou 18,00%**.
  * **Lógica do Termo de Acordo:** Possuímos um Termo de Acordo com o estado de Minas Gerais. O programa deve verificar o NCM do item. Se o NCM estiver listado no documento do Termo de Acordo de Benefício Fiscal, a alíquota de saída é **12,00%**. Caso contrário, aplica-se a alíquota padrão de **18,00%**.
  * *Recomendação da Polliana para o programador:* Para simplificar a programação e evitar cadastros manuais do Termo de Acordo no banco do site, configure o sistema para **herdar a alíquota praticada diretamente da nota de saída original**.
* **Operações Interestaduais:**
  * Para **regiões Sul e Sudeste** (exceto Espírito Santo): Alíquota de **12,00%**.
  * Para **Espírito Santo, Centro-Oeste, Norte e Nordeste**: Alíquota de **7,00%**.

### D. QUEDES (Alagoas)
* **Operações de Medicamentos:** A QUEDES trabalha apenas com a linha de medicamentos e **não realiza vendas internas** (apenas interestaduais).
* **Alíquota Interestadual:** Sempre **12,00%** para qualquer estado por sair de Alagoas.

---

## 4. HERANÇA DE ICMS ST (SUBSTITUIÇÃO TRIBUTÁRIA)
A parametrização de alíquotas internas de Substituição Tributária (ST) no banco de dados é inviável, pois varia por produto, estado de destino e protocolos fiscais vigentes.

* **A Lógica de Herança (Validação ST):** O programador deve configurar o sistema para ler o XML de saída. Se na venda original houve o destaque de ICMS ST (presença das tags `vBCST` e `vICMSST`), o sistema de auditoria deve **exigir o destaque correspondente de ICMS ST na nota de devolução de forma rigorosamente proporcional à quantidade devolvida**. Se a nota original não teve ST, a devolução do cliente também não deve conter.

---

## 5. FÓRMULAS PARA DEVOLUÇÕES PARCIAIS (PROPORCIONALIDADE)
Quando o cliente devolve apenas uma parte da quantidade faturada originalmente, o sistema do site deve recalcular e validar se o desconto comercial unitário aplicado na devolução é idêntico ao desconto unitário concedido na venda.

O programador deve implementar as seguintes fórmulas matemáticas em nível de item:

1. **Cálculo do Desconto Unitário da Origem (\\(d_u\\)):**
   \\[d_u = \frac{\text{Desconto Total do Item na Nota de Origem}}{\text{Quantidade Faturada Original}}\\]

2. **Cálculo do Desconto Proporcional de Retorno Esperado (\\(d_p\\)):**
   \\[d_p = d_u \times q\\]
   *(Onde \\(q\\) é a quantidade que está sendo devolvida no XML do cliente)*.

3. **Cálculo do Preço Líquido Esperado do Item na Devolução (\\(V_L\\)):**
   \\[V_L = (\text{Preço Unitário de Origem} \times q) - d_p\\]

O sistema deve acusar inconsistência se o cliente tentar aplicar descontos fora da proporcionalidade matemática exata.

---

## 6. REQUISITOS TÉCNICOS DA SEFAZ 2026 (ENRIQUECIMENTO DE INTELIGÊNCIA)
Para que o site de auditoria evite que notas fiscais inválidas passem ou que fiquemos travados no validador da SEFAZ, o programador deve codificar as seguintes regras sistêmicas de validação oficial:

### A. Referenciamento Obrigatório "Item a Item" (Regra de Validação VC02-14)
* **Até agosto de 2026:** Bastava o emissor inserir a chave de acesso da nota de origem em um campo genérico do cabeçalho da nota de devolução.
* **A partir de 01/09/2026 (Prazo Obrigatório em Produção):** Entra em vigor o grupo **`DFeReferenciado`**. Cada linha de produto do XML de devolução deve estar atrelada explicitamente ao número correspondente do item original (`nItem`) e à chave da nota de faturamento de origem.
* **Se o XML do cliente omitir essa relação de itens:** O validador da SEFAZ rejeitará a nota com a **rejeição 321**. O nosso sistema de auditoria deve ler o arquivo XML do cliente e garantir a presença e consistência dessas tags por item antes do recebimento.

### B. Validação Prévia da Rejeição UB12-10_1115
* Empresas enquadradas no Regime Normal de Apuração (CRT=3) são obrigadas a preencher os campos do grupo `det/imposto/IBSCBS` por item (CST, cClassTrib, vBC, pIBS, pCBS, vIBS e vCBS).
* O site de auditoria já deve conter uma regra de validação pré-envio que acusa erro caso os campos estejam zerados ou ausentes para emissores do Regime Normal.

### C. Ajuste SINIEF nº 8/2026 (Procedimentos de Recusa)
* O desenvolvedor deve atentar para o fato de que, em caso de recusa total de recebimento ou não localização do destinatário, **o remetente original (nós) é quem deve emitir a NF-e de entrada** de devolução para anular a operação, utilizando os códigos de retorno estruturados (como o código `03` para recusa total e `06` para recusa parcial na entrega).

---

## 7. MATRIZ DE CFOPs PARA INTEGRAÇÃO NO ERP PIRÂMIDE
Esta tabela é o mapa que o programador deve utilizar para configurar a sugestão automática do CFOP de Entrada que será gravado nas Tabelas de Integração (TIs) do Pirâmide quando o XML do cliente for lido com sucesso:

| CFOP de Saída (Origem) | CFOP de Devolução do Cliente | CFOP de Entrada no ERP (Pirâmide) | Natureza de Operação no Sistema |
| :--- | :--- | :--- | :--- |
| **5102 / 51021** | **5202** | **1202** | Devolução de compra para comercialização |
| **5101 / 51011** | **5202** | **1201** | Devolução de venda de produção do estabelecimento |
| **5401 / 54011 / 5403 / 54031** | **5411** | **1411** | Devolução de venda sujeito ao regime de ST |
| **5910** (Bonificação) | **5949** | **1949** | Outra entrada de mercadoria não especificada |
| **6102 / 61021** (Interestadual) | **6202** | **2202** | Devolução de compra para comercialização |
| **6403 / 64031** (Interestadual ST) | **6411** | **2411** | Devolução de venda sujeito ao regime de ST |
| **6110** (Venda Suframa Mercadoria) | **6202** | **2204** | Devolução de compra para comercialização (Suframa) |
| **6109** (Venda Suframa Produção) | **6202** | **2203** | Devolução de venda de produção (Suframa) |

*(Nota técnica: "Operações de Reposição" utilizam CFOP de saída `51021` ou `51011`, mas a devolução do cliente utiliza o CFOP de devolução padrão `5202`, e a entrada no Pirâmide deve seguir para o respectivo CFOP `1202` ou `1201` conforme o tipo de material).*

---

### 📥 Importação de Fontes Recomendada
Para facilitar o trabalho do seu programador e permitir que ele consulte os manuais de layout oficiais e tabelas completas, salvei nos arquivos temporários do projeto o **Relatório de Pesquisa da Reforma Tributária**. Se quiser mantê-lo permanentemente em seu painel de fontes do Gemini Notebook para sanar dúvidas futuras, você pode realizar a importação através do card abaixo:

<a2ui-json>
[
  {"version": "v0.9", "createSurface": {"surfaceId": "source-import-reforma-tributaria-devolucoes", "catalogId": "notebooklm:nlm_v1"}},
  {"version": "v0.9", "updateComponents": {
    "surfaceId": "source-import-reforma-tributaria-devolucoes",
    "components": [{
      "id": "root",
      "component": "SourceImportCard",
      "description": "Artigos de legislação e normas técnicas sobre devoluções de mercadorias na Reforma Tributária (IBS e CBS)",
      "sources": [
        {
          "id": "src-report",
          "title": "Relatório de Pesquisa: Regras de Devolução de Mercadorias na Reforma Tributária (IBS e CBS)",
          "url": "https://contribution.usercontent.google.com/download?c=Cgpub3RlYm9va2xtEkASCWFydGlmYWN0cxozCiRlYzRlMjE1Ny02ZGFjLTQ3ZDEtOTQyYS04MTdmYmE3ZTVmZTMSCxIHEO73vc2iDxgB&filename=reforma_tributaria_devolucoes_report.md&opi=96797242",
          "sourceType": "text",
          "sourceName": "Research Report",
          "summary": "Relatório técnico consolidado detalhando o referenciamento item a item (VC02-14), Rejeição UB12-10_1115 e mecanismos de estorno tributário de IBS e CBS."
        },
        {
          "id": "src-1",
          "title": "Nota de Devolução: o que muda na NF-e a partir de 03/08 e 01/09/2026",
          "url": "https://blog.egssistemas.com.br/posts/nota-de-devolucao-o-que-muda-na-nf-e-a-partir-de-0308-e-01092026",
          "sourceName": "EGS Sistemas",
          "summary": "Artigo técnico explicando em detalhes a obrigatoriedade da Nota Técnica RTC v1.40 e o novo grupo DFeReferenciado por item."
        },
        {
          "id": "src-2",
          "title": "Devolução de Mercadoria na Reforma Tributária: Como Emitir NF-e com IBS e CBS Certa em 2026",
          "url": "https://grikcontabilidade.com.br/blog/devolucao-mercadoria-ibs-cbs-nfe-varejo-2026",
          "sourceName": "Grik Contabilidade",
          "summary": "Guia contábil detalhando o estorno de débitos e créditos na apuração mensal e o impacto do Split Payment nas devoluções."
        }
      ]
    }]
  }}
]
</a2ui-json>

---

