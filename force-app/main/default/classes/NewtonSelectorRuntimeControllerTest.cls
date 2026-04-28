@IsTest
private class NewtonSelectorRuntimeControllerTest {
  private static final Integer BULK_RECORD_COUNT = 251;

  @IsTest
  static void queryItemsSuccess() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(3, 'Technology');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      String configJson = JSON.serialize(config);

      Test.startTest();
      List<NewtonSelectorItemDTO> dtos = NewtonSelectorRuntimeController.queryItems(
        configJson
      );
      Test.stopTest();

      Assert.areEqual(3, dtos.size());
    }
  }

  @IsTest
  static void queryItemsRejectsBlankConfig() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      try {
        NewtonSelectorRuntimeController.queryItems('');
        Assert.fail('Should have thrown for blank config');
      } catch (AuraHandledException e) {
        Assert.isTrue(String.isNotBlank(e.getMessage()));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryItemsRejectsMalformedJson() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      try {
        NewtonSelectorRuntimeController.queryItems('{ not valid json');
        Assert.fail('Should have thrown for malformed JSON');
      } catch (AuraHandledException e) {
        Assert.isTrue(String.isNotBlank(e.getMessage()));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryItemsAppliesWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(3, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(2, 'Banking');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Technology\'';
      String configJson = JSON.serialize(config);

      Test.startTest();
      List<NewtonSelectorItemDTO> techOnly = NewtonSelectorRuntimeController.queryItems(
        configJson
      );
      Test.stopTest();

      Assert.areEqual(
        3,
        techOnly.size(),
        'WHERE should filter to Technology only'
      );
    }
  }

  @IsTest
  static void queryItemsBulk() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(BULK_RECORD_COUNT, 'Bulk');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Bulk\'';
      config.queryLimit = 500;
      String configJson = JSON.serialize(config);

      Test.startTest();
      List<NewtonSelectorItemDTO> dtos = NewtonSelectorRuntimeController.queryItems(
        configJson
      );
      Test.stopTest();

      Assert.areEqual(BULK_RECORD_COUNT, dtos.size());
    }
  }

  @IsTest
  static void validateQueryAcceptsValidConfig() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(1, 'Technology');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Technology\'';

      Test.startTest();
      NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
        JSON.serialize(config)
      );
      Test.stopTest();

      Assert.areEqual(true, result.valid);
      Assert.isTrue(result.soql.contains('FROM Account'));
      Assert.isTrue(result.soql.contains('LIMIT 1'));
    }
  }

  @IsTest
  static void validateQueryRejectsBadWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'DefinitelyMissing__c = \'Nope\'';

      Test.startTest();
      NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
        JSON.serialize(config)
      );
      Test.stopTest();

      Assert.areEqual(false, result.valid);
      Assert.isTrue(String.isNotBlank(result.message));
    }
  }

  @IsTest
  static void validateQueryRejectsBlankConfig() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
        ''
      );
      Test.stopTest();

      Assert.areEqual(false, result.valid);
      Assert.isTrue(result.message.contains('required'));
    }
  }

  @IsTest
  static void validateQueryRejectsMalformedJson() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
        '{ not valid json'
      );
      Test.stopTest();

      Assert.areEqual(false, result.valid);
      Assert.areEqual('Invalid selector configuration.', result.message);
    }
  }

  @IsTest
  static void validateQueryRejectsNullJson() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      NewtonSelectorQueryValidationResultDTO result = NewtonSelectorRuntimeController.validateQuery(
        'null'
      );
      Test.stopTest();

      Assert.areEqual(false, result.valid);
      Assert.isTrue(result.message.contains('required'));
    }
  }
}
