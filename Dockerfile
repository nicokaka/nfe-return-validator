# Estágio 1: Build do Frontend (Vite + TypeScript)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Runtime unificado de alta performance (Node.js 20 Alpine + Nginx)
FROM node:20-alpine
RUN apk add --no-cache nginx

WORKDIR /app

# Copia dependências e instala em modo de execução com tsx
COPY package*.json ./
RUN npm install --omit=dev && npm install tsx

# Copia o bundle estático do frontend gerado pelo Vite para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configura o Nginx com proxy reverso apontando para a API local (porta 3001)
COPY nginx.conf /etc/nginx/http.d/default.conf
RUN mkdir -p /etc/nginx/conf.d && cp /etc/nginx/http.d/default.conf /etc/nginx/conf.d/default.conf

# Copia o código-fonte da API Node.js e seus módulos
COPY src/server ./src/server
COPY src/types ./src/types
COPY src/data ./src/data
COPY src/services ./src/services
COPY src/utils ./src/utils
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Porta 80 para acesso Web (mapeada para 5002 na VM Debian)
EXPOSE 80 3001

CMD ["./entrypoint.sh"]
