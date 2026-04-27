@IsTest
private class NewtonSelectorRuntimeControllerTest {
  @TestSetup
  static void setup() {
    NewtonSelectorTestDataFactory.createAccounts(3, 'Technology');
  }

  @IsTest
  static void queryItemsSuccess() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    String configJson = JSON.serialize(config);

    Test.startTest();
    List<NewtonSelectorItemDTO> dtos = NewtonSelectorRuntimeController.queryItems(
      configJson
    );
    Test.stopTest();

    System.assertEquals(3, dtos.size());
  }

  @IsTest
  static void queryItemsRejectsBlankConfig() {
    Test.startTest();
    try {
      NewtonSelectorRuntimeController.queryItems('');
      System.assert(false, 'Should have thrown for blank config');
    } catch (AuraHandledException e) {
      System.assert(true);
    }
    Test.stopTest();
  }

  @IsTest
  static void queryItemsRejectsMalformedJson() {
    Test.startTest();
    try {
      NewtonSelectorRuntimeController.queryItems('{ not valid json');
      System.assert(false, 'Should have thrown for malformed JSON');
    } catch (AuraHandledException e) {
      System.assert(true);
    }
    Test.stopTest();
  }

  @IsTest
  static void queryItemsAppliesWhereClause() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Technology\'';
    String configJson = JSON.serialize(config);

    NewtonSelectorTestDataFactory.createAccounts(2, 'Banking');

    Test.startTest();
    List<NewtonSelectorItemDTO> techOnly = NewtonSelectorRuntimeController.queryItems(
      configJson
    );
    Test.stopTest();

    System.assertEquals(
      3,
      techOnly.size(),
      'WHERE should filter to Technology only'
    );
  }

  @IsTest
  static void queryItemsBulk() {
    NewtonSelectorTestDataFactory.createAccounts(200, 'Bulk');
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Bulk\'';
    config.queryLimit = 500;
    String configJson = JSON.serialize(config);

    Test.startTest();
    List<NewtonSelectorItemDTO> dtos = NewtonSelectorRuntimeController.queryItems(
      configJson
    );
    Test.stopTest();

    System.assertEquals(200, dtos.size());
  }

  @IsTest
  static void validateQueryAcceptsValidConfig() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Technology\'';

    Test.startTest();
    NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
      JSON.serialize(config)
    );
    Test.stopTest();

    System.assertEquals(true, result.valid);
    System.assert(result.soql.contains('FROM Account'));
    System.assert(result.soql.contains('LIMIT 1'));
  }

  @IsTest
  static void validateQueryRejectsBadWhereClause() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'DefinitelyMissing__c = \'Nope\'';

    Test.startTest();
    NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
      JSON.serialize(config)
    );
    Test.stopTest();

    System.assertEquals(false, result.valid);
    System.assert(String.isNotBlank(result.message));
  }

  @IsTest
  static void validateQueryRejectsBlankConfig() {
    Test.startTest();
    NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
      ''
    );
    Test.stopTest();

    System.assertEquals(false, result.valid);
    System.assert(result.message.contains('required'));
  }

  @IsTest
  static void validateQueryRejectsMalformedJson() {
    Test.startTest();
    NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
      '{ not valid json'
    );
    Test.stopTest();

    System.assertEquals(false, result.valid);
    System.assertEquals('Invalid selector configuration.', result.message);
  }

  @IsTest
  static void validateQueryHandlesUnexpectedErrors() {
    Test.startTest();
    NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
      'null'
    );
    Test.stopTest();

    System.assertEquals(false, result.valid);
    System.assertEquals('Unable to validate this query.', result.message);
  }
}
