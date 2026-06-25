namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Connection to the local Postgres database defined in <c>docker-compose.yml</c>.
    /// Defaults match the compose file; everything is overridable via the "Database"
    /// configuration section (appsettings / env vars) so the same code runs against a
    /// container, a managed Postgres, CI, etc.
    /// </summary>
    public static class DbConfig
    {
        public static string Host { get; private set; } = "localhost";
        public static int Port { get; private set; } = 5432;
        public static string Database { get; private set; } = "revealaichat";
        public static string User { get; private set; } = "reveal";
        public static string Password { get; private set; } = "reveal_ai_chat";

        public static void Load(IConfiguration config)
        {
            Host = config["Database:Host"] ?? Host;
            if (int.TryParse(config["Database:Port"], out var port)) Port = port;
            Database = config["Database:Name"] ?? Database;
            User = config["Database:User"] ?? User;
            Password = config["Database:Password"] ?? Password;
        }
    }
}
