#!/bin/sh
set -e

echo "========================================================"
echo "🚀 INICIANDO VALIDADOR FISCAL HEBRON & PIRAMIDE API"
echo "========================================================"

# Inicia o servidor Node.js em background na porta 3001
echo "[1/2] Iniciando API Integradora Node.js (porta 3001)..."
npx tsx src/server/standaloneServer.ts &
API_PID=$!

# Aguarda 2 segundos para inicialização do listener HTTP
sleep 2

# Inicia o Nginx em foreground na porta 80
echo "[2/2] Iniciando Nginx Web Server (porta 80)..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Captura sinais de encerramento para parar ambos os processos
trap "kill -TERM $API_PID $NGINX_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $NGINX_PID
