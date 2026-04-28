/** @description Field and object access validation for Newton Selector query building. */
public with sharing class NewtonSelectorQueryFieldAccess {
  /**
   * @description Validates the configured source object.
   * @param apiName Source object API name.
   */
  public static void validateObject(String apiName) {
    if (String.isBlank(apiName)) {
      throw new NewtonSelectorException('Object API name is required.');
    }

    Schema.SObjectType type = Schema.getGlobalDescribe().get(apiName);
    if (type == null) {
      throw new NewtonSelectorException('Unknown object: ' + apiName);
    }

    Schema.DescribeSObjectResult describe = describeSObject(type);
    if (!describe.isQueryable() || !describe.isAccessible()) {
      throw new NewtonSelectorException('Object not accessible: ' + apiName);
    }
  }

  /**
   * @description Collects every field needed by runtime mapping and sorting.
   * @param config Selector query configuration.
   * @return Field API names to query.
   */
  public static List<String> collectFields(NewtonSelectorQueryDTO config) {
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

  /**
   * @description Validates read access for every query field.
   * @param apiName Source object API name.
   * @param fields Field API names.
   */
  public static void validateFields(String apiName, List<String> fields) {
    Schema.SObjectType type = Schema.getGlobalDescribe().get(apiName);
    Map<String, Schema.SObjectField> fieldMap = describeSObject(type)
      .fields.getMap();
    for (String fieldApiName : fields) {
      validateReadableField(apiName, fieldApiName, fieldMap);
    }
  }

  /**
   * @description Resolves a filter field to its canonical API name and validates filter access.
   * @param objectApiName Source object API name.
   * @param fieldApiName Filter field API name.
   * @return Canonical field API name.
   */
  public static String canonicalFilterField(
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

  /**
   * @description Resolves and validates a field describe for runtime querying.
   * @param objectApiName Source object API name.
   * @param fieldApiName Field API name.
   * @return Field describe result.
   */
  public static Schema.DescribeFieldResult getFieldDescribe(
    String objectApiName,
    String fieldApiName
  ) {
    if (String.isBlank(fieldApiName)) {
      throw new NewtonSelectorException('Filter field is required.');
    }

    Schema.SObjectType type = Schema.getGlobalDescribe().get(objectApiName);
    Map<String, Schema.SObjectField> fieldMap = describeSObject(type)
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

  /**
   * @description Gets a deferred object describe to avoid eager child relationship loading.
   * @param type SObject type token.
   * @return Deferred describe result.
   */
  public static Schema.DescribeSObjectResult describeSObject(
    Schema.SObjectType type
  ) {
    return type.getDescribe(SObjectDescribeOptions.DEFERRED);
  }

  private static void addIfPresent(Set<String> target, String value) {
    if (String.isNotBlank(value)) {
      target.add(value);
    }
  }

  private static void validateReadableField(
    String apiName,
    String fieldApiName,
    Map<String, Schema.SObjectField> fieldMap
  ) {
    Schema.SObjectField token = fieldMap.get(fieldApiName.toLowerCase());
    if (token == null) {
      throw new NewtonSelectorException(
        'Unknown field on ' + apiName + ': ' + fieldApiName
      );
    }
    if (!token.getDescribe().isAccessible()) {
      throw new NewtonSelectorException(
        'Field not accessible on ' + apiName + ': ' + fieldApiName
      );
    }
  }
}
