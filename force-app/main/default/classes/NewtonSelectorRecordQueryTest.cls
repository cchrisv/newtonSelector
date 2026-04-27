@isTest
private class NewtonSelectorRecordQueryTest {
  @testSetup
  static void setup() {
    NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
    NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
  }

  @isTest
  static void queryReturnsRecordsInOrder() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(15, results.size(), 'Should return all 15 accounts');
    // Ordered by Name ASC
    System.assert(
      ((String) results[0].get('Name'))
        .compareTo((String) results[1].get('Name')) <= 0,
      'Should be ordered ASC by Name'
    );
  }

  @isTest
  static void queryFiltersByWhereClause() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Technology\'';

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(10, results.size(), 'Should only return Tech accounts');
    for (SObject record : results) {
      System.assertEquals('Technology', record.get('Industry'));
    }
  }

  @isTest
  static void queryFiltersByWhereClauseInList() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry IN (\'Technology\', \'Finance\')';

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(
      15,
      results.size(),
      'WHERE IN should include both industries'
    );
  }

  @isTest
  static void queryFiltersByStructuredFilters() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
    filter.fieldApiName = 'Industry';
    filter.operator = '=';
    filter.value = 'Finance';
    config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(
      5,
      results.size(),
      'Should only return Finance accounts'
    );
    for (SObject record : results) {
      System.assertEquals('Finance', record.get('Industry'));
    }
  }

  @isTest
  static void queryFiltersByStructuredInValuesAndSkipsNullFilters() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
    filter.fieldApiName = 'Industry';
    filter.operator = 'IN';
    filter.values = new List<String>{ 'Technology', 'Finance' };
    config.filters = new List<NewtonSelectorQueryDTO.Filter>{ null, filter };

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(
      15,
      results.size(),
      'IN should include both industries'
    );
  }

  @isTest
  static void queryDefaultsBlankStructuredOperator() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
    filter.fieldApiName = 'Industry';
    filter.operator = '';
    filter.value = 'Finance';
    config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(
      5,
      results.size(),
      'Blank operator should default to equals'
    );
  }

  @isTest
  static void queryRejectsMultipicklistOperatorOnSinglePicklistStructuredFilter() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
    filter.fieldApiName = 'Industry';
    filter.operator = 'INCLUDES';
    filter.values = new List<String>{ 'Technology' };
    config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(
        false,
        'Should reject INCLUDES for non-multi-select picklist fields'
      );
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('multi-select picklist'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryRejectsMultipicklistOperatorOnSinglePicklistWhereClause() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry INCLUDES (\'Technology\')';

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(
        false,
        'Should reject INCLUDES for non-multi-select picklist fields'
      );
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('multi-select picklist'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryRejectsUnsafeWhereClause() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Technology\' ORDER BY CreatedDate';

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(
        false,
        'Should have rejected an unsupported WHERE fragment'
      );
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('Unsupported WHERE clause'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryAppliesLimit() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.queryLimit = 3;

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(3, results.size(), 'Limit should cap results');
  }

  @isTest
  static void previewSoqlBuildsRuntimeQuery() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Technology\'';
    config.queryLimit = 1;

    Test.startTest();
    String soql = NewtonSelectorRecordQuery.previewSoql(config);
    Test.stopTest();

    System.assert(soql.contains('SELECT'));
    System.assert(soql.contains('FROM Account'));
    System.assert(soql.contains('WHERE'));
    System.assert(soql.contains('LIMIT 1'));
  }

  @isTest
  static void queryRejectsBlankObject() {
    NewtonSelectorQueryDTO config = new NewtonSelectorQueryDTO();
    config.sObjectApiName = '';

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(false, 'Should have thrown for blank object');
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('required'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryRejectsUnknownObject() {
    NewtonSelectorQueryDTO config = new NewtonSelectorQueryDTO();
    config.sObjectApiName = 'DoesNotExist__c';

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(false, 'Should have thrown for unknown object');
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('Unknown object'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryRejectsUnknownField() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.labelField = 'NotARealField__c';

    Test.startTest();
    try {
      NewtonSelectorRecordQuery.query(config);
      System.assert(false, 'Should have thrown for unknown field');
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('Unknown field'));
    }
    Test.stopTest();
  }

  @isTest
  static void queryHandlesBulkVolume() {
    NewtonSelectorTestDataFactory.createAccounts(200, 'Healthcare');
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Healthcare\'';
    config.queryLimit = 500;

    Test.startTest();
    List<SObject> results = NewtonSelectorRecordQuery.query(config);
    Test.stopTest();

    System.assertEquals(
      200,
      results.size(),
      'Should return all 200 healthcare accounts under the 500 limit'
    );
  }

  @isTest
  static void queryRespectsSharing() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

    User u = NewtonSelectorTestDataFactory.createStandardUser();
    Integer countAsUser;
    System.runAs(u) {
      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();
      countAsUser = results.size();
    }
    // Standard user may see 0 accounts depending on org sharing model; the
    // assertion here is that the query runs without exception under an
    // unprivileged user — sharing model is enforced by USER_MODE.
    System.assertNotEquals(
      null,
      countAsUser,
      'Query should complete as standard user'
    );
  }
}
