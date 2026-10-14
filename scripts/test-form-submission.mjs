import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from '@base-ui/react/button'

// Base UI deliberately defaults to type=button, unlike a plain HTML button.
assert.match(renderToStaticMarkup(React.createElement(Button, null, 'Guardar')), /type="button"/)
assert.match(renderToStaticMarkup(React.createElement(Button, { type: 'submit' }, 'Guardar')), /type="submit"/)

const source = ts.createSourceFile('connected-app.tsx', readFileSync('components/attendance/connected-app.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let forms = 0
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'form') {
    forms++
    let submitButtons = 0
    function inspect(child) {
      if ((ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) && child.tagName.getText(source) === 'Button') {
        const type = child.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === 'type')
        assert.ok(type?.initializer && ts.isStringLiteral(type.initializer), `A form button needs an explicit type at line ${source.getLineAndCharacterOfPosition(child.pos).line + 1}`)
        if (type.initializer.text === 'submit') submitButtons++
      }
      ts.forEachChild(child, inspect)
    }
    inspect(node)
    assert.equal(submitButtons, 1, 'Every form must have exactly one explicit submit button')
  }
  ts.forEachChild(node, visit)
}
visit(source)
assert.equal(forms, 4, 'Verify login, password, employee and correction forms')
console.log('PASS: all four forms have an explicit submit button; Base UI button behavior verified.')
