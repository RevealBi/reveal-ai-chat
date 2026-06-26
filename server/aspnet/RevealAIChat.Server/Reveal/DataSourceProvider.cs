using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL;

namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Points Reveal at the sample Postgres server. Each vertical (retail, finance,
    /// healthcare, automotive, manufacturing, energy, telecom) is its own database on the
    /// same server, so all we supply here is the shared host/port — the database name
    /// comes from Reveal/Metadata/catalog.json per datasource, the AI introspects the
    /// schema, and the dashboards reference tables by name.
    ///
    /// In a real app this is the seam where you bind Reveal to YOUR data — SQL Server,
    /// Postgres, Snowflake, BigQuery, a REST API, etc. Swapping the source here is the
    /// only change needed; the AI, governance, and UI are unaffected.
    /// </summary>
    public class DataSourceProvider : IRVDataSourceProvider
    {
        public Task<RVDataSourceItem> ChangeDataSourceItemAsync(
            IRVUserContext userContext, string dashboardId, RVDataSourceItem dataSourceItem)
        {
            if (dataSourceItem.DataSource is RVPostgresDataSource ds)
                ApplyConnection(ds);

            return Task.FromResult(dataSourceItem);
        }

        public Task<RVDashboardDataSource> ChangeDataSourceAsync(
            IRVUserContext userContext, RVDashboardDataSource dataSource)
        {
            if (dataSource is RVPostgresDataSource ds)
                ApplyConnection(ds);

            return Task.FromResult(dataSource);
        }

        private static void ApplyConnection(RVPostgresDataSource ds)
        {
            ds.Host = DbConfig.Host;
            ds.Port = DbConfig.Port;
            // One Postgres server hosts every vertical as its own database (retail, finance,
            // healthcare, …). In this sample each datasource's Id IS its database name (see
            // Reveal/Metadata/catalog.json), so we route to the right database by Id. This is
            // the equivalent of the Database=<name> field in a plain connection string.
            if (!string.IsNullOrWhiteSpace(ds.Id))
                ds.Database = ds.Id;
        }
    }
}
