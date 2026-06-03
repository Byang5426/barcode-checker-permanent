# 条形码核对系统 · 项目梳理文档

> **项目名称**: barcode-checker-permanent
> **版本**: 1.0.0 | **许可证**: MIT
> **最后梳理时间**: 2026-06-02

---

## 一、项目概述

**条形码核对系统**是一个基于 Web 的商品清单管理与条码扫描核对工具。用户可以上传包含条形码和数量的 Excel/Numbers 文件，系统自动解析创建核对清单，然后通过摄像头扫描或手动输入条形码来逐一核对商品，实时追踪核对进度。

### 核心功能

| 功能模块 | 说明 |
|---------|------|
| 📁 文件上传与解析 | 支持 Excel (.xlsx/.xls) 和 Numbers 文件，智能识别列名 |
| 📷 摄像头扫描 | 基于 html5-qrcode 的实时条形码识别 |
| ⌨️ 手动输入 | 支持手动输入条形码进行核对 |
| 📊 进度追踪 | 实时显示核对进度，区分已完成/待核对项目 |
| 🔄 清单管理 | 创建、查看、重置、删除清单 |
| 🔐 用户系统 | 基于用户名/密码的注册、登录、权限控制 |

---

## 二、技术架构

```
┌────────────────────────────────────────────────────────┐
│                     前端 (React 19)                     │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │  Wouter   │  │ TanStack   │  │  shadcn/ui +      │  │
│  │  (路由)   │  │ React-Query│  │  Tailwind CSS 4   │  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│                         │                               │
│               ┌─────────┴─────────┐                    │
│               │   tRPC Client     │                    │
│               └─────────┬─────────┘                    │
└─────────────────────────┼──────────────────────────────┘
                          │ HTTP (/api/trpc)
┌─────────────────────────┼──────────────────────────────┐
│               ┌─────────┴─────────┐                    │
│               │   tRPC Server     │    后端 (Express)   │
│               └─────────┬─────────┘                    │
│  ┌──────────┐  ┌────────┴───────┐  ┌───────────────┐  │
│  │  Auth    │  │  File Parser   │  │  Barcode Scan │  │
│  │ (bcrypt) │  │  (xlsx)        │  │  (html5-qrcode)│  │
│  └──────────┘  └────────────────┘  └───────────────┘  │
│                         │                               │
│               ┌─────────┴─────────┐                    │
│               │   Drizzle ORM     │                    │
│               └─────────┬─────────┘                    │
└─────────────────────────┼──────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│               ┌─────────┴─────────┐                    │
│               │   MySQL / TiDB    │    数据库           │
│               └───────────────────┘                    │
└────────────────────────────────────────────────────────┘
```

### 主要技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.1 |
| **路由** | Wouter | 3.3.5 |
| **UI 组件** | shadcn/ui (Radix UI) | 最新 |
| **样式** | Tailwind CSS | 4.1.14 |
| **数据请求** | tRPC + TanStack React Query | 11.6.0 / 5.90.2 |
| **动画** | Framer Motion | 12.23.22 |
| **后端框架** | Express | 4.21.2 |
| **ORM** | Drizzle ORM | 0.44.5 |
| **数据库** | MySQL / TiDB (mysql2) | 3.15.0 |
| **文件解析** | xlsx (SheetJS) | 0.18.5 |
| **条码扫描** | html5-qrcode | 2.3.8 |
| **加密** | bcryptjs | 3.0.3 |
| **构建** | Vite + esbuild | 7.1.7 / 0.25.0 |
| **测试** | Vitest | 2.1.4 |
| **包管理** | pnpm | 10.4.1 |

---

## 三、数据库设计

### ER 关系图

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    users     │    │   checklists     │    │ checklistItems   │
├──────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)      │───>│ userId (FK)      │───>│ checklistId (FK) │
│ username     │    │ id (PK)          │    │ id (PK)          │
│ password     │    │ name             │    │ barcode          │
│ name         │    │ fileName         │    │ productName      │
│ email        │    │ totalItems       │    │ productCode      │
│ role (enum)  │    │ completedItems   │    │ targetQuantity   │
│ createdAt    │    │ createdAt        │    │ verifiedQuantity │
│ updatedAt    │    │ updatedAt        │    │ isCompleted      │
│ lastSignedIn │    └──────────────────┘    │ createdAt        │
└──────────────┘                            │ updatedAt        │
                                            └──────────────────┘
                                                    │
                                            ┌───────┴──────────┐
                                            │  scanRecords     │
                                            ├──────────────────┤
                                            │ id (PK)          │
                                            │ checklistId (FK) │
                                            │ barcode          │
                                            │ scanMethod       │
                                            │ createdAt        │
                                            └──────────────────┘
