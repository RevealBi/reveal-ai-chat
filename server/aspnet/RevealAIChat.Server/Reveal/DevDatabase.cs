using System.Diagnostics;

namespace RevealAIChat.Server.Reveal
{
    /// <summary>
    /// Developer convenience so pressing F5 "just works": before the app serves (in
    /// Development only) bring the Postgres container up and wait until it's healthy
    /// (and seeded, on first run). Fails soft — if Docker isn't running we log a clear
    /// hint instead of crashing, so the UI still loads.
    /// </summary>
    public static class DevDatabase
    {
        public static async Task EnsureUpAsync(string contentRoot, ILogger logger)
        {
            var compose = FindComposeFile(contentRoot);
            if (compose is null)
            {
                logger.LogWarning("docker-compose.yml not found above {Root}; skipping DB auto-start.", contentRoot);
                return;
            }

            try
            {
                logger.LogInformation("Starting Postgres (docker compose up -d --wait)...");
                var psi = new ProcessStartInfo("docker", $"compose -f \"{compose}\" up -d --wait")
                {
                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };

                using var proc = Process.Start(psi);
                if (proc is null) { logger.LogWarning("Could not launch 'docker'."); return; }

                var stderr = await proc.StandardError.ReadToEndAsync();
                await proc.WaitForExitAsync();

                if (proc.ExitCode == 0)
                    logger.LogInformation("Postgres is up and ready.");
                else
                    logger.LogWarning("`docker compose up` exited {Code}. Is Docker Desktop running?\n{Err}",
                        proc.ExitCode, stderr.Trim());
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Could not start the database via docker compose. Start Docker Desktop, " +
                    "or run `docker compose up -d` in the repo root, then restart.");
            }
        }

        private static string? FindComposeFile(string startDir)
        {
            var dir = new DirectoryInfo(startDir);
            for (int i = 0; i < 6 && dir is not null; i++, dir = dir.Parent)
            {
                var candidate = Path.Combine(dir.FullName, "docker-compose.yml");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }
    }
}
