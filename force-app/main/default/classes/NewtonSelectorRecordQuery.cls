@SuppressWarnings(
  'PMD.CognitiveComplexity, PMD.CyclomaticComplexity, PMD.ExcessiveParameterList'
)
/** @description Safe SOQL builder and executor for Newton Selector runtime queries. */
public with sharing class NewtonSelectorRecordQuery {
  private static final Integer MAX_LIMIT = 2000;
  private static final Set<String> ALLOWED_DIRECTIONS = new Set<String>{
    'ASC',
    'DESC'
  };
  private static final Set<String> ALLOWED_OPERATORS = new Set<String>{
    '=',
    '!=',
    '<',
    '<=',
    '>',
    '>=',
    'LIKE',
    'NOT LIKE',
    'IN',
    'NOT IN',
    'INCLUDES',
    'EXCLUDES'
  };

  /**
   * @description Validates the config and executes the selector query in user mode.
   * @param config Selector query configuration.
   * @return Queried records.
   */
  public static List<SObject> query(NewtonSelectorQueryDTO config) {
    validateObject(config.sObjectApiName);
    List<String> fields = collectFields(config);
    validateFields(config.sObjectApiName, fields);

    QueryParts queryParts = buildSoql(config, fields);
    return Database.queryWithBinds(
      queryParts.soql,
      queryParts.binds,
      AccessLevel.USER_MODE
    );
  }

  /**
   * @description Builds validated preview SOQL without executing the caller's full result query.
   * @param config Selector query configuration.
   * @return Preview SOQL text.
   */
  public static String previewSoql(NewtonSelectorQueryDTO config) {
    validateObject(config.sObjectApiName);
    List<String> fields = collectFields(config);
    validateFields(config.sObjectApiName, fields);
    return buildSoql(config, fields).soql;
  }

  private class QueryParts {
    String soql;
    Map<String, Object> binds = new Map<String, Object>();
  }

  private static void validateObject(String apiName) {
    if (String.isBlank(apiName)) {
      throw new NewtonSelectorException('Object API name is required.');
    }
    Schema.SObjectType type = Schema.getGlobalDescribe().get(apiName);
    if (type == null) {
      throw new NewtonSelectorException('Unknown object: ' + apiName);
    }
    if (
      !type.getDescribe().isQueryable() || !type.getDescribe().isAccessible()
    ) {
      throw new NewtonSelectorException('Object not accessible: ' + apiName);
    }
  }

  private static List<String> collectFields(NewtonSelectorQueryDTO config) {
    Set<String> fieldSet = new Set<String>{ 'Id' };
    addIfPresent(fieldSet, config.labelField);
    addIfPresent(fieldSet, config.valueField);
    addIfPresent(fieldSet, config.sublabelField);
    addIfPresent(fieldSet, config.iconField);
    addIfPresent(fieldSet, config.badgeField);
    addIfPresent(fieldSet, config.helpField);
    addIfPresent(fieldSet, config.orderByField);
    return new List<String>(fieldSet);
  }

  private static void addIfPresent(Set<String> target, String value) {
    if (String.isNotBlank(value)) {
      target.add(value);
    }
  }

  private static void validateFields(String apiName, List<String> fields) {
    Schema.SObjectType type = Schema.getGlobalDescribe().get(apiName);
    Map<String, Schema.SObjectField> fieldMap = type.getDescribe()
      .fields.getMap();
    for (String f : fields) {
      String key = f.toLowerCase();
      Schema.SObjectField token = fieldMap.get(key);
      if (token == null) {
        throw new NewtonSelectorException(
          'Unknown field on ' + apiName + ': ' + f
        );
      }
      if (!token.getDescribe().isAccessible()) {
        throw new NewtonSelectorException(
          'Field not accessible on ' + apiName + ': ' + f
        );
      }
    }
  }

  private static QueryParts buildSoql(
    NewtonSelectorQueryDTO config,
    List<String> fields
  ) {
    QueryParts queryParts = new QueryParts();
    String selectClause = String.join(fields, ', ');
    String sObjectName = Schema.getGlobalDescribe()
      .get(config.sObjectApiName)
      .getDescribe()
      .getName();
    String soql = 'SELECT ' + selectClause + ' FROM ' + sObjectName;
    soql += buildWhere(config, queryParts.binds);
    soql += buildOrderBy(config);
    soql += buildLimit(config);
    queryParts.soql = soql;
    return queryParts;
  }

  private static String buildWhere(
    NewtonSelectorQueryDTO config,
    Map<String, Object> binds
  ) {
    List<String> clauses = new List<String>();
    if (config.filters != null && !config.filters.isEmpty()) {
      clauses.add(buildStructuredWhere(config, binds));
    }
    if (String.isNotBlank(config.whereClause)) {
      clauses.add(
        new LegacyWhereParser(config.sObjectApiName, config.whereClause, binds)
          .parse()
      );
    }
    if (clauses.isEmpty()) {
      return '';
    }
    return ' WHERE (' + String.join(clauses, ') AND (') + ')';
  }

  private static String buildStructuredWhere(
    NewtonSelectorQueryDTO config,
    Map<String, Object> binds
  ) {
    List<String> clauses = new List<String>();
    for (NewtonSelectorQueryDTO.Filter filter : config.filters) {
      if (filter == null) {
        continue;
      }
      String fieldApiName = canonicalFilterField(
        config.sObjectApiName,
        filter.fieldApiName
      );
      String operator = normalizeOperator(filter.operator);
      if (!ALLOWED_OPERATORS.contains(operator)) {
        throw new NewtonSelectorException(
          'Unsupported filter operator: ' + filter.operator
        );
      }
      List<String> rawValues = filter.values == null || filter.values.isEmpty()
        ? new List<String>{ filter.value }
        : filter.values;
      Schema.DescribeFieldResult fieldDescribe = getFieldDescribe(
        config.sObjectApiName,
        fieldApiName
      );
      if (isMultiPicklistOperator(operator)) {
        clauses.add(
          buildMultiPicklistPredicate(
            fieldApiName,
            operator,
            fieldDescribe,
            rawValues
          )
        );
      } else if (operator == 'IN' || operator == 'NOT IN') {
        List<String> bindNames = new List<String>();
        for (String rawValue : rawValues) {
          bindNames.add(addBind(binds, coerceValue(fieldDescribe, rawValue)));
        }
        clauses.add(
          fieldApiName +
            ' ' +
            operator +
            ' (' +
            String.join(bindNames, ', ') +
            ')'
        );
      } else {
        clauses.add(
          fieldApiName +
            ' ' +
            operator +
            ' ' +
            addBind(binds, coerceValue(fieldDescribe, rawValues[0]))
        );
      }
    }
    return String.join(clauses, ' AND ');
  }

  private static Boolean isMultiPicklistOperator(String operator) {
    return operator == 'INCLUDES' || operator == 'EXCLUDES';
  }

  private static String buildMultiPicklistPredicate(
    String fieldApiName,
    String operator,
    Schema.DescribeFieldResult fieldDescribe,
    List<String> rawValues
  ) {
    if (fieldDescribe.getType() != Schema.DisplayType.MULTIPICKLIST) {
      throw new NewtonSelectorException(
        operator + ' is only supported for multi-select picklist fields.'
      );
    }
    List<String> literals = new List<String>();
    for (String rawValue : rawValues) {
      if (String.isBlank(rawValue)) {
        continue;
      }
      literals.add(quoteSoqlStringLiteral(rawValue.trim()));
    }
    if (literals.isEmpty()) {
      throw new NewtonSelectorException(
        'At least one multi-select picklist value is required for ' +
          operator +
          '.'
      );
    }
    return fieldApiName +
      ' ' +
      operator +
      ' (' +
      String.join(literals, ', ') +
      ')';
  }

  private static String quoteSoqlStringLiteral(String value) {
    String escaped = value == null ? '' : value.replace('\\', '\\\\');
    return '\'' + String.escapeSingleQuotes(escaped) + '\'';
  }

  private static String buildOrderBy(NewtonSelectorQueryDTO config) {
    if (String.isBlank(config.orderByField)) {
      return '';
    }
    String direction = String.isBlank(config.orderByDirection)
      ? 'ASC'
      : config.orderByDirection.toUpperCase();
    if (!ALLOWED_DIRECTIONS.contains(direction)) {
      direction = 'ASC';
    }
    return ' ORDER BY ' +
      String.escapeSingleQuotes(config.orderByField) +
      ' ' +
      direction;
  }

  private static String buildLimit(NewtonSelectorQueryDTO config) {
    Integer effective = (config.queryLimit == null ||
      config.queryLimit <= 0)
      ? 50
      : config.queryLimit;
    if (effective > MAX_LIMIT) {
      effective = MAX_LIMIT;
    }
    return ' LIMIT ' + effective;
  }

  private static String canonicalFilterField(
    String objectApiName,
    String fieldApiName
  ) {
    Schema.DescribeFieldResult describe = getFieldDescribe(
      objectApiName,
      fieldApiName
    );
    if (!describe.isFilterable()) {
      throw new NewtonSelectorException(
        'Field not filterable on ' + objectApiName + ': ' + fieldApiName
      );
    }
    return describe.getName();
  }

  private static Schema.DescribeFieldResult getFieldDescribe(
    String objectApiName,
    String fieldApiName
  ) {
    if (String.isBlank(fieldApiName)) {
      throw new NewtonSelectorException('Filter field is required.');
    }
    Schema.SObjectType type = Schema.getGlobalDescribe().get(objectApiName);
    Map<String, Schema.SObjectField> fieldMap = type.getDescribe()
      .fields.getMap();
    Schema.SObjectField token = fieldMap.get(fieldApiName.toLowerCase());
    if (token == null) {
      throw new NewtonSelectorException(
        'Unknown field on ' + objectApiName + ': ' + fieldApiName
      );
    }
    Schema.DescribeFieldResult describe = token.getDescribe();
    if (!describe.isAccessible()) {
      throw new NewtonSelectorException(
        'Field not accessible on ' + objectApiName + ': ' + fieldApiName
      );
    }
    return describe;
  }

  private static String normalizeOperator(String operator) {
    return String.isBlank(operator)
      ? '='
      : operator.trim().replaceAll('\\s+', ' ').toUpperCase();
  }

  private static String addBind(Map<String, Object> binds, Object value) {
    String bindName = 'newtonBind' + binds.size();
    binds.put(bindName, value);
    return ':' + bindName;
  }

  private static Object coerceValue(
    Schema.DescribeFieldResult fieldDescribe,
    String rawValue
  ) {
    if (rawValue == null || rawValue.equalsIgnoreCase('NULL')) {
      return null;
    }
    Schema.DisplayType fieldType = fieldDescribe.getType();
    if (fieldType == Schema.DisplayType.BOOLEAN) {
      return rawValue.equalsIgnoreCase('TRUE');
    }
    if (fieldType == Schema.DisplayType.INTEGER) {
      return Integer.valueOf(rawValue);
    }
    if (fieldType == Schema.DisplayType.LONG) {
      return Long.valueOf(rawValue);
    }
    if (
      fieldType == Schema.DisplayType.DOUBLE ||
      fieldType == Schema.DisplayType.CURRENCY ||
      fieldType == Schema.DisplayType.PERCENT
    ) {
      return Decimal.valueOf(rawValue);
    }
    if (fieldType == Schema.DisplayType.DATE) {
      return Date.valueOf(rawValue);
    }
    if (fieldType == Schema.DisplayType.DATETIME) {
      return Datetime.valueOf(rawValue);
    }
    return rawValue;
  }

  private class LegacyWhereParser {
    private final String objectApiName;
    private final String input;
    private final Map<String, Object> binds;
    private Integer pos = 0;

    LegacyWhereParser(
      String objectApiName,
      String input,
      Map<String, Object> binds
    ) {
      this.objectApiName = objectApiName;
      this.input = input == null ? '' : input;
      this.binds = binds;
    }

    String parse() {
      String expression = parseOrExpression();
      skipWhitespace();
      if (pos != input.length()) {
        throw new NewtonSelectorException(
          'Unsupported WHERE clause near: ' + input.substring(pos)
        );
      }
      return expression;
    }

    private String parseOrExpression() {
      List<String> parts = new List<String>{ parseAndExpression() };
      while (matchKeyword('OR')) {
        parts.add(parseAndExpression());
      }
      return String.join(parts, ' OR ');
    }

    private String parseAndExpression() {
      List<String> parts = new List<String>{ parseFactor() };
      while (matchKeyword('AND')) {
        parts.add(parseFactor());
      }
      return String.join(parts, ' AND ');
    }

    private String parseFactor() {
      skipWhitespace();
      if (peek('(')) {
        pos++;
        String expression = parseOrExpression();
        skipWhitespace();
        expect(')');
        return '(' + expression + ')';
      }
      return parseCondition();
    }

    private String parseCondition() {
      String fieldApiName = canonicalFilterField(
        objectApiName,
        parseIdentifier()
      );
      String operator = parseOperator();
      Schema.DescribeFieldResult fieldDescribe = getFieldDescribe(
        objectApiName,
        fieldApiName
      );
      if (isMultiPicklistOperator(operator)) {
        skipWhitespace();
        expect('(');
        List<String> values = new List<String>();
        do {
          values.add(parseLiteral());
          skipWhitespace();
        } while (consume(','));
        expect(')');
        return buildMultiPicklistPredicate(
          fieldApiName,
          operator,
          fieldDescribe,
          values
        );
      }
      if (operator == 'IN' || operator == 'NOT IN') {
        skipWhitespace();
        expect('(');
        List<String> bindNames = new List<String>();
        do {
          bindNames.add(
            addBind(binds, coerceValue(fieldDescribe, parseLiteral()))
          );
          skipWhitespace();
        } while (consume(','));
        expect(')');
        return fieldApiName +
          ' ' +
          operator +
          ' (' +
          String.join(bindNames, ', ') +
          ')';
      }
      return fieldApiName +
        ' ' +
        operator +
        ' ' +
        addBind(binds, coerceValue(fieldDescribe, parseLiteral()));
    }

    private String parseIdentifier() {
      skipWhitespace();
      Integer start = pos;
      while (pos < input.length()) {
        String ch = input.substring(pos, pos + 1);
        if (!Pattern.matches('[A-Za-z0-9_]', ch)) {
          break;
        }
        pos++;
      }
      if (start == pos) {
        throw new NewtonSelectorException(
          'Expected field name in WHERE clause.'
        );
      }
      return input.substring(start, pos);
    }

    private String parseOperator() {
      skipWhitespace();
      if (matchKeyword('NOT')) {
        if (matchKeyword('LIKE')) {
          return 'NOT LIKE';
        }
        if (matchKeyword('IN')) {
          return 'NOT IN';
        }
        throw new NewtonSelectorException('Unsupported WHERE operator.');
      }
      if (matchKeyword('LIKE')) {
        return 'LIKE';
      }
      if (matchKeyword('IN')) {
        return 'IN';
      }
      if (matchKeyword('INCLUDES')) {
        return 'INCLUDES';
      }
      if (matchKeyword('EXCLUDES')) {
        return 'EXCLUDES';
      }
      if (consume('!')) {
        expect('=');
        return '!=';
      }
      if (consume('<')) {
        return consume('=') ? '<=' : '<';
      }
      if (consume('>')) {
        return consume('=') ? '>=' : '>';
      }
      if (consume('=')) {
        return '=';
      }
      throw new NewtonSelectorException('Expected WHERE operator.');
    }

    private String parseLiteral() {
      skipWhitespace();
      if (peek('\'')) {
        return parseQuotedString();
      }
      Integer start = pos;
      while (pos < input.length()) {
        String ch = input.substring(pos, pos + 1);
        if (Pattern.matches('[\\s,)]', ch)) {
          break;
        }
        pos++;
      }
      if (start == pos) {
        throw new NewtonSelectorException('Expected WHERE value.');
      }
      return input.substring(start, pos);
    }

    private String parseQuotedString() {
      expect('\'');
      String value = '';
      while (pos < input.length()) {
        String ch = input.substring(pos, pos + 1);
        pos++;
        if (ch == '\\' && pos < input.length()) {
          value += input.substring(pos, pos + 1);
          pos++;
        } else if (ch == '\'') {
          return value;
        } else {
          value += ch;
        }
      }
      throw new NewtonSelectorException('Unterminated string in WHERE clause.');
    }

    private Boolean matchKeyword(String keyword) {
      skipWhitespace();
      Integer endPos = pos + keyword.length();
      if (
        endPos > input.length() ||
        !input.substring(pos, endPos).equalsIgnoreCase(keyword)
      ) {
        return false;
      }
      if (
        endPos < input.length() &&
        Pattern.matches('[A-Za-z0-9_]', input.substring(endPos, endPos + 1))
      ) {
        return false;
      }
      pos = endPos;
      return true;
    }

    private void skipWhitespace() {
      while (
        pos < input.length() &&
        Pattern.matches('\\s', input.substring(pos, pos + 1))
      ) {
        pos++;
      }
    }

    private Boolean peek(String expected) {
      return pos < input.length() && input.substring(pos, pos + 1) == expected;
    }

    private Boolean consume(String expected) {
      skipWhitespace();
      if (!peek(expected)) {
        return false;
      }
      pos++;
      return true;
    }

    private void expect(String expected) {
      skipWhitespace();
      if (!peek(expected)) {
        throw new NewtonSelectorException(
          'Expected "' + expected + '" in WHERE clause.'
        );
      }
      pos++;
    }
  }
}
