/**
 * Ticket Code Generation Helper
 *
 * Purpose: Centralize ticket code generation logic
 * Pattern: Adapted from TicketService.getNextCRNumber() and TestTicketBuilder.generateTicketCode()
 */

import { readdir } from 'node:fs/promises'

export class TicketCodeHelper {
  /**
   * Find next ticket number by scanning existing files
   * Pattern: Adapted from TicketService.getNextCRNumber() (lines 317-345)
   *
   * @param projectCode - Project code (e.g., "MDT")
   * @param ticketsDir - Directory containing ticket files
   * @returns Next ticket number to use
   */
  static async findNextNumber(
    projectCode: string,
    ticketsDir: string,
  ): Promise<number> {
    try {
      const allFiles = await readdir(ticketsDir)
      const crFiles = allFiles.filter(file => file.endsWith('.md'))
      let highestNumber = 0

      const regex = new RegExp(`^${projectCode}-(\\d+)`, 'i')
      for (const filename of crFiles) {
        const match = filename.match(regex)
        if (match) {
          const number = Number.parseInt(match[1], 10)
          if (!isNaN(number) && number > highestNumber) {
            highestNumber = number
          }
        }
      }

      return highestNumber + 1
    }
    catch {
      return 1
    }
  }

  /**
   * Generate ticket code with zero-padding
   * Pattern: From TestTicketBuilder.generateTicketCode() (lines 129-131)
   *
   * @param projectCode - Project code (e.g., "MDT")
   * @param number - Ticket number
   * @returns Formatted ticket code (e.g., "MDT-001")
   */
  static generateCode(projectCode: string, number: number): string {
    return `${projectCode}-${String(number).padStart(3, '0')}`
  }

  /**
   * Create URL-safe slug from title
   * Pattern: From TicketService.createSlug() (lines 493-501)
   *
   * @param title - Ticket title
   * @returns URL-safe slug
   */
  static createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }
}
