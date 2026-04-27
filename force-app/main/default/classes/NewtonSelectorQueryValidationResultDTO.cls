/** @description Validation result returned to the Flow CPE SOQL preview and query validator. */
public class NewtonSelectorQueryValidationResultDTO {
  @AuraEnabled
  public Boolean valid;
  @AuraEnabled
  public String message;
  @AuraEnabled
  public String soql;

  /**
   * @description Builds a successful validation response with preview SOQL.
   * @param message User-facing success message.
   * @param soql Preview SOQL generated from the selector config.
   * @return Successful validation result.
   */
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

  /**
   * @description Builds a failed validation response with a user-facing message.
   * @param message User-facing validation error.
   * @return Failed validation result.
   */
  public static NewtonSelectorQueryValidationResultDTO failure(String message) {
    NewtonSelectorQueryValidationResultDTO result = new NewtonSelectorQueryValidationResultDTO();
    result.valid = false;
    result.message = message;
    return result;
  }
}