```

### 表结构详解

#### 1. `users` — 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int, PK, 自增 | 用户 ID |
| `username` | varchar(64), 唯一 | 用户名 |
| `password` | varchar(255) | bcrypt 加密密码 |
| `name` | text | 用户昵称 |
| `email` | varchar(320) | 邮箱（可选） |
| `role` | enum('user','admin') | 角色，默认 'user' |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |
| `lastSignedIn` | timestamp | 最后登录时间 |

#### 2. `checklists` — 清单表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int, PK, 自增 | 清单 ID |
| `userId` | int, FK → users | 所属用户（级联删除） |
| `name` | varchar(255) | 清单名称（文件名的主文件名） |
| `fileName` | varchar(255) | 原始文件名 |
| `totalItems` | int | 总项目数 |
| `completedItems` | int, 默认 0 | 已完成项目数 |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |

#### 3. `checklistItems` — 清单条目表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int, PK, 自增 | 条目 ID |
| `checklistId` | int, FK → checklists | 所属清单（级联删除） |
| `barcode` | varchar(255) | 条形码 |
| `productName` | varchar(255) | 产品名称 |
| `productCode` | varchar(255), 可选 | 产品编码 |
| `targetQuantity` | int | 目标数量 |
| `verifiedQuantity` | int, 默认 0 | 已核对数量 |
| `isCompleted` | boolean, 默认 false | 是否已完成 |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |

#### 4. `scanRecords` — 扫描记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int, PK, 自增 | 记录 ID |
| `checklistId` | int, FK → checklists | 所属清单（级联删除） |
| `barcode` | varchar(255) | 扫描的条形码 |
| `scanMethod` | varchar(64) | 扫描方式：'camera' 或 'manual' |
| `createdAt` | timestamp | 扫描时间 |

### 数据库迁移

迁移文件位于 `drizzle/` 目录，共 3 个迁移：
- `0000_flashy_carnage.sql` — 初始 schema（users 表）
- `0001_rapid_omega_red.sql` — 添加清单相关表
- `0002_windy_maestro.sql` — 后续更新

执行迁移：`pnpm db:push`

---

## 四、后端架构

### 4.1 tRPC 路由结构 (`server/routers.ts`)

```
appRouter
├── system        → 系统路由（通知、心跳等）
├── auth          → 认证路由
│   ├── me        → 获取当前用户 (publicProcedure)
│   ├── register  → 注册 (publicProcedure, mutation)
│   ├── login     → 登录 (publicProcedure, mutation)
│   └── logout    → 登出 (publicProcedure, mutation)
└── checklist     → 清单路由（全部 protectedProcedure）
    ├── list            → 获取用户所有清单 (query)
    ├── getById         → 获取指定清单详情 (query)
    ├── getItems        → 获取清单所有条目 (query)
    ├── uploadAndParse  → 上传并解析文件 (mutation)
    ├── scan            → 扫描条形码 (mutation)
    ├── getScanRecords  → 获取扫描记录 (query)
    ├── reset           → 重置清单 (mutation)
    └── delete          → 删除清单 (mutation)
```

### 4.2 认证流程

```
用户输入用户名/密码
        │
        ▼
  ┌─────────────┐
  │ auth.login  │ ─► authenticateUser() → bcrypt.compare
  └──────┬──────┘
         │ 成功
         ▼
  生成 Session Cookie（JSON 格式包含 userId, username, name, role）
         │
         ▼
  后续请求通过 context.ts 解析 Cookie → ctx.user
         │
         ▼
  protectedProcedure 验证 ctx.user → 允许访问
