/**
 * Environment variables utility
 * 
 * This file provides type-safe access to environment variables.
 * It also handles fallbacks and validation for required variables.
 */

// Define your environment variables here
interface EnvVariables {
  XAI_API_KEY: string;
  // Add more environment variables as needed
}

// Get an environment variable with type safety
export function getEnvVariable(key: keyof EnvVariables): string {
  const value = import.meta.env[`VITE_${key}`];
  
  if (value === undefined) {
    console.warn(`Environment variable ${key} is not defined`);
    return '';
  }
  
  return value;
}

// Get the XAI API key
export function getXaiApiKey(): string {
  return getEnvVariable('XAI_API_KEY');
}

// Check if we're in a production environment
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

// Check if we're in a development environment
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
} 