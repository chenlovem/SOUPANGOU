/**
 * 搜盘狗资源爬虫 v5 - 从 pan.xiaozi.cc 爬取资源
 * 使用 mysql2 raw SQL 插入，确保能拿到 insertId 写入 resource_disk
 *
 * 用法:
 *   npm run crawl                 爬取全部
 *   npm run crawl -- --pages 10  只爬10页测试
 *   npm run crawl -- --start 100 从第100页开始
 *   npm run crawl -- --resume    断点续爬
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });

const BASE_URL = "https://pan.xiaozi.cc";
const DELAY = 250;
const PROGRESS_FILE = path.join(rootDir, "data", "crawl-progress.json");

const CAT_KEYS = ["tv", "movie", "anime", "variety", "comic", "short", "ebook", "course", "music", "material", "cartoon", "software", "other"];
const CAT_NAMES = ["电视剧", "电影", "动漫", "综艺", "漫画", "短剧", "电子书", "课程", "音乐", "素材", "动画片", "软件", "其他"];
const DISK_MAP: Record<string, string> = {
  "夸克": "quark", "百度": "baidu", "阿里": "aliyun", "迅雷": "xunlei",
};

const args = process.argv.slice(2);
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) { const k = args[i].slice(2); flags[k] = args[i+1]?.startsWith("--") ? "true" : args[i+1] || "true"; }
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function loadProgress() { try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")); } catch { return null; } }
function saveProgress(page: number, total: number) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ page, total, time: new Date().toISOString() }));
}

function extractResources(html: string): any[] {
  const items: any[] = [];
  const regex = /\{id:(\d+),categoryKey:"([^"]+)",pinyin:"([^"]*)",title:"([^"]*)",desc:"([^"]*)",cover:"([^"]*)",diskType:"([^"]*)",url:"([^"]*)",hotNum:(\d+),isShowHome:(\d+),updatedAt:[^}]+\}/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    items.push({
      siteId: parseInt(m[1]), categoryKey: m[2] || "other", pinyin: m[3],
      title: m[4], desc: m[5], cover: m[6], diskType: m[7], url: m[8],
      hotNum: parseInt(m[9]) || 0, isShowHome: parseInt(m[10]) || 0,
    });
  }
  return items;
}

async function main() {
  console.log("╔════════════════════════════╗");
  console.log("║   搜盘狗爬虫 v5            ║");
  console.log("╚════════════════════════════╝\n");

  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME, password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  console.log(`[${new Date().toLocaleTimeString()}] ✓ 已连接数据库`);

  // 确保分类存在
  for (let i = 0; i < CAT_KEYS.length; i++) {
    await conn.execute("INSERT IGNORE INTO category (`name`, `key`) VALUES (?, ?)", [CAT_NAMES[i], CAT_KEYS[i]]);
  }
  console.log(`[${new Date().toLocaleTimeString()}] ✓ 分类就绪`);

  // 获取总页数
  const resp = await fetch(`${BASE_URL}/resource?page=1`, { headers: { "User-Agent": "Mozilla/5.0" } });
  const firstHtml = await resp.text();
  const tm = firstHtml.match(/共[^\d]*(\d[\d,]*)/);
  const totalResources = tm ? parseInt(tm[1].replace(/,/g, "")) : 71283;
  const totalPages = Math.ceil(totalResources / 10);
  console.log(`[${new Date().toLocaleTimeString()}] → ${totalResources} 资源, ${totalPages} 页`);

  let startPage = 1;
  if (flags["resume"]) { const p = loadProgress(); if (p) startPage = p.page + 1; }
  else if (flags["start"]) startPage = parseInt(flags["start"]);
  const maxPages = parseInt(flags["pages"]) || totalPages;
  const endPage = Math.min(startPage + maxPages - 1, totalPages);
  console.log(`[${new Date().toLocaleTimeString()}] → P${startPage}~P${endPage} (${endPage-startPage+1}页)`);
  if (startPage > totalPages) { console.log("! 已完成"); process.exit(0); }

  let totalNew = 0, totalSkip = 0, totalErr = 0;
  const startTime = Date.now();

  for (let page = startPage; page <= endPage; page++) {
    let html: string;
    try {
      const res = await fetch(`${BASE_URL}/resource?page=${page}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      html = await res.text();
    } catch { await sleep(2000); continue; }

    const items = extractResources(html);
    if (items.length === 0) continue;

    let pNew = 0, pSkip = 0, pErr = 0;
    for (const item of items) {
      try {
        // 用 raw SQL 插入 resource 表
        const pinyin = item.pinyin || item.title.toLowerCase().replace(/[^\w一-鿿]/g, "").slice(0, 100);
        const diskType = DISK_MAP[item.diskType] || "quark";

        const [result] = await conn.execute(
          `INSERT INTO resource (title, category_key, url, pinyin, \`desc\`, cover, disk_type, hot_num, is_show_home)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.title, item.categoryKey || "other", item.url || "", pinyin,
           item.desc || "", item.cover || "", diskType, item.hotNum, item.isShowHome]
        );
        const insertId = (result as any).insertId;
        pNew++;

        // 写入 resource_disk 表
        if (insertId && item.url) {
          try {
            await conn.execute(
              "INSERT INTO resource_disk (resource_id, disk_type, external_url, url) VALUES (?, ?, ?, ?)",
              [insertId, diskType, item.url, item.url]
            );
          } catch {}
        }
      } catch (err: any) {
        if (err?.code === "ER_DUP_ENTRY") pSkip++;
        else { pErr++; if (pErr <= 3) console.error(`\n✗ ${(item.title||'').slice(0,30)}: ${err.message}`); }
      }
    }

    totalNew += pNew; totalSkip += pSkip; totalErr += pErr;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? Math.round(totalNew / elapsed) : 0;
    const pct = ((page - startPage + 1) / (endPage - startPage + 1) * 100).toFixed(1);
    process.stdout.write(`\r  [${pct}%] P${page}/${endPage} | +${pNew} | dup:${pSkip} | tot:${totalNew} | ${rate}/s`);
    if (page % 20 === 0) saveProgress(page, totalNew);
    await sleep(DELAY + Math.random() * 100);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log("\n\n已完成!");
  console.log(`  新增: ${totalNew} | 跳过: ${totalSkip} | 失败: ${totalErr}`);
  console.log(`  耗时: ${elapsed}s (${Math.round(totalNew/elapsed)}/s)`);
  saveProgress(endPage, totalNew);
  await conn.end();
  process.exit(0);
}

main();
