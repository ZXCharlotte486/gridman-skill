/**
 * Gridman API 调用规范
 * 
 * 本文件是"参考文档"，不是运行时依赖。
 * Agent 读取本文件后，按此规范使用宿主自身的 HTTP 能力发起请求。
 * 不需要 import 或执行本文件。
 * 
 * 宿主能力要求：能发 HTTPS GET 请求（web_fetch / fetch / curl 均可）
 */

// ============================================================
// 平台配置
// ============================================================

const GITEE_API = "https://gitee.com/api/v5/repos";
const GITHUB_API = "https://api.github.com/repos";

// ============================================================
// 调用规范 1: 读取远程 index.json（知识目录 / 模式目录）
// ============================================================

/**
 * URL 拼接规则:
 *   Gitee:  GET {GITEE_API}/{owner}/{repo}/contents/index.json?access_token={token}
 *   GitHub: GET {GITHUB_API}/{owner}/{repo}/contents/index.json
 *           Header: Authorization: Bearer {token}
 * 
 * 返回 JSON 对象，其中 content 字段是 Base64 编码的文件正文。
 * 解码: atob(content.replace(/\n/g, "")) 或 Buffer.from(content, "base64").toString("utf-8")
 * 
 * 示例（Gitee）:
 *   GET https://gitee.com/api/v5/repos/gridman/gridman-knowledge/contents/index.json?access_token=xxx
 *   → response.content → Base64 解码 → JSON.parse → 得到 IndexFile
 */

// ============================================================
// 调用规范 2: 读取远程知识文件 / 模式文件
// ============================================================

/**
 * URL 拼接规则:
 *   Gitee:  GET {GITEE_API}/{owner}/{repo}/contents/{path}?access_token={token}
 *   GitHub: GET {GITHUB_API}/{owner}/{repo}/contents/{path}
 *           Header: Authorization: Bearer {token}
 * 
 * path = index.json 中文档条目的 path 字段
 * 返回同上：content 字段 Base64 解码即为 Markdown 正文
 * 
 * 示例:
 *   GET https://gitee.com/api/v5/repos/gridman/gridman-knowledge/contents/accounting-金融工具与减值.md?access_token=xxx
 *   → response.content → Base64 解码 → 得到 Markdown 正文
 */

// ============================================================
// 调用规范 3: 读取本地 manifest.json
// ============================================================

/**
 * manifest.json 在用户本地系统根目录下。
 * 宿主直接读文件即可（文件读写能力）。
 * 
 * 路径: {用户安装时指定的根目录}/manifest.json
 * 格式: 见 manifest.template.json
 * 
 * 关键字段:
 *   root             — 系统根目录绝对路径
 *   platform         — "gitee" 或 "github"
 *   knowledge_source — "{owner}/{repo}" 知识仓库
 *   modes_source     — "{owner}/{repo}" 模式仓库
 *   token            — Git 平台 Access Token
 *   modules_enabled  — 已启用的模块 ID 列表
 *   mind_dir         — Mind 目录名（相对于 root）
 *   evidence_dir     — Evidence 目录名
 *   modes_dir        — 本地模式目录名
 */

// ============================================================
// 调用规范 4: 写入本地设置
// ============================================================

/**
 * 修改 manifest.json 中的字段（如 modules_enabled）。
 * 宿主读取 → 修改目标字段 → 写回文件。
 * 
 * 注意: 修改 modules_enabled 必须经用户确认（铁律）。
 */

// ============================================================
// 数据类型参考
// ============================================================

interface Manifest {
  root: string;
  platform: "gitee" | "github";
  knowledge_source: string;   // "owner/repo"
  modes_source: string;       // "owner/repo"
  token: string;
  modules_enabled: string[];
  mind_dir: string;
  evidence_dir: string;
  modes_dir: string;
}

interface IndexEntry {
  doc_id: string;
  title: string;
  keywords: string[];
  alias: string[];
  path: string;
  module_id: string;
}

interface IndexFile {
  version: string;
  documents: IndexEntry[];    // knowledge index
  modes?: ModeEntry[];        // modes index
}

interface ModeEntry {
  mode_id: string;
  title: string;
  type: "system" | "user";
  keywords: string[];
}
