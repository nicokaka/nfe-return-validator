# Estágio 1: Build do Frontend (Vite + TypeScript) e da API Node.js (esbuild)
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Runtime unificado de alta performance com Nginx + Node.js 20 + Oracle Instant Client 19 (Suporte nativo a Oracle 11g)
FROM node:20-slim

# 1. Instala Nginx, dependências do Oracle Instant Client (libaio1) e utilitários
RUN apt-get update && \
    (apt-get install -y --no-install-recommends nginx libaio1 curl unzip ca-certificates || \
     apt-get install -y --no-install-recommends nginx libaio1t64 curl unzip ca-certificates) && \
    rm -rf /var/lib/apt/lists/*

# 2. Configura o Oracle Instant Client 19.21 (compatível 100% com Oracle Database 11g)
ENV ORACLE_CLIENT_DIR=/opt/oracle/instantclient
RUN mkdir -p /opt/oracle && \
    curl -fsSL -o /opt/oracle/instantclient.zip https://download.oracle.com/otn_software/linux/instantclient/1921000/instantclient-basiclite-linux.x64-19.21.0.0.0dbru.zip && \
    unzip -q /opt/oracle/instantclient.zip -d /opt/oracle && \
    rm /opt/oracle/instantclient.zip && \
    mv /opt/oracle/instantclient_19_21 $ORACLE_CLIENT_DIR && \
    echo $ORACLE_CLIENT_DIR > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

ENV LD_LIBRARY_PATH=$ORACLE_CLIENT_DIR:$LD_LIBRARY_PATH
ENV ORACLE_CLIENT_LIB_DIR=$ORACLE_CLIENT_DIR

WORKDIR /app

# 3. Instala apenas dependências de produção para oracledb
COPY package*.json ./
RUN npm install --omit=dev

# 4. Copia o bundle estático do frontend gerado pelo Vite para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 5. Copia o bundle compilado da API Node.js
COPY --from=builder /app/dist-server /app/dist-server

# 6. Substitui diretamente o nginx.conf mestre e limpa configs padrão do Debian
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/sites-enabled/* && mkdir -p /var/log/nginx /run/nginx

# 7. Copia o script de inicialização garantindo formato de fim de linha Unix (LF)
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Porta 80 para acesso Web (mapeada para 5002 na VM Debian)
EXPOSE 80 3001

CMD ["./entrypoint.sh"]
