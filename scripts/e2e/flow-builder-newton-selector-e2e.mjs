import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const TARGET_ORG = process.env.SF_TARGET_ORG || "cchrisv944";
const FLOW_API_NAME = "Newton_Selector_E2E";
const FLOW_LABEL = "Newton Selector E2E";
const SCREEN_LABEL = "Newton Selector E2E Screen";
const RUN_ID =
  process.env.NEWTON_E2E_RUN_ID ||
  new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const COMPANY = `NewtonE2ECompany${RUN_ID}`;
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== "false";
const SF_COMMAND = process.platform === "win32" ? "sf.cmd" : "sf";
const FLOW_SOURCE_DIR = resolve("force-app", "main", "default", "flows");
const FLOW_SOURCE_FILE = join(
  FLOW_SOURCE_DIR,
  `${FLOW_API_NAME}.flow-meta.xml`
);
const ARTIFACT_DIR = resolve(
  "output",
  "playwright",
  "flow-builder-newton-selector-e2e",
  RUN_ID
);

const screenshots = {
  builderLoaded: join(ARTIFACT_DIR, "01-builder-loaded.png"),
  screenEditor: join(ARTIFACT_DIR, "02-screen-editor.png"),
  modal: join(ARTIFACT_DIR, "03-config-modal.png"),
  invalidModal: join(ARTIFACT_DIR, "03a-invalid-config-modal.png"),
  afterSave: join(ARTIFACT_DIR, "04-builder-after-save.png"),
  debugRuntime: join(ARTIFACT_DIR, "05-debug-runtime.png"),
  done: join(ARTIFACT_DIR, "06-debug-done.png")
};
const diagnosticsPath = join(ARTIFACT_DIR, "diagnostics.json");

const temporaryLeadIds = [];
const diagnosticPages = new WeakSet();
const diagnostics = {
  console: [],
  pageErrors: [],
  requestFailures: []
};
let originalFlowSource = "";
let originalFlowSourceExisted = false;

function runSf(args) {
  const output = execFileSync(SF_COMMAND, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  return parseFirstJson(output);
}

function parseFirstJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    if (start < 0) {
      throw new Error(`Salesforce CLI did not return JSON: ${raw}`);
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < raw.length; i += 1) {
      const ch = raw[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(raw.slice(start, i + 1));
        }
      }
    }
    throw new Error(`Could not parse Salesforce CLI JSON: ${raw}`);
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isProductDiagnosticText(text) {
  return /newton|professor flow|Newton selector|custom_selector|newtonselectorflowscreen|Newton_Selector|c-newton|TypeError|ReferenceError|Unhandled|Cannot read|undefined is not|is not a function/i.test(
    text || ""
  );
}

function attachDiagnosticsToPage(page) {
  if (!page || diagnosticPages.has(page)) return;
  diagnosticPages.add(page);

  page.on("console", (message) => {
    if (
      message.type() !== "error" &&
      !isProductDiagnosticText(message.text())
    ) {
      return;
    }
    diagnostics.console.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
      url: page.url()
    });
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push({
      message: error?.message || String(error),
      stack: error?.stack || "",
      url: page.url()
    });
  });
  page.on("requestfailed", (request) => {
    diagnostics.requestFailures.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || ""
    });
  });
}

function attachDiagnosticsToContext(context) {
  context.on("page", attachDiagnosticsToPage);
}

function actionableDiagnostics() {
  const consoleErrors = diagnostics.console.filter(
    (entry) => entry.type === "error" && isProductDiagnosticText(entry.text)
  );
  const pageErrors = diagnostics.pageErrors.filter((entry) =>
    isProductDiagnosticText(`${entry.message}\n${entry.stack}`)
  );
  const requestFailures = diagnostics.requestFailures.filter(
    (entry) =>
      /newton|Newton_Selector|flowruntime|flowbuilder/i.test(entry.url) &&
      !/ERR_ABORTED|aborted|cancelled|canceled/i.test(entry.failure)
  );
  return { consoleErrors, pageErrors, requestFailures };
}

function writeDiagnostics() {
  writeFileSync(
    diagnosticsPath,
    JSON.stringify(
      { ...diagnostics, actionable: actionableDiagnostics() },
      null,
      2
    ),
    "utf8"
  );
}

function assertNoActionableBrowserDiagnostics() {
  const actionable = actionableDiagnostics();
  const total =
    actionable.consoleErrors.length +
    actionable.pageErrors.length +
    actionable.requestFailures.length;
  if (!total) return;
  throw new Error(
    `Browser diagnostics found ${total} selector-relevant issue(s). See ${diagnosticsPath}`
  );
}

async function assertPageText(context, pattern, label, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const text = await context
      .locator("body")
      .innerText({ timeout: 5000 })
      .catch(() => "");
    if (pattern.test(text)) {
      return text;
    }
    await context.waitForTimeout(1000);
  }
  const finalText = await context
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  throw new Error(
    `${label} did not appear. Expected ${pattern}. Body starts with: ${finalText.slice(
      0,
      1200
    )}`
  );
}

async function dismissTransientUi(page) {
  for (const name of ["Skip", "Got It", "Got it", "Close"]) {
    const button = page.getByRole("button", { name }).first();
    if (
      (await button.count()) &&
      (await button.isVisible().catch(() => false))
    ) {
      await button.click({ timeout: 2000 }).catch(() => {});
    }
  }
}

