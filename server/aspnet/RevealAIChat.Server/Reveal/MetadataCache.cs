using System.Text.Json;

namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Reveal AI caches generated table metadata per datasource under
    /// <c>%LOCALAPPDATA%/reveal/ai/metadata</c> (e.g. <c>retail_index.json</c> and
    /// <c>retail_&lt;database&gt;_public.retail.json</c>). The cache is keyed by datasource id and is
    /// <b>not</b> invalidated when the catalog's database changes — so if you rename the database
    /// (or an earlier build reused the same datasource ids against a different DB), startup reuses
    /// the stale index and the AI can't resolve the current database, failing the chat with
    /// <c>"The given key '&lt;database&gt;' was not present in the dictionary."</c>
    ///
    /// On startup we drop any datasource whose cache doesn't match the current database so it
    /// regenerates cleanly. A fresh machine — and every fresh Docker container — has an empty
    /// cache, so this is a no-op there; it only does work on a dev box that previously ran a
    /// different database under the same datasource ids.
    /// </summary>
    public static class MetadataCache
    {
        public static void ClearStaleForDatabase(string catalogPath, string database, ILogger logger)
        {
            var cacheDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "reveal", "ai", "metadata");
            if (!Directory.Exists(cacheDir) || !File.Exists(catalogPath))
                return;

            foreach (var id in ReadDatasourceIds(catalogPath))
            {
                // No index yet → nothing cached for this datasource; it will generate fresh.
                if (!File.Exists(Path.Combine(cacheDir, $"{id}_index.json")))
                    continue;

                // Per-table files are named "{id}_{database}_{schema}.{table}.json". If any exist
                // for the CURRENT database, the cache matches the catalog — keep it (the common
                // case, so steady-state startups do no work).
                if (Directory.GetFiles(cacheDir, $"{id}_{database}_*.json").Length > 0)
                    continue;

                // Index exists but is backed by a different database → stale. Drop the whole set
                // (index + table files) so the metadata generator rebuilds it for this database.
                foreach (var file in Directory.GetFiles(cacheDir, $"{id}_*.json"))
                {
                    try { File.Delete(file); }
                    catch (Exception ex) { logger.LogDebug(ex, "Could not delete stale metadata file {File}", file); }
                }
                logger.LogInformation(
                    "Cleared stale AI metadata cache for datasource '{Id}' (database is now '{Database}'); it will regenerate.",
                    id, database);
            }
        }

        private static IReadOnlyList<string> ReadDatasourceIds(string catalogPath)
        {
            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(catalogPath));
                if (doc.RootElement.TryGetProperty("Datasources", out var datasources) &&
                    datasources.ValueKind == JsonValueKind.Array)
                {
                    return datasources.EnumerateArray()
                        .Where(d => d.TryGetProperty("Id", out var id) && id.ValueKind == JsonValueKind.String)
                        .Select(d => d.GetProperty("Id").GetString()!)
                        .Where(id => !string.IsNullOrEmpty(id))
                        .ToList();
                }
            }
            catch
            {
                // Malformed/missing catalog — leave the cache alone; generation will surface the error.
            }
            return Array.Empty<string>();
        }
    }
}
