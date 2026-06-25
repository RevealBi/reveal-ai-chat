namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// Set when the first-run setup is saved and the host must re-initialize to apply a new
    /// Reveal license / AI provider. Program.cs runs the web host inside a loop: when this is
    /// requested and the host stops, the loop rebuilds and reruns the host in-process — so the
    /// restart behaves the same under VS F5, <c>dotnet run</c>, VS Code, and Docker, with no
    /// external supervisor. (Previously the app called <c>Environment.Exit</c> and relied on
    /// Docker's restart policy to bring it back — which never happened under F5.)
    /// </summary>
    public sealed class RestartSignal
    {
        private volatile bool _requested;

        /// <summary>True once a restart has been requested for the current host instance.</summary>
        public bool Requested => _requested;

        /// <summary>Flag that the host should restart after it stops.</summary>
        public void Request() => _requested = true;
    }
}
