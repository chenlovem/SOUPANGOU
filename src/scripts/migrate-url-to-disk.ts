/**
 * 迁移 resource.url → resource_disk 表
 * 将已爬取的资源链接同步到 resource_disk 表，以便前端页面展示
 *
 * 用法: npm run migrate-url
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { resource, resourceDisk } from "../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  const db = drizzle(connection);

  // 获取所有有 URL 但没有对应 resource_disk 的资源
  const rows = await db
    .select()
    .from(resource)
    .where(sql`${resource.url} != ''`);

  console.log(`找到 ${rows.length} 条有 URL 的资源`);

  let success = 0, skipped = 0, errors = 0;
  for (const r of rows) {
    try {
      // 检查是否已有 disk 记录
      const existing = await db
        .select()
        .from(resourceDisk)
        .where(eq(resourceDisk.resourceId, r.id));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(resourceDisk).values({
        resourceId: r.id,
        diskType: r.diskType || "quark",
        externalUrl: r.url,
        url: r.url,
      });
      success++;
    } catch (err: any) {
      errors++;
      if (errors <= 3) console.error(`  ✗ ID=${r.id}: ${err.message}`);
    }
  }

  console.log(`\n迁移完成！新增: ${success}, 已存在: ${skipped}, 失败: ${errors}`);
  await connection.end();
  process.exit(0);
}

main();
