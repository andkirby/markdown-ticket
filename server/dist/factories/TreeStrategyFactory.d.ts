import { PathSelectionStrategy } from '../strategies/PathSelectionStrategy.js';
import { DocumentNavigationStrategy } from '../strategies/DocumentNavigationStrategy.js';
/**
 * Factory for creating tree building strategies
 */
export declare class TreeStrategyFactory {
    static createPathSelectionStrategy(): PathSelectionStrategy;
    static createDocumentNavigationStrategy(): DocumentNavigationStrategy;
}
