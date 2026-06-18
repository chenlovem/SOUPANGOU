import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// 创建 MySQL 连接池（支持 SSL，兼容 TiDB Cloud Serverless）
const connection = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 初始化 Drizzle ORM
export const db = drizzle(connection);
