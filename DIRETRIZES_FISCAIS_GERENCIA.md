# Diretrizes e Regras de Negócio — Validador Fiscal de Devoluções
> Documento para consolidação das orientações e regras práticas repassadas pela Gerência Fiscal. Preencha ou edite as seções abaixo com as especificidades do negócio.

---

## 1. Regras de Validação e Cruzamento (NFO x NFD)
*Descreva como a empresa trata divergências entre a Nota de Saída (Origem) e a Nota de Devolução.*

- **Chave de Referência (`<NFref>`):**
  - [ ] É obrigatório constar a chave da NFO na NFD? O que fazer se o cliente não informar a chave?
  - Observações:

- **Preço Unitário e Valor Total:**
  - [ ] O preço unitário na NFD deve ser exatamente idêntico ao da NFO?
  - [ ] Qual a tolerância de arredondamento aceita em centavos (R$ 0,01 a R$ 0,05)?
  - Observações:

- **Quantidade Devolvida:**
  - [ ] É aceita devolução parcial (ex: vendeu 10, devolveu 3)?
  - [ ] O que fazer se a quantidade devolvida for maior que a faturada?
  - Observações:

---

## 2. Regras Tributárias e Fiscais (ICMS, IPI, PIS/COFINS, ST)
*Critérios de conferência de alíquotas, bases de cálculo e impostos.*

- **ICMS Próprio e ICMS-ST:**
  - [ ] Como conferir a alíquota e base de cálculo de ICMS da devolução?
  - [ ] Em devoluções de Simples Nacional para Regime Normal, o ICMS vem destacado em dados adicionais (`<infCpl>`)?
  - Observações:

- **PIS / COFINS (Produtos Monofásicos):**
  - [ ] CSTs esperados na entrada de devolução (ex: CST 04, 70, 73, 98)?
  - Observações:

- **Desconto Comercial Proporcional:**
  - [ ] Como o desconto concedido na venda deve ser refletido na devolução?
  - Observações:

---

## 3. Especificidades do Setor Farmacêutico (Lotes e Anvisa)
*Normas técnicas, NT 2021.004 e rastreabilidade.*

- **Rastreabilidade de Lote (`<rastro>`):**
  - [ ] Medicamentos (NCM 3004): lote e validade são obrigatórios?
  - [ ] Vitaminas e Cosméticos (NCM 2936, 3304): são dispensados ou exigidos internamente?
  - Observações:

- **Lotes com Validade Próxima ou Vencida:**
  - [ ] Regra interna para devoluções de itens com validade curta:
  - Observações:

---

## 4. Integração Operacional com o ERP Pirâmide
*Direcionamento logístico, almoxarifados e códigos de lançamento.*

- **Natureza de Operação (NDO / CFOP):**
  - CFOPs padrão de entrada de devolução:
  - NDOs específicas no ERP:

- **Motivos de Devolução e Almoxarifados de Destino:**
  | Motivo Informado pelo Cliente | Código ERP | Almoxarifado Destino | Ação Operacional |
  |---|---|---|---|
  | Avaria / Danificado | | | |
  | Desacordo Comercial | | | |
  | Vencimento Próximo | | | |
  | Erro de Pedido | | | |

---

## 5. Casos Especiais, Exceções e Instruções da Gerente
*Anote aqui quaisquer instruções verbais, orientações de exceção ou particularidades do dia a dia repassadas pela gerente fiscal.*

1. 
2. 
3. 