function defaultConfig(overrides = {}) {
  return {
    dataSource: "custom",
    layout: "grid",
    selectionMode: "single",
    autoAdvance: false,
    enableSearch: true,
    showSelectAll: false,
    minSelections: 0,
    maxSelections: null,
    required: false,
    customErrorMessage: "Select an E2E option.",
    label: "",
    helpText: "",
    fieldLevelHelp: "",
    emptyStateMessage: "No E2E options available.",
    errorStateMessage: "Could not load E2E options.",
    picklist: {
      objectApiName: "",
      fieldApiName: "",
      recordTypeId: "",
      valueSource: "apiName"
    },
    collection: {
      fieldMap: {
        label: "",
        sublabel: "",
        icon: "",
        value: "",
        badge: "",
        helpText: ""
      }
    },
    sobject: {
      sObjectApiName: "",
      whereClause: "",
      orderByField: "CreatedDate",
      orderByDirection: "DESC",
      limit: 10,
      labelField: "LastName",
      valueField: "Id",
      sublabelField: "Company",
      iconField: "",
      badgeField: "Rating",
      helpField: ""
    },
    custom: { items: [] },
    includeNoneOption: false,
    noneOptionLabel: "--None--",
    noneOptionPosition: "start",
    overrides: {},
    display: { sortBy: "none", sortDirection: "asc", limit: null },
    gridConfig: {
      minWidth: "16rem",
      gapH: "7",
      gapV: "7",
      margin: {
        top: "none",
        right: "none",
        bottom: "none",
        left: "none",
        linked: true
      },
      padding: { top: "", right: "", bottom: "", left: "", linked: true },
      size: "medium",
      aspectRatio: "1:1",
      badge: {
        position: "bottom-inline",
        variant: "neutral",
        shape: "pill",
        variantHex: ""
      },
      columns: null,
      selectionIndicator: "checkmark",
      elevation: "outlined",
      pattern: "none",
      patternTone: "neutral",
      patternHoverTone: "",
      patternSelectedTone: "brand",
      patternDisabledTone: "neutral",
      cornerStyle: "none",
      cornerTone: "neutral",
      surfaceStyle: "solid",
      surfaceTone: "neutral",
      surfaceHoverTone: "",
      surfaceSelectedTone: "brand",
      surfaceDisabledTone: "neutral",
      iconDecor: "none",
      iconStyle: "filled",
      iconShading: "flat",
      iconTone: "neutral",
      iconToneHex: "",
      iconGlyphTone: "auto",
      iconGlyphToneHex: "",
      patternToneHex: "",
      patternHoverToneHex: "",
      patternSelectedToneHex: "",
      patternDisabledToneHex: "",
      cornerToneHex: "",
      surfaceToneHex: "",
      surfaceHoverToneHex: "",
      surfaceSelectedToneHex: "",
      surfaceDisabledToneHex: "",
      showIcons: true,
      showBadges: true
    },
    ...overrides
  };
}

function customConfig(label) {
  return defaultConfig({
    dataSource: "custom",
    label,
    helpText: "Custom options rendered by the E2E Flow.",
    custom: {
      items: [
        {
          label: "E2E Custom Alpha",
          value: "custom-alpha",
          sublabel: "Custom A",
          icon: "standard:choice",
          badge: "A",
          helpText: "First custom option"
        },
        {
          label: "E2E Custom Beta",
          value: "custom-beta",
          sublabel: "Custom B",
          icon: "standard:choice",
          badge: "B",
          helpText: "Second custom option"
        },
        {
          label: "E2E Custom Gamma",
          value: "custom-gamma",
          sublabel: "Custom C",
          icon: "standard:choice",
          badge: "C",
          helpText: "Third custom option"
        }
      ]
    }
  });
}

function picklistConfig() {
  return defaultConfig({
    dataSource: "picklist",
    label: "E2E Rating Selector",
    helpText: "Picklist mode.",
    picklist: {
      objectApiName: "Lead",
      fieldApiName: "Rating",
      recordTypeId: "",
      valueSource: "apiName"
    }
  });
}

function sobjectConfig() {
  return defaultConfig({
    dataSource: "sobject",
    label: "E2E SOQL Lead Selector",
    helpText: "SOQL-backed Lead mode.",
    sobject: {
      sObjectApiName: "Lead",
      whereClause: `Company = '${COMPANY}'`,
      orderByField: "CreatedDate",
      orderByDirection: "DESC",
      limit: 10,
      labelField: "LastName",
      valueField: "Id",
      sublabelField: "Company",
      iconField: "",
      badgeField: "Rating",
      helpField: ""
    }
  });
}

function collectionConfig() {
  return defaultConfig({
    dataSource: "collection",
    label: "E2E Collection Lead Selector",
    helpText: "Flow record collection mode.",
    collection: {
      fieldMap: {
        label: "LastName",
        sublabel: "Company",
        icon: "",
        value: "Id",
        badge: "Rating",
        helpText: ""
      }
    }
  });
}

