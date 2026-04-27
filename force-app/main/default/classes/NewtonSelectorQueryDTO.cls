public class NewtonSelectorQueryDTO {
  @AuraEnabled
  public String sObjectApiName;
  @AuraEnabled
  public String whereClause;
  @AuraEnabled
  public List<Filter> filters;
  @AuraEnabled
  public String orderByField;
  @AuraEnabled
  public String orderByDirection;
  @AuraEnabled
  public Integer queryLimit;

  @AuraEnabled
  public String labelField;
  @AuraEnabled
  public String valueField;
  @AuraEnabled
  public String sublabelField;
  @AuraEnabled
  public String iconField;
  @AuraEnabled
  public String badgeField;
  @AuraEnabled
  public String helpField;

  public class Filter {
    @AuraEnabled
    public String fieldApiName;
    @AuraEnabled
    public String operator;
    @AuraEnabled
    public String value;
    @AuraEnabled
    public List<String> values;
  }

  public NewtonSelectorQueryDTO() {
    this.orderByDirection = 'ASC';
    this.queryLimit = 50;
    this.labelField = 'Name';
    this.valueField = 'Id';
  }
}
