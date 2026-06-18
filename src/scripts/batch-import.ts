/**
 * 批量资源导入脚本
 *
 * 支持三种模式：
 *   1. 从 JSON 文件批量导入  ->  npm run import -- --from-json ./data.json
 *   2. 从 CSV 文件批量导入   ->  npm run import -- --from-csv ./data.csv
 *   3. 从 API 抓取资源      ->  npm run import -- --from-api "https://..."
 *
 * JSON 格式：
 *   [
 *     {
 *       "title": "资源标题",
 *       "categoryKey": "movie",
 *       "url": "https://pan.quark.cn/s/xxx",
 *       "pinyin": "ziyuanpin",
 *       "desc": "资源描述",
 *       "diskType": "quark",
 *       "hotNum": 1000,
 *       "isShowHome": 1,
 *       "cover": ""
 *     }
 *   ]
 *
 * CSV 格式：
 *   title,categoryKey,url,pinyin,desc,diskType,hotNum,isShowHome
 *   资源标题,movie,https://...,ziyuanpin,描述,quark,1000,1
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { resource, category } from "../lib/db/schema";
import * as dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── 环境变量 ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

// ── 参数解析 ──
const args = process.argv.slice(2);
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    flags[key] = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
    if (flags[key] !== "true") i++;
  }
}

// ── 工具函数 ──
/** 自动生成拼音（简化：取标题前几个字符转小写） */
function toPinyin(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w一-鿿]/g, "")
    .slice(0, 50) || `res_${Date.now()}`;
}

/** 去重：按 title 去重 */
function deduplicate(list: any[]): any[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── 主逻辑 ──
async function main() {
  // 1. 连接数据库
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  const db = drizzle(connection);
  console.log("✓ 数据库连接成功");

  // 2. 读取已有分类映射
  const categories = await db.select().from(category);
  const categoryKeys = new Set(categories.map((c) => c.key));
  console.log(`✓ 已加载 ${categories.length} 个分类: ${[...categoryKeys].join(", ")}`);

  // 3. 获取数据源
  let resources: any[] = [];

  if (flags["from-json"]) {
    // ── 模式1：JSON 文件 ──
    const filePath = path.resolve(rootDir, flags["from-json"]);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ 文件不存在: ${filePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    resources = JSON.parse(raw);
    console.log(`✓ 从 JSON 读取到 ${resources.length} 条数据`);
  } else if (flags["from-csv"]) {
    // ── 模式2：CSV 文件 ──
    const filePath = path.resolve(rootDir, flags["from-csv"]);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ 文件不存在: ${filePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    const lines = raw.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = vals[idx] || ""));
      resources.push(row);
    }
    console.log(`✓ 从 CSV 读取到 ${resources.length} 条数据`);
  } else if (flags["from-api"]) {
    // ── 模式3：从 API 抓取 ──
    const apiUrl = flags["from-api"];
    console.log(`→ 正在从 API 抓取: ${apiUrl}`);
    const resp = await fetch(apiUrl);
    if (!resp.ok) throw new Error(`API 请求失败: ${resp.status}`);
    const data = await resp.json();

    // 尝试多种常见 API 返回值结构
    resources = data.list || data.data || data.results || data.records || data;
    if (!Array.isArray(resources)) {
      // 如果是对象数组的值
      const maybe = Object.values(data).find((v) => Array.isArray(v));
      resources = maybe || [];
    }
    console.log(`✓ 从 API 获取到 ${resources.length} 条数据`);
  } else {
    console.log(`
用法:
  npm run import -- --from-json ./data.json    从 JSON 文件导入
  npm run import -- --from-csv  ./data.csv     从 CSV 文件导入
  npm run import -- --from-api "https://..."   从 API 抓取

JSON 字段: title, categoryKey, url, pinyin, desc, diskType, hotNum, isShowHome, cover
CSV 首行为列名，字段同上
`);
    process.exit(0);
  }

  if (resources.length === 0) {
    console.log("! 没有数据需要导入");
    process.exit(0);
  }

  // 4. 数据清洗 & 去重
  resources = deduplicate(resources);
  console.log(`→ 去重后剩余 ${resources.length} 条`);

  // 5. 逐条插入
  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of resources) {
    try {
      const title = (item.title || item.name || "").trim();
      if (!title) { skipped++; continue; }

      const key = item.categoryKey || item.category_key || "other";
      if (!categoryKeys.has(key)) {
        console.warn(`  ⚠ 分类 "${key}" 不存在，跳过: ${title}`);
        skipped++;
        continue;
      }

      await db.insert(resource).values({
        title,
        categoryKey: key,
        url: item.url || item.link || item.externalUrl || "",
        pinyin: item.pinyin || toPinyin(title),
        desc: item.desc || item.description || item.summary || "",
        diskType: item.diskType || item.disk_type || item.platform || "quark",
        hotNum: Number(item.hotNum || item.hot_num || item.hot || item.popularity || 0),
        isShowHome: item.isShowHome || item.is_show_home ? 1 : 0,
        cover: item.cover || item.image || item.thumbnail || "",
      });
      success++;
    } catch (err: any) {
      // 唯一键冲突 = 已存在
      if (err?.code === "ER_DUP_ENTRY") {
        skipped++;
      } else {
        console.error(`  ✗ 导入失败: ${item.title}`, err?.message || err);
        errors++;
      }
    }
  }

  console.log(`\n✓ 导入完成！成功: ${success}, 跳过(已存在): ${skipped}, 失败: ${errors}`);
  await connection.end();
  process.exit(0);
}

main();
