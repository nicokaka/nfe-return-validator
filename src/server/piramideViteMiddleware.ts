import type { IncomingMessage, ServerResponse } from 'http';
import { testOracleConnection } from './oracleDbPool';
import {
  integrateReturnNoteToPiramide,
  getReturnNoteStatusFromPiramide,
  rollbackReturnNoteFromPiramide,
} from './piramideIntegrator';

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Corpo da requisição JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

export function createPiramideApiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';

    if (!url.startsWith('/api/piramide')) {
      return next();
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    try {
      // 1. Health check: GET /api/piramide/health
      if (url === '/api/piramide/health' && req.method === 'GET') {
        const result = await testOracleConnection();
        return sendJson(res, 200, result);
      }

      // 2. Integração: POST /api/piramide/integrate
      if (url === '/api/piramide/integrate' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.result || !body.result.nfd) {
          return sendJson(res, 400, {
            success: false,
            message: 'Parâmetro "result" contendo os dados da reconciliação é obrigatório.',
          });
        }
        const integrationResult = await integrateReturnNoteToPiramide(body.result, body.options);
        return sendJson(res, 200, integrationResult);
      }

      // 3. Status: GET /api/piramide/status/:notaFiscal
      if (url.startsWith('/api/piramide/status/') && req.method === 'GET') {
        const notaFiscal = decodeURIComponent(url.replace('/api/piramide/status/', '').split('?')[0]);
        if (!notaFiscal) {
          return sendJson(res, 400, { success: false, message: 'Número da nota fiscal é obrigatório.' });
        }
        const statusResult = await getReturnNoteStatusFromPiramide(notaFiscal);
        return sendJson(res, 200, statusResult);
      }

      // 4. Rollback: DELETE /api/piramide/rollback/:notaFiscal
      if (url.startsWith('/api/piramide/rollback/') && req.method === 'DELETE') {
        const notaFiscal = decodeURIComponent(url.replace('/api/piramide/rollback/', '').split('?')[0]);
        if (!notaFiscal) {
          return sendJson(res, 400, { success: false, message: 'Número da nota fiscal é obrigatório.' });
        }
        const rollbackResult = await rollbackReturnNoteFromPiramide(notaFiscal);
        return sendJson(res, rollbackResult.success ? 200 : 500, rollbackResult);
      }

      return sendJson(res, 404, { success: false, message: 'Rota da API Pirâmide não encontrada.' });
    } catch (err: any) {
      return sendJson(res, 500, {
        success: false,
        message: `Erro interno no conector Pirâmide: ${err.message}`,
        error: err.message,
      });
    }
  };
}
