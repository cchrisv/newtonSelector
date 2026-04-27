@isTest
private class NewtonSelectorServiceTest {
  @testSetup
  static void setup() {
    NewtonSelectorTestDataFactory.createAccounts(5, 'Technology');
  }

  @isTest
  static void fetchItemsReturnsNormalizedDtos() {
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();

    Test.startTest();
    List<NewtonSelectorItemDTO> dtos = NewtonSelectorService.fetchItems(config);
    Test.stopTest();

    System.assertEquals(5, dtos.size(), 'Should return 5 items');
    for (NewtonSelectorItemDTO dto : dtos) {
      System.assertNotEquals(null, dto.id, 'DTO should have an id');
      System.assertNotEquals('', dto.label, 'DTO should have a label');
      System.assertEquals(
        'Technology',
        dto.sublabel,
        'Sublabel should map to Industry'
      );
      System.assertEquals(false, dto.disabled, 'Disabled defaults to false');
    }
  }

  @isTest
  static void fetchItemsRejectsNullConfig() {
    Test.startTest();
    try {
      NewtonSelectorService.fetchItems(null);
      System.assert(false, 'Should have thrown for null config');
    } catch (NewtonSelectorException e) {
      System.assert(e.getMessage().contains('required'));
    }
    Test.stopTest();
  }

  @isTest
  static void fetchItemsHandlesBulkMapping() {
    NewtonSelectorTestDataFactory.createAccounts(195, 'Retail');
    NewtonSelectorQueryDTO config = NewtonSelectorTestDataFactory.buildSimpleAccountConfig();
    config.whereClause = 'Industry = \'Retail\'';
    config.queryLimit = 500;

    Test.startTest();
    List<NewtonSelectorItemDTO> dtos = NewtonSelectorService.fetchItems(config);
    Test.stopTest();

    System.assertEquals(
      195,
      dtos.size(),
      'Bulk mapping should handle all records'
    );
  }
}
