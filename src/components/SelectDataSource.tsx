import { framer } from "framer-plugin";
import { useState } from "react";
import { type DataSource, dataSourceOptions, getDataSource } from "../data";

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
		dataSourceOptions[0].id,
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
				apiKey.trim(),
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
						src="/marble-light.png"
						alt="Marble"
						width="30"
						height="30"
						className="marble-logo-light"
					/>
					<img
						src="/marble-dark.png"
						alt="Marble"
						width="30"
						height="30"
						className="marble-logo-dark"
					/>
				</div>
				<div className="content">
					<h2>Marble</h2>
					<p>Sync your Marble CMS content into Framer.</p>
				</div>
			</div>

			<form onSubmit={handleSubmit}>
				<label htmlFor="apiKey" className="api-key-label">
					API Key
					<input
						id="apiKey"
						type="password"
						placeholder="Enter your Marble API key"
						value={apiKey}
						onChange={(event) => onApiKeyChange(event.target.value)}
						autoComplete="off"
					/>
				</label>

				<label htmlFor="collection">
					<select
						id="collection"
						onChange={(event) => setSelectedDataSourceId(event.target.value)}
						value={selectedDataSourceId}
					>
						<option value="" disabled>
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
					type="submit"
					disabled={!selectedDataSourceId || !apiKey.trim() || isLoading}
				>
					{isLoading ? <div className="framer-spinner" /> : "Next"}
				</button>
			</form>
		</main>
	);
}
