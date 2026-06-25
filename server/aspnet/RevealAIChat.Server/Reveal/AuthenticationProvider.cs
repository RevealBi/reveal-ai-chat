using Reveal.Sdk;
using Reveal.Sdk.Data;
using Reveal.Sdk.Data.PostgreSQL;

namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Supplies credentials for the Postgres datasource. In a real app this is where you
    /// resolve per-user / per-tenant credentials (from a secret store, the signed-in
    /// user, etc.) — never hard-coded. Here it's the local sample database.
    /// </summary>
    public class AuthenticationProvider : IRVAuthenticationProvider
    {
        public Task<IRVDataSourceCredential> ResolveCredentialsAsync(
            IRVUserContext userContext, RVDashboardDataSource dataSource)
        {
            IRVDataSourceCredential? credential = null;

            if (dataSource is RVPostgresDataSource)
                credential = new RVUsernamePasswordDataSourceCredential(DbConfig.User, DbConfig.Password);

            return Task.FromResult(credential!);
        }
    }
}
