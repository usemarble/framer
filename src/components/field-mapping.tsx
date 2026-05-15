import {
  framer,
  type ManagedCollection,
  type ManagedCollectionFieldInput,
  useIsAllowedTo,
} from "framer-plugin";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PLUGIN_KEYS } from "../constants";
import type { DataSource } from "../types";
import {
  mergeFieldsWithExistingFields,
  syncCollection,
  syncMethods,
} from "../utils/data";
import { dataSourceOptions } from "../utils/fields";

interface FieldMappingRowProps {
  disabled: boolean;
  field: ManagedCollectionFieldInput;
  isIgnored: boolean;
  onNameChange: (fieldId: string, name: string) => void;
  onToggleDisabled: (fieldId: string) => void;
  originalFieldName: string | undefined;
}

function FieldMappingRow({
  field,
  originalFieldName,
  isIgnored,
  onToggleDisabled,
  onNameChange,
  disabled,
}: FieldMappingRowProps) {
  return (
    <>
      <button
        className={`source-field ${isIgnored ? "ignored" : ""}`}
        disabled={disabled}
        onClick={() => onToggleDisabled(field.id)}
        type="button"
      >
        <input checked={!isIgnored} readOnly tabIndex={-1} type="checkbox" />
        <span>{originalFieldName ?? field.id}</span>
      </button>
      <svg fill="none" height="8" width="8" xmlns="http://www.w3.org/2000/svg">
        <title>maps to</title>
        <path
          d="m2.5 7 3-3-3-3"
          fill="transparent"
          stroke="#999"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
      <input
        disabled={isIgnored || disabled}
        onChange={(event) => onNameChange(field.id, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        placeholder={field.id}
        type="text"
        value={field.name}
      />
    </>
  );
}

// Create a const empty array to be used whenever there are no fields.
const emptyFields: ManagedCollectionFieldInput[] = [];
Object.freeze(emptyFields);

interface FieldMappingProps {
  collection: ManagedCollection;
  dataSource: DataSource;
  initialSlugFieldId: string | null;
}

export function FieldMapping({
  collection,
  dataSource,
  initialSlugFieldId,
}: FieldMappingProps) {
  const [status, setStatus] = useState<
    "mapping-fields" | "loading-fields" | "syncing-collection"
  >(initialSlugFieldId ? "loading-fields" : "mapping-fields");
  const isSyncing = status === "syncing-collection";
  const isLoadingFields = status === "loading-fields";

  const [fields, setFields] =
    useState<ManagedCollectionFieldInput[]>(emptyFields);
  const [ignoredFieldIds, setIgnoredFieldIds] = useState<ReadonlySet<string>>(
    new Set()
  );

  const possibleSlugFields = useMemo(() => {
    const slugEligibleIds =
      dataSource.id === "posts" ? ["title", "slug"] : ["name", "slug"];
    return dataSource.fields.filter(
      (field) => field.type === "string" && slugEligibleIds.includes(field.id)
    );
  }, [dataSource.fields, dataSource.id]);

  const [selectedSlugField, setSelectedSlugField] =
    useState<ManagedCollectionFieldInput | null>(
      possibleSlugFields.find((f) => f.id === initialSlugFieldId) ??
        possibleSlugFields.find((f) => f.id === "slug") ??
        possibleSlugFields[0] ??
        null
    );

  const dataSourceName =
    dataSourceOptions.find((option) => option.id === dataSource.id)?.name ??
    dataSource.id;

  useEffect(() => {
    setSelectedSlugField(
      possibleSlugFields.find((f) => f.id === initialSlugFieldId) ??
        possibleSlugFields.find((f) => f.id === "slug") ??
        possibleSlugFields[0] ??
        null
    );
  }, [initialSlugFieldId, possibleSlugFields]);

  useEffect(() => {
    const abortController = new AbortController();

    collection
      .getFields()
      .then((collectionFields) => {
        if (abortController.signal.aborted) {
          return;
        }

        setFields(
          mergeFieldsWithExistingFields(dataSource.fields, collectionFields)
        );

        const existingFieldIds = new Set(
          collectionFields.map((field) => field.id)
        );

        if (collectionFields.length > 0) {
          const ignoredIds = new Set<string>();
          for (const sourceField of dataSource.fields) {
            if (existingFieldIds.has(sourceField.id)) {
              continue;
            }
            ignoredIds.add(sourceField.id);
          }
          if (ignoredIds.size > 0) {
            setIgnoredFieldIds(ignoredIds);
          }
        }

        setStatus("mapping-fields");
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch collection fields:", error);
          framer.notify("Failed to load collection fields", {
            variant: "error",
          });
        }
      });

    return () => abortController.abort();
  }, [dataSource, collection]);

  const changeFieldName = useCallback((fieldId: string, name: string) => {
    setFields((prevFields) => {
      const updatedFields = prevFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }
        return { ...field, name };
      });
      return updatedFields;
    });
  }, []);

  const toggleFieldDisabledState = useCallback((fieldId: string) => {
    setIgnoredFieldIds((previousIgnoredFieldIds) => {
      const updatedIgnoredFieldIds = new Set(previousIgnoredFieldIds);

      if (updatedIgnoredFieldIds.has(fieldId)) {
        updatedIgnoredFieldIds.delete(fieldId);
      } else {
        updatedIgnoredFieldIds.add(fieldId);
      }

      return updatedIgnoredFieldIds;
    });
  }, []);

  const isAllowedToManage = useIsAllowedTo(
    "ManagedCollection.setFields",
    ...syncMethods
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlugField) {
      framer.notify("Please select a slug field before importing.", {
        variant: "warning",
      });
      return;
    }

    try {
      setStatus("syncing-collection");

      const fieldsToSync: ManagedCollectionFieldInput[] = [];
      for (const field of fields) {
        if (ignoredFieldIds.has(field.id) || field.id === "slug") {
          continue;
        }
        fieldsToSync.push({ ...field, name: field.name.trim() || field.id });
      }

      await collection.setFields(fieldsToSync);
      await collection.setPluginData(
        PLUGIN_KEYS.SLUG_FIELD_ID,
        selectedSlugField.id
      );
      await syncCollection(
        collection,
        dataSource,
        fieldsToSync,
        selectedSlugField
      );
      framer.closePlugin("Synchronization successful", { variant: "success" });
    } catch (error) {
      console.error("[Marble] Sync error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      framer.notify(`Import failed: ${message}`, {
        variant: "error",
      });
    } finally {
      setStatus("mapping-fields");
    }
  };

  if (isLoadingFields) {
    return (
      <main className="loading">
        <div className="framer-spinner" />
      </main>
    );
  }

  return (
    <main className="framer-hide-scrollbar mapping">
      <hr className="sticky-divider" />
      <form onSubmit={handleSubmit}>
        <label className="slug-field" htmlFor="slugField">
          Slug Field
          <select
            className="field-input"
            disabled={!isAllowedToManage}
            id="slugField"
            name="slugField"
            onChange={(event) => {
              const field = possibleSlugFields.find(
                (f) => f.id === event.target.value
              );
              if (field) {
                setSelectedSlugField(field);
              }
            }}
            required
            value={selectedSlugField?.id ?? ""}
          >
            {possibleSlugFields.map((f) => (
              <option key={`slug-field-${f.id}`} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <div className="fields">
          <span className="fields-column">Column</span>
          <span>Field</span>
          {fields
            .filter((field) => field.id !== "slug")
            .map((field) => (
              <FieldMappingRow
                disabled={!isAllowedToManage}
                field={field}
                isIgnored={ignoredFieldIds.has(field.id)}
                key={`field-${field.id}`}
                onNameChange={changeFieldName}
                onToggleDisabled={toggleFieldDisabledState}
                originalFieldName={
                  dataSource.fields.find(
                    (sourceField) => sourceField.id === field.id
                  )?.name
                }
              />
            ))}
        </div>

        <footer>
          <hr />
          <button
            className="primary"
            disabled={isSyncing || !isAllowedToManage}
            title={isAllowedToManage ? undefined : "Insufficient permissions"}
            type="submit"
          >
            {isSyncing ? (
              <div className="framer-spinner" />
            ) : (
              `Import ${dataSourceName}`
            )}
          </button>
        </footer>
      </form>
    </main>
  );
}
