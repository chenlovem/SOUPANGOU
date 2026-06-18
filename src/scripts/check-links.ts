/**
 * 链接有效性检测脚本
 *
 * 检测所有 resource_disk 中的链接是否有效，更新 status 字段
 *
 * 用法:
 *   npm run check-links              检测所有未知状态的链接
 *   npm run check-links -- --all     检测所有链接（包括已检测过的）
 *   npm run check-links -- --limit 100  只检测前100条
 *   npm run check-links -- --id 123     检测指定资源ID
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

const CONCURRENCY = 10; // 并发数量
const TIMEOUT = 10000;   // 每个请求超时时间(ms)

const args = process.argv.slice(2);
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const k = args[i].slice(2);
    flags[k] = args[i + 1]?.startsWith("--") ? "true" : args[i + 1] || "true";
  }
}

/** 检测单个链接是否有效 */
async function checkUrl(url: string): Promise<"valid" | "invalid"> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return "invalid";
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const resp = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    clearTimeout(timer);

    const status = resp.status;
    // 200 = 正常, 302/301 = 重定向(通常也有效), 404 = 失效, 403 = 可能失效
    if (status === 200 || status === 301 || status === 302 || status === 304) {
      return "valid";
    }
    if (status === 404 || status === 410) {
      return "invalid";
    }
    // 其他状态码(403, 500 等)可能是暂时问题，标记为 invalid
    return "invalid";
  } catch (err: any) {
    // 网络错误也视为 invalid
    return "invalid";
  }
}

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   链接有效性检测工具                   ║");
  console.log("╚══════════════════════════════════════╝\n");

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  console.log(`[${new Date().toLocaleTimeString()}] ✓ 数据库连接成功`);

  // 查询需要检测的链接
  let whereClause = "WHERE status = 'unknown' OR status IS NULL";
  if (flags["all"]) whereClause = "WHERE 1=1";
  if (flags["id"]) whereClause = `WHERE resource_id = ${parseInt(flags["id"])}`;

  let limitClause = "";
  if (flags["limit"]) limitClause = `LIMIT ${parseInt(flags["limit"])}`;

  const [rows] = await conn.execute(
    `SELECT id, resource_id, url, status FROM resource_disk ${whereClause} ORDER BY id ASC ${limitClause}`
  );
  const disks = rows as any[];

  console.log(`[${new Date().toLocaleTimeString()}] → 待检测链接: ${disks.length} 条\n`);

  if (disks.length === 0) {
    console.log("没有需要检测的链接！");
    await conn.end();
    process.exit(0);
  }

  // 并发检测
  let validCount = 0;
  let invalidCount = 0;
  let errorCount = 0;
  let completed = 0;
  const startTime = Date.now();

  // 分批处理
  for (let i = 0; i < disks.length; i += CONCURRENCY) {
    const batch = disks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (disk: any) => {
        const status = await checkUrl(disk.url);
        return { ...disk, newStatus: status };
      })
    );

    // 入库
    for (const r of results) {
      try {
        await conn.execute(
          "UPDATE resource_disk SET status = ?, checked_at = NOW() WHERE id = ?",
          [r.newStatus, r.id]
        );
        if (r.newStatus === "valid") validCount++;
        else if (r.newStatus === "invalid") invalidCount++;
      } catch {
        errorCount++;
      }
    }

    completed += batch.length;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const pct = ((completed / disks.length) * 100).toFixed(1);
    process.stdout.write(
      `\r  [${pct}%] ${completed}/${disks.length} | ✓有效: ${validCount} | ✗失效: ${invalidCount} | 耗时: ${elapsed}s`
    );
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log("\n\n╔══════════════════════════════════════╗");
  console.log("║   检测完成                            ║");
  console.log("╠══════════════════════════════════════╣");
  console.log(`║  有效: ${String(validCount).padStart(6)} 条              ║`);
  console.log(`║  失效: ${String(invalidCount).padStart(6)} 条              ║`);
  console.log(`║  错误: ${String(errorCount).padStart(6)} 条              ║`);
  console.log(`║  耗时: ${String(totalTime).padStart(6)} 秒              ║`);
  console.log("╚══════════════════════════════════════╝");

  await conn.end();
  process.exit(0);
}

main();
