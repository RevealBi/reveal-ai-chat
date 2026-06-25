namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Keys captured in the first-run setup dialog and persisted encrypted: the Reveal license
    /// plus the chosen LLM provider and its connection settings. Used to configure the SDK when
    /// no explicit config (env / user-secrets) is present.
    /// </summary>
    public sealed class AppKeys
    {
        public string? RevealLicense { get; set; }

        /// <summary>"OpenAI" | "Anthropic" | "AzureOpenAI".</summary>
        public string? Provider { get; set; }
        public string? ApiKey { get; set; }
        public string? Model { get; set; }       // OpenAI / Anthropic model id
        public string? Endpoint { get; set; }     // OpenAI-compatible base URL, or the Azure resource endpoint
        public string? Deployment { get; set; }   // Azure OpenAI deployment name
    }

    /// <summary>
    /// Snapshot the client reads from <c>/api/setup/status</c> to render the setup dialog.
    /// <list type="bullet">
    /// <item><c>Configured</c> — a license AND an AI key are present, so the app booted in full mode.</item>
    /// <item><c>LicenseNeeded</c> — whether to show the license field (false when a license already
    /// came from env, a file, or the native SDK license).</item>
    /// </list>
    /// The AI fields are echoed back (without the secret) so the dialog can prefill them.
    /// </summary>
    public sealed record SetupState(
        bool Configured,
        bool LicenseError,
        bool LicenseNeeded,
        string Provider,
        string? Model,
        string? Endpoint,
        string? Deployment,
        bool HasKey);
}
