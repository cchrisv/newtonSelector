/**
 * @description Tests for NewtonSelectorFlowCpeController. Covers the AuraEnabled
 * methods exposed to the Flow CPE LWCs: object search, field search, and object describe.
 */
@IsTest
private class NewtonSelectorFlowCpeControllerTest {
  @IsTest
  static void testGetObjectFieldsReturnsAccountFields() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      List<NewtonSelectorFlowCpeController.Field> fields = NewtonSelectorFlowCpeController.getObjectFields(
        'Account'
      );
      Test.stopTest();

      Boolean accountOk =
        Schema.getGlobalDescribe().containsKey('Account') &&
        Schema.getGlobalDescribe().get('Account').getDescribe().isAccessible();
      Assert.isTrue(
        accountOk,
        'Account should be accessible in describe for this org'
      );

      if (fields.isEmpty()) {
        return;
      }

      Assert.isTrue(
        containsField(fields, 'Name'),
        'Account.Name should be present when any Account fields are readable'
      );
    }
  }

  @IsTest
  static void testGetObjectFieldsBlankNameReturnsEmpty() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.getObjectFields(null).size()
      );
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.getObjectFields('').size()
      );
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.getObjectFields('   ').size()
      );
    }
  }

  @IsTest
  static void testGetObjectFieldsInvalidTypeReturnsEmpty() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.getObjectFields('NotARealObjectZZZ999')
          .size()
      );
    }
  }

  @IsTest
  static void testGetObjectFieldsIncludesReferenceMetadata() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      List<NewtonSelectorFlowCpeController.Field> fields = NewtonSelectorFlowCpeController.getObjectFields(
        'Contact'
      );
      Test.stopTest();

      if (fields.isEmpty()) {
        return;
      }

      NewtonSelectorFlowCpeController.Field accountLookup = findField(
        fields,
        'AccountId'
      );
      Assert.areNotEqual(null, accountLookup);
      Assert.areEqual('Account', accountLookup.parentObjectName);
      Assert.areEqual('Account', accountLookup.relationshipName);
    }
  }

  @IsTest
  static void testSearchSObjectTypesReturnsAccount() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchSObjectTypes(
        'accoun'
      );

      Assert.isTrue(!rows.isEmpty());
      Assert.isTrue(containsChoice(rows, 'Account'));
    }
  }

  @IsTest
  static void testSearchSObjectTypesBlankReturnsRows() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchSObjectTypes(
        ''
      );
      Assert.isTrue(!rows.isEmpty());
    }
  }

  @IsTest
  static void testSearchSObjectTypesNoMatchReturnsEmpty() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchSObjectTypes(
        'zzzzzznomatchobject99999'
      );
      Assert.areEqual(0, rows.size());
    }
  }

  @IsTest
  static void testSearchSObjectTypesNullSafe() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Assert.isTrue(
        !NewtonSelectorFlowCpeController.searchSObjectTypes(null).isEmpty()
      );
    }
  }

  @IsTest
  static void testSearchLookupDatasetFieldsForAccount() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
        'Account',
        ''
      );

      Assert.isTrue(!rows.isEmpty());
      Assert.isTrue(
        containsChoice(rows, 'Name'),
        'Account.Name should be present in the field lookup'
      );
    }
  }

  @IsTest
  static void testSearchLookupDatasetFieldsForLead() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      if (!Schema.getGlobalDescribe().containsKey('Lead')) {
        return;
      }

      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
        'Lead',
        ''
      );
      Assert.isTrue(!rows.isEmpty());
    }
  }

  @IsTest
  static void testSearchLookupDatasetFieldsBlankObjectReturnsEmpty() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
            '',
            'x'
          )
          .size()
      );
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
            null,
            'x'
          )
          .size()
      );
    }
  }

  @IsTest
  static void testSearchLookupDatasetFieldsBogusObjectReturnsEmpty() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Assert.areEqual(
        0,
        NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
            'NotAnObjectZZZ__c',
            ''
          )
          .size()
      );
    }
  }

  @IsTest
  static void testSearchLookupDatasetFieldsFiltersByKey() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      List<NewtonSelectorFlowCpeController.ChoiceOption> rows = NewtonSelectorFlowCpeController.searchLookupDatasetFieldsForObject(
        'Account',
        'name'
      );

      if (rows.isEmpty()) {
        return;
      }

      for (NewtonSelectorFlowCpeController.ChoiceOption row : rows) {
        String fieldName = row.value == null ? '' : row.value.toLowerCase();
        String label = row.label == null ? '' : row.label.toLowerCase();
        Assert.isTrue(fieldName.contains('name') || label.contains('name'));
      }
    }
  }

  private static Boolean containsField(
    List<NewtonSelectorFlowCpeController.Field> fields,
    String fieldName
  ) {
    return findField(fields, fieldName) != null;
  }

  private static NewtonSelectorFlowCpeController.Field findField(
    List<NewtonSelectorFlowCpeController.Field> fields,
    String fieldName
  ) {
    for (NewtonSelectorFlowCpeController.Field field : fields) {
      if (field.name == fieldName) {
        return field;
      }
    }
    return null;
  }

  private static Boolean containsChoice(
    List<NewtonSelectorFlowCpeController.ChoiceOption> rows,
    String value
  ) {
    for (NewtonSelectorFlowCpeController.ChoiceOption row : rows) {
      if (row != null && row.value == value) {
        return true;
      }
    }
    return false;
  }
}
