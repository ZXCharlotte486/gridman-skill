#!/usr/bin/env node
/**
 * Gridman Skill 安装脚本
 * 用法: npx @gridman/skill init
 * 
 * 步骤:
 *   1. 问用户根目录
 *   2. 问平台（gitee/github）
 *   3. 问 Git Access Token
 *   4. 创建本地目录（mind/、evidence/、modes/）
 *   5. 生成 manifest.json
 *   6. 从远程拉取模式文件到本地 modes/
 *   7. 拷贝 console.html 到根目录
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(resolve => rl.question(q, resolve)); }

const GITEE_API = 'https://gitee.com/api/v5/repos';
const GITHUB_API = 'https://api.github.com/repos';

// 默认配置
const DEFAULT_KNOWLEDGE = 'ZXCharlotte486/gridman-knowledge';
const DEFAULT_MODES = 'ZXCharlotte486/gridman-modes';

async function fetchFile(platform, repo, filePath, token) {
  let url;
  const headers = { 'User-Agent': 'gridman-skill-init' };

  // 路径中的每段分别编码，保留 /
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');

  if (platform === 'gitee') {
    url = `${GITEE_API}/${repo}/contents/${encodedPath}?access_token=${token}`;
  } else {
    url = `${GITHUB_API}/${repo}/contents/${encodedPath}`;
    headers['Authorization'] = `Bearer ${token}`;
    headers['Accept'] = 'application/vnd.github.v3+json';
  }

  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : require('http');
    lib.get(url, { headers }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // 跟随重定向
        lib.get(res.headers.location, { headers }, res2 => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`)); return; }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function decodeBase64(content) {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

async function main() {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   Gridman Skill 安装向导 v0.2.0     ║');
  console.log('  ║   超级特工古立特 · Access Flash      ║');
  console.log('  ╚══════════════════════════════════════╝\n');

  // 1. 根目录
  const defaultRoot = path.join(process.env.HOME || process.env.USERPROFILE, '.gridman');
  const rootInput = await ask(`  系统根目录 [${defaultRoot}]: `);
  const root = rootInput.trim() || defaultRoot;

  // 2. 平台
  const platformInput = await ask('  Git 平台 (gitee/github) [github]: ');
  const platform = platformInput.trim().toLowerCase() === 'gitee' ? 'gitee' : 'github';

  // 3. Token
  const token = await ask(`  ${platform} Access Token (只读权限): `);
  if (!token.trim()) {
    console.log('\n  ⚠ 未填写 Token。安装将继续，但无法访问远程知识库。\n');
  }

  // 4. 创建目录
  console.log('\n  创建目录结构...');
  const dirs = ['mind', 'evidence', 'modes'];
  fs.mkdirSync(root, { recursive: true });
  dirs.forEach(d => fs.mkdirSync(path.join(root, d), { recursive: true }));

  // 5. 生成 manifest.json
  const manifest = {
    manifest_version: '0.2.0',
    root: root,
    platform: platform,
    knowledge_source: DEFAULT_KNOWLEDGE,
    modes_source: DEFAULT_MODES,
    token: token.trim(),
    modules_enabled: ['accounting', 'audit', 'tax', 'investment', 'compliance', 'analysis', 'specialized', 'academic'],
    mind_dir: 'mind',
    evidence_dir: 'evidence',
    modes_dir: 'modes'
  };
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('  ✓ manifest.json');

  // 6. 模式文件不拉到本地（Agent 按需从远程读取）
  console.log('\n  模式和知识由 Agent 按需从远程加载。');

  // 7. 拷贝 console.html + serve.js + start.vbs
  const consoleSrc = path.join(__dirname, '..', 'console.html');
  if (fs.existsSync(consoleSrc)) {
    fs.copyFileSync(consoleSrc, path.join(root, 'console.html'));
    console.log('  ✓ console.html');
  }

  // 拷贝 serve.js
  const serveSrc = path.join(__dirname, 'serve.js');
  const serveDest = path.join(root, 'serve.js');
  if (fs.existsSync(serveSrc)) {
    fs.copyFileSync(serveSrc, serveDest);
    console.log('  ✓ serve.js');
  }

  // 生成 start.vbs（用户双击启动）
  const startVbs = `Set shell = CreateObject("WScript.Shell")\nshell.Run "node ""${serveDest.replace(/\\/g, '\\\\')}""  ""${root.replace(/\\/g, '\\\\')}"" ", 0, False\nWScript.Sleep 800\nshell.Run "http://localhost:3721", 0, False\n`;
  fs.writeFileSync(path.join(root, 'start.vbs'), startVbs, 'utf-8');
  console.log('  ✓ start.vbs');

  // 8. 生成 SKILL.md（替换 manifest 路径占位符）
  const skillSrc = path.join(__dirname, '..', 'SKILL.md');
  if (fs.existsSync(skillSrc)) {
    const manifestPath = path.join(root, 'manifest.json');
    let skillContent = fs.readFileSync(skillSrc, 'utf-8');
    skillContent = skillContent.replace('{{MANIFEST_PATH}}', manifestPath);
    fs.writeFileSync(path.join(root, 'SKILL.md'), skillContent, 'utf-8');
    console.log('  ✓ SKILL.md（已写入 manifest 路径）');
  }

  console.log('\n  ══════════════════════════════════════');
  console.log('  安装完成！');
  console.log(`  根目录: ${root}`);
  console.log(`  平台:   ${platform}`);
  console.log(`  Token:  ${token.trim() ? '已配置' : '未配置'}`);
  console.log('');
  console.log('  下一步:');
  console.log('  • 双击 start.vbs 打开 Console');
  console.log(`  • 把 ${path.join(root, 'SKILL.md')} 加载到你的 AI 宿主`);
  console.log('  • 向古立特提一个财税问题试试');
  console.log('  ══════════════════════════════════════\n');

  rl.close();
}

main().catch(e => { console.error('安装失败:', e.message); rl.close(); process.exit(1); });