function componentFieldXml(name, config, extraInputs = "") {
  return `
        <fields>
            <name>${name}</name>
            <dataTypeMappings>
                <typeName>T</typeName>
                <typeValue>Lead</typeValue>
            </dataTypeMappings>
            <extensionName>c:newtonSelectorFlowScreen</extensionName>
            <fieldType>ComponentInstance</fieldType>
            <inputParameters>
                <name>selectorConfigJson</name>
                <value>
                    <stringValue>${escapeXml(JSON.stringify(config))}</stringValue>
                </value>
            </inputParameters>${extraInputs}
            <inputsOnNextNavToAssocScrn>UseStoredValues</inputsOnNextNavToAssocScrn>
            <isRequired>false</isRequired>
            <storeOutputAutomatically>true</storeOutputAutomatically>
            <styleProperties>
                <verticalAlignment>
                    <stringValue>top</stringValue>
                </verticalAlignment>
                <width>
                    <stringValue>12</stringValue>
                </width>
            </styleProperties>
        </fields>`;
}

function buildFlowXml() {
  const collectionInput = `
            <inputParameters>
                <name>sourceRecords</name>
                <value>
                    <elementReference>Get_E2E_Leads</elementReference>
                </value>
            </inputParameters>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>66.0</apiVersion>
    <areMetricsLoggedToDataCloud>false</areMetricsLoggedToDataCloud>
    <customProperties>
        <name>ScreenProgressIndicator</name>
        <value>
            <stringValue>{&quot;location&quot;:&quot;top&quot;,&quot;type&quot;:&quot;simple&quot;}</stringValue>
        </value>
    </customProperties>
    <environments>Default</environments>
    <interviewLabel>${FLOW_LABEL} {!$Flow.CurrentDateTime}</interviewLabel>
    <label>${FLOW_LABEL}</label>
    <processMetadataValues>
        <name>BuilderType</name>
        <value>
            <stringValue>LightningFlowBuilder</stringValue>
        </value>
    </processMetadataValues>
    <processMetadataValues>
        <name>CanvasMode</name>
        <value>
            <stringValue>AUTO_LAYOUT_CANVAS</stringValue>
        </value>
    </processMetadataValues>
    <processMetadataValues>
        <name>OriginBuilderType</name>
        <value>
            <stringValue>LightningFlowBuilder</stringValue>
        </value>
    </processMetadataValues>
    <processType>Flow</processType>
    <recordLookups>
        <name>Get_E2E_Leads</name>
        <label>Get E2E Leads</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <assignNullValuesIfNoRecordsFound>false</assignNullValuesIfNoRecordsFound>
        <connector>
            <targetReference>Newton_Selector_E2E_Screen</targetReference>
        </connector>
        <filterLogic>and</filterLogic>
        <filters>
            <field>Company</field>
            <operator>EqualTo</operator>
            <value>
                <stringValue>${escapeXml(COMPANY)}</stringValue>
            </value>
        </filters>
        <getFirstRecordOnly>false</getFirstRecordOnly>
        <limit>
            <numberValue>10.0</numberValue>
        </limit>
        <object>Lead</object>
        <sortField>CreatedDate</sortField>
        <sortOrder>Desc</sortOrder>
        <storeOutputAutomatically>true</storeOutputAutomatically>
    </recordLookups>
    <screens>
        <name>Newton_Selector_E2E_Screen</name>
        <label>${SCREEN_LABEL}</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <allowBack>true</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <connector>
            <targetReference>Done_Screen</targetReference>
        </connector>${componentFieldXml(
          "Custom_Selector",
          customConfig("E2E Custom Selector")
        )}${componentFieldXml(
          "Picklist_Selector",
          picklistConfig()
        )}${componentFieldXml("SObject_Selector", sobjectConfig())}${componentFieldXml(
          "Collection_Selector",
          collectionConfig(),
          collectionInput
        )}
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
    </screens>
    <screens>
        <name>Done_Screen</name>
        <label>E2E Done</label>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <allowBack>true</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <fields>
            <name>Done_Text</name>
            <fieldText>&lt;p&gt;E2E Flow completed.&lt;/p&gt;&lt;p&gt;Custom: {!Custom_Selector.selectedLabel}&lt;/p&gt;&lt;p&gt;Rating: {!Picklist_Selector.selectedLabel}&lt;/p&gt;&lt;p&gt;SOQL: {!SObject_Selector.selectedLabel}&lt;/p&gt;&lt;p&gt;Collection: {!Collection_Selector.selectedLabel}&lt;/p&gt;</fieldText>
            <fieldType>DisplayText</fieldType>
            <styleProperties>
                <verticalAlignment>
                    <stringValue>top</stringValue>
                </verticalAlignment>
                <width>
                    <stringValue>12</stringValue>
                </width>
            </styleProperties>
        </fields>
        <showFooter>true</showFooter>
        <showHeader>true</showHeader>
    </screens>
    <start>
        <locationX>0</locationX>
        <locationY>0</locationY>
        <connector>
            <targetReference>Get_E2E_Leads</targetReference>
        </connector>
    </start>
    <status>Draft</status>
</Flow>
`;
}

