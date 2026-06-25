using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;

namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Loads/saves <see cref="AppKeys"/> encrypted with ASP.NET Data Protection into a file
    /// under the config directory. In the container that directory is a Docker volume, so
    /// both the keys and the Data Protection key-ring survive the restart that applies a
    /// newly-entered license. (It's the user's own keys on their own machine, so this is
    /// tamper-resistance at rest, not a secrets vault — but it keeps them out of plain text.)
    /// </summary>
    public sealed class KeyStore
    {
        private const string Purpose = "RevealAIChat.Keys.v1";

        private readonly string _file;
        private readonly IDataProtector _protector;

        public KeyStore(string configDir, IDataProtector protector)
        {
            Directory.CreateDirectory(configDir);
            _file = Path.Combine(configDir, "keys.dat");
            _protector = protector;
        }

        public AppKeys Load()
        {
            if (!File.Exists(_file)) return new AppKeys();
            try
            {
                return JsonSerializer.Deserialize<AppKeys>(_protector.Unprotect(File.ReadAllText(_file)))
                       ?? new AppKeys();
            }
            catch
            {
                return new AppKeys(); // unreadable (e.g. lost key-ring) -> treat as unconfigured
            }
        }

        public void Save(AppKeys keys)
            => File.WriteAllText(_file, _protector.Protect(JsonSerializer.Serialize(keys)));

        public void Clear()
        {
            try { if (File.Exists(_file)) File.Delete(_file); } catch { /* ignore */ }
        }

        /// <summary>
        /// Protector for reading keys at startup, before the app's DI container exists.
        /// Built on a throwaway ServiceCollection pointed at the same key-ring + app name as
        /// the DI one, so the two encrypt/decrypt interchangeably.
        /// </summary>
        public static IDataProtector StartupProtector(string configDir)
        {
            var ring = Path.Combine(configDir, "dp-keys");
            Directory.CreateDirectory(ring);
            var services = new ServiceCollection();
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(ring))
                .SetApplicationName("RevealAIChat");
            return services.BuildServiceProvider()
                .GetRequiredService<IDataProtectionProvider>()
                .CreateProtector(Purpose);
        }

        /// <summary>Same protector, resolved from DI (used by the controller at runtime).</summary>
        public static IDataProtector DiProtector(IDataProtectionProvider provider)
            => provider.CreateProtector(Purpose);
    }
}
