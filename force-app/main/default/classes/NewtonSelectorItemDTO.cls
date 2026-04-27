/** @description Runtime option DTO returned to the Newton Selector Flow screen component. */
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

  /** @description Creates a selectable item with disabled defaulting to false. */
  public NewtonSelectorItemDTO() {
    this.disabled = false;
  }
}
