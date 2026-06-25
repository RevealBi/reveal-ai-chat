using System.ClientModel;
using System.Text;
using OpenAI;
using OpenAI.Chat;
using Reveal.Sdk.AI;

namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// An <see cref="IAIProvider"/> that reads the live <see cref="RuntimeAiSettings"/> on
    /// every call, so the provider / model / key can change at runtime (via the in-app
    /// Settings dialog) with no restart. Registered once under the default provider key, so
    /// every request routes here. Faithful to the SDK's own OpenAI provider, plus a clear
    /// error when no key is set yet.
    ///
    /// Phase 1 handles OpenAI and OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, …);
    /// Anthropic / Google / Azure branch in here in phase 2.
    /// </summary>
    public sealed class RuntimeAiProvider : IAIProvider
    {
        private readonly RuntimeAiSettings _settings;

        public RuntimeAiProvider(RuntimeAiSettings settings) => _settings = settings;

        public async Task<ProviderResponse> SendPromptAsync(
            ProviderRequest request, CancellationToken cancellationToken = default)
        {
            var (_, defaultModel, apiKey, endpoint) = _settings.Snapshot();
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException(
                    "No AI provider key is configured yet. Open Settings and add one.");

            var model = request.Model ?? defaultModel;

            var client = new OpenAIClient(new ApiKeyCredential(apiKey), new OpenAIClientOptions
            {
                Endpoint = string.IsNullOrWhiteSpace(endpoint) ? null : new Uri(endpoint),
            });
            var chat = client.GetChatClient(model);

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage("You are a helpful AI assistant."),
                new UserChatMessage(request.Prompt),
            };

            // Leave options at defaults — works across chat + reasoning models, and the SDK
            // bakes everything it needs into the prompt itself.
            ClientResult<ChatCompletion> result =
                await chat.CompleteChatAsync(messages, new ChatCompletionOptions(), cancellationToken);

            var content = new StringBuilder();
            foreach (var part in result.Value.Content) content.Append(part.Text);

            return new ProviderResponse
            {
                Content = content.ToString(),
                FinishReason = MapFinishReason(result.Value.FinishReason),
                Usage = new TokenUsage
                {
                    InputTokens = result.Value.Usage.InputTokenCount,
                    OutputTokens = result.Value.Usage.OutputTokenCount,
                },
                Model = result.Value.Model,
            };
        }

        private static FinishReason MapFinishReason(ChatFinishReason reason) => reason switch
        {
            ChatFinishReason.Stop => FinishReason.Stop,
            ChatFinishReason.Length => FinishReason.Length,
            ChatFinishReason.ContentFilter => FinishReason.ContentFilter,
            _ => FinishReason.Stop,
        };
    }
}
