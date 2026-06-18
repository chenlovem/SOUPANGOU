/**
 * 资源爬虫脚本
 *
 * 支持从多种来源爬取资源数据并自动入库
 *
 * 用法:
 *   npm run scrape -- --tmdb           从 TMDB 抓取热门电影(需 TMD B_API_KEY)
 *   npm run scrape -- --site <url>     从通用站点抓取
 *   npm run scrape -- --list           列出可用爬虫
 *
 * 环境变量(.env.local):
 *   TMDB_API_KEY=your_tmdb_api_key    (选填,用于 TMDB 源)
 *
 * 爬虫配置文件: src/scripts/scraper-config.json
 *   可自定义爬取规则
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { resource, category } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── 环境变量 ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

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

// ── 工具 ──
function toPinyin(title: string): string {
  return title.toLowerCase().replace(/[^\w一-鿿]/g, "").slice(0, 50) || `res_${Date.now()}`;
}

async function insertResource(db: any, items: any[], categoryKeys: Set<string>) {
  let success = 0, skipped = 0, errors = 0;
  for (const item of items) {
    try {
      const title = (item.title || item.name || "").trim();
      if (!title) { skipped++; continue; }
      const key = item.categoryKey || "movie";
      if (!categoryKeys.has(key)) { skipped++; continue; }
      await db.insert(resource).values({
        title,
        categoryKey: key,
        url: item.url || "",
        pinyin: item.pinyin || toPinyin(title),
        desc: item.desc || item.overview || "",
        diskType: item.diskType || "quark",
        hotNum: Number(item.hotNum || item.vote_count || item.popularity || 0),
        isShowHome: item.isShowHome ? 1 : 0,
        cover: item.cover || item.poster_path || "",
      });
      success++;
    } catch (err: any) {
      if (err?.code === "ER_DUP_ENTRY") { skipped++; }
      else { console.error(`  ✗ ${item.title}: ${err?.message}`); errors++; }
    }
  }
  return { success, skipped, errors };
}

// ═══════════════════════════════════════════
//  爬虫源定义
// ═══════════════════════════════════════════

const SOURCES: Record<string, () => Promise<any[]>> = {
  // ── TMDB 热门电影（需要 TMDB_API_KEY） ──
  tmdb: async () => {
    if (!TMDB_API_KEY) {
      console.error("✗ 请在 .env.local 中设置 TMDB_API_KEY");
      console.log("  免费申请: https://www.themoviedb.org/settings/api");
      process.exit(1);
    }
    const results: any[] = [];
    for (const type of ["movie", "tv"]) {
      const url = `https://api.themoviedb.org/3/trending/${type}/week?api_key=${TMDB_API_KEY}&language=zh-CN`;
      const resp = await fetch(url);
      const data = await resp.json();
      for (const item of data.results || []) {
        results.push({
          title: item.title || item.name || "未知",
          desc: item.overview || "",
          categoryKey: type === "movie" ? "movie" : "tv",
          pinyin: (item.title || item.name || "").toLowerCase().replace(/\s+/g, ""),
          hotNum: item.vote_count || item.popularity || 0,
          cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
          url: "",
          diskType: "quark",
          isShowHome: 0,
        });
      }
    }
    return results;
  },
};

// ═══════════════════════════════════════════
//  通用 HTML 爬虫（通过 CSS 选择器配置）
// ═══════════════════════════════════════════

interface ScraperConfig {
  name: string;
  url: string;
  categoryKey: string;
  diskType: string;
  selectors: {
    container: string;
    title: string;
    url?: string;
    desc?: string;
  };
}

async function scrapeSite(config: ScraperConfig): Promise<any[]> {
  console.log(`→ 正在爬取: ${config.name} (${config.url})`);
  const resp = await fetch(config.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  const html = await resp.text();

  // 用正则简单解析 (避免依赖 cheerio)
  const items: any[] = [];
  const titleRegex = new RegExp(config.selectors.title.replace(/\./g, "\\.").replace(/#/g, "#"), "g");
  // 简单启发式提取: 找链接文本
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  const seen = new Set<string>();
  while ((match = linkRegex.exec(html)) !== null) {
    const title = match[2].trim();
    const url = match[1].startsWith("http") ? match[1] : new URL(match[1], config.url).href;
    // 过滤掉太短或无关的链接
    if (title.length >= 4 && !seen.has(title) && !title.includes("登录") && !title.includes("注册")) {
      seen.add(title);
      items.push({
        title,
        url,
        categoryKey: config.categoryKey,
        diskType: config.diskType,
        desc: "",
        hotNum: 0,
        isShowHome: 0,
      });
    }
  }

  console.log(`  → 提取到 ${items.length} 条`);
  return items;
}

// ═══════════════════════════════════════════
//  主逻辑
// ═══════════════════════════════════════════

async function main() {
  // 连接数据库
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  const db = drizzle(connection);
  const categories = await db.select().from(category);
  const categoryKeys = new Set(categories.map((c) => c.key));
  console.log(`✓ 已连接数据库, ${categories.length} 个分类: ${[...categoryKeys].join(", ")}`);

  let allItems: any[] = [];
  let totalSuccess = 0, totalSkipped = 0, totalErrors = 0;

  // ── 预定义爬虫源 ──
  if (flags["tmdb"]) {
    const items = await SOURCES.tmdb();
    allItems.push(...items);
  }

  // ── 通用站点爬取 ──
  if (flags["site"]) {
    // 尝试加载配置文件
    const configPath = path.resolve(__dirname, "scraper-config.json");
    if (fs.existsSync(configPath)) {
      const configs: ScraperConfig[] = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (Array.isArray(configs)) {
        for (const cfg of configs) {
          const items = await scrapeSite(cfg);
          allItems.push(...items);
        }
      }
    } else {
      // 直接用参数中的 URL 简单爬取
      const items = await scrapeSite({
        name: flags["site"],
        url: flags["site"],
        categoryKey: flags["category"] || "other",
        diskType: flags["disk"] || "quark",
        selectors: {
          container: "body",
          title: "a",
        },
      });
      allItems.push(...items);
    }
  }

  // ── 列出可用爬虫 ──
  if (flags["list"] || Object.keys(flags).length === 0) {
    console.log(`
可用爬虫源:
  --tmdb          TMDB 热门电影/剧集 (需 TMDB_API_KEY)

通用爬取:
  --site <url>    从指定网页提取链接作为资源
  --category xxx  指定分类 (默认 other)
  --disk xxx      指定网盘类型 (默认 quark)

配置文件爬取:
  编辑 src/scripts/scraper-config.json 配置多个站点规则

示例:
  npm run scrape -- --tmdb
  npm run scrape -- --site "https://example.com/resources" --category movie
  npm run import -- --from-json ./data.json
`);
    process.exit(0);
  }

  // ── 入库 ──
  if (allItems.length === 0) {
    console.log("! 没有抓取到数据");
    process.exit(0);
  }

  console.log(`\n→ 共 ${allItems.length} 条数据，正在入库...`);
  const result = await insertResource(db, allItems, categoryKeys);
  console.log(`✓ 入库完成！成功: ${result.success}, 跳过: ${result.skipped}, 失败: ${result.errors}`);

  await connection.end();
  process.exit(0);
}

main();
