import "framer-plugin/framer.css";

import { framer } from "framer-plugin";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { PLUGIN_KEYS, syncExistingCollection } from "./data";

const activeCollection = await framer.getActiveManagedCollection();

const previousDataSourceId = await activeCollection.getPluginData(
	PLUGIN_KEYS.DATA_SOURCE_ID,
);
const previousApiKey = await activeCollection.getPluginData(
	PLUGIN_KEYS.API_KEY,
);

const { didSync } = await syncExistingCollection(
	activeCollection,
	previousDataSourceId,
	previousApiKey,
);

if (didSync) {
	framer.closePlugin("Synchronization successful", {
		variant: "success",
	});
} else {
	const root = document.getElementById("root");
	if (!root) throw new Error("Root element not found");

	createRoot(root).render(
		<StrictMode>
			<App
				collection={activeCollection}
				previousDataSourceId={previousDataSourceId}
				previousApiKey={previousApiKey}
			/>
		</StrictMode>,
	);
}
