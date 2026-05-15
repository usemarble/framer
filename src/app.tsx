import "./styles/App.css";

import { framer, type ManagedCollection, useIsAllowedTo } from "framer-plugin";
import { useEffect, useLayoutEffect, useState } from "react";
import { FieldMapping } from "./components/field-mapping";
import { SelectDataSource } from "./components/select-data-source";
import { PLUGIN_KEYS } from "./constants";
import type { DataSource } from "./types";
import { getDataSource } from "./utils/data";

interface AppProps {
  collection: ManagedCollection;
  previousApiKey: string | null;
  previousDataSourceId: string | null;
  previousSlugFieldId: string | null;
}

export function App({
  collection,
  previousDataSourceId,
  previousSlugFieldId,
  previousApiKey,
}: AppProps) {
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [apiKey, setApiKey] = useState<string>(previousApiKey ?? "");
  const [isLoadingDataSource, setIsLoadingDataSource] = useState(
    Boolean(previousDataSourceId && previousApiKey)
  );

  useLayoutEffect(() => {
    const hasDataSourceSelected = Boolean(dataSource);

    framer.showUI({
      width: hasDataSourceSelected ? 360 : 300,
      height: hasDataSourceSelected ? 425 : 380,
      minWidth: hasDataSourceSelected ? 360 : undefined,
      minHeight: hasDataSourceSelected ? 425 : undefined,
      resizable: hasDataSourceSelected,
    });
  }, [dataSource]);

  useEffect(() => {
    if (!(previousDataSourceId && previousApiKey)) {
      return;
    }

    const abortController = new AbortController();

    setIsLoadingDataSource(true);
    getDataSource(previousDataSourceId, previousApiKey, abortController.signal)
      .then(setDataSource)
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("[Marble] Data source load error:", error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        framer.notify(`Failed to load "${previousDataSourceId}": ${message}`, {
          variant: "error",
        });
      })
      .finally(() => {
        if (abortController.signal.aborted) {
          return;
        }

        setIsLoadingDataSource(false);
      });

    return () => abortController.abort();
  }, [previousDataSourceId, previousApiKey]);

  const isAllowedToSetData = useIsAllowedTo("ManagedCollection.setPluginData");

  const handleApiKeyChange = async (newApiKey: string) => {
    setApiKey(newApiKey);
    if (isAllowedToSetData) {
      await collection.setPluginData(PLUGIN_KEYS.API_KEY, newApiKey);
    }
  };

  if (isLoadingDataSource) {
    return (
      <main className="loading">
        <div className="framer-spinner" />
      </main>
    );
  }

  if (!dataSource) {
    return (
      <SelectDataSource
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onSelectDataSource={setDataSource}
      />
    );
  }

  return (
    <FieldMapping
      collection={collection}
      dataSource={dataSource}
      initialSlugFieldId={previousSlugFieldId}
    />
  );
}
