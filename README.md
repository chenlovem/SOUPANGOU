<p align="center">
  <img src="./public/logos/logo.svg" width="100" height="100">
</p>
<h1 align="center">搜盘狗</h1>

## 项目简介

搜盘狗是一个一站式网盘资源搜索引擎，支持夸克网盘、百度网盘、阿里云盘等多平台，快速精准搜索，一键直达。

<p align="center">
  <img src="./screenshot/home.png">
</p>


在线体验：https://pan.xiaozi.cc

## 主要特性

- 🚀 基于 Next.js 15 的现代 React 应用
- 🎨 美观的 UI 设计，使用 Tailwind CSS 和 Radix UI 组件
- 📱 响应式设计，适配各种设备屏幕
- 🔒 完整的用户认证系统
- 🗃️ 基于 Drizzle ORM 的数据库管理

## 技术栈

- **前端框架**: Next.js 15, React 18
- **UI 组件**: Radix UI, TailwindCSS
- **状态管理**: React Hooks, Contexts
- **表单处理**: React Hook Form
- **数据验证**: Zod
- **数据库 ORM**: Drizzle ORM
- **API 路由**: Hono
- **认证**: JWT
- **开发工具**: TypeScript, Drizzle Kit

## 安装指南

### 前提条件

- Node.js 18+
- MySQL 数据库（或使用 PlanetScale）

### 环境变量设置

在项目根目录创建`.env.local`文件，添加以下配置（根据您的环境修改）:

```
DATABASE_HOST=your-database-host
DATABASE_PORT=3306
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
DATABASE_NAME=your-database-name
JWT_SECRET=your-jwt-secret
```

### 安装步骤

1. 克隆仓库：

   ```bash
   git clone <repository-url>
   cd panxiaozi
   ```

2. 安装依赖：

   ```bash
   npm install
   # 或
   pnpm install
   # 或
   yarn install
   ```

3. 数据库设置：

   ```bash
   # 生成数据库迁移文件
   npm run db:generate

   # 应用数据库迁移
   npm run db:push
   ```

4. 启动开发服务器：

   ```bash
   npm run dev
   ```

5. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 项目命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行代码检查
- `npm run db:generate` - 生成数据库迁移文件
- `npm run db:push` - 应用数据库迁移
- `npm run db:studio` - 启动 Drizzle 数据库管理界面

## 部署

该项目可以部署在任何支持 Node.js 的平台上，如 Zeabur、Vercel、Netlify 等。

[![Deployed on Zeabur](https://zeabur.com/deployed-on-zeabur-dark.svg)](https://zeabur.com/referral?referralCode=towelong&utm_source=towelong&utm_campaign=oss)

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")


## 许可证

[MIT](LICENSE)
