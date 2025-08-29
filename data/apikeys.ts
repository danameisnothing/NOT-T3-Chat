"use server";
import { checkUser } from "@/lib/auth/check";
import { prisma } from "@/prisma";
import { z } from "zod";
import { encrypt } from "@/lib/encryption/encrypt";
import { populateOpenRouterModels } from "@/scripts/populate-openrouter-models";
import { populateAnthropicModels } from "@/scripts/populate-anthropic-models";
import { populateOpenAIModels } from "@/scripts/populate-openai-models";
import { populateGoogleModels } from "@/scripts/populate-google-models";
import { populateDeepSeekModels } from "@/scripts/populate-deepseek-models";
import { populateXaiModels } from "@/scripts/populate-xai-models";
import { decrypt } from "@/lib/encryption/encrypt";

// Input validation schemas
const providerSchema = z
  .enum([
    "openai",
    "anthropic",
    "google",
    "deepseek",
    "xai",
    "custom",
    "openrouter",
  ])
  .or(z.string().min(1).max(100));
const apiKeySchema = z.string().min(1).max(500).trim();

export const createAPIKey = async (key: string, provider: string) => {
  try {
    // Validate inputs
    const validatedKey = apiKeySchema.parse(key);
    const validatedProvider = providerSchema.parse(provider);
    const { userId } = await checkUser();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // Encrypt the API key before storing
    const encryptedKey = await encrypt(validatedKey);

    if (validatedProvider.toLowerCase() === "openrouter") {
      console.log("Populating OpenRouter models");
      await populateOpenRouterModels();
    }
    if (validatedProvider.toLowerCase() === "anthropic") {
      await populateAnthropicModels(validatedKey);
    }
    if (validatedProvider.toLowerCase() === "openai") {
      await populateOpenAIModels(validatedKey);
    }
    if (validatedProvider.toLowerCase() === "google") {
      await populateGoogleModels(validatedKey);
    }
    if (validatedProvider.toLowerCase() === "deepseek") {
      await populateDeepSeekModels(validatedKey);
    }
    if (validatedProvider.toLowerCase() === "xai") {
      await populateXaiModels(validatedKey);
    }

    const existingKey = await prisma.apiKey.findFirst({
      where: {
        userId: userId,
        provider: validatedProvider,
      },
    });

    if (existingKey) {
      const apiKey = await prisma.apiKey.update({
        where: {
          id: existingKey.id,
        },
        data: {
          key: encryptedKey,
          provider: validatedProvider,
        },
      });
      return apiKey;
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        key: encryptedKey,
        provider: validatedProvider,
        userId: userId,
      },
    });
    return apiKey.id;
  } catch (error) {
    console.error("Error creating API key:", error);
    if (error instanceof z.ZodError) {
      throw new Error("Invalid input data");
    }
    throw new Error("Failed to create API key");
  }
};

export const deleteAPIKey = async (keyId: string) => {
  try {
    const validatedKeyId = z.string().cuid().parse(keyId);

    const { userId } = await checkUser();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // CRITICAL: Verify the API key belongs to the authenticated user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: validatedKeyId,
        userId: userId, // This ensures only the owner can delete
      },
    });

    if (!apiKey) {
      throw new Error("API key not found or unauthorized");
    }

    await prisma.apiKey.delete({
      where: {
        id: validatedKeyId,
      },
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    if (error instanceof z.ZodError) {
      throw new Error("Invalid input data");
    }
    throw new Error("Failed to delete API key");
  }
};

export const refetchModelsForAllProviders = async () => {
  try {
    const { userId } = await checkUser();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get all user's API keys
    const userApiKeys = await prisma.apiKey.findMany({
      where: {
        userId: userId,
      },
    });

    if (userApiKeys.length === 0) {
      throw new Error("No API keys found");
    }

    const results = [];
    const errors = [];

    // Process each API key and refetch models
    for (const apiKey of userApiKeys) {
      try {
        const decryptedKey = await decrypt(apiKey.key);
        const provider = apiKey.provider.toLowerCase();

        console.log(`Refetching models for provider: ${provider}`);

        // Delete existing models first so populate functions will run
        switch (provider) {
          case "openrouter":
            await prisma.openRouterModel.deleteMany({});
            await populateOpenRouterModels();
            break;
          case "anthropic":
            await prisma.anthropicModel.deleteMany({});
            await populateAnthropicModels(decryptedKey);
            break;
          case "openai":
            await prisma.openaiModel.deleteMany({});
            await populateOpenAIModels(decryptedKey);
            break;
          case "google":
            await prisma.googleModel.deleteMany({});
            await populateGoogleModels(decryptedKey);
            break;
          case "deepseek":
            await prisma.deepSeekModel.deleteMany({});
            await populateDeepSeekModels(decryptedKey);
            break;
          case "xai":
            await prisma.xaiModel.deleteMany({});
            await populateXaiModels(decryptedKey);
            break;
          default:
            console.warn(`Unknown provider: ${provider}`);
            continue;
        }

        results.push({
          provider: provider,
          success: true,
          message: `Successfully refetched models for ${provider}`,
        });
      } catch (error) {
        console.error(`Error refetching models for ${apiKey.provider}:`, error);
        errors.push({
          provider: apiKey.provider,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: results,
      errors: errors,
      totalProviders: userApiKeys.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  } catch (error) {
    console.error("Error refetching models:", error);
    if (error instanceof z.ZodError) {
      throw new Error("Invalid input data");
    }
    throw new Error("Failed to refetch models");
  }
};
