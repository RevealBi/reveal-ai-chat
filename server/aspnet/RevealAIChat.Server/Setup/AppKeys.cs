namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Runtime configuration entered through the first-run Settings dialog and persisted
    /// encrypted: the Reveal license plus the chosen LLM provider / model / API key. This
    /// is what the SDK is configured from when no explicit config (env / user-secrets) is
    /// present.
    /// </summary>
    public sealed class AppKeys
    {
        public string? RevealLicense { get; set; }
        public string? Provider { get; set; }   // currently "OpenAI"
        public string? Model { get; set; }
        public string? ApiKey { get; set; }
        public string? Endpoint { get; set; }    // for local / OpenAI-compatible endpoints
    }

    /// <summary>
    /// Startup snapshot the client reads from <c>/api/setup/status</c>. "Configured" means a
    /// Reveal license is present (full mode); the AI key is a separate, runtime concern.
    /// </summary>
    public sealed record SetupState(bool Configured, bool LicenseError);
}
