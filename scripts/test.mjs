import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

// Prueba las funciones puras que usa la app conectada. Las reglas de marcación viven en SQL (invayal_clock).
const temporary = mkdtempSync(join(tmpdir(), 'invayal-tests-'))
try {
  const source = readFileSync('lib/attendance.ts', 'utf8')
  writeFileSync(join(temporary, 'attendance.js'), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)
  const require = createRequire(import.meta.url)
  const { businessDate, currentTimeHHMM, getStatus, getWorkedMinutes, formatDuration } = require(join(temporary, 'attendance.js'))
  const record = { id: 'r1', employeeId: 'e1', date: '2026-10-14', clockIn: '08:10', clockOut: null, scheduledStart: '08:00', toleranceMinutes: 10 }
  assert.equal(getStatus(record), 'on-time')
  assert.equal(getStatus({ ...record, clockIn: '08:11' }), 'late')
  assert.equal(getStatus({ ...record, clockIn: '08:20', toleranceMinutes: 20 }), 'on-time')
  assert.equal(getStatus({ ...record, clockIn: null }), 'absent')
  assert.equal(getWorkedMinutes(record), null)
  assert.equal(getWorkedMinutes({ ...record, clockOut: '17:00' }), 530)
  assert.equal(formatDuration(530), '8h 50m')
  assert.equal(businessDate(new Date('2026-10-15T05:30:00Z')), '2026-10-14')
  assert.equal(currentTimeHHMM(new Date('2026-10-15T05:30:00Z')), '23:30')
  console.log('9 verificaciones correctas: tolerancia, ausencia, duración y zona horaria.')
} finally { rmSync(temporary, { recursive: true, force: true }) }
