@isTest
public class NewtonSelectorTestDataFactory {
  public static List<Account> createAccounts(Integer count) {
    return createAccounts(count, 'Technology');
  }

  public static List<Account> createAccounts(Integer count, String industry) {
    List<Account> accounts = new List<Account>();
    for (Integer i = 0; i < count; i++) {
      accounts.add(
        new Account(
          Name = 'Test Account ' + i,
          Industry = industry,
          AnnualRevenue = 1000000 + (i * 1000),
          NumberOfEmployees = 50 + i
        )
      );
    }
    insert accounts;
    return accounts;
  }

  public static User createStandardUser() {
    Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
    String uniq = String.valueOf(System.currentTimeMillis());
    User u = new User(
      FirstName = 'Newton',
      LastName = 'Test',
      Alias = 'newtont',
      Email = 'newton.test+' + uniq + '@example.com',
      Username = 'newton.test+' + uniq + '@example.com.newton',
      ProfileId = p.Id,
      TimeZoneSidKey = 'America/Los_Angeles',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US'
    );
    insert u;
    return u;
  }

  public static NewtonSelectorQueryDTO buildSimpleAccountConfig() {
    NewtonSelectorQueryDTO config = new NewtonSelectorQueryDTO();
    config.sObjectApiName = 'Account';
    config.labelField = 'Name';
    config.valueField = 'Id';
    config.sublabelField = 'Industry';
    config.orderByField = 'Name';
    config.orderByDirection = 'ASC';
    config.queryLimit = 50;
    return config;
  }
}
