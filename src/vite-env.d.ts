/// <reference types="vite/client" />

declare module 'oracledb' {
  const oracledb: any;
  export default oracledb;
  export type Pool = any;
  export type Connection = any;
}

