public class NewtonSelectorQueryValidationResultDTO {
  @AuraEnabled
  public Boolean valid;
  @AuraEnabled
  public String message;
  @AuraEnabled
  public String soql;

  public static NewtonSelectorQueryValidationResultDTO success(
    String message,
    String soql
  ) {
    NewtonSelectorQueryValidationResultDTO result = new NewtonSelectorQueryValidationResultDTO();
    result.valid = true;
    result.message = message;
    result.soql = soql;
    return result;
  }

  public static NewtonSelectorQueryValidationResultDTO failure(String message) {
    NewtonSelectorQueryValidationResultDTO result = new NewtonSelectorQueryValidationResultDTO();
    result.valid = false;
    result.message = message;
    return result;
  }
}
