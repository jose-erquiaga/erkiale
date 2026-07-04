<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2e9fe7b0-99b9-4d07-852f-7b2621fa72d8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
   - Optional: set `GEMINI_MODEL` in `.env.local` to override the default
     model (`gemini-2.0-flash`) without touching code.
3. Run the app:
   `npm run dev`
