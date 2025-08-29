import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useContext } from "react";
import {
  createAPIKey,
  deleteAPIKey,
  refetchModelsForAllProviders,
} from "@/data/apikeys";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ActiveProvidersSection from "@/components/settings/tab/ActiveProviders";
import { ChatContext } from "@/context/ChatContext";
import { addPreferredModel, getAvailableModels } from "@/data/models";
import { updateModelAndProvider } from "@/data/settings";

const getBasicModelForProvider = (provider: string): string => {
  const basicModels: Record<string, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet",
    google: "gemini-1.5-flash",
    deepseek: "deepseek-chat",
    xai: "grok-3-fast",
    openrouter: "openai/gpt-3.5-turbo",
  };

  return basicModels[provider.toLowerCase()] || "gpt-3.5-turbo";
};

export function ApiKeysTab() {
  const [selectedProvider, setSelectedProvider] = useState("");
  const [customProviderName, setCustomProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const {
    activeUser,
    activeProviders,
    setActiveProviders,
    setAvailableModels,
    chatSettings,
    setChatSettings,
    setPreferredModels,
    preferredModels,
  } = useContext(ChatContext);

  const handleSaveApiKey = async () => {
    const finalProvider =
      selectedProvider === "custom"
        ? customProviderName.trim()
        : selectedProvider;

    if (!selectedProvider || !apiKey.trim() || !activeUser?.id) {
      toast.error("Please select a provider and enter an API key");
      return;
    }

    if (selectedProvider === "custom" && !customProviderName.trim()) {
      toast.error("Please enter a custom provider name");
      return;
    }

    setIsLoading(true);

    const originalProviders = [...activeProviders];

    try {
      const result = await createAPIKey(apiKey.trim(), finalProvider);

      // Handle both return types: string (ID) or object (full API key)
      const keyId = typeof result === "string" ? result : result.id;
      const keyData =
        typeof result === "string"
          ? { id: keyId, provider: finalProvider }
          : { id: result.id, provider: result.provider };

      // Update providers with the correct API key data
      setActiveProviders([...activeProviders, keyData]);

      const models = await getAvailableModels();
      setAvailableModels(models);

      // Set chat settings to use the new provider with a basic model
      const basicModelName = getBasicModelForProvider(finalProvider);

      // Find the actual model from the fetched models that matches our basic model name
      const matchingModel = models.find(
        (model) =>
          model.provider === finalProvider &&
          (model.name.toLowerCase().includes(basicModelName.toLowerCase()) ||
            model.modelId.toLowerCase().includes(basicModelName.toLowerCase()))
      );

      // If we found a matching model, use its ID, otherwise fallback to the first model from this provider
      const modelToUse =
        matchingModel ||
        models.find((model) => model.provider === finalProvider);

      if (modelToUse) {
        if (chatSettings) {
          // Update existing chat settings
          setChatSettings({
            ...chatSettings,
            provider: finalProvider,
            model: modelToUse.modelId,
          });
        } else {
          // Create new chat settings if none exist
          setChatSettings({
            id: "", // Will be set by the database
            userId: activeUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: finalProvider,
            model: modelToUse.modelId,
            promptId: null,
            reasoningEffort: null,
            temperature: null,
            maxTokens: null,
            topP: null,
            isWebSearch: false,
            isImageGeneration: false,
          });
        }
        setPreferredModels([
          ...preferredModels,
          {
            id: "",
            userId: activeUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: finalProvider,
            model: modelToUse.modelId,
          },
        ]);
        await addPreferredModel(modelToUse.modelId, finalProvider);
        await updateModelAndProvider(modelToUse.modelId, finalProvider);
      }

      toast.success("API key saved successfully");
      // Reset form
      setApiKey("");
      setSelectedProvider("");
      setCustomProviderName("");
    } catch (error) {
      // Revert the optimistic update on error
      setActiveProviders(originalProviders);
      console.error("Failed to save API key:", error);
      if (error instanceof Error) {
        // Handle specific error messages from server
        if (error.message.includes("Invalid input")) {
          toast.error("Please check your API key format and try again");
        } else if (error.message.includes("Unauthorized")) {
          toast.error("Session expired. Please sign in again");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to save API key");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!activeUser?.id) return;

    try {
      await deleteAPIKey(keyId);
      toast.success("API key deleted successfully");
      setActiveProviders(
        activeProviders.filter((provider) => provider.id !== keyId)
      );
    } catch (error) {
      console.error("Failed to delete API key:", error);
      if (error instanceof Error) {
        if (
          error.message.includes("not found") ||
          error.message.includes("unauthorized")
        ) {
          toast.error(
            "API key not found or you don't have permission to delete it"
          );
        } else if (error.message.includes("Invalid input")) {
          toast.error("Invalid request. Please try again");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to delete API key");
      }
    }
  };

  const handleRefetchModels = async () => {
    if (!activeUser?.id) return;

    if (activeProviders.length === 0) {
      toast.error("No API keys found. Please add API keys first.");
      return;
    }

    setIsRefetching(true);

    try {
      const result = await refetchModelsForAllProviders();

      // Update available models after refetch
      const models = await getAvailableModels();
      setAvailableModels(models);

      // Show detailed results
      if (result.successCount > 0) {
        toast.success(
          `Successfully refetched models for ${result.successCount}/${result.totalProviders} providers`
        );
      }

      if (result.errorCount > 0) {
        const errorProviders = result.errors.map((e) => e.provider).join(", ");
        toast.error(
          `Failed to refetch models for: ${errorProviders}. Check console for details.`
        );
      }

      if (result.successCount === 0 && result.errorCount === 0) {
        toast.info("No models were refetched");
      }
    } catch (error) {
      console.error("Failed to refetch models:", error);
      if (error instanceof Error) {
        if (error.message.includes("No API keys found")) {
          toast.error("No API keys found. Please add API keys first.");
        } else if (error.message.includes("Unauthorized")) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to refetch models");
      }
    } finally {
      setIsRefetching(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-chat-background">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground/90 text-xl">
              API Keys
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Manage your API keys for different AI services.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefetchModels}
                  disabled={isRefetching || activeProviders.length === 0}
                  className="flex items-center gap-2"
                >
                  {isRefetching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refetching...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refetch Models
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Refresh and update available models from all your configured
                  providers
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-6 min-h-0">
        {/* Add New API Key Section */}
        <form
          className="space-y-4 p-4 border rounded-lg bg-muted/50"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveApiKey();
          }}
        >
          {/* Hidden username field for accessibility - required when using password type inputs */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: "none" }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <Label className="text-base font-medium">Add New API Key</Label>

          <div className="grid gap-3">
            <Label htmlFor="provider-select">Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google AI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="xai">xAI</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="api-key-input">API Key</Label>
            <Input
              id="api-key-input"
              type="password"
              placeholder="Enter your API key..."
              value={apiKey}
              className="rounded-lg border-[.1rem] border-chat-border p-2"
              autoComplete="new-password"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={
              !selectedProvider ||
              !apiKey.trim() ||
              isLoading ||
              (selectedProvider === "custom" && !customProviderName.trim())
            }
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save API Key"
            )}
          </Button>
        </form>

        <ActiveProvidersSection
          apiKeys={activeProviders}
          customModels={[]}
          ollamaModels={[]}
          localModels={[]}
          onDeleteApiKey={handleDeleteApiKey}
        />
      </CardContent>
    </Card>
  );
}
