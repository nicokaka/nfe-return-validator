# 🏛️ Validador Fiscal de Devoluções & Integração ERP Pirâmide (Oracle)
> **Hebron Farmacêutica & HebronVet**  
> *INFAN Indústria Química Farmacêutica S/A, QUESALON Distribuidora Matriz (PB), QUESALON Filial Extrema (MG), QUEDES Distribuidora (AL)*  

[![Test Suite](https://img.shields.io/badge/Testes-88%2F88%20(100%25%20Verde)-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)](#)
[![Oracle Database](https://img.shields.io/badge/Oracle-19c%20Staging-red)](#)
[![ERP Pirâmide](https://img.shields.io/badge/ERP-Pir%C3%A2mide%20Procenge-orange)](#)

---

## 📌 Visão Geral do Projeto

O **Validador Fiscal de Devoluções Hebron** é uma solução de missão crítica desenvolvida para automatizar, auditar e integrar as devoluções de vendas (NFD de clientes x NFO da Hebron) diretamente no **ERP Pirâmide (Procenge / Oracle 19c)**.

O sistema elimina 100% da digitação manual de notas fiscais, protege o departamento fiscal contra glosas tributárias e estornos indevidos de crédito, e realiza a injeção automatizada nas tabelas intermediárias de staging (`TI_NOTA_FISCAL_ENTRADA`, `TI_ITEM_NOTA_FISCAL_ENTRADA` e `TI_ITEM_ENTRADA_LOTE`).

---

## 🏢 As Empresas do Grupo & Regras Fiscais

1. **`001` • QUESALON Matriz (PB) - CNPJ `04.792.134/0001-43`:**
   * Distribuidora. Base 100%. Alíquota interna PB 20,00%, interestadual 12,00%. NDO `COM032`.
2. **`003` • INFAN Indústria Química Farmacêutica S/A (PB) - CNPJ `08.939.548/0001-03`:**
   * Indústria Farmacêutica. Reduções de base PB (9,90% para medicamentos NCM 3004 / 10,49% cosméticos e higiene).
   * **Monofásico PIS/COFINS (Lei 10.147/00):** Cliente devolve sob CST `04`. O validador sugere crédito na entrada com **CST `50`** (PIS 2,10% e COFINS 9,90%). NDO `COM206`.
3. **`004` • QUESALON Filial Extrema (MG) - CNPJ `04.792.134/0004-96`:**
   * Distribuidora Filial MG (Termo de Acordo MG). Interna 12% ou 18%; Interestadual 12% (Sul/Sudeste exceto ES) e 7% (Norte/Nordeste/CO/ES). NDO `COM032`.
4. **`005` • QUEDES Distribuidora (AL) - CNPJ `10.565.860/0001-08`:**
   * Distribuidora Alagoas. Interestadual 12,00%.
5. **🐾 Linha HebronVet (Saúde Animal):**
   * Produtos veterinários com regulação MAPA/SEFAZ e rastreabilidade sanitária de lotes.

---

## 🌐 Topologia de Ambientes e Bancos

| Ambiente | Host / IP | Porta | Serviço / SID | Schema | Função |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **🧪 Homologação Oracle (TESTE)** | **`192.168.97.58`** | `1521` | **`TESTE`** | **`PIRAMIDE`** | **Banco Oracle Oficial de Testes Hebron.** Alvo exclusivo de cargas e simulações. |
| **🖥️ Servidor App Pirâmide (TESTE)** | `192.168.97.61` | `3389 / 8080` | `Windows/Tomcat` | N/A | Servidor de aplicação Pirâmide (Scriba/Fiscal/Estoque). |
| **🏭 Produção Oracle (OFICIAL)** | `192.168.97.60` | `1521` | `PROD` | `PIRAMIDE` | **Produção Hebron**. Em Standby total até homologação. |
| **🖥️ Servidor Web (VM Debian)** | `192.168.97.10` | `5002` | `HTTP` | N/A | Host da aplicação Docker na rede corporativa. |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js v20+
* npm v10+

### Instalação e Desenvolvimento
```bash
# 1. Instalar dependências
npm install

# 2. Executar a suíte de testes automatizados (88 testes - 100% Verde)
npm test

# 3. Compilar TypeScript e gerar bundle Vite de produção
npm run build

# 4. Iniciar servidor local de desenvolvimento (com proxy de API ativo)
npm run dev
```

---

## 📚 Documentação e Manuais Técnicos

O projeto conta com documentação aprofundada organizada nos seguintes documentos:

1. **[Guia Mestre de Conhecimentos e Arquitetura](docs/GUIA_MESTRE_DE_CONHECIMENTOS_DO_PROJETO.md):**  
   Documento definitivo com visão 360° do projeto, regras tributárias, arquitetura de classes, detalhes das tabelas de staging do Procenge e os "Gotchas" técnicos de banco de dados.

2. **[Manual de Integração ERP Pirâmide Oracle](docs/MANUAL_INTEGRACAO_ERP_PIRAMIDE_ORACLE.md):**  
   Dicionário completo de colunas das tabelas intermediárias (`TI_NOTA_FISCAL_ENTRADA`, `TI_ITEM_NOTA_FISCAL_ENTRADA`, `TI_ITEM_ENTRADA_LOTE`), mapeamentos de NDO/Almoxarifado e scripts SQL.

3. **[Base de Conhecimento Fiscal Corporativa Hebron](HEBRON_FISCAL_KNOWLEDGE_BASE.md):**  
   Enciclopédia de legislação fiscal, ICMS próprio, ICMS-ST, PIS/COFINS monofásico e Reforma Tributária (CBS/IBS).

4. **[Diretrizes Fiscais da Gerência (Polliana)](DIRETRIZES_FISCAIS_GERENCIA.md):**  
   Regras de negócio acordadas com a Gerência Fiscal Hebron.

5. **[Memória Histórica do Projeto](PROJECT_MEMORY.md):**  
   Linha do tempo completa com todas as 25 iterações de desenvolvimento e homologações realizadas.

---

## ⚠️ Regras Inegociáveis de Desenvolvimento (AGENTS.md)
* **Taxa de Sucesso de Testes:** Manter sempre em **100%** (`npm test` com 88/88 testes aprovados).
* **Segurança do Banco:** Nunca direcionar testes ao servidor final `.60`. O host `.61` é o ambiente oficial de homologação.
* **Constraints de Catálogo:**
  * `COD_NDO_ORIGEM` $\le$ **6 caracteres** (usar `COM032`, `COM206`, `COM200` ou CFOP com 4 dígitos).
  * `COD_DEPOSITO` $\le$ **5 caracteres** (usar `AVCD`, `GQ`, `ALMOX`).
  * `VAL_OUTRAS_DESPESAS` é NOT NULL (deve ser `0`).