```

### 4.3 文件解析逻辑 (`server/fileParser.ts`)

文件解析器使用 `xlsx` 库读取 Excel/Numbers 文件，核心流程：

1. **读取工作簿** → 获取第一个 Sheet
2. **识别表头行** → 在前 5 行中搜索包含关键词（条码、barcode、数量、quantity 等）的行
3. **列匹配** → 自动匹配条形码列、数量列、产品名称列、产品编码列
4. **数据提取** → 从表头行后逐行读取，过滤空行和无效数据
5. **返回结构化数据** → 包含 `barcode`, `productName`, `productCode`, `targetQuantity` 的数组

**智能列名匹配支持的关键词：**

| 列 | 支持的关键词 |
|---|-------------|
| 条形码 | barcode, 条码, 条形码, code, ean, upc, sku, 商品条码 |
| 数量 | quantity, qty, 数量, 目标数量, target, 件数, count, amount |
| 产品名称 | product, name, 产品, 名称, 产品名称, 商品名称, 品名 |
| 产品编码 | code, sku, 产品编码, 编码, 商品编码 |

### 4.4 数据库辅助函数 (`server/db.ts`)

| 函数 | 用途 |
|------|------|
| `getDb()` | 懒加载获取 Drizzle 实例 |
| `registerUser()` | 注册新用户（密码 bcrypt 加密） |
| `authenticateUser()` | 验证用户名/密码 |
| `getUserById()` | 按 ID 查找用户 |
| `getUserByUsername()` | 按用户名查找用户 |
| `createChecklist()` | 创建清单 ⚠️ (实现有误，见问题章节) |
| `getChecklistsByUserId()` | 获取用户所有清单 |
| `getChecklistById()` | 按 ID 获取清单 |
| `getChecklistItemsByChecklistId()` | 获取清单所有条目 |
| `getChecklistItemByBarcode()` | 按条形码查找条目 |
| `getScanRecordsByChecklistId()` | 获取扫描记录 |

---

## 五、前端架构

### 5.1 路由结构 (`client/src/App.tsx`)

| 路由 | 组件 | 权限 | 说明 |
|------|------|------|------|
| `/login` | Login | 公开 | 登录/注册页面 |
| `/` | Home | 需登录 | 首页/仪表盘 |
| `/checklists` | ChecklistList | 需登录 | 清单列表页 |
| `/upload` | Upload | 需登录 | 文件上传页 |
| `/checklist/:id` | ChecklistDetail | 需登录 | 清单详情/扫描页 |
| `*` | NotFound | 公开 | 404 页面 |

### 5.2 页面功能

#### Login 页面
- 支持登录/注册切换
- 表单验证（用户名 ≥ 3 字符，密码 ≥ 6 字符）
- 登录成功后跳转首页

#### Home 页面（首页）
- 显示欢迎信息
- 快捷入口：上传清单、查看清单
- 系统功能介绍
- 退出登录按钮

#### ChecklistList 页面（清单列表）
- 展示所有已上传的清单
- 显示每个清单的进度条
- 支持删除、重置操作
- 点击进入清单详情

#### Upload 页面（上传）
- 拖拽上传 / 点击选择文件
- 支持 Excel (.xlsx/.xls) 和 Numbers 格式
- 文件大小限制 10MB
- 显示文件格式要求和示例

#### ChecklistDetail 页面（核心 - 清单详情）
- **进度面板**：显示核对百分比、已完成/待核对数量
- **摄像头扫描**：使用 html5-qrcode 实时扫描条形码
- **手动输入**：文本框输入条形码 + 回车确认
- **项目列表**：分为已完成和待核对两组
- **扫描历史**：可展开查看历史扫描记录
- **重置功能**：清除所有扫描记录

### 5.3 状态管理

- **认证状态**：`useAuth()` Hook（来自 `_core/hooks/useAuth.ts`）
- **数据获取**：tRPC React Query hooks（自动缓存、重新获取）
- **UI 状态**：组件内 `useState`
- **主题**：ThemeProvider（默认 light 模式）

### 5.4 UI 组件库

项目集成了完整的 **shadcn/ui** 组件（约 40+ 个），包括：
- 基础组件：button, input, card, label, badge
- 布局组件：dialog, drawer, sheet, tabs, accordion
- 数据展示：table, chart, carousel, scroll-area
- 表单组件：form, select, checkbox, radio-group, switch
- 反馈组件：alert, toast (sonner), progress, skeleton
- 导航组件：navigation-menu, breadcrumb, sidebar, pagination, menubar

---

## 六、核心业务流程

### 6.1 完整使用流程

```
1. 用户注册/登录
        │
        ▼
