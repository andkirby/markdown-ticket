import { describe, expect, it } from 'bun:test'
import { classifyLink, LinkType } from './linkProcessor'

describe('MDT-265 link classification', () => {
  for (const key of ['TP0-042', 'TP0-10000', 'AB123-99999', 'CR-A001']) {
    const project = key.split('-')[0]
    it(`classifies relative and absolute links for ${key} with anchors`, () => {
      expect(classifyLink(`${key}.md#intro`, project)).toMatchObject({
        type: LinkType.TICKET,
        ticketKey: key,
        projectCode: project,
        anchor: '#intro',
        href: `/prj/${project}/ticket/${key}#intro`,
      })
      expect(classifyLink(`/prj/${project}/ticket/${key}#intro`, project)).toMatchObject({
        type: LinkType.TICKET,
        ticketKey: key,
        projectCode: project,
        anchor: '#intro',
      })
    })
    it(`preserves subdocument capture layout for ${key}`, () => {
      for (const documentPath of ['part/plan.md', 'preview.html']) {
        expect(classifyLink(`/prj/${project}/ticket/${key}/${documentPath}#intro`, project)).toMatchObject({
          type: LinkType.DOCUMENT,
          ticketKey: key,
          projectCode: project,
          documentPath,
          anchor: '#intro',
        })
        expect(classifyLink(`/prj/${project}/ticket/${key}/${documentPath}#intro`, 'ZZ').type)
          .toBe(LinkType.CROSS_PROJECT)
      }
    })
  }

  for (const key of ['TP0-12', 'TP0-100000', 'TOOLONG-042', '1TP-042', 'tp0-042', 'TP0-042x', 'X-10000']) {
    it(`does not classify ${key} as a ticket`, () => {
      expect(classifyLink(key, 'TP0').type).toBe(LinkType.UNKNOWN)
      expect(classifyLink(`/prj/TP0/ticket/${key}`, 'TP0').type).toBe(LinkType.UNKNOWN)
    })
  }
})
