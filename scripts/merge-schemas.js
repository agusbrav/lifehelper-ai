#!/usr/bin/env node
// Merges per-module .prisma fragments into the core schema.
// Module fragments live at packages/modules/{id}/prisma/schema.prisma
// and must NOT include datasource or generator blocks.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreSchema = join(root, 'packages/core/prisma/schema.prisma')
const modulesDir = join(root, 'packages/modules')

const rawBase = readFileSync(coreSchema, 'utf8')
// Strip any previously merged fragments so the script is idempotent.
const fragmentMarkerIndex = rawBase.indexOf('\n// Fragment')
const base = fragmentMarkerIndex !== -1 ? rawBase.slice(0, fragmentMarkerIndex).trimEnd() + '\n' : rawBase

const fragments = readdirSync(modulesDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_'))
  .map(d => join(modulesDir, d.name, 'prisma', 'schema.prisma'))
  .filter(existsSync)
  .map(f => readFileSync(f, 'utf8'))

if (fragments.length === 0) {
  console.log('No module schema fragments found - core schema unchanged.')
  process.exit(0)
}

const merged = [base, ...fragments].join('\n\n')
writeFileSync(coreSchema, merged)
console.log(`Merged ${fragments.length} module schema(s) into core schema.`)