function writeFlowFixture() {
  mkdirSync(FLOW_SOURCE_DIR, { recursive: true });
  originalFlowSourceExisted = existsSync(FLOW_SOURCE_FILE);
  originalFlowSource = originalFlowSourceExisted
    ? readFileSync(FLOW_SOURCE_FILE, "utf8")
    : "";
  writeFileSync(FLOW_SOURCE_FILE, buildFlowXml(), "utf8");
}

function restoreFlowFixture() {
  if (originalFlowSourceExisted) {
    writeFileSync(FLOW_SOURCE_FILE, originalFlowSource, "utf8");
  } else {
    rmSync(FLOW_SOURCE_FILE, { force: true });
  }
}

function createLead(lastName, rating) {
  const values = `LastName=${lastName} Company=${COMPANY} Rating=${rating}`;
  const result = runSf([
    "data",
    "create",
    "record",
    "--target-org",
    TARGET_ORG,
    "--sobject",
    "Lead",
    "--values",
    process.platform === "win32" ? `"${values}"` : values,
    "--json"
  ]);
  assert(result.status === 0, `Lead create failed: ${JSON.stringify(result)}`);
  temporaryLeadIds.push(result.result.id);
  return result.result.id;
}

function deleteTemporaryLeads() {
  for (const id of temporaryLeadIds) {
    try {
      runSf([
        "data",
        "delete",
        "record",
        "--target-org",
        TARGET_ORG,
        "--sobject",
        "Lead",
        "--record-id",
        id,
        "--json"
      ]);
    } catch (error) {
      console.warn(`Could not delete temporary Lead ${id}: ${error.message}`);
    }
  }
}

function deleteFlowFixture() {
  try {
    const query = `SELECT Id,MasterLabel,VersionNumber,Status FROM Flow WHERE MasterLabel = '${FLOW_LABEL}'`;
    const result = runSf([
      "data",
      "query",
      "--target-org",
      TARGET_ORG,
      "--use-tooling-api",
      "--query",
      process.platform === "win32" ? `"${query}"` : query,
      "--json"
    ]);
    if (result.status !== 0) {
      console.warn(`Could not query temporary Flow: ${JSON.stringify(result)}`);
      return;
    }
    for (const record of result.result.records || []) {
      runSf([
        "data",
        "delete",
        "record",
        "--target-org",
        TARGET_ORG,
        "--use-tooling-api",
        "--sobject",
        "Flow",
        "--record-id",
        record.Id,
        "--json"
      ]);
    }
  } catch (error) {
    console.warn(
      `Could not delete temporary Flow ${FLOW_API_NAME}: ${error.message}`
    );
  }
}

function deployFlowFixture() {
  const result = runSf([
    "project",
    "deploy",
    "start",
    "--target-org",
    TARGET_ORG,
    "--source-dir",
    FLOW_SOURCE_FILE,
    "--json"
  ]);
  assert(
    result.status === 0,
    `Flow fixture deploy failed: ${JSON.stringify(result)}`
  );
}

function openFlowBuilderUrl() {
  const result = runSf([
    "org",
    "open",
    "--target-org",
    TARGET_ORG,
    "--source-file",
    FLOW_SOURCE_FILE,
    "--url-only",
    "--json"
  ]);
  assert(
    result.status === 0,
    `Could not open Flow Builder: ${JSON.stringify(result)}`
  );
  return result.result.url;
}

function findFile(startDir, fileName) {
  if (!existsSync(startDir)) return null;
  for (const entry of readdirSync(startDir, { withFileTypes: true })) {
    const entryPath = join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(entryPath, fileName);
      if (nested) return nested;
    } else if (entry.name === fileName) {
      return entryPath;
    }
  }
  return null;
}

function extractSelectorConfigFromFlowXml(xml, fieldName) {
  const fieldBlocks = xml.match(/<fields>[\s\S]*?<\/fields>/g) || [];
  const fieldBlock = fieldBlocks.find((block) =>
    block.includes(`<name>${fieldName}</name>`)
  );
  assert(fieldBlock, `Could not find Flow screen field ${fieldName}.`);

  const inputBlocks =
    fieldBlock.match(/<inputParameters>[\s\S]*?<\/inputParameters>/g) || [];
  const configBlock = inputBlocks.find((block) =>
    block.includes("<name>selectorConfigJson</name>")
  );
  assert(configBlock, `Could not find selectorConfigJson for ${fieldName}.`);

  const valueMatch = configBlock.match(
    /<stringValue>([\s\S]*?)<\/stringValue>/
  );
  assert(valueMatch, `selectorConfigJson has no stringValue for ${fieldName}.`);
  return JSON.parse(decodeXml(valueMatch[1].trim()));
}

