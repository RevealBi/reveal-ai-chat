using Microsoft.AspNetCore.Mvc;

namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// First-run LICENSE setup. The Reveal license is required at startup, so when none is
    /// configured (env / secret / file / store) the app boots in setup mode, the client shows
    /// the license dialog, and POSTing here saves it and restarts so Reveal can initialize.
    /// (The AI provider / model / key are NOT here — those are runtime; see
    /// <see cref="AiSettingsController"/>.)
    /// </summary>
    [ApiController]
    [Route("api/setup")]
    public sealed class SetupController : ControllerBase
    {
        private readonly KeyStore _store;
        private readonly SetupState _state;

        public SetupController(KeyStore store, SetupState state)
        {
            _store = store;
            _state = state;
        }

        [HttpGet("status")]
        public IActionResult Status() => Ok(new
        {
            configured = _state.Configured,
            licenseError = _state.LicenseError,
        });

        [HttpPost]
        public IActionResult SaveLicense([FromBody] LicenseRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.License))
                return BadRequest(new { error = "A Reveal license is required." });

            var keys = _store.Load();
            keys.RevealLicense = req.License.Trim();
            _store.Save(keys);

            // The license initializes at startup, so apply by restarting. Docker's restart
            // policy brings the container right back; the client polls status and reloads.
            _ = Task.Run(async () => { await Task.Delay(700); Environment.Exit(0); });
            return Ok(new { restarting = true });
        }
    }

    public sealed class LicenseRequest
    {
        public string? License { get; set; }
    }
}