2. 上传 Excel 文件 → 服务端解析 → 创建清单 + 条目
        │
        ▼
3. 进入清单详情页
        │
        ├── 打开摄像头扫描条形码 ──► 自动匹配条目
        │                            │
        └── 手动输入条形码 ──────────► 核对数量 +1
                                      │
                                      ▼
                              更新进度（实时更新）
                                      │
                                      ▼
                              verifiedQuantity ≥ targetQuantity
                                      │
                                      ▼
                              标记为已完成 ✓
```

### 6.2 扫描核对流程

```
扫描条形码
    │
    ▼
查找清单中匹配的条目 (getChecklistItemByBarcode)
    │
    ├── 未找到 → 提示 "Barcode not found"
    │
    └── 找到 → verifiedQuantity + 1
              │
              ├── 判断是否达到目标数量
              │   └── 是 → isCompleted = true
              │
              ├── 记录扫描记录 (scanRecords)
              │
              └── 返回结果 → 前端展示 Toast
```

---

## 七、项目目录结构

```
barcode-checker-permanent/
├── client/                          # 前端代码
│   ├── public/                      # 静态资源
│   ├── src/
│   │   ├── _core/hooks/useAuth.ts   # 认证 Hook
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui 组件库 (40+)
│   │   │   ├── ErrorBoundary.tsx    # 错误边界
│   │   │   ├── DashboardLayout.tsx  # 仪表盘布局
│   │   │   ├── AIChatBox.tsx        # AI 聊天组件
│   │   │   ├── Map.tsx              # 地图组件
│   │   │   └── ManusDialog.tsx      # 对话框组件
│   │   ├── contexts/ThemeContext.tsx # 主题上下文
│   │   ├── hooks/                   # 自定义 Hooks
│   │   ├── lib/
│   │   │   ├── trpc.ts              # tRPC 客户端配置
│   │   │   └── utils.ts             # 工具函数
│   │   ├── pages/                   # 页面组件
│   │   │   ├── Home.tsx             # 首页
│   │   │   ├── Login.tsx            # 登录/注册
│   │   │   ├── ChecklistList.tsx    # 清单列表
│   │   │   ├── ChecklistDetail.tsx  # 清单详情/扫描
│   │   │   ├── Upload.tsx           # 文件上传
│   │   │   └── NotFound.tsx         # 404
│   │   ├── App.tsx                  # 路由配置
│   │   ├── main.tsx                 # 入口文件
│   │   └── index.css                # 全局样式
│   └── index.html                   # HTML 模板
│
├── server/                          # 后端代码
│   ├── _core/                       # 框架层（不建议修改）
│   │   ├── index.ts                 # Express 入口
│   │   ├── context.ts               # tRPC 上下文
│   │   ├── trpc.ts                  # tRPC 初始化
│   │   ├── cookies.ts               # Cookie 处理
│   │   ├── env.ts                   # 环境变量
│   │   ├── llm.ts                   # LLM 集成
│   │   ├── map.ts                   # 地图服务
│   │   ├── notification.ts          # 通知服务
│   │   └── ...                      # 其他框架模块
│   ├── db.ts                        # 数据库辅助函数
│   ├── routers.ts                   # tRPC 路由定义（核心）
│   ├── fileParser.ts                # Excel 文件解析器
│   ├── storage.ts                   # 文件存储服务
│   └── fileParser.test.ts           # 文件解析测试
│
├── drizzle/                         # 数据库
│   ├── schema.ts                    # 表结构定义（核心）
│   ├── relations.ts                 # 表关系
│   ├── 0000_flashy_carnage.sql      # 迁移文件
│   ├── 0001_rapid_omega_red.sql
│   ├── 0002_windy_maestro.sql
│   └── meta/                        # 迁移元数据
│
├── shared/                          # 共享代码
│   ├── const.ts                     # 共享常量
│   ├── types.ts                     # 类型导出
│   └── _core/errors.ts              # 错误定义
│
├── package.json                     # 项目配置
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite 构建配置
├── drizzle.config.ts                # Drizzle 配置
├── vitest.config.ts                 # 测试配置
└── components.json                  # shadcn/ui 配置
```

---

## 八、可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式（热重载，tsx watch） |
| `pnpm build` | 生产构建（Vite + esbuild） |
| `pnpm start` | 启动生产服务 |
| `pnpm check` | TypeScript 类型检查 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm db:push` | 生成并执行数据库迁移 |