function retrieveAndAssertPersistedConfig() {
  const retrieveDir = join(ARTIFACT_DIR, "retrieved");
  rmSync(retrieveDir, { recursive: true, force: true });
  const result = runSf([
    "project",
    "retrieve",
    "start",
    "--metadata",
    `Flow:${FLOW_API_NAME}`,
    "--target-org",
    TARGET_ORG,
    "--output-dir",
    retrieveDir,
    "--json"
  ]);
  assert(
    result.status === 0,
    `Flow retrieve after Builder save failed: ${JSON.stringify(result)}`
  );

  const flowXmlPath = findFile(retrieveDir, `${FLOW_API_NAME}.flow-meta.xml`);
  assert(flowXmlPath, `Retrieved Flow XML was not found under ${retrieveDir}.`);
  const xml = readFileSync(flowXmlPath, "utf8");
  const config = extractSelectorConfigFromFlowXml(xml, "Custom_Selector");

  assert(
    config.label === "E2E Custom Selector Edited",
    `Saved Selector label did not persist. Got ${config.label}`
  );
  assert(
    config.dataSource === "custom",
    `Saved Selector dataSource did not persist. Got ${config.dataSource}`
  );
  assert(
    config.layout === "grid",
    `Saved Selector layout did not persist. Got ${config.layout}`
  );
  assert(
    config.selectionMode === "single",
    `Saved Selector selectionMode did not persist. Got ${config.selectionMode}`
  );
  assert(
    config.gridConfig?.size === "medium",
    `Saved Selector tile size did not persist. Got ${config.gridConfig?.size}`
  );
  assert(
    config.gridConfig?.aspectRatio === "1:1",
    `Saved Selector aspect ratio did not persist. Got ${config.gridConfig?.aspectRatio}`
  );
  assert(
    config.gridConfig?.iconDecor === "ring",
    `Saved Selector icon decoration did not persist. Got ${config.gridConfig?.iconDecor}`
  );
  assert(
    config.gridConfig?.patternSelectedTone === "brand",
    `Saved Selector selected pattern color did not persist. Got ${config.gridConfig?.patternSelectedTone}`
  );
  assert(
    config.gridConfig?.surfaceHoverTone === "teal",
    `Saved Selector hover surface color did not persist. Got ${config.gridConfig?.surfaceHoverTone}`
  );

  return { flowXmlPath, config };
}

async function dispatchCustomEvent(locator, eventName, detail, patchTarget) {
  await locator.evaluate(
    (node, payload) => {
      if (payload.patchTarget) {
        Object.assign(node, payload.patchTarget);
      }
      node.dispatchEvent(
        new CustomEvent(payload.eventName, {
          detail: payload.detail,
          bubbles: true,
          composed: true
        })
      );
    },
    { eventName, detail, patchTarget }
  );
}

async function dispatchCardSelect(page, ariaLabel, value) {
  const label = ariaLabel.includes(" - ")
    ? `${ariaLabel}, ${ariaLabel.replace(" - ", " \u2014 ")}`
    : ariaLabel;
  const selector = label
    .split(", ")
    .map((entry) => `.newton-studio__selectorgroup[aria-label="${entry}"]`)
    .join(", ");
  const group = page.locator(selector).first();
  await assertVisible(group, `selector group "${ariaLabel}"`);
  await dispatchCustomEvent(group, "cardselect", { value });
}

async function activateStudioSection(page, key) {
  const studio = page.locator("c-newton-selector-flow-cpe-studio").first();
  await assertVisible(studio, "Newton Selector studio");
  await dispatchCustomEvent(studio, "sectionclick", key);
  await page.waitForTimeout(250);
}

async function dispatchValueChanged(locator, newValue, extraTarget = {}) {
  await assertVisible(locator, "value editor");
  await dispatchCustomEvent(
    locator,
    "valuechanged",
    {
      newValue,
      newValueDataType: "String",
      value: newValue
    },
    { value: newValue, ...extraTarget }
  );
}

async function dispatchToggle(locator, checked) {
  await assertVisible(locator, "toggle");
  await dispatchCustomEvent(locator, "toggle", { checked }, { checked });
}

async function dispatchSelectionMode(page, mode) {
  const toggle = page
    .locator(
      "c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle"
    )
    .first();
  await dispatchToggle(toggle, mode === "multi");
}

async function dispatchConfigPatch(locator, path, value) {
  await assertVisible(locator, "config component");
  await dispatchCustomEvent(locator, "configpatch", { path, value });
}

async function assertVisible(locator, label, timeout = 30000) {
  await locator.waitFor({ state: "attached", timeout });
  const visible = await locator.isVisible().catch(() => false);
  assert(visible, `${label} is not visible`);
}

async function clickFirstVisible(locator, label, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const candidate = locator.nth(i);
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ timeout: 5000 });
        return;
      }
    }
    await locator.page().waitForTimeout(500);
  }
  throw new Error(`${label} was not visible`);
}

async function modalSaveButton(page) {
  const saveButton = page.getByRole("button", { name: /^Save$/ }).last();
  await assertVisible(saveButton, "modal save button");
  return saveButton;
}

async function assertModalSaveDisabled(page, issuePattern, label) {
  await assertPageText(page, issuePattern, label, 30000);
  const saveButton = await modalSaveButton(page);
  assert(
    await saveButton.isDisabled(),
    `Modal Save button was enabled for invalid state: ${label}`
  );
}

async function assertModalSaveEnabled(page, label) {
  const saveButton = await modalSaveButton(page);
  assert(
    !(await saveButton.isDisabled().catch(() => false)),
    `Modal Save button was disabled after restoring valid state: ${label}`
  );
}

