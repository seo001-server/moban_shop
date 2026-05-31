# Moban Shop

模板主题商城系统：包含用户前台、管理后台与 Go REST API，支持模板商品浏览购买、购物车结算、已购下载，以及完整的后台运营与 CMS 配置能力。

## 功能概览

### 用户前台（`frontend`）

- 首页与可配置 CMS 内容（轮播、分类卡片、特性介绍等）
- 模板商品目录：类目筛选（影视 / 小说 / 游戏 / 商城）、搜索、排序
- 商品详情、在线预览、购物车与结算下单
- 用户注册 / 登录、账户中心、订单查询与模拟支付
- 密码找回与重置（开发模式可返回重置链接）
- 业务板块展示（程序、落地、CDN 等）
- 开发文档阅读（Markdown 渲染）

### 管理后台（`admin-frontend`）

- 数据看板（营收趋势、热销模板等）
- 用户管理、订单管理与状态变更
- 模板（商品）CRUD、上下架、推荐、批量操作、复制
- 业务产品与业务板块配置
- 站点 CMS：首页配置、板块文案、开发文档编辑
- 图片与压缩包上传（模板下载包）
- 操作审计日志
- 多标签页工作台

### 后端 API（`cmd/server`）

- Echo HTTP 服务，统一 JSON 响应格式
- 前台用户 JWT 与后台管理员 JWT 分离鉴权
- MySQL + [sqlc](https://sqlc.dev/) 类型安全数据访问
- 静态文件服务（`/uploads`）
- 健康检查：`GET /healthz`、`GET /readyz`

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.24 · Echo v4 · MySQL · sqlc · JWT (HS256) · bcrypt |
| 用户前台 | React 19 · TypeScript · Vite 8 · React Router |
| 管理后台 | React 19 · TypeScript · Vite 8 · React Router |
| 开发工具 | Air（热重载）· ESLint |

## 项目结构

```
moban_shop/
├── cmd/
│   ├── server/          # HTTP API 入口
│   └── staff-hash/      # 生成管理员 bcrypt 密码哈希
├── internal/            # 后端业务模块（auth、catalog、orders、admin…）
├── sql/
│   ├── schema.sql       # 完整数据库 DDL（开发重建用）
│   ├── queries/         # sqlc SQL 查询
│   └── migrations/      # 增量迁移脚本
├── frontend/            # 用户前台（默认 :5173）
├── admin-frontend/      # 管理后台（默认 :5174）
├── uploads/             # 运行时上传目录（本地开发自动生成）
├── template-dev.md      # 模板开发文档（首次启动可自动写入 docs 表）
├── .env.example         # 后端环境变量示例
└── sqlc.yaml            # sqlc 配置
```

## 环境要求

- **Go** ≥ 1.24
- **Node.js** ≥ 18（推荐 20+）
- **MySQL** 8.x
- （可选）[Air](https://github.com/air-verse/air) — 后端热重载
- （可选）[sqlc](https://docs.sqlc.dev/en/latest/overview/install.html) — 修改 SQL 后重新生成 Go 代码

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/seo001-server/moban_shop.git
cd moban_shop
```

### 2. 创建数据库并导入表结构

```bash
mysql -u root -p -e "CREATE DATABASE moban_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p moban_shop < sql/schema.sql
```

> `sql/schema.sql` 会 **DROP 已有表**，仅适用于全新库或开发环境重建。生产环境请使用 `sql/migrations/` 下的增量脚本。

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少修改以下项：

| 变量 | 说明 |
|------|------|
| `DATABASE_DSN` | MySQL 连接串，须含 `parseTime=true` |
| `JWT_SECRET` | 前台用户 JWT 密钥（≥16 字符，生产环境建议 32+ 随机字符） |
| `JWT_ADMIN_SECRET` | 后台 JWT 密钥（须与 `JWT_SECRET` 不同） |
| `HTTP_ADDR` | API 监听地址，**本地开发建议 `:4396`**（与前端 Vite 代理一致） |

前台 / 后台前端可选配置：

```bash
cp frontend/.env.example frontend/.env
cp admin-frontend/.env.example admin-frontend/.env
```

### 4. 创建管理员账号

前台 `users` 与后台 `admin` 为独立账号体系。生成密码哈希后手动写入数据库：

```bash
go run ./cmd/staff-hash "你的管理员密码"
```

将输出的 bcrypt 哈希插入 `admin` 表，例如：

```sql
INSERT INTO `admin` (account, nickname, password_hash)
VALUES ('admin', '管理员', '<上一步输出的哈希>');
```

### 5. 启动后端

**方式 A — 热重载（推荐开发）：**

```bash
air
```

**方式 B — 直接运行：**

```bash
go run ./cmd/server
```

启动成功后访问 `http://127.0.0.1:4396/healthz` 应返回 `{"status":"ok"}`。

### 6. 启动前端

在两个终端分别执行：

```bash
# 用户前台 → http://127.0.0.1:5173
cd frontend && npm install && npm run dev

# 管理后台 → http://127.0.0.1:5174
cd admin-frontend && npm install && npm run dev
```

Vite 开发服务器会将 `/api` 与 `/uploads` 代理到 `http://127.0.0.1:4396`。若后端端口不同，请同步修改两个目录下的 `vite.config.ts` 中的 `proxy.target`。

## 环境变量参考

<details>
<summary>后端完整变量（点击展开）</summary>

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_DSN` | — | **必填** MySQL DSN |
| `HTTP_ADDR` | `:8080` | API 监听地址 |
| `ALLOW_ORIGINS` | `*` | CORS 允许来源，生产环境填逗号分隔域名 |
| `JWT_SECRET` | — | **必填** 前台 JWT 签名密钥 |
| `JWT_ISSUER` | `moban_shop` | 前台 JWT issuer |
| `JWT_ACCESS_TTL_SECONDS` | `86400` | 前台 Token 有效期（秒，上限 30 天） |
| `JWT_ADMIN_SECRET` | — | **必填** 后台 JWT 签名密钥 |
| `JWT_ADMIN_ISSUER` | `moban_shop_admin` | 后台 JWT issuer |
| `JWT_ADMIN_ACCESS_TTL_SECONDS` | 同前台 | 后台 Token 有效期 |
| `PASSWORD_RESET_EXPOSE_LINK` | `false` | 开发模式：忘记密码接口返回 reset_url |
| `PASSWORD_RESET_TTL_SECONDS` | `3600` | 重置令牌有效期 |
| `FRONTEND_URL` | — | 前台地址，用于密码重置链接 |
| `UPLOAD_DIR` | `./uploads` | 上传文件存储目录 |

</details>

## API 路由概览

```
GET  /healthz                          健康检查
GET  /readyz                           数据库就绪检查

/api/products                          商品列表
/api/products/:id                      商品详情
/api/homepage                          首页 CMS 数据
/api/business-sections                 业务板块
/api/docs/:slug                        文档内容

/api/auth/register | login             用户注册 / 登录
/api/auth/forgot-password              忘记密码
/api/auth/reset-password               重置密码
/api/me                                当前用户（需登录）

/api/cart/*                            购物车（需登录）
/api/orders/*                          订单（需登录）
/api/downloads/products/:id            已购模板下载（需登录）

/api/admin/auth/login                  管理员登录
/api/admin/*                           后台管理接口（需管理员 JWT）
```

完整路由定义见 [`cmd/server/main.go`](cmd/server/main.go)。

## 开发说明

### 修改 SQL 后重新生成代码

```bash
sqlc generate
```

生成结果输出到 `internal/db/`。

### 模板开发文档

项目根目录 [`template-dev.md`](template-dev.md) 描述模板引擎语法。后端首次启动时，若 `docs` 表为空，会自动将该文件写入 slug 为 `template-dev` 的文档记录。

### 构建生产产物

```bash
# 后端
go build -o bin/server ./cmd/server

# 用户前台
cd frontend && npm run build    # 产物在 frontend/dist

# 管理后台
cd admin-frontend && npm run build  # 产物在 admin-frontend/dist
```

生产部署时请将 `ALLOW_ORIGINS` 设为实际域名，关闭 `PASSWORD_RESET_EXPOSE_LINK`，并使用足够强度的随机 JWT 密钥。

## 安全提示

- **切勿** 将 `.env` 提交到 Git（已在 `.gitignore` 中忽略）
- 前台与后台使用不同的 JWT 密钥
- 管理员密码通过 `staff-hash` 生成 bcrypt 哈希，不要明文存储
- 上传目录需限制可执行权限，生产环境建议配合对象存储或 CDN

## License

尚未指定开源协议。如需开源，请自行添加 `LICENSE` 文件。
