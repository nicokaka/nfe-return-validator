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

export function getOracleConfig(): OracleConfig {
  return {
    user: process.env.ORACLE_USER || 'PIRAMIDE',
    password: process.env.ORACLE_PASSWORD || '',
    connectString: process.env.ORACLE_CONNECT_STRING || '192.169.97.61:1521/PIRAMIDE',
    poolMin: parseInt(process.env.ORACLE_POOL_MIN || '1', 10),
    poolMax: parseInt(process.env.ORACLE_POOL_MAX || '4', 10),
    timeoutMs: parseInt(process.env.ORACLE_TIMEOUT_MS || '15000', 10),
    sistemaOrigem: process.env.ORACLE_SISTEMA_ORIGEM || 'VAL',
  };
}

export async function getOraclePool(): Promise<any> {
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
