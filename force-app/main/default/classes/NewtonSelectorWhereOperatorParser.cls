/** @description Parses SOQL operators from a Newton Selector WHERE scanner. */
public with sharing class NewtonSelectorWhereOperatorParser {
  /**
   * @description Parses a SOQL comparison operator.
   * @param scanner WHERE clause scanner.
   * @return Normalized operator.
   */
  public static String parse(NewtonSelectorWhereScanner scanner) {
    String keywordOperator = parseKeywordOperator(scanner);
    if (keywordOperator != null) {
      return keywordOperator;
    }
    return parseSymbolOperator(scanner);
  }

  private static String parseKeywordOperator(
    NewtonSelectorWhereScanner scanner
  ) {
    if (scanner.matchKeyword('NOT')) {
      return parseNotOperator(scanner);
    }
    if (scanner.matchKeyword('LIKE')) {
      return 'LIKE';
    }
    if (scanner.matchKeyword('IN')) {
      return 'IN';
    }
    if (scanner.matchKeyword('INCLUDES')) {
      return 'INCLUDES';
    }
    if (scanner.matchKeyword('EXCLUDES')) {
      return 'EXCLUDES';
    }
    return null;
  }

  private static String parseNotOperator(NewtonSelectorWhereScanner scanner) {
    if (scanner.matchKeyword('IN')) {
      return 'NOT IN';
    }
    throw new NewtonSelectorException('Unsupported WHERE operator.');
  }

  private static String parseSymbolOperator(
    NewtonSelectorWhereScanner scanner
  ) {
    if (scanner.consume('!')) {
      scanner.expect('=');
      return '!=';
    }
    if (scanner.consume('<')) {
      return scanner.consume('=') ? '<=' : '<';
    }
    if (scanner.consume('>')) {
      return scanner.consume('=') ? '>=' : '>';
    }
    if (scanner.consume('=')) {
      return '=';
    }
    throw new NewtonSelectorException('Expected WHERE operator.');
  }
}
