/**
 * Base command interface
 */
export declare abstract class Command {
    /**
     * Execute the command
     * @param args - Command arguments
     * @returns Command result
     */
    abstract execute(...args: unknown[]): Promise<unknown>;
}
