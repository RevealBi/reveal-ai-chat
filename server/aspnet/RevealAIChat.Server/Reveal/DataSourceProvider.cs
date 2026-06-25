using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL;

namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Points Reveal at the sample Postgres database. Every vertical (automotive,
    /// retail, manufacturing, healthcare, energy) is a table in the same database, so
    /// all we do here is supply the connection — the AI introspects the schema and the
    /// dashboards reference tables by name.
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
            ds.Database = DbConfig.Database;
        }
    }
}
