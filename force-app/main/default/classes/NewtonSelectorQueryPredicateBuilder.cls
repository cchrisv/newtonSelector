/** @description Builds validated structured filter predicates for Newton Selector queries. */
public with sharing class NewtonSelectorQueryPredicateBuilder {
  private static final Set<String> ALLOWED_OPERATORS = new Set<String>{
    '=',
    '!=',
    '<',
    '<=',
    '>',
    '>=',
    'LIKE',
    'IN',
    'NOT IN',
    'INCLUDES',
    'EXCLUDES'
  };

  /** @description Request data for a multi-select picklist predicate. */
  public class MultiPicklistPredicateRequest {
    /** @description Canonical field API name. */
    public String fieldApiName;
    /** @description INCLUDES or EXCLUDES. */
    public String operator;
    /** @description Field describe for type validation. */
    public Schema.DescribeFieldResult fieldDescribe;
    /** @description Raw configured values. */
    public List<String> rawValues;
  }

  /** @description Predicate construction request. */
  private class PredicateRequest {
    String fieldApiName;
    String operator;
    Schema.DescribeFieldResult fieldDescribe;
    List<String> rawValues;
    Map<String, Object> binds;
  }

  /**
   * @description Builds the structured-filter WHERE fragment.
   * @param config Selector query configuration.
   * @param binds Shared bind map.
   * @return WHERE fragment without the WHERE keyword.
   */
  public static String buildStructuredWhere(
    NewtonSelectorQueryDTO config,
    Map<String, Object> binds
  ) {
    if (config.filters == null || config.filters.isEmpty()) {
      return '';
    }

    List<String> clauses = new List<String>();
    for (NewtonSelectorQueryDTO.Filter filter : config.filters) {
      String clause = buildStructuredPredicate(
        config.sObjectApiName,
        filter,
        binds
      );
      if (String.isNotBlank(clause)) {
        clauses.add(clause);
      }
    }
    return String.join(clauses, ' AND ');
  }

  /**
   * @description Builds an INCLUDES or EXCLUDES predicate after validating the field type.
   * @param request Multi-select predicate request.
   * @return Validated predicate text.
   */
  public static String buildMultiPicklistPredicate(
    MultiPicklistPredicateRequest request
  ) {
    if (request.fieldDescribe.getType() != Schema.DisplayType.MULTIPICKLIST) {
      throw new NewtonSelectorException(
        request.operator +
        ' is only supported for multi-select picklist fields.'
      );
    }

    List<String> literals = new List<String>();
    for (String rawValue : request.rawValues) {
      if (String.isNotBlank(rawValue)) {
        literals.add(quoteSoqlStringLiteral(rawValue.trim()));
      }
    }

    if (literals.isEmpty()) {
      throw new NewtonSelectorException(
        'At least one multi-select picklist value is required for ' +
          request.operator +
          '.'
      );
    }

    return request.fieldApiName +
      ' ' +
      request.operator +
      ' (' +
      String.join(literals, ', ') +
      ')';
  }

  private static String buildStructuredPredicate(
    String objectApiName,
    NewtonSelectorQueryDTO.Filter filter,
    Map<String, Object> binds
  ) {
    if (filter == null) {
      return '';
    }

    PredicateRequest request = new PredicateRequest();
    request.fieldApiName = NewtonSelectorQueryFieldAccess.canonicalFilterField(
      objectApiName,
      filter.fieldApiName
    );
    request.operator = normalizeOperator(filter.operator);
    validateOperator(request.operator, filter.operator);
    request.rawValues = getFilterValues(filter);
    request.fieldDescribe = NewtonSelectorQueryFieldAccess.getFieldDescribe(
      objectApiName,
      request.fieldApiName
    );
    request.binds = binds;
    return buildPredicate(request);
  }

  private static String buildPredicate(PredicateRequest request) {
    if (
      NewtonSelectorQueryValueUtil.isMultiPicklistOperator(request.operator)
    ) {
      return buildMultiPicklistPredicate(request);
    }
    if (request.operator == 'IN' || request.operator == 'NOT IN') {
      return buildInPredicate(request);
    }
    return request.fieldApiName +
      ' ' +
      request.operator +
      ' ' +
      NewtonSelectorQueryValueUtil.addBind(
        request.binds,
        NewtonSelectorQueryValueUtil.coerceValue(
          request.fieldDescribe,
          request.rawValues[0]
        )
      );
  }

  private static String buildMultiPicklistPredicate(PredicateRequest request) {
    MultiPicklistPredicateRequest multiRequest = new MultiPicklistPredicateRequest();
    multiRequest.fieldApiName = request.fieldApiName;
    multiRequest.operator = request.operator;
    multiRequest.fieldDescribe = request.fieldDescribe;
    multiRequest.rawValues = request.rawValues;
    return buildMultiPicklistPredicate(multiRequest);
  }

  private static String buildInPredicate(PredicateRequest request) {
    List<String> bindNames = new List<String>();
    for (String rawValue : request.rawValues) {
      bindNames.add(
        NewtonSelectorQueryValueUtil.addBind(
          request.binds,
          NewtonSelectorQueryValueUtil.coerceValue(
            request.fieldDescribe,
            rawValue
          )
        )
      );
    }
    return request.fieldApiName +
      ' ' +
      request.operator +
      ' (' +
      String.join(bindNames, ', ') +
      ')';
  }

  private static void validateOperator(
    String operator,
    String configuredOperator
  ) {
    if (!ALLOWED_OPERATORS.contains(operator)) {
      throw new NewtonSelectorException(
        'Unsupported filter operator: ' + configuredOperator
      );
    }
  }

  private static List<String> getFilterValues(
    NewtonSelectorQueryDTO.Filter filter
  ) {
    return filter.values == null || filter.values.isEmpty()
      ? new List<String>{ filter.value }
      : filter.values;
  }

  private static String normalizeOperator(String operator) {
    return String.isBlank(operator)
      ? '='
      : operator.trim().replaceAll('\\s+', ' ').toUpperCase();
  }

  private static String quoteSoqlStringLiteral(String value) {
    String escaped = value == null ? '' : value.replace('\\', '\\\\');
    return '\'' + String.escapeSingleQuotes(escaped) + '\'';
  }
}