async function exerciseInvalidBuilderStates(page) {
  const dataConfig = page.locator("c-newton-selector-flow-cpe-data-config");

  await dispatchCardSelect(page, "Data source", "collection");
  await assertModalSaveDisabled(
    page,
    /Flow record collection/i,
    "collection mode missing Flow record binding"
  );

  await dispatchCustomEvent(dataConfig, "refchange", {
    name: "sourceRecordsRef",
    value: "{!Get_E2E_Leads}"
  });
  await dispatchConfigPatch(
    dataConfig,
    ["collection", "fieldMap", "label"],
    ""
  );
  await assertModalSaveDisabled(
    page,
    /Label field/i,
    "collection mode missing label field mapping"
  );

  await dispatchCardSelect(page, "Data source", "custom");
  await dispatchConfigPatch(dataConfig, ["custom", "items"], []);
  await assertModalSaveDisabled(
    page,
    /custom item/i,
    "custom mode missing custom items"
  );
  await page.screenshot({ path: screenshots.invalidModal, fullPage: true });

  await dispatchCustomEvent(dataConfig, "refchange", {
    name: "sourceRecordsRef",
    value: ""
  });
  await dispatchConfigPatch(
    dataConfig,
    ["custom", "items"],
    customConfig("E2E Custom Selector").custom.items
  );
  await assertModalSaveEnabled(page, "invalid-state recovery");
}

async function exerciseAllConfigChapters(page) {
  await assertPageText(page, /Configure Newton Selector/i, "config modal");
  await page.screenshot({ path: screenshots.modal, fullPage: true });

  await exerciseInvalidBuilderStates(page);

  const sourceModes = ["picklist", "collection", "sobject", "custom"];
  for (const value of sourceModes) {
    await dispatchCardSelect(page, "Data source", value);
  }

  await activateStudioSection(page, "content");
  const contentFields = page.locator(
    "c-newton-selector-flow-cpe-content-config c-newton-selector-flow-cpe-resource-selector"
  );
  await dispatchValueChanged(
    contentFields.nth(0),
    "E2E Custom Selector Edited"
  );
  await dispatchValueChanged(
    contentFields.nth(1),
    "Edited help text from Playwright."
  );
  await dispatchValueChanged(
    contentFields.nth(2),
    "Edited tooltip from Playwright."
  );
  await dispatchValueChanged(contentFields.nth(3), "E2E empty state");
  await dispatchValueChanged(contentFields.nth(4), "E2E error state");

  await activateStudioSection(page, "behavior");
  await dispatchSelectionMode(page, "multi");
  await dispatchToggle(
    page.locator(
      'c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle[data-key="required"]'
    ),
    true
  );
  await dispatchSelectionMode(page, "single");
  await dispatchToggle(
    page.locator(
      'c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle[data-key="autoAdvance"]'
    ),
    false
  );
  await dispatchToggle(
    page.locator(
      'c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle[data-key="includeNoneOption"]'
    ),
    true
  );
  await dispatchValueChanged(
    page
      .locator(
        "c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-resource-selector"
      )
      .first(),
    "None of these"
  );
  await dispatchCardSelect(page, "None option position", "end");
  await dispatchToggle(
    page.locator(
      'c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle[data-key="enableSearch"]'
    ),
    true
  );
  await dispatchToggle(
    page.locator(
      'c-newton-selector-flow-cpe-behavior-config c-newton-selector-flow-cpe-toggle[data-key="includeNoneOption"]'
    ),
    false
  );

  await activateStudioSection(page, "appearance");
  const appearanceSelections = [
    ["Layout", "grid"],
    ["Layout", "list"],
    ["Layout", "horizontal"],
    ["Layout", "picklist"],
    ["Layout", "radio"],
    ["Layout", "columns"],
    ["Layout", "dualListbox"],
    ["Layout", "grid"],
    ["Tile size", "small"],
    ["Tile size", "medium"],
    ["Tile size", "large"],
    ["Aspect ratio", "1:1"],
    ["Aspect ratio", "4:3"],
    ["Aspect ratio", "16:9"],
    ["Aspect ratio", "3:4"],
    ["Card elevation", "outlined"],
    ["Card elevation", "flat"],
    ["Card elevation", "elevated"],
    ["Pattern", "none"],
    ["Pattern", "dots"],
    ["Pattern", "lines"],
    ["Pattern", "diagonal"],
    ["Pattern", "grid"],
    ["Pattern", "glow"],
    ["Pattern", "noise"],
    ["Pattern", "paper"],
    ["Pattern", "waves"],
    ["Corner style", "none"],
    ["Corner style", "trim"],
    ["Corner style", "brackets"],
    ["Corner style", "dots"],
    ["Surface style", "solid"],
    ["Surface style", "gradient-top"],
    ["Surface style", "gradient-radial"],
    ["Surface style", "gradient-diagonal"],
    ["Surface style", "tint"],
    ["Icon decoration", "none"],
    ["Icon decoration", "ring"],
    ["Icon decoration", "halo"],
    ["Icon decoration", "badge"],
    ["Icon decoration", "square"],
    ["Icon style", "filled"],
    ["Icon style", "outlined"],
    ["Icon style", "soft"],
    ["Icon style", "glow"],
    ["Icon style", "filled"],
    ["Icon shading", "flat"],
    ["Icon shading", "gradient"],
    ["Icon shading", "emboss"],
    ["Icon size", "xx-small"],
    ["Icon size", "x-small"],
    ["Icon size", "small"],
    ["Icon size", "medium"],
    ["Icon size", "large"],
    ["Selection indicator", "checkmark"],
    ["Selection indicator", "fill"],
    ["Selection indicator", "bar"],
    ["Horizontal gap", "none"],
    ["Horizontal gap", "1"],
    ["Horizontal gap", "4"],
    ["Horizontal gap", "7"],
    ["Vertical gap", "none"],
    ["Vertical gap", "1"],
    ["Vertical gap", "4"],
    ["Vertical gap", "7"],
    ["Margin - all sides", "none"],
    ["Margin - all sides", "2"],
    ["Padding - all sides", ""],
    ["Padding - all sides", "3"]
  ];
  for (const [label, value] of appearanceSelections) {
    await dispatchCardSelect(page, label, value);
  }

  const appearance = page.locator(
    "c-newton-selector-flow-cpe-appearance-config"
  );
  for (const [label, value] of [
    ["Columns", "3"],
    ["Pattern selected color", "brand"],
    ["Corner color", "success"],
    ["Surface hover color", "teal"],
    ["Icon color", "warning"],
    ["Icon glyph color", "contrast"],
    ["Badge position", "top-right"],
    ["Badge color", "brand"],
    ["Badge shape", "square"]
  ]) {
    await appearance
      .locator(`[aria-label="${label}"] [data-value="${value}"]`)
      .first()
      .click({ force: true, timeout: 15000 });
  }

  await dispatchConfigPatch(appearance, ["gridConfig", "showIcons"], false);
  await dispatchConfigPatch(appearance, ["gridConfig", "showIcons"], true);
  await dispatchConfigPatch(appearance, ["gridConfig", "showBadges"], false);
  await dispatchConfigPatch(appearance, ["gridConfig", "showBadges"], true);

  await activateStudioSection(page, "data");
  await dispatchCardSelect(page, "Data source", "custom");
  await activateStudioSection(page, "appearance");
  await dispatchCardSelect(page, "Layout", "grid");
  await activateStudioSection(page, "behavior");
  await dispatchSelectionMode(page, "single");
  await activateStudioSection(page, "appearance");
  await dispatchCardSelect(page, "Tile size", "medium");
  await dispatchCardSelect(page, "Aspect ratio", "1:1");
  await dispatchCardSelect(page, "Card elevation", "outlined");
  await dispatchCardSelect(page, "Pattern", "none");
  await dispatchCardSelect(page, "Surface style", "solid");
  await dispatchCardSelect(page, "Corner style", "none");
  await dispatchCardSelect(page, "Icon decoration", "ring");
  await dispatchCardSelect(page, "Selection indicator", "checkmark");
  await dispatchConfigPatch(
    appearance,
    ["gridConfig", "surfaceHoverTone"],
    "teal"
  );

  await page.screenshot({ path: screenshots.modal, fullPage: true });
}

