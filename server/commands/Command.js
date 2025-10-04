/**
 * Base command interface
 */
export class Command {
  /**
   * Execute the command
   * @param {...any} args - Command arguments
   * @returns {Promise<any>} Command result
   */
  async execute(...args) {
    throw new Error('execute must be implemented by command');
  }
}
