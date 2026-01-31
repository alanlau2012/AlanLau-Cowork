#!/usr/bin/env node
/**
 * AI Coding 专用验证脚本
 * 多层测试防护网 - 一键验证系统
 *
 * 使用方式：
 *   npm run verify        # 标准验证 (<60s)
 *   npm run verify:full   # 完整验证 (2-3min)
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

// 解析命令行参数
const args = process.argv.slice(2);
const isFullMode = args.includes('--full');

// 验证步骤定义
const standardSteps = [
  {
    layer: 1,
    name: 'Static Analysis',
    steps: [
      { name: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
      { name: 'Format Check', cmd: 'npm', args: ['run', 'format:check'] }
    ]
  },
  {
    layer: 2,
    name: 'Unit Tests',
    steps: [{ name: 'Unit Tests', cmd: 'npm', args: ['run', 'test:unit'] }]
  },
  {
    layer: 3,
    name: 'Integration Tests',
    steps: [{ name: 'API & Integration', cmd: 'npm', args: ['run', 'test:api'] }]
  }
];

const fullSteps = [
  ...standardSteps,
  {
    layer: 4,
    name: 'E2E Smoke Tests',
    steps: [{ name: 'E2E Smoke', cmd: 'npm', args: ['run', 'test:e2e:smoke'] }]
  },
  {
    layer: 6,
    name: 'Performance Guard',
    steps: [{ name: 'Benchmark', cmd: 'npm', args: ['run', 'test:bench'] }]
  }
];

const steps = isFullMode ? fullSteps : standardSteps;

// 执行单个命令
function runCommand(cmd, args) {
  return new Promise(resolve => {
    const startTime = performance.now();
    const proc = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', data => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', data => {
      stderr += data.toString();
    });

    proc.on('close', code => {
      const duration = ((performance.now() - startTime) / 1000).toFixed(1);
      resolve({
        success: code === 0,
        duration,
        stdout,
        stderr,
        code
      });
    });

    proc.on('error', err => {
      const duration = ((performance.now() - startTime) / 1000).toFixed(1);
      resolve({
        success: false,
        duration,
        stdout,
        stderr: err.message,
        code: 1
      });
    });
  });
}

// 格式化时间显示
function formatDuration(seconds) {
  return `${seconds}s`;
}

// 打印分隔线
function printSeparator() {
  console.log(colors.dim + '━'.repeat(50) + colors.reset);
}

// 打印 Layer 标题
function printLayerHeader(layer, name) {
  console.log(`\n${colors.cyan}Layer ${layer}: ${name}${colors.reset}`);
}

// 打印步骤结果
function printStepResult(name, success, duration, extra = '') {
  const icon = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const status = success
    ? `${colors.green}[PASS]${colors.reset}`
    : `${colors.red}[FAIL]${colors.reset}`;
  const extraInfo = extra ? ` ${colors.dim}${extra}${colors.reset}` : '';
  console.log(`  ${icon} ${name.padEnd(25)} ${status} ${formatDuration(duration)}${extraInfo}`);
}

// 打印失败详情
function printFailureDetails(stderr) {
  if (stderr) {
    console.log(`${colors.red}  └─ Error Details:${colors.reset}`);
    const lines = stderr.split('\n').slice(0, 10);
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors.dim}     ${line}${colors.reset}`);
      }
    });
  }
}

// 主函数
async function main() {
  const totalStartTime = performance.now();
  const mode = isFullMode ? 'FULL' : 'STANDARD';

  console.log('\n');
  printSeparator();
  console.log(
    `${colors.bold}  Multi-Layer Test Defense System${colors.reset} ${colors.dim}[${mode} MODE]${colors.reset}`
  );
  printSeparator();

  const results = [];
  let hasFailure = false;

  for (const layer of steps) {
    printLayerHeader(layer.layer, layer.name);

    for (const step of layer.steps) {
      const result = await runCommand(step.cmd, step.args);
      results.push({ ...step, ...result, layer: layer.layer });

      printStepResult(step.name, result.success, result.duration);

      if (!result.success) {
        hasFailure = true;
        printFailureDetails(result.stderr);
        // 快速失败：遇到错误立即停止
        break;
      }
    }

    if (hasFailure) {
      break;
    }
  }

  const totalDuration = ((performance.now() - totalStartTime) / 1000).toFixed(1);

  console.log('\n');
  printSeparator();

  if (hasFailure) {
    console.log(`${colors.red}${colors.bold}✗ VERIFICATION FAILED - DO NOT COMMIT${colors.reset}`);
    console.log(`${colors.dim}  Fix the issues above and run again${colors.reset}`);
  } else {
    console.log(`${colors.green}${colors.bold}✓ ALL CHECKS PASSED - Safe to commit${colors.reset}`);
    console.log(`${colors.dim}  Total time: ${totalDuration}s${colors.reset}`);
  }

  printSeparator();
  console.log('\n');

  process.exit(hasFailure ? 1 : 0);
}

main().catch(err => {
  console.error(`${colors.red}Verification script error:${colors.reset}`, err);
  process.exit(1);
});
