/**
 * Self-check for attrResolver (ponytail: one runnable check for non-trivial logic).
 * Run: bun test shared/services/ticket/attrResolver.test.ts
 */
import { expect, test } from 'bun:test'
import { resolveAttrValue, resolvePriorityToken, resolveStatusToken } from './attrResolver.js'

// column-label aliases → primary status
test('status: column aliases map to primary status', () => {
  expect(resolveStatusToken('done')).toBe('Implemented')
  expect(resolveStatusToken('open')).toBe('Approved')
  expect(resolveStatusToken('backlog')).toBe('Proposed')
  expect(resolveStatusToken('deferred')).toBe('On Hold')
})

test('status: alternatives + canonical passthrough', () => {
  expect(resolveStatusToken('complete')).toBe('Implemented')
  expect(resolveStatusToken('d')).toBe('Implemented')
  expect(resolveStatusToken('partial')).toBe('Partially Implemented')
  expect(resolveStatusToken('Implemented')).toBe('Implemented')
  expect(resolveStatusToken('IN-PROGRESS')).toBe('In Progress')
})

test('status: unknown token rejected with valid set', () => {
  expect(() => resolveStatusToken('Dne')).toThrow(/Valid: Proposed/)
  expect(() => resolveStatusToken('Complete2')).toThrow(/Invalid status/)
})

test('priority: aliases + canonical', () => {
  expect(resolvePriorityToken('p1')).toBe('Critical')
  expect(resolvePriorityToken('p4')).toBe('Low')
  expect(resolvePriorityToken('High')).toBe('High')
  expect(() => resolvePriorityToken('Urgent')).toThrow(/Valid: Low/)
})

test('resolveAttrValue: non-enum fields pass through untouched', () => {
  expect(resolveAttrValue('assignee', '@alice')).toBe('@alice')
  expect(resolveAttrValue('impl-notes', 'anything goes')).toBe('anything goes')
})
