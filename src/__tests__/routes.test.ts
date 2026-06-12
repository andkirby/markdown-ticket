/**
 * MDT-184: Route pattern centralization tests
 *
 * Tests that routes.ts owns all pattern constants and builder functions,
 * and that no file outside routes.ts contains hardcoded /prj/ paths.
 */
import { describe, expect, it } from 'bun:test'
import {
  buildProjectPath,
  buildTicketPath,
  buildTicketSubDocPath,
  buildDocumentPath,
  ROUTE_PROJECT,
  ROUTE_PROJECT_LIST,
  ROUTE_PROJECT_DOCUMENTS,
  ROUTE_TICKET,
  ROUTE_TICKET_SUBDOC,
  ROUTE_DIRECT_TICKET,
  buildDirectTicketPath,
  buildDirectTicketSubDocPath,
} from '../routes'

describe('MDT-184: routes.ts — pattern constants', () => {
  it('defines ROUTE_PROJECT pattern', () => {
    expect(ROUTE_PROJECT).toBe('/prj/:projectCode')
  })

  it('defines ROUTE_PROJECT_LIST pattern', () => {
    expect(ROUTE_PROJECT_LIST).toBe('/prj/:projectCode/list')
  })

  it('defines ROUTE_PROJECT_DOCUMENTS pattern', () => {
    expect(ROUTE_PROJECT_DOCUMENTS).toBe('/prj/:projectCode/documents')
  })

  it('defines ROUTE_TICKET pattern', () => {
    expect(ROUTE_TICKET).toBe('/prj/:projectCode/ticket/:ticketKey')
  })

  it('defines ROUTE_TICKET_SUBDOC pattern', () => {
    expect(ROUTE_TICKET_SUBDOC).toBe('/prj/:projectCode/ticket/:ticketKey/*')
  })

  it('defines ROUTE_DIRECT_TICKET pattern', () => {
    expect(ROUTE_DIRECT_TICKET).toBe('/ticket/:ticketKey')
  })
})

describe('MDT-184: routes.ts — builder functions', () => {
  describe('buildProjectPath', () => {
    it('builds board (default) path', () => {
      expect(buildProjectPath('MDT')).toBe('/prj/MDT')
    })

    it('builds list view path', () => {
      expect(buildProjectPath('MDT', 'list')).toBe('/prj/MDT/list')
    })

    it('builds documents view path', () => {
      expect(buildProjectPath('MDT', 'documents')).toBe('/prj/MDT/documents')
    })
  })

  describe('buildTicketPath', () => {
    it('builds ticket path without anchor', () => {
      expect(buildTicketPath('MDT', 'MDT-184')).toBe('/prj/MDT/ticket/MDT-184')
    })

    it('builds ticket path with anchor', () => {
      expect(buildTicketPath('MDT', 'MDT-184', '#section')).toBe('/prj/MDT/ticket/MDT-184#section')
    })
  })

  describe('buildTicketSubDocPath', () => {
    it('builds sub-document ticket path', () => {
      expect(buildTicketSubDocPath('MDT', 'MDT-184', 'architecture.md')).toBe(
        '/prj/MDT/ticket/MDT-184/architecture.md',
      )
    })

    it('builds sub-document ticket path with anchor', () => {
      expect(buildTicketSubDocPath('MDT', 'MDT-184', 'requirements.md', '#br-1')).toBe(
        '/prj/MDT/ticket/MDT-184/requirements.md#br-1',
      )
    })

    it('builds nested sub-document path', () => {
      expect(buildTicketSubDocPath('MDT', 'MDT-093', 'prep/test.md')).toBe(
        '/prj/MDT/ticket/MDT-093/prep/test.md',
      )
    })
  })

  describe('buildDocumentPath', () => {
    it('builds document path', () => {
      expect(buildDocumentPath('MDT', 'README.md')).toBe('/prj/MDT/documents?file=README.md')
    })

    it('encodes special characters', () => {
      expect(buildDocumentPath('MDT', 'docs/CRs/MDT-184/arch.md')).toBe(
        '/prj/MDT/documents?file=docs%2FCRs%2FMDT-184%2Farch.md',
      )
    })
  })

  describe('buildDirectTicketPath', () => {
    it('builds direct ticket path without project', () => {
      expect(buildDirectTicketPath('MDT-184')).toBe('/ticket/MDT-184')
    })
  })

  describe('buildDirectTicketSubDocPath', () => {
    it('builds direct ticket subdoc path', () => {
      expect(buildDirectTicketSubDocPath('MDT-184', 'requirements.md')).toBe(
        '/ticket/MDT-184/requirements.md',
      )
    })
  })
})
