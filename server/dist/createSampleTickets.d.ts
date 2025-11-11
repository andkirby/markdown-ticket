#!/usr/bin/env node
export interface SampleTicket {
    filename: string;
    content: string;
}
export declare const SAMPLE_TICKETS: SampleTicket[];
declare function createSampleTickets(): Promise<void>;
export { createSampleTickets };
