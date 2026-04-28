/** @description Describe/search service for Newton Selector Flow CPE data pickers. */
public with sharing class NewtonSelectorFlowCpeDescribeService {
  private static final Integer MAX_OBJECT_LOOKUP_ROWS = 80;
  private static final Integer MAX_FIELD_LOOKUP_ROWS = 2000;
  private static final Set<Schema.DisplayType> LOOKUP_FIELD_SKIP_TYPES = new Set<Schema.DisplayType>{
    Schema.DisplayType.BASE64,
    Schema.DisplayType.ADDRESS,
    Schema.DisplayType.LOCATION
  };
  private class FieldChoiceRequest {
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows;
    Schema.SObjectField fieldToken;
    String normalizedSearchKey;
    String canonicalObject;
  }

  /**
   * @description Finds accessible, queryable sObject types for Flow Builder search.
   * @param searchKey Optional API name or label search text.
   * @return Matching sObject choices capped for the CPE lookup.
   */
  public static List<NewtonSelectorFlowCpeController.ChoiceOption> searchSObjectTypes(
    String searchKey
  ) {
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows = new List<NewtonSelectorFlowCpeController.ChoiceOption>();
    String normalizedSearchKey = normalizeSearchKey(searchKey);

    for (Schema.SObjectType sObjectType : Schema.getGlobalDescribe().values()) {
      addSObjectChoice(rows, sObjectType, normalizedSearchKey);
    }

    rows.sort();
    return NewtonSelectorFlowCpeChoiceFactory.capChoiceList(
      rows,
      MAX_OBJECT_LOOKUP_ROWS
    );
  }

  /**
   * @description Finds accessible fields for the selected lookup dataset object.
   * @param objectApiName Source object API name.
   * @param searchKey Optional field API name or label search text.
   * @return Matching field choices capped for the CPE lookup.
   */
  public static List<NewtonSelectorFlowCpeController.ChoiceOption> searchLookupDatasetFieldsForObject(
    String objectApiName,
    String searchKey
  ) {
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows = new List<NewtonSelectorFlowCpeController.ChoiceOption>();
    Schema.SObjectType sObjectType = NewtonSelectorFlowCpeObjectResolver.resolveSObjectType(
      objectApiName
    );
    if (sObjectType == null) {
      return rows;
    }

    String normalizedSearchKey = normalizeSearchKey(searchKey);
    Schema.DescribeSObjectResult describe = NewtonSelectorFlowCpeObjectResolver.describeSObject(
      sObjectType
    );
    String canonicalObject = describe.getName();
    for (Schema.SObjectField fieldToken : describe.fields.getMap().values()) {
      FieldChoiceRequest request = new FieldChoiceRequest();
      request.rows = rows;
      request.fieldToken = fieldToken;
      request.normalizedSearchKey = normalizedSearchKey;
      request.canonicalObject = canonicalObject;
      addFieldChoice(request);
    }

    rows.sort();
    return NewtonSelectorFlowCpeChoiceFactory.capChoiceList(
      rows,
      MAX_FIELD_LOOKUP_ROWS
    );
  }

  /**
   * @description Describes accessible fields for a selected object.
   * @param objectName Source object API name.
   * @return Accessible field rows, including lookup relationship metadata when available.
   */
  public static List<NewtonSelectorFlowCpeController.Field> getObjectFields(
    String objectName
  ) {
    List<NewtonSelectorFlowCpeController.Field> fields = new List<NewtonSelectorFlowCpeController.Field>();
    Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
    if (sObjectType == null) {
      return fields;
    }

    Schema.DescribeSObjectResult describe = NewtonSelectorFlowCpeObjectResolver.describeSObject(
      sObjectType
    );
    if (!describe.isAccessible()) {
      return fields;
    }

    Map<String, Schema.SObjectField> tokenMap = describe.fields.getMap();
    for (String fieldName : tokenMap.keySet()) {
      addObjectField(fields, tokenMap.get(fieldName));
    }
    return fields;
  }

  private static void addSObjectChoice(
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows,
    Schema.SObjectType sObjectType,
    String normalizedSearchKey
  ) {
    Schema.DescribeSObjectResult describe = NewtonSelectorFlowCpeObjectResolver.describeSObject(
      sObjectType
    );
    if (!describe.isAccessible() || !describe.isQueryable()) {
      return;
    }

    String apiName = describe.getName();
    String label = describe.getLabel() == null ? apiName : describe.getLabel();
    if (!matchesSearch(apiName, label, normalizedSearchKey)) {
      return;
    }
    NewtonSelectorFlowCpeChoiceFactory.ChoiceRequest request = new NewtonSelectorFlowCpeChoiceFactory.ChoiceRequest();
    request.value = apiName;
    request.label = label;
    request.subtitle = apiName;
    request.icon = 'utility:sobject';
    request.sObjectType = apiName;
    rows.add(NewtonSelectorFlowCpeChoiceFactory.choice(request));
  }

  private static void addFieldChoice(FieldChoiceRequest request) {
    Schema.DescribeFieldResult fieldDescribe = request.fieldToken.getDescribe();
    if (!isLookupSelectableField(fieldDescribe)) {
      return;
    }

    String fieldName = fieldDescribe.getName();
    String label = fieldDescribe.getLabel();
    if (!matchesSearch(fieldName, label, request.normalizedSearchKey)) {
      return;
    }

    String fieldType = String.valueOf(fieldDescribe.getType());
    NewtonSelectorFlowCpeChoiceFactory.ChoiceRequest choiceRequest = new NewtonSelectorFlowCpeChoiceFactory.ChoiceRequest();
    choiceRequest.value = fieldName;
    choiceRequest.label = label;
    choiceRequest.subtitle = fieldName + ' - ' + fieldType;
    choiceRequest.icon = NewtonSelectorFlowCpeChoiceFactory.iconForFieldType(
      fieldType
    );
    choiceRequest.sObjectType = request.canonicalObject;
    request.rows.add(NewtonSelectorFlowCpeChoiceFactory.choice(choiceRequest));
  }

  private static void addObjectField(
    List<NewtonSelectorFlowCpeController.Field> fields,
    Schema.SObjectField fieldToken
  ) {
    Schema.DescribeFieldResult fieldDescribe = fieldToken.getDescribe();
    if (!fieldDescribe.isAccessible()) {
      return;
    }

    NewtonSelectorFlowCpeController.Field field = new NewtonSelectorFlowCpeController.Field(
      fieldDescribe.getName(),
      fieldDescribe.getLabel(),
      fieldDescribe.getType().name()
    );
    addReferenceMetadata(field, fieldDescribe);
    fields.add(field);
  }

  private static void addReferenceMetadata(
    NewtonSelectorFlowCpeController.Field field,
    Schema.DescribeFieldResult fieldDescribe
  ) {
    if (
      fieldDescribe.getReferenceTo() == null ||
      fieldDescribe.getReferenceTo().size() != 1
    ) {
      return;
    }
    field.parentObjectName = NewtonSelectorFlowCpeObjectResolver.describeSObject(
        fieldDescribe.getReferenceTo()[0]
      )
      .getName();
    field.relationshipName = fieldDescribe.getRelationshipName();
  }

  private static Boolean isLookupSelectableField(
    Schema.DescribeFieldResult fieldDescribe
  ) {
    return fieldDescribe.isAccessible() &&
      !LOOKUP_FIELD_SKIP_TYPES.contains(fieldDescribe.getType());
  }

  private static Boolean matchesSearch(
    String apiName,
    String label,
    String normalizedSearchKey
  ) {
    if (String.isBlank(normalizedSearchKey)) {
      return true;
    }
    return apiName.toLowerCase().contains(normalizedSearchKey) ||
      (label != null && label.toLowerCase().contains(normalizedSearchKey));
  }

  private static String normalizeSearchKey(String searchKey) {
    return searchKey == null ? '' : searchKey.trim().toLowerCase();
  }
}