---

## 九、环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL/TiDB 连接字符串 |
| `JWT_SECRET` | Session Cookie 签名密钥 |
| `VITE_APP_ID` | OAuth 应用 ID |
| `OAUTH_SERVER_URL` | OAuth 后端 URL |

---

## 十、已知问题与改进建议

### 🐛 已知问题

1. **`db.ts` 中 `createChecklist()` 实现有误**
   - 当前实现错误地向 `users` 表插入数据，而非 `checklists` 表
   - 该函数未被使用（`routers.ts` 中直接使用了 Drizzle 的 `db.insert(checklists)`），不影响功能
   - 建议修复或删除

2. **`routers.ts` 中 `uploadAndParse` 的清单 ID 获取方式不健壮**
   - 当前通过查询 `userId` 最新记录来获取 checklistId，多用户并发上传可能产生竞态
   - 建议使用 MySQL 的 `result.insertId` 获取

3. **`checklist.getScanRecords` 缺少权限验证**
   - 缺少对 `ctx.user.id` 的检查（虽然验证了 checklist 存在，但后续查询未验证权限）

### 💡 改进建议

| 优先级 | 建议 | 说明 |
|--------|------|------|
| 🔴 高 | 修复 `createChecklist` 函数 | 修正插入逻辑或移除无用函数 |
| 🔴 高 | 修复清单 ID 获取竞态问题 | 使用 `insertId` 替代查询 |
| 🟡 中 | 添加搜索/筛选功能 | 清单列表页支持搜索、按状态筛选 |
| 🟡 中 | 导出核对报告 | 支持将核对结果导出为 Excel |
| 🟡 中 | 批量扫描模式 | 支持连续扫描，减少操作次数 |
| 🟢 低 | 添加单元测试 | 补充 routers.ts 和业务逻辑测试 |
| 🟢 低 | 国际化 (i18n) | 界面中文硬编码，可支持多语言 |
| 🟢 低 | PWA 支持 | 添加 Service Worker 支持离线使用 |

---

## 十一、数据流图

### 上传文件 → 创建清单

```
前端 (Upload.tsx)          后端 (routers.ts)          数据库
─────────────────          ──────────────────         ──────
选择文件 → base64编码
              │
    uploadAndParse(fileData, fileName)
              │
              ▼
                        parseChecklistFile(buffer)
                              │
                              ▼
                        识别表头 → 解析数据行
                              │
                              ▼
                     INSERT checklists ──────────► ✓ 清单记录
                              │
                              ▼
                     循环 INSERT checklistItems ──► ✓ 条目记录
                              │
                              ▼
                     返回 { checklistId, itemCount }
              │
              ▼
    Toast 成功 → 跳转 /checklists
```

### 扫描核对流程

```
前端 (ChecklistDetail.tsx)     后端 (routers.ts)        数据库
─────────────────────────     ──────────────────       ──────
摄像头/手动输入 barcode
              │
    scan(checklistId, barcode, method)
              │
              ▼
                         验证清单归属 (ctx.user)
                              │
                              ▼
                     getChecklistItemByBarcode ────► 查找匹配条目
                              │                         │
                              │  ◄──── 返回条目 ─────────┘
                              ▼
                     verifiedQuantity + 1
                     判断 isCompleted
                              │
                              ▼
                     UPDATE checklistItems ─────────► 更新条目
                              │
                              ▼
                     INSERT scanRecords ────────────► 记录扫描
                              │
                              ▼
                     返回 { newQuantity, isCompleted }
              │
              ▼
    Toast 反馈 → 刷新列表
```

---

*文档自动生成 · 基于项目源码分析*
