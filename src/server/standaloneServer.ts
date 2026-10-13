import http from 'http';
import { createPiramideApiMiddleware } from './piramideViteMiddleware';
import { getOracleConfig, closeOraclePool } from './oracleDbPool';

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);
const HOST = process.env.API_HOST || '0.0.0.0';

const apiMiddleware = createPiramideApiMiddleware();
const config = getOracleConfig();

const isTeste = config.connectString.includes('TESTE') || config.connectString.includes('61');
const environmentLabel = isTeste ? 'HOMOLOGAÇÃO (.61 TESTE)' : 'PRODUÇÃO (.60 PROD)';

const server = http.createServer((req, res) => {
  const url = req.url || '';

  // O middleware trata rotas /api/piramide/*
  apiMiddleware(req, res, () => {
    // Rota raiz ou health check da API
    if (url === '/' || url === '/health' || url === '/api') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(
        JSON.stringify(
          {
            status: 'online',
            service: 'Validador Fiscal Hebron - API Integradora Oracle Pirâmide',
            environment: environmentLabel,
            targetHost: config.connectString,
            sistemaOrigem: config.sistemaOrigem,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }

    // 404 para rotas não reconhecidas
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        error: 'Rota não encontrada',
        path: url,
      })
    );
  });
});

server.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log('🏛️  VALIDADOR FISCAL HEBRON - API INTEGRADORA ORACLE PIRÂMIDE');
  console.log(`📡 Servidor HTTP escutando em http://${HOST}:${PORT}`);
  console.log(`🎯 Destino Oracle: ${config.connectString} [${environmentLabel}]`);
  console.log(`🏢 Schema: ${config.user} | Sistema Integrante: ${config.sistemaOrigem}`);
  console.log('================================================================');
});

// Tratamento de encerramento gracioso (SIGINT / SIGTERM)
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Recebido sinal ${signal}. Encerrando API com segurança...`);
  server.close(async () => {
    try {
      await closeOraclePool();
      console.log('🔒 Pool de conexões Oracle fechado com sucesso.');
    } catch (err: any) {
      console.error('Erro ao fechar pool Oracle:', err.message);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
