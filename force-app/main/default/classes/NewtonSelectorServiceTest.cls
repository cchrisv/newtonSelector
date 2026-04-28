@IsTest
private class NewtonSelectorServiceTest {
  private static final Integer BULK_RECORD_COUNT = 251;

  @IsTest
  static void fetchItemsReturnsNormalizedDtos() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(5, 'Technology');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

      Test.startTest();
      List<NewtonSelectorItemDTO> dtos = NewtonSelectorService.fetchItems(
        config
      );
      Test.stopTest();

      Assert.areEqual(5, dtos.size(), 'Should return 5 items');
      for (NewtonSelectorItemDTO dto : dtos) {
        Assert.areNotEqual(null, dto.id, 'DTO should have an id');
        Assert.areNotEqual('', dto.label, 'DTO should have a label');
        Assert.areEqual(
          'Technology',
          dto.sublabel,
          'Sublabel should map to Industry'
        );
        Assert.areEqual(false, dto.disabled, 'Disabled defaults to false');
      }
    }
  }

  @IsTest
  static void fetchItemsRejectsNullConfig() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      Test.startTest();
      try {
        NewtonSelectorService.fetchItems(null);
        Assert.fail('Should have thrown for null config');
      } catch (NewtonSelectorException e) {
        Assert.isTrue(e.getMessage().contains('required'));
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void fetchItemsHandlesBulkMapping() {
    User testUser = NewtonSelectorTestDataFactory.createStandardUser();
    System.runAs(testUser) {
      NewtonSelectorTestDataFactory.createAccounts(BULK_RECORD_COUNT, 'Retail');
      NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
      config.whereClause = 'Industry = \'Retail\'';
      config.queryLimit = 500;

      Test.startTest();
      List<NewtonSelectorItemDTO> dtos = NewtonSelectorService.fetchItems(
        config
      );
      Test.stopTest();

      Assert.areEqual(
        BULK_RECORD_COUNT,
        dtos.size(),
        'Bulk mapping should handle all records'
      );
    }
  }
}
