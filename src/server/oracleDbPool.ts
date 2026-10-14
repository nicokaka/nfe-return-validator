import oracledb from 'oracledb';

export interface OracleConfig {
  user: string;
  password?: string;
  connectString: string;
  poolMin: number;
  poolMax: number;
  timeoutMs: number;
  sistemaOrigem: string;
}

let pool: any = null;
let clientModeAttempted = false;

export function ensureOracleClient(): void {
  if (clientModeAttempted) return;
  clientModeAttempted = true;

  const libDir =
    process.env.ORACLE_CLIENT_LIB_DIR ||
    (process.platform === 'linux' ? '/opt/oracle/instantclient' : undefined);

  try {
    if (libDir) {
      oracledb.initOracleClient({ libDir });
      console.log(`[ORACLE] Thick Mode ativado com sucesso usando Instant Client: ${libDir}`);
    } else {
      oracledb.initOracleClient();
      console.log(`[ORACLE] Thick Mode ativado com bibliotecas padrão do sistema.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already been initialized')) {
      // Já inicializado
    } else {
      // Continua em Thin Mode se não houver Instant Client local
    }
  }
}

export function getOracleConfig(): OracleConfig {
  return {
    user: process.env.ORACLE_USER || 'PIRAMIDE',
    password: process.env.ORACLE_PASSWORD || 'PIRAMIDE',
    connectString: process.env.ORACLE_CONNECT_STRING || '192.168.97.58:1521/TESTE',
    poolMin: parseInt(process.env.ORACLE_POOL_MIN || '1', 10),
    poolMax: parseInt(process.env.ORACLE_POOL_MAX || '4', 10),
    timeoutMs: parseInt(process.env.ORACLE_TIMEOUT_MS || '15000', 10),
    sistemaOrigem: process.env.ORACLE_SISTEMA_ORIGEM || 'VAL',
  };
}

export async function getOraclePool(): Promise<any> {
  ensureOracleClient();

  if (pool) {
    return pool;
  }

  const config = getOracleConfig();

  // Thin mode is the default in node-oracledb v6+ and v7+
  pool = await oracledb.createPool({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: config.poolMin,
    poolMax: config.poolMax,
    poolIncrement: 1,
    poolTimeout: 60,
  });

  return pool;
}

export async function testOracleConnection(): Promise<{
  success: boolean;
  message: string;
  serverVersion?: string;
  banner?: string;
  error?: string;
}> {
  let connection: any = null;
  const config = getOracleConfig();

  try {
    const p = await getOraclePool();
    connection = await p.getConnection();

    const result = await connection.execute(
      `SELECT banner FROM v$version WHERE ROWNUM = 1`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const banner = result.rows && result.rows.length > 0 ? (result.rows[0] as any).BANNER : 'Oracle Database';

    return {
      success: true,
      message: `Conexão estabelecida com sucesso com o Oracle no host [${config.connectString}]`,
      serverVersion: connection.oracleServerVersionString,
      banner,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha ao conectar com o Oracle no host [${config.connectString}]: ${err.message}`,
      error: err.message,
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch {
        // ignore close error
      }
    }
  }
}

export async function closeOraclePool(): Promise<void> {
  if (pool) {
    try {
      await pool.close(10);
    } finally {
      pool = null;
    }
  }
}
