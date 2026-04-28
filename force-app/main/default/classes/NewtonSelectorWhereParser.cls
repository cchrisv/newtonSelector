/** @description Parses legacy text WHERE clauses into validated bind-based SOQL fragments. */
public with sharing class NewtonSelectorWhereParser {
  private final String objectApiName;
  private final Map<String, Object> binds;
  private final NewtonSelectorWhereScanner scanner;

  /**
   * @description Creates a parser for one legacy WHERE clause.
   * @param objectApiName Source object API name.
   * @param input Legacy WHERE clause without the WHERE keyword.
   * @param binds Shared query bind map.
   */
  public NewtonSelectorWhereParser(
    String objectApiName,
    String input,
    Map<String, Object> binds
  ) {
    this.objectApiName = objectApiName;
    this.binds = binds;
    this.scanner = new NewtonSelectorWhereScanner(input);
  }

  /**
   * @description Parses the configured WHERE clause.
   * @return Validated SOQL predicate fragment.
   */
  public String parse() {
    String expression = parseOrExpression();
    if (!scanner.isAtEnd()) {
      throw new NewtonSelectorException(
        'Unsupported WHERE clause near: ' + scanner.remaining()
      );
    }
    return expression;
  }

  private String parseOrExpression() {
    List<String> parts = new List<String>{ parseAndExpression() };
    while (scanner.matchKeyword('OR')) {
      parts.add(parseAndExpression());
    }
    return String.join(parts, ' OR ');
  }

  private String parseAndExpression() {
    List<String> parts = new List<String>{ parseFactor() };
    while (scanner.matchKeyword('AND')) {
      parts.add(parseFactor());
    }
    return String.join(parts, ' AND ');
  }

  private String parseFactor() {
    if (scanner.peek('(')) {
      scanner.consume('(');
      String expression = parseOrExpression();
      scanner.expect(')');
      return '(' + expression + ')';
    }
    return parseCondition();
  }

  private String parseCondition() {
    String fieldApiName = NewtonSelectorQueryFieldAccess.canonicalFilterField(
      objectApiName,
      scanner.parseIdentifier()
    );
    String operator = NewtonSelectorWhereOperatorParser.parse(scanner);
    Schema.DescribeFieldResult fieldDescribe = NewtonSelectorQueryFieldAccess.getFieldDescribe(
      objectApiName,
      fieldApiName
    );
    return buildCondition(fieldApiName, operator, fieldDescribe);
  }

  private String buildCondition(
    String fieldApiName,
    String operator,
    Schema.DescribeFieldResult fieldDescribe
  ) {
    if (NewtonSelectorQueryValueUtil.isMultiPicklistOperator(operator)) {
      return parseMultiPicklistCondition(fieldApiName, operator, fieldDescribe);
    }
    if (operator == 'IN' || operator == 'NOT IN') {
      return parseInCondition(fieldApiName, operator, fieldDescribe);
    }
    return fieldApiName +
      ' ' +
      operator +
      ' ' +
      NewtonSelectorQueryValueUtil.addBind(
        binds,
        NewtonSelectorQueryValueUtil.coerceValue(
          fieldDescribe,
          scanner.parseLiteral()
        )
      );
  }

  private String parseMultiPicklistCondition(
    String fieldApiName,
    String operator,
    Schema.DescribeFieldResult fieldDescribe
  ) {
    NewtonSelectorQueryPredicateBuilder.MultiPicklistPredicateRequest request = new NewtonSelectorQueryPredicateBuilder.MultiPicklistPredicateRequest();
    request.fieldApiName = fieldApiName;
    request.operator = operator;
    request.fieldDescribe = fieldDescribe;
    request.rawValues = scanner.parseListLiterals();
    return NewtonSelectorQueryPredicateBuilder.buildMultiPicklistPredicate(
      request
    );
  }

  private String parseInCondition(
    String fieldApiName,
    String operator,
    Schema.DescribeFieldResult fieldDescribe
  ) {
    List<String> bindNames = new List<String>();
    for (String rawValue : scanner.parseListLiterals()) {
      bindNames.add(
        NewtonSelectorQueryValueUtil.addBind(
          binds,
          NewtonSelectorQueryValueUtil.coerceValue(fieldDescribe, rawValue)
        )
      );
    }
    return fieldApiName +
      ' ' +
      operator +
      ' (' +
      String.join(bindNames, ', ') +
      ')';
  }
}
