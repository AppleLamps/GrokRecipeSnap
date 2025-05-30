# Tasty-Pic-Teller

## Overview

Tasty-Pic-Teller is a web application built with React, Vite, and TypeScript, designed to be your AI-powered culinary assistant. It leverages the XAI API (specifically the Grok models) to provide users with recipes generated from food images and offer cooking assistance through an interactive chat. The application features a modern UI built with shadcn/ui and Tailwind CSS.

## Features

1.  **Food Image Analysis:** Upload a picture of a dish, and the application will use the XAI Vision API to identify it and generate a detailed recipe, including ingredients, step-by-step instructions, cooking times, servings, and difficulty level.
2.  **AI Chef Assistant:** Have questions about a recipe you're working with (perhaps one generated by the app)? Use the chat feature to ask an AI assistant for tips, ingredient substitutions, technique clarifications, and more, all within the context of the specific recipe.

## Technology Stack

* **Frontend Framework:** React
* **Language:** TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS & CSS Modules
* **UI Components:** shadcn/ui
* **State Management/Caching:** TanStack Query (@tanstack/react-query)
* **Routing:** React Router DOM
* **Forms & Validation:** React Hook Form & Zod
* **Icons:** Lucide React
* **Linting:** ESLint
* **AI Backend:** XAI API (Grok models)

## API Integration (XAI)

The application relies heavily on the XAI API (`https://api.x.ai/v1/chat/completions`) for its core AI features. An API key is required and must be configured as an environment variable.

### 1. Food Image Analysis (`src/utils/api.ts`)

* **Model:** `grok-2-vision-1212`
* **Functionality:** The `analyzeFood` function takes image data (base64 encoded), sends it to the API along with a prompt asking for a detailed recipe in plain text (specifically instructing *not* to use markdown).
* **Processing:** The function receives the text response from the API and attempts to parse it to extract structured recipe information (title, description, ingredients, instructions, timings, servings, difficulty, tags). It includes helper functions (`extractTitle`, `extractIngredients`, etc.) to parse the text, handling potential variations in the API's output format and cleaning any residual markdown. A fallback mechanism exists if parsing fails.

### 2. Chef Assistant Chat (`src/utils/chatService.ts`)

* **Model:** `grok-3-latest`
* **Functionality:** The `sendMessageToChef` function facilitates a conversation about a specific recipe. It sends the user's message, the context of the current recipe (title, ingredients, instructions summary), and the previous chat history to the API.
* **Prompting:** A detailed system prompt instructs the AI to act as a friendly, knowledgeable chef assistant, relate answers to the provided recipe context, use clear paragraphs for readability, and keep responses concise.
* **Streaming:** The function supports streaming responses by providing an `onChunk` callback, allowing the chef's reply to appear progressively in the UI. It also formats the response to ensure proper paragraph breaks.



## Setup and Running Locally

To run this project locally, you'll need Node.js and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone <YOUR_GIT_REPOSITORY_URL>
    cd <YOUR_PROJECT_DIRECTORY>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your XAI API key:
    ```env
    VITE_XAI_API_KEY=your_xai_api_key_here
    ```
    *(Refer to `src/utils/env.ts` for how environment variables are accessed)*

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, usually accessible at `http://localhost:8080`. The app will automatically reload when you make changes to the code.

## Building for Production

To create a production build:

```bash
npm run build