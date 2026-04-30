import { config } from "dotenv";
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Load .env.local if it exists (legacy mode). In Doppler mode, GEMINI_API_KEY
// is injected by `doppler run --`, so this dotenv call is a no-op and we read
// straight from process.env.
config({ path: join(projectRoot, ".env.local") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  const dopplerMode = existsSync(join(projectRoot, ".doppler.yaml"));
  console.error("");
  console.error("ERROR: GEMINI_API_KEY is not set.");
  console.error("");
  console.error("HOW TO OBTAIN A KEY:");
  console.error("  1. Open Google AI Studio:  https://aistudio.google.com/app/apikey");
  console.error("  2. Sign in with a Google account.");
  console.error("  3. Click \"Create API key\" (free tier is sufficient for image generation).");
  console.error("  4. Copy the key — it starts with \"AIza\" and is ~39 characters.");
  console.error("");
  if (dopplerMode) {
    console.error("HOW TO ADD IT (Doppler mode — this repo has .doppler.yaml):");
    console.error("  doppler secrets set GEMINI_API_KEY=<paste-key> --config dev");
    console.error("");
    console.error("  Then re-run the original command. The Doppler-aware caller will");
    console.error("  inject it via `doppler run --` automatically.");
    console.error("");
    console.error("ALTERNATIVE (one-off, won't persist):");
    console.error("  GEMINI_API_KEY=<paste-key> node scripts/generate-image.js ...");
  } else {
    console.error("HOW TO ADD IT (legacy mode — .env.local):");
    console.error("  Open .env.local in this project root and add this line:");
    console.error("");
    console.error("    GEMINI_API_KEY=<paste-key>");
    console.error("");
    console.error("  Save the file, then re-run the original command.");
  }
  console.error("");
  process.exit(1);
}

async function generateImage(prompt, outputPath, options = {}) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

  // Build generation config with optional aspect ratio
  const generationConfig = {
    responseModalities: ["IMAGE"],
  };

  // Add image config if aspect ratio specified
  if (options.aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: options.aspectRatio,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract image data
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates in response");
  }

  const imagePart = candidate.content?.parts?.find(p => p.inlineData);
  if (!imagePart) {
    console.log("Response structure:", JSON.stringify(data, null, 2).slice(0, 500));
    throw new Error("No image data in response");
  }

  const imageData = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType;

  // Decode base64 and save
  const buffer = Buffer.from(imageData, "base64");
  writeFileSync(outputPath, buffer);

  console.log(`Image saved to: ${outputPath}`);
  console.log(`MIME type: ${mimeType}`);
  console.log(`Size: ${buffer.length} bytes`);
}

// Show help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage: node generate-image.js "prompt" "output-path" [options]

Options:
  --aspect-ratio, -ar  Set aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4, 21:9)
  --help, -h           Show this help message

Examples:
  node generate-image.js "A sunset over mountains" output.png
  node generate-image.js "Blog banner about coding" banner.jpg --aspect-ratio 16:9
  node generate-image.js "Professional tech header" public/blog/images/header.jpg -ar 16:9
`);
  process.exit(0);
}

// Parse command line arguments
// Usage: node generate-image.js "prompt" "output-path" [--aspect-ratio 16:9]
const args = process.argv.slice(2);
let prompt = "";
let outputPath = "";
let aspectRatio = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--aspect-ratio" || args[i] === "-ar") {
    aspectRatio = args[++i];
  } else if (!prompt) {
    prompt = args[i];
  } else if (!outputPath) {
    outputPath = args[i];
  }
}

// Defaults
prompt = prompt || "A professional blog header image, modern tech aesthetic";
outputPath = outputPath || join(projectRoot, "output.png");

console.log(`Generating image for: "${prompt}"`);
if (aspectRatio) {
  console.log(`Aspect ratio: ${aspectRatio}`);
}

generateImage(prompt, outputPath, { aspectRatio }).catch(console.error);
