/** @description Query configuration used by the Newton Selector runtime Apex service. */
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

  /** @description Structured WHERE-clause filter supplied by the Flow CPE. */
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

  /** @description Applies runtime defaults for order, limit, label, and value fields. */
  public NewtonSelectorQueryDTO() {
    this.orderByDirection = 'ASC';
    this.queryLimit = 50;
    this.labelField = 'Name';
    this.valueField = 'Id';
  }
}
