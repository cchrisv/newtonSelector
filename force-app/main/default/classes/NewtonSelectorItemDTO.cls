public class NewtonSelectorItemDTO {
  @AuraEnabled
  public String id;
  @AuraEnabled
  public String label;
  @AuraEnabled
  public String sublabel;
  @AuraEnabled
  public String icon;
  @AuraEnabled
  public String badge;
  @AuraEnabled
  public String helpText;
  @AuraEnabled
  public String value;
  @AuraEnabled
  public Boolean disabled;

  public NewtonSelectorItemDTO() {
    this.disabled = false;
  }
}
