import { PathSelectionStrategy } from '../strategies/PathSelectionStrategy.js';
import { DocumentNavigationStrategy } from '../strategies/DocumentNavigationStrategy.js';

/**
 * Factory for creating tree building strategies
 */
export class TreeStrategyFactory {
  static createPathSelectionStrategy() {
    return new PathSelectionStrategy();
  }

  static createDocumentNavigationStrategy() {
    return new DocumentNavigationStrategy();
  }
}
