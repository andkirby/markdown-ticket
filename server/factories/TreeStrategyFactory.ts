import { DocumentNavigationStrategy } from '../strategies/DocumentNavigationStrategy.js'
import { PathSelectionStrategy } from '../strategies/PathSelectionStrategy.js'

/**
 * Factory for creating tree building strategies.
 */
export class TreeStrategyFactory {
  static createPathSelectionStrategy(): PathSelectionStrategy {
    return new PathSelectionStrategy()
  }

  static createDocumentNavigationStrategy(): DocumentNavigationStrategy {
    return new DocumentNavigationStrategy()
  }
}
