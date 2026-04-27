import { SECTIONS } from "c/newtonSelectorFlowCpeUtilityConfigOptions";

export function sectionIssues(key, config, refs = {}) {
  const errors = [];
  const warnings = [];
  const c = config || {};
  const dataSource = c.dataSource;

  if (key === "data") {
    if (!dataSource) {
      errors.push("Pick a data source to continue.");
    } else if (dataSource === "picklist") {
      if (!c.picklist?.objectApiName)
        errors.push("Select a Salesforce object.");
      if (!c.picklist?.fieldApiName) errors.push("Select a picklist field.");
    } else if (dataSource === "collection") {
      if (!refs.sourceRecordsRef)
        errors.push("Bind a Flow record collection variable.");
      if (!c.collection?.fieldMap?.label)
        errors.push("Map at least the Label field for the collection.");
    } else if (dataSource === "sobject") {
      if (!c.sobject?.sObjectApiName)
        errors.push("Select a Salesforce object.");
      if (!c.sobject?.labelField) warnings.push("Set a label field.");
    } else if (dataSource === "custom") {
      const items = c.custom?.items || [];
      if (items.length === 0 && !c.manualInput?.enabled) {
        errors.push("Add at least one custom item.");
      }
      const missingLabel = items.filter((item) => !item.label).length;
      if (missingLabel) {
        warnings.push(
          `${missingLabel} item${missingLabel === 1 ? "" : "s"} missing a label.`
        );
      }
    }
  } else if (key === "behavior") {
    const min = Number(c.minSelections || 0);
    const max = c.maxSelections == null ? null : Number(c.maxSelections);
    const manual = c.manualInput || {};
    const manualMin = Number(manual.minLength || 0);
    const manualMax =
      manual.maxLength === null || manual.maxLength === undefined
        ? null
        : Number(manual.maxLength);
    if (c.selectionMode === "multi" && max != null && max < Math.max(min, 1)) {
      errors.push("Max selections must be ≥ min selections (and ≥ 1).");
    }
    if (manual.enabled) {
      if (!manual.label || !String(manual.label).trim()) {
        errors.push("Manual input needs an option label.");
      }
      if (!Number.isFinite(manualMin) || manualMin < 0) {
        errors.push("Manual input minimum characters must be 0 or greater.");
      }
      if (
        manualMax !== null &&
        (!Number.isFinite(manualMax) || manualMax < Math.max(manualMin, 1))
      ) {
        errors.push(
          "Manual input maximum characters must be ≥ minimum characters (and ≥ 1)."
        );
      }
    }
    if (c.selectionMode === "multi" && c.autoAdvance) {
      warnings.push(
        "Auto-advance is single-select only — it has no effect in multi."
      );
    }
  }

  return { errors, warnings };
}

export function sectionStatus(key, config, refs) {
  const issues = sectionIssues(key, config, refs);
  if (issues.errors.length) return "error";
  if (issues.warnings.length) return "warn";
  return "ok";
}

export function totalIssueCount(config, refs, level) {
  return SECTIONS.reduce((count, section) => {
    const issues = sectionIssues(section.key, config, refs);
    return count + issues[level].length;
  }, 0);
}

export function activeSectionIssueList(key, config, refs) {
  const issues = sectionIssues(key, config, refs);
  return [
    ...issues.errors.map((message, index) =>
      buildIssue("error", message, index)
    ),
    ...issues.warnings.map((message, index) =>
      buildIssue("warn", message, index)
    )
  ];
}

function buildIssue(level, message, index) {
  return {
    key: `${level}-${index}-${message}`,
    level,
    message,
    icon: level === "error" ? "circle-alert" : "triangle-alert",
    className: `newton-studio__issue newton-studio__issue_${level}`
  };
}
