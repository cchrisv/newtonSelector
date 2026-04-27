/** @description AuraEnabled runtime and query-validation controller for the Flow screen LWC. */
public with sharing class NewtonSelectorRuntimeController {
  /**
   * @description Queries runtime selector items from a serialized NewtonSelectorQueryDTO.
   * @param configJson Serialized NewtonSelectorQueryDTO.
   * @return Runtime selector item DTOs.
   */
  @AuraEnabled(cacheable=true)
  public static List<NewtonSelectorItemDTO> queryItems(String configJson) {
    try {
      if (String.isBlank(configJson)) {
        throw new NewtonSelectorException(
          'Selector configuration is required.'
        );
      }
      NewtonSelectorQueryDTO config = (NewtonSelectorQueryDTO) JSON.deserialize(
        configJson,
        NewtonSelectorQueryDTO.class
      );
      return NewtonSelectorService.fetchItems(config);
    } catch (NewtonSelectorException e) {
      throw new AuraHandledException(e.getMessage());
    } catch (System.JSONException e) {
      throw new AuraHandledException('Invalid selector configuration.');
    } catch (Exception e) {
      throw new AuraHandledException('Unable to load selector options.');
    }
  }

  /**
   * @description Validates a serialized query configuration and returns preview SOQL.
   * @param configJson Serialized NewtonSelectorQueryDTO.
   * @return Validation result with status, message, and optional preview SOQL.
   */
  @AuraEnabled(cacheable=false)
  public static NewtonSelectorQueryValidationResultDTO validateQuery(
    String configJson
  ) {
    try {
      if (String.isBlank(configJson)) {
        throw new NewtonSelectorException(
          'Selector configuration is required.'
        );
      }
      NewtonSelectorQueryDTO config = (NewtonSelectorQueryDTO) JSON.deserialize(
        configJson,
        NewtonSelectorQueryDTO.class
      );
      config.queryLimit = 1;
      String soql = NewtonSelectorRecordQuery.previewSoql(config);
      NewtonSelectorService.fetchItems(config);
      return NewtonSelectorQueryValidationResultDTO.success(
        'Query validated successfully.',
        soql
      );
    } catch (NewtonSelectorException e) {
      return NewtonSelectorQueryValidationResultDTO.failure(e.getMessage());
    } catch (System.JSONException e) {
      return NewtonSelectorQueryValidationResultDTO.failure(
        'Invalid selector configuration.'
      );
    } catch (Exception e) {
      return NewtonSelectorQueryValidationResultDTO.failure(
        'Unable to validate this query.'
      );
    }
  }
}