async function openBuilderAndConfigure(page, builderUrl) {
  await page.goto(builderUrl, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  await page
    .waitForLoadState("networkidle", { timeout: 45000 })
    .catch(() => {});
  await dismissTransientUi(page);
  await assertPageText(
    page,
    new RegExp(`${FLOW_LABEL}|Flow Builder|Auto-Layout|Run|Debug`, "i"),
    "Flow Builder shell",
    120000
  );
  await page.screenshot({ path: screenshots.builderLoaded, fullPage: true });

  await page.getByText(SCREEN_LABEL, { exact: true }).first().click({
    timeout: 90000
  });
  await assertPageText(page, /Edit Screen|Screen Properties/i, "screen editor");
  await page.screenshot({ path: screenshots.screenEditor, fullPage: true });

  await page
    .getByText("Custom_Selector", { exact: true })
    .last()
    .click({ force: true, timeout: 60000 });
  await assertPageText(
    page,
    /Professor Flow \| Newton Selector|Edit configuration|Configure selector/i,
    "Newton Selector CPE panel",
    90000
  );

  const configureButton = page
    .getByRole("button", { name: /Edit configuration|Configure selector/i })
    .first();
  await configureButton.click({ timeout: 30000 });
  await exerciseAllConfigChapters(page);

  const saveButton = page.getByRole("button", { name: /^Save$/ }).last();
  await assertVisible(saveButton, "modal save button");
  assert(
    !(await saveButton.isDisabled().catch(() => false)),
    "Config modal Save button is disabled after option sweep."
  );
  await saveButton.click();
  await assertPageText(
    page,
    /E2E Custom Selector Edited|Custom items|Current configuration/i,
    "CPE summary after modal save",
    60000
  );

  const doneButton = page.getByRole("button", { name: /^Done$/ }).last();
  await clickFirstVisible(doneButton, "screen editor Done button", 60000);
  await assertPageText(page, /Run|Debug|Save/i, "Flow Builder toolbar");

  const builderSaveButton = page
    .getByRole("button", { name: /^Save$/ })
    .first();
  if (await builderSaveButton.isVisible().catch(() => false)) {
    await builderSaveButton.click({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(8000);
  }
  await page.screenshot({ path: screenshots.afterSave, fullPage: true });
  const persisted = retrieveAndAssertPersistedConfig();
  console.log(
    JSON.stringify({
      step: "metadata-verified",
      flowXmlPath: persisted.flowXmlPath,
      customSelectorLabel: persisted.config.label
    })
  );
}

async function clickDebugRunButton(page) {
  const debugButton = page.getByRole("button", { name: /^Debug$/ }).first();
  await clickFirstVisible(debugButton, "Flow Builder Debug button", 60000);
  await assertPageText(
    page,
    /Select Debug Options|Debug|Input Variables/i,
    "debug panel"
  );

  const runButtons = page.getByRole("button", { name: /^Run$/ });
  const count = await runButtons.count();
  for (let i = count - 1; i >= 0; i -= 1) {
    const button = runButtons.nth(i);
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 30000 });
      return;
    }
  }
  throw new Error("No visible Run button found in the Debug panel.");
}

