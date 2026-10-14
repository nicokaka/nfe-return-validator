#!/bin/bash
set -e

echo "========================================================"
echo "🚀 INICIANDO VALIDADOR FISCAL HEBRON & PIRAMIDE API"
echo "========================================================"

# Inicia o servidor Node.js em background na porta 3001 usando o bundle compilado
echo "[1/2] Iniciando API Integradora Node.js (porta 3001)..."
node /app/dist-server/server.cjs &
API_PID=$!

# Aguarda 2 segundos para inicialização do listener HTTP
sleep 2

# Testa se o processo Node continua vivo
if kill -0 $API_PID 2>/dev/null; then
    echo "✅ API Node.js iniciada com sucesso (PID: $API_PID)!"
else
    echo "❌ ERRO FATAL: API Node.js encerrou inesperadamente!"
fi

# Testa a sintaxe do Nginx antes de subir
echo "[2/2] Testando configuração e iniciando Nginx Web Server (porta 80)..."
nginx -t

nginx -g "daemon off;" &
NGINX_PID=$!

# Captura sinais de encerramento para parar ambos os processos (sintaxe POSIX / Bash)
trap "kill -TERM $API_PID $NGINX_PID 2>/dev/null; exit 0" INT TERM

wait $NGINX_PID
