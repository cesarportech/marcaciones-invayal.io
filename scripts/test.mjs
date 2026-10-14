import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

const temporary = mkdtempSync(join(tmpdir(), 'invayal-tests-'))
try {
  for (const name of ['attendance', 'demo-store']) {
    const source = readFileSync(`lib/${name}.ts`, 'utf8')
    writeFileSync(join(temporary, `${name}.js`), ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText)
  }
  const require = createRequire(import.meta.url)
  const { businessDate, currentTimeHHMM, getStatus, getWorkedMinutes } = require(join(temporary, 'attendance.js'))
  const { initialData, parseData, punch } = require(join(temporary, 'demo-store.js'))
  const data = initialData('2026-10-14')
  const employee = data.employees[0]
  assert.deepEqual(parseData(JSON.stringify(data)), data)
  assert.throws(() => parseData('{"version":2}'))
  let records = punch([], employee, '2026-10-14', '08:10', 'in', false)
  assert.equal(getStatus(records[0]), 'on-time')
  assert.equal(getStatus({ ...records[0], clockIn: '08:11' }), 'late')
  assert.throws(() => punch(records, employee, '2026-10-14', '08:12', 'in', false))
  assert.throws(() => punch([], employee, '2026-10-14', '17:00', 'out', false))
  assert.throws(() => punch(records, employee, '2026-10-14', '07:00', 'out', false))
  assert.throws(() => punch([], { ...employee, active: false }, '2026-10-14', '08:00', 'in', false))
  assert.throws(() => punch([], employee, '2026-10-18', '08:00', 'in', true))
  records = punch(records, employee, '2026-10-14', '17:00', 'out', false)
  assert.equal(getWorkedMinutes(records[0]), 530)
  assert.throws(() => punch(records, employee, '2026-10-14', '17:01', 'out', false))
  assert.throws(() => parseData(JSON.stringify({ ...data, records: [records[0], records[0]] })))
  assert.equal(businessDate(new Date('2026-10-15T05:30:00Z')), '2026-10-14')
  assert.equal(currentTimeHHMM(new Date('2026-10-15T05:30:00Z')), '23:30')
  console.log('14 verificaciones correctas: persistencia, duplicados, secuencia, descanso, cuenta inactiva, tolerancia, duración y zona horaria.')
} finally { rmSync(temporary, { recursive: true, force: true }) }
