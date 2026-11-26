#!/usr/bin/env node
/**
 * SUI.css Optional Tree-Shaking Purger & Arbitrary-Value JIT CLI (Zero Dependencies)
 * Usage:
 *   node bin/sui-cli.mjs --content "index.html,docs/index.html" --output dist/sui.purged.css
 *   npx sui-css --content "src/index.html" --output public/sui.css
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { content: [], input: 'dist/sui.min.css', output: 'dist/sui.purged.css' };
  for (let i = 2; i < argv.length; i += 1) {
    if ((argv[i] === '--content' || argv[i] === '-c') && argv[i + 1]) {
      args.content.push(...argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    } else if ((argv[i] === '--input' || argv[i] === '-i') && argv[i + 1]) {
      args.input = argv[++i];
    } else if ((argv[i] === '--output' || argv[i] === '-o') && argv[i + 1]) {
      args.output = argv[++i];
    }
  }
  if (args.content.length === 0) args.content = ['index.html', 'docs/index.html'];
  return args;
}

function escapeCssSelector(cls) {
  return cls.replace(/([:\[\]#\/.%(),])/g, '\\$1');
}

function generateArbitraryCss(tokens) {
  const propMap = {
    w: 'width',
    h: 'height',
    'min-w': 'min-width',
    'max-w': 'max-width',
    'min-h': 'min-height',
    'max-h': 'max-height',
    p: 'padding',
    px: 'padding-inline',
    py: 'padding-block',
    m: 'margin',
    mx: 'margin-inline',
    my: 'margin-block',
    gap: 'gap',
    bg: 'background-color',
    text: 'color',
    border: 'border-color',
    rounded: 'border-radius',
    'grid-cols': 'grid-template-columns',
    z: 'z-index'
  };

  const rules = [];
  for (const raw of tokens) {
    // Match optional state prefix (sui-hover:, sui-focus:, sui-active:, sui-dark:) + arbitrary value: sui-w-[342px]
    const m = raw.match(/^(?:(sui-hover|sui-focus|sui-active|sui-dark):)?sui-([a-z-]+)-\[([^\]]+)\]$/);
    if (!m) continue;
    const [, variant, propKey, rawVal] = m;
    const cssProp = propMap[propKey];
    if (!cssProp) continue;
    const cssVal = rawVal.replace(/_/g, ' ');
    const sel = `.${escapeCssSelector(raw)}`;
    if (variant === 'sui-hover') rules.push(`${sel}:hover{${cssProp}:${cssVal}}`);
    else if (variant === 'sui-focus') rules.push(`${sel}:focus{${cssProp}:${cssVal}}`);
    else if (variant === 'sui-active') rules.push(`${sel}:active{${cssProp}:${cssVal}}`);
    else if (variant === 'sui-dark') rules.push(`[data-theme="dark"] ${sel},[data-theme="oled"] ${sel}{${cssProp}:${cssVal}}`);
    else rules.push(`${sel}{${cssProp}:${cssVal}}`);
  }
  return rules.length > 0 ? `@layer utilities{${rules.join('')}}` : '';
}

function extractTokens(files) {
  const used = new Set();
  for (const file of files) {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const m of text.matchAll(/(?<![a-zA-Z0-9_-])((?:sui-(?:hover|focus|active|dark):)?sui-[a-zA-Z0-9_\-\[\]#\/.%(),]+)(?![a-zA-Z0-9_\-\[\]#\/.%():])/g)) {
      used.add(m[1]);
    }
  }
  return used;
}

// Lightweight top-level rule purger for @layer utilities while keeping reset/tokens/base/used components
function purgeCss(fullCss, usedTokens) {
  const utilIdx = fullCss.indexOf('@layer utilities{');
  if (utilIdx === -1) return fullCss;

  const head = fullCss.slice(0, utilIdx);
  const closeIdx = fullCss.lastIndexOf('}');
  const utilSection = fullCss.slice(utilIdx + '@layer utilities{'.length, closeIdx);

  // Split simple rules in utilities layer (preserving @media/@container blocks if any class inside is used)
  const kept = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < utilSection.length; i += 1) {
    const ch = utilSection[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const rule = utilSection.slice(start, i + 1);
        start = i + 1;
        const classes = [...rule.matchAll(/\.(sui-(?:\\.|[a-zA-Z0-9_-])+)/g)].map((m) => m[1].replace(/\\/g, ''));
        if (classes.length === 0 || classes.some((c) => usedTokens.has(c))) {
          kept.push(rule);
        }
      }
    }
  }

  const jit = generateArbitraryCss(usedTokens);
  return `${head}@layer utilities{${kept.join('')}}${jit}`;
}

const args = parseArgs(process.argv);
const fullCss = fs.readFileSync(path.resolve(process.cwd(), args.input), 'utf8');
const usedTokens = extractTokens(args.content);
const purged = purgeCss(fullCss, usedTokens);
fs.writeFileSync(path.resolve(process.cwd(), args.output), purged, 'utf8');

console.log(
  `SUI CLI: Scanned ${args.content.length} file(s) (${usedTokens.size} tokens) -> ` +
    `${fullCss.length} B => ${purged.length} B (${Math.round((1 - purged.length / fullCss.length) * 100)}% smaller) at ${args.output}`
);
