/** @description Value coercion and predicate helpers for Newton Selector SOQL building. */
public with sharing class NewtonSelectorQueryValueUtil {
  /**
   * @description Returns true when the operator is for multi-select picklist matching.
   * @param operator Normalized SOQL operator.
   * @return True for INCLUDES and EXCLUDES.
   */
  public static Boolean isMultiPicklistOperator(String operator) {
    return operator == 'INCLUDES' || operator == 'EXCLUDES';
  }

  /**
   * @description Adds a named bind value to the bind map.
   * @param binds Bind map.
   * @param value Bind value.
   * @return SOQL bind token.
   */
  public static String addBind(Map<String, Object> binds, Object value) {
    String bindName = 'newtonBind' + binds.size();
    binds.put(bindName, value);
    return ':' + bindName;
  }

  /**
   * @description Converts a raw string into the field's Apex value type.
   * @param fieldDescribe Field describe for type selection.
   * @param rawValue Raw value from configuration.
   * @return Coerced Apex value.
   */
  public static Object coerceValue(
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
    if (isDecimalField(fieldType)) {
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

  private static Boolean isDecimalField(Schema.DisplayType fieldType) {
    return fieldType == Schema.DisplayType.DOUBLE ||
      fieldType == Schema.DisplayType.CURRENCY ||
      fieldType == Schema.DisplayType.PERCENT;
  }
}
