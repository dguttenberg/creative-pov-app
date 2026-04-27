import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

const BRAIN_ENDPOINT = process.env.BRAIN_ENDPOINT;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior creative director writing a brief for your creative team.
You write with clarity and opinion. You sound human, not corporate. You give direction, not documentation.
Your briefs replace kickoff meetings for routine work. They should take under 2 minutes to read.

You will receive interpreted project data. Transform it into a Creative POV Brief.

Output ONLY valid JSON with this exact structure:
{
  "title": "project title",
  "creative_problem": "2-3 sentences describing the core creative challenge",
  "audience_reality": ["bullet 1", "bullet 2", "bullet 3"],
  "creative_pov": ["short opinionated line 1", "line 2", "line 3", "line 4"],
  "tone_guardrails": {
    "bullets": ["guardrail 1", "guardrail 2", "guardrail 3"],
    "sample_line": "optional example of the right tone"
  },
  "watch_outs": ["watch out 1", "watch out 2"]
}

Rules:
- Total brief should be ~300 words max
- Sound like a creative director, not a strategist or PM
- Be opinionated and direct
- No jargon, no fluff
- Creative POV should feel like guidance, not requirements
- Watch-outs should be specific to this project`;

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Plain text
  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return await file.text();
  }

  // PDF
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  // DOCX
  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Images (JPG, PNG) - use Claude vision
  if (
    fileType.startsWith("image/") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png")
  ) {
    return `[IMAGE FILE: ${file.name}]`;
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

async function extractTextFromImage(
  file: File,
  anthropic: Anthropic
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract all text from this image. If it's a brief, document, or form, capture all the content. Return only the extracted text, no commentary.",
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Extract text from file
    let requestText: string;
    const fileName = file.name.toLowerCase();

    if (
      file.type.startsWith("image/") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png")
    ) {
      requestText = await extractTextFromImage(file, anthropic);
    } else {
      requestText = await extractTextFromFile(file);
    }

    if (!requestText || requestText.trim().length < 10) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Step 1: Call the Brain
    const brainResponse = await fetch(BRAIN_ENDPOINT as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_text: requestText }),
    });

    if (!brainResponse.ok) {
      return NextResponse.json(
        { error: "Failed to interpret request" },
        { status: 500 }
      );
    }

    const brainData = await brainResponse.json();
    const intent = brainData.intent_object;

    // Step 2: Generate Creative POV Brief
    const briefContext = `
Project Source: ${file.name}

INTERPRETED INTENT:
- Purpose: ${intent?.intent?.why?.stated || "Not specified"}
- Inferred Goal: ${intent?.intent?.why?.inferred || "Not specified"}
- Audience: ${intent?.intent?.who?.segments?.join(", ") || "Not specified"}
- Audience Posture: ${intent?.intent?.who?.posture || "Not specified"}
- Deliverables: ${intent?.intent?.what?.deliverables?.map((d: any) => d.deliverable_name).join(", ") || "Not specified"}
- Channels: ${intent?.intent?.where?.channels?.join(", ") || "Not specified"}
- Creative Constraints: ${intent?.intent?.where?.constraints?.join("; ") || "None specified"}
- Speed Sensitivity: ${intent?.intent?.how_hard?.speed_sensitivity || "Normal"}
- Risk Flags: ${intent?.uncertainty?.flags?.join("; ") || "None"}

ORIGINAL REQUEST:
${requestText}

Generate a Creative POV Brief for this project.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: briefContext }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate brief" },
        { status: 500 }
      );
    }

    const brief = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      brief,
    });
  } catch (err: any) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err.message || "Generation failed" },
      { status: 500 }
    );
  }
}
