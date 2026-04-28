@IsTest
private class NewtonSelectorRecordQueryTest {
  private static final Integer BULK_RECORD_COUNT = 251;

  @IsTest
  static void queryReturnsRecordsInOrder() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(15, results.size(), 'Should return all 15 accounts');
      Assert.isTrue(
        ((String) results[0].get('Name'))
          .compareTo((String) results[1].get('Name')) <= 0,
        'Should be ordered ASC by Name'
      );
    }
  }

  @IsTest
  static void queryFiltersByWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Technology\'';

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(10, results.size(), 'Should only return Tech accounts');
      for (SObject record : results) {
        Assert.areEqual('Technology', record.get('Industry'));
      }
    }
  }

  @IsTest
  static void queryFiltersByWhereClauseInList() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry IN (\'Technology\', \'Finance\')';

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(
        15,
        results.size(),
        'WHERE IN should include both industries'
      );
    }
  }

  @IsTest
  static void queryFiltersByStructuredFilters() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
      filter.fieldApiName = 'Industry';
      filter.operator = '=';
      filter.value = 'Finance';
      config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(5, results.size(), 'Should only return Finance accounts');
      for (SObject record : results) {
        Assert.areEqual('Finance', record.get('Industry'));
      }
    }
  }

  @IsTest
  static void queryFiltersByStructuredInValuesAndSkipsNullFilters() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
      filter.fieldApiName = 'Industry';
      filter.operator = 'IN';
      filter.values = new List<String>{ 'Technology', 'Finance' };
      config.filters = new List<NewtonSelectorQueryDTO.Filter>{ null, filter };

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(15, results.size(), 'IN should include both industries');
    }
  }

  @IsTest
  static void queryDefaultsBlankStructuredOperator() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorTestDataFactory.createAccounts(5, 'Finance');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
      filter.fieldApiName = 'Industry';
      filter.operator = '';
      filter.value = 'Finance';
      config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(
        5,
        results.size(),
        'Blank operator should default to equals'
      );
    }
  }

  @IsTest
  static void queryRejectsMultipicklistOperatorOnSinglePicklistStructuredFilter() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      NewtonSelectorQueryDTO.Filter filter = new NewtonSelectorQueryDTO.Filter();
      filter.fieldApiName = 'Industry';
      filter.operator = 'INCLUDES';
      filter.values = new List<String>{ 'Technology' };
      config.filters = new List<NewtonSelectorQueryDTO.Filter>{ filter };

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail(
          'Should reject INCLUDES for non-multi-select picklist fields'
        );
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('multi-select picklist'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryRejectsMultipicklistOperatorOnSinglePicklistWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry INCLUDES (\'Technology\')';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail(
          'Should reject INCLUDES for non-multi-select picklist fields'
        );
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('multi-select picklist'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryRejectsUnsafeWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Technology\' ORDER BY CreatedDate';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail('Should have rejected an unsupported WHERE fragment');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('Unsupported WHERE clause'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryParsesAdditionalComparisonOperators() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(2, 'Technology');
      List<String> whereClauses = new List<String>{
        'Name LIKE \'Test%\'',
        'NumberOfEmployees != 0',
        'NumberOfEmployees >= 50',
        'AnnualRevenue < 2000000',
        'AnnualRevenue <= 2000000',
        'AnnualRevenue > 0',
        'Industry NOT IN (\'Finance\')'
      };

      Test.startTest();
      for (String whereClause : whereClauses) {
        NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
        config.whereClause = whereClause;
        List<SObject> results = NewtonSelectorRecordQuery.query(config);
        Assert.areEqual(
          2,
          results.size(),
          'Expected two records for WHERE: ' + whereClause
        );
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryRejectsUnsupportedNotLikeWhereClause() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Name NOT LIKE \'Missing%\'';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail('Should reject NOT LIKE because SOQL does not support it');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('Unsupported WHERE operator'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryValueUtilCoercesPrimitiveFieldTypes() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      Object nullValue = NewtonSelectorQueryValueUtil.coerceValue(
        Account.Name.getDescribe(),
        'NULL'
      );
      Object booleanValue = NewtonSelectorQueryValueUtil.coerceValue(
        User.IsActive.getDescribe(),
        'true'
      );
      Object integerValue = NewtonSelectorQueryValueUtil.coerceValue(
        Account.NumberOfEmployees.getDescribe(),
        '42'
      );
      Object decimalValue = NewtonSelectorQueryValueUtil.coerceValue(
        Account.AnnualRevenue.getDescribe(),
        '123.45'
      );
      Object dateValue = NewtonSelectorQueryValueUtil.coerceValue(
        Task.ActivityDate.getDescribe(),
        '2026-04-27'
      );
      Object dateTimeValue = NewtonSelectorQueryValueUtil.coerceValue(
        Account.CreatedDate.getDescribe(),
        '2026-04-27 12:00:00'
      );
      Test.stopTest();

      Assert.areEqual(null, nullValue);
      Assert.areEqual(true, booleanValue);
      Assert.areEqual(42, integerValue);
      Assert.areEqual(Decimal.valueOf('123.45'), decimalValue);
      Assert.areEqual(Date.valueOf('2026-04-27'), dateValue);
      Assert.areEqual(Datetime.valueOf('2026-04-27 12:00:00'), dateTimeValue);
    }
  }

  @IsTest
  static void queryAppliesLimit() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(10, 'Technology');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.queryLimit = 3;

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(3, results.size(), 'Limit should cap results');
    }
  }

  @IsTest
  static void previewSoqlBuildsRuntimeQuery() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Technology\'';
      config.queryLimit = 1;

      Test.startTest();
      String soql = NewtonSelectorRecordQuery.previewSoql(config);
      Test.stopTest();

      Assert.isTrue(soql.contains('SELECT'));
      Assert.isTrue(soql.contains('FROM Account'));
      Assert.isTrue(soql.contains('WHERE'));
      Assert.isTrue(soql.contains('LIMIT 1'));
    }
  }

  @IsTest
  static void queryRejectsBlankObject() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = new NewtonSelectorQueryDTO();
      config.sObjectApiName = '';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail('Should have thrown for blank object');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('required'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryRejectsUnknownObject() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = new NewtonSelectorQueryDTO();
      config.sObjectApiName = 'DoesNotExist__c';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail('Should have thrown for unknown object');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('Unknown object'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryRejectsUnknownField() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.labelField = 'NotARealField__c';

      Test.startTest();
      try {
        NewtonSelectorRecordQuery.query(config);
        Assert.fail('Should have thrown for unknown field');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('Unknown field'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void queryHandlesBulkVolume() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(
        BULK_RECORD_COUNT,
        'Healthcare'
      );
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Healthcare\'';
      config.queryLimit = 500;

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(
        BULK_RECORD_COUNT,
        results.size(),
        'Should return all healthcare accounts under the 500 limit'
      );
    }
  }

  @IsTest
  static void queryRunsInUserModeForOwnedRecords() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(2, 'Technology');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

      Test.startTest();
      List<SObject> results = NewtonSelectorRecordQuery.query(config);
      Test.stopTest();

      Assert.areEqual(
        2,
        results.size(),
        'User-mode query should return records owned by the running user'
      );
    }
  }
}
