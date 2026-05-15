import { framer } from "framer-plugin";
import { useState } from "react";
import type { DataSource } from "../types";
import { getDataSource } from "../utils/data";
import { dataSourceOptions } from "../utils/fields";

interface SelectDataSourceProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  onSelectDataSource: (dataSource: DataSource) => void;
}

export function SelectDataSource({
  apiKey,
  onApiKeyChange,
  onSelectDataSource,
}: SelectDataSourceProps) {
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>(
    dataSourceOptions[0].id
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apiKey.trim()) {
      framer.notify("Please enter your Marble API key.", {
        variant: "warning",
      });
      return;
    }

    try {
      setIsLoading(true);

      const dataSource = await getDataSource(
        selectedDataSourceId,
        apiKey.trim()
      );
      onSelectDataSource(dataSource);
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : `Failed to load "${selectedDataSourceId}" from Marble.`;

      framer.notify(message, { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="framer-hide-scrollbar setup">
      <div className="intro">
        <div className="logo marble-logo">
          <img
            alt="Marble"
            className="marble-logo-light"
            height="30"
            src="/marble-light.png"
            width="30"
          />
          <img
            alt="Marble"
            className="marble-logo-dark"
            height="30"
            src="/marble-dark.png"
            width="30"
          />
        </div>
        <div className="content">
          <h2>Marble</h2>
          <p>Sync your Marble content into Framer.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="api-key-label" htmlFor="apiKey">
          API Key
          <input
            autoComplete="off"
            id="apiKey"
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Enter your Marble API key"
            type="password"
            value={apiKey}
          />
        </label>

        <label htmlFor="collection">
          <select
            id="collection"
            onChange={(event) => setSelectedDataSourceId(event.target.value)}
            value={selectedDataSourceId}
          >
            <option disabled value="">
              Choose Source…
            </option>
            {dataSourceOptions.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!(selectedDataSourceId && apiKey.trim()) || isLoading}
          type="submit"
        >
          {isLoading ? <div className="framer-spinner" /> : "Next"}
        </button>
      </form>
    </main>
  );
}
