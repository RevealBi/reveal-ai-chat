namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Live, mutable AI settings (provider / model / key / endpoint). The runtime
    /// <see cref="RuntimeAiProvider"/> reads these on every call, so the in-app Settings
    /// dialog can change the provider, model, or key with no restart. Seeded from the
    /// encrypted store at startup and updated through <c>/api/settings/ai</c>.
    /// </summary>
    public sealed class RuntimeAiSettings
    {
        private readonly object _gate = new();
        private string _provider = "OpenAI";
        private string _model = "gpt-4.1";
        private string? _apiKey;
        private string? _endpoint;

        public RuntimeAiSettings(AppKeys? seed = null)
        {
            if (seed is not null) Apply(seed.Provider, seed.Model, seed.ApiKey, seed.Endpoint);
        }

        public string Provider { get { lock (_gate) return _provider; } }
        public string Model { get { lock (_gate) return _model; } }
        public string? Endpoint { get { lock (_gate) return _endpoint; } }
        public bool HasKey { get { lock (_gate) return !string.IsNullOrWhiteSpace(_apiKey); } }

        public (string Provider, string Model, string? ApiKey, string? Endpoint) Snapshot()
        {
            lock (_gate) return (_provider, _model, _apiKey, _endpoint);
        }

        /// <summary>Update settings. A blank apiKey keeps the existing one (lets you tweak
        /// model/endpoint without re-entering the key); blank provider/model are ignored.</summary>
        public void Apply(string? provider, string? model, string? apiKey, string? endpoint)
        {
            lock (_gate)
            {
                if (!string.IsNullOrWhiteSpace(provider)) _provider = provider.Trim();
                if (!string.IsNullOrWhiteSpace(model)) _model = model.Trim();
                if (!string.IsNullOrWhiteSpace(apiKey)) _apiKey = apiKey.Trim();
                _endpoint = string.IsNullOrWhiteSpace(endpoint) ? null : endpoint.Trim();
            }
        }

        /// <summary>Project the current settings back into an <see cref="AppKeys"/> for persistence
        /// (preserving the already-stored license).</summary>
        public AppKeys ToAppKeys(string? revealLicense)
        {
            var (provider, model, apiKey, endpoint) = Snapshot();
            return new AppKeys
            {
                RevealLicense = revealLicense,
                Provider = provider,
                Model = model,
                ApiKey = apiKey,
                Endpoint = endpoint,
            };
        }
    }
}
