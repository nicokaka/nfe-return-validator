# Estágio 1: Build do Frontend (Vite + TypeScript) e da API Node.js (esbuild)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Runtime unificado de alta performance (Nginx + Node.js 20 Alpine)
FROM node:20-alpine
RUN apk add --no-cache nginx

WORKDIR /app

# Instala apenas dependências de produção para oracledb
COPY package*.json ./
RUN npm install --omit=dev

# Copia o bundle estático do frontend gerado pelo Vite para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia o bundle compilado da API Node.js (apenas 22KB!)
COPY --from=builder /app/dist-server /app/dist-server

# Substitui diretamente o nginx.conf mestre e remove diretórios de configs residuais
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /etc/nginx/http.d /etc/nginx/conf.d

# Copia o script de inicialização garantindo formato de fim de linha Unix (LF)
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

# Porta 80 para acesso Web (mapeada para 5002 na VM Debian)
EXPOSE 80 3001

CMD ["./entrypoint.sh"]
