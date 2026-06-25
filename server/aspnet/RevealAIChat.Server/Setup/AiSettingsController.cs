using Microsoft.AspNetCore.Mvc;

namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Runtime AI settings — the provider / model / key the AI uses. These are read live by
    /// <see cref="RuntimeAiProvider"/> on every request, so changing them here takes effect on
    /// the next message with NO restart. The client opens the dialog automatically when no key
    /// is set, and it can be reopened any time to swap provider / model / key.
    /// </summary>
    [ApiController]
    [Route("api/settings/ai")]
    public sealed class AiSettingsController : ControllerBase
    {
        private readonly RuntimeAiSettings _ai;
        private readonly KeyStore _store;

        public AiSettingsController(RuntimeAiSettings ai, KeyStore store)
        {
            _ai = ai;
            _store = store;
        }

        [HttpGet]
        public IActionResult Get() => Ok(new
        {
            provider = _ai.Provider,
            model = _ai.Model,
            endpoint = _ai.Endpoint,
            hasKey = _ai.HasKey,
        });

        [HttpPost]
        public IActionResult Save([FromBody] AiSettingsRequest req)
        {
            _ai.Apply(req.Provider, req.Model, req.ApiKey, req.Endpoint);
            if (!_ai.HasKey)
                return BadRequest(new { error = "An API key is required for the selected provider." });

            // Persist alongside the existing license. No restart — the provider reads live.
            _store.Save(_ai.ToAppKeys(_store.Load().RevealLicense));

            return Ok(new { ok = true, provider = _ai.Provider, model = _ai.Model, hasKey = _ai.HasKey });
        }
    }

    public sealed class AiSettingsRequest
    {
        public string? Provider { get; set; }
        public string? Model { get; set; }
        public string? ApiKey { get; set; }
        public string? Endpoint { get; set; }
    }
}
