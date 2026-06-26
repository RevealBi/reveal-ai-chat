namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Connection to the local Postgres server defined in <c>docker-compose.db.yml</c>
    /// (the prebuilt <c>brianlagunas/reveal-samples-db</c> image). Defaults match that
    /// image; everything is overridable via the "Database" configuration section
    /// (appsettings / env vars) so the same code runs against a container, a managed
    /// Postgres, CI, etc.
    ///
    /// Note: there is no single database name here. Each vertical is its own database on
    /// this server (retail, finance, healthcare, …); the database name comes from
    /// <c>Reveal/Metadata/catalog.json</c> per datasource and is applied by the dashboard,
    /// not forced here. This config only supplies the shared host/port/credentials.
    /// </summary>
    public static class DbConfig
    {
        public static string Host { get; private set; } = "localhost";
        public static int Port { get; private set; } = 5432;
        public static string User { get; private set; } = "reveal";
        public static string Password { get; private set; } = "reveal";

        public static void Load(IConfiguration config)
        {
            Host = config["Database:Host"] ?? Host;
            if (int.TryParse(config["Database:Port"], out var port)) Port = port;
            User = config["Database:User"] ?? User;
            Password = config["Database:Password"] ?? Password;
        }
    }
}
