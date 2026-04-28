/** @description Builds validated SOQL text and bind values for Newton Selector runtime queries. */
public with sharing class NewtonSelectorQueryBuilder {
  private static final Integer DEFAULT_LIMIT = 50;
  private static final Integer MAX_LIMIT = 2000;
  private static final Set<String> ALLOWED_DIRECTIONS = new Set<String>{
    'ASC',
    'DESC'
  };

  /** @description Validated SOQL plus bind values ready for Database.queryWithBinds. */
  public class QueryParts {
    /** @description SOQL statement. */
    public String soql;
    /** @description Named bind values referenced by the SOQL statement. */
    public Map<String, Object> binds = new Map<String, Object>();
  }

  /**
   * @description Builds validated SOQL and named bind values from a selector config.
   * @param config Selector query configuration.
   * @return Validated SOQL and bind values.
   */
  public static QueryParts build(NewtonSelectorQueryDTO config) {
    validateConfig(config);
    NewtonSelectorQueryFieldAccess.validateObject(config.sObjectApiName);
    List<String> fields = NewtonSelectorQueryFieldAccess.collectFields(config);
    NewtonSelectorQueryFieldAccess.validateFields(
      config.sObjectApiName,
      fields
    );
    return buildSoql(config, fields);
  }

  private static void validateConfig(NewtonSelectorQueryDTO config) {
    if (config == null) {
      throw new NewtonSelectorException('Query configuration is required.');
    }
  }

  private static QueryParts buildSoql(
    NewtonSelectorQueryDTO config,
    List<String> fields
  ) {
    QueryParts queryParts = new QueryParts();
    String sObjectName = Schema.getGlobalDescribe()
      .get(config.sObjectApiName)
      .getDescribe(SObjectDescribeOptions.DEFERRED)
      .getName();

    queryParts.soql =
      'SELECT ' +
      String.join(fields, ', ') +
      ' FROM ' +
      sObjectName +
      buildWhere(config, queryParts.binds) +
      buildOrderBy(config) +
      buildLimit(config);
    return queryParts;
  }

  private static String buildWhere(
    NewtonSelectorQueryDTO config,
    Map<String, Object> binds
  ) {
    List<String> clauses = new List<String>();
    String structuredWhere = NewtonSelectorQueryPredicateBuilder.buildStructuredWhere(
      config,
      binds
    );
    if (String.isNotBlank(structuredWhere)) {
      clauses.add(structuredWhere);
    }
    if (String.isNotBlank(config.whereClause)) {
      clauses.add(
        new NewtonSelectorWhereParser(
            config.sObjectApiName,
            config.whereClause,
            binds
          )
          .parse()
      );
    }
    return clauses.isEmpty()
      ? ''
      : ' WHERE (' + String.join(clauses, ') AND (') + ')';
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
      ? DEFAULT_LIMIT
      : config.queryLimit;
    if (effective > MAX_LIMIT) {
      effective = MAX_LIMIT;
    }
    return ' LIMIT ' + effective;
  }
}