async function runtimeContextAfterDebug(page, context) {
  const newPagePromise = context
    .waitForEvent("page", { timeout: 15000 })
    .catch(() => null);
  await clickDebugRunButton(page);
  const newPage = await newPagePromise;
  const candidate = newPage || page;
  if (newPage) {
    await newPage.waitForLoadState("domcontentloaded", { timeout: 120000 });
    await newPage
      .waitForLoadState("networkidle", { timeout: 45000 })
      .catch(() => {});
  }

  const contexts = [candidate, ...candidate.frames()];
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    for (const frameOrPage of contexts) {
      const text = await frameOrPage
        .locator("body")
        .innerText({ timeout: 3000 })
        .catch(() => "");
      if (/E2E Custom Selector Edited|E2E Custom Selector/i.test(text)) {
        return { page: candidate, context: frameOrPage };
      }
    }
    await candidate.waitForTimeout(1000);
  }

  const body = await candidate
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  throw new Error(
    `Debug runtime did not render the Newton Selector screen. Body starts with: ${body.slice(
      0,
      1200
    )}`
  );
}

async function runDebugFlow(page, browserContext) {
  const runtime = await runtimeContextAfterDebug(page, browserContext);
  const runtimePage = runtime.page;
  const runtimeScope = runtime.context;

  await assertPageText(
    runtimeScope,
    /E2E Custom Selector Edited|E2E Custom Selector/i,
    "debug runtime custom Selector"
  );
  await assertPageText(
    runtimeScope,
    /E2E Rating Selector/i,
    "debug runtime rating Selector"
  );
  await assertPageText(
    runtimeScope,
    /E2E SOQL Lead Selector/i,
    "debug runtime SOQL Selector"
  );
  await assertPageText(
    runtimeScope,
    /E2E Collection Lead Selector/i,
    "debug runtime collection Selector"
  );
  await assertPageText(runtimeScope, /E2E Custom Alpha/i, "custom option");
  await assertPageText(
    runtimeScope,
    /NewtonE2EAlpha/i,
    "SOQL or collection lead option"
  );
  await runtimePage.screenshot({
    path: screenshots.debugRuntime,
    fullPage: true
  });

  for (const text of [
    "E2E Custom Alpha",
    "Hot",
    `NewtonE2EAlpha${RUN_ID}`,
    `NewtonE2EBeta${RUN_ID}`
  ]) {
    await runtimeScope
      .getByText(text, { exact: true })
      .first()
      .click({ force: true, timeout: 30000 })
      .catch(async () => {
        await runtimeScope.getByText(text).first().click({
          force: true,
          timeout: 30000
        });
      });
  }

  const nextButton = runtimeScope
    .getByRole("button", { name: /^Next$/ })
    .last();
  await clickFirstVisible(nextButton, "Flow runtime Next button", 60000);
  await assertPageText(
    runtimeScope,
    /E2E Flow completed/i,
    "debug completion screen"
  );
  await runtimePage.screenshot({ path: screenshots.done, fullPage: true });
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

let browser;
try {
  console.log(
    JSON.stringify({
      step: "setup",
      targetOrg: TARGET_ORG,
      flowApiName: FLOW_API_NAME,
      runId: RUN_ID,
      artifactDir: ARTIFACT_DIR
    })
  );
  writeFlowFixture();
  createLead(`NewtonE2EAlpha${RUN_ID}`, "Hot");
  createLead(`NewtonE2EBeta${RUN_ID}`, "Warm");
  deployFlowFixture();
  const builderUrl = openFlowBuilderUrl();

  browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1050 },
    recordVideo:
      process.env.PLAYWRIGHT_RECORD_VIDEO === "true"
        ? { dir: ARTIFACT_DIR }
        : undefined
  });
  attachDiagnosticsToContext(context);
  const page = await context.newPage();
  attachDiagnosticsToPage(page);
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);

  await openBuilderAndConfigure(page, builderUrl);
  await runDebugFlow(page, context);
  assertNoActionableBrowserDiagnostics();
  writeDiagnostics();

  await context.close();
  console.log(
    JSON.stringify(
      {
        ok: true,
        targetOrg: TARGET_ORG,
        flowApiName: FLOW_API_NAME,
        runId: RUN_ID,
        screenshots
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
} finally {
  writeDiagnostics();
  if (browser) {
    await browser.close().catch(() => {});
  }
  deleteTemporaryLeads();
  deleteFlowFixture();
  restoreFlowFixture();
}
