import { LightningElement, api } from "lwc";

export default class NewtonDefaultPropertyExample extends LightningElement {
  @api label = "Default Property Editor Example";
  @api recordId = "";
  @api configurationJson = "";
  @api helpText = "This component intentionally has no Custom Property Editor.";
  @api required = false;
  @api pageSize = 10;
}
