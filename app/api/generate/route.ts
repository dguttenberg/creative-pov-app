import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const BRAIN_ENDPOINT = process.env.BRAIN_ENDPOINT;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior creative director writing a brief for your creative team.
You write with clarity and opinion. You sound human, not corporate. You give direction, not documentation.
Your briefs replace kickoff meetings for routine work. They should take under 2 minutes to read.

You will receive a project request and some supplementary context. Transform it into a Creative POV Brief.

Output ONLY valid JSON with this exact structure:
{
  "title": "project title",
  "main_message": "One sentence. The single thing the audience should think, feel, or do after seeing this work.",
  "explicitly_requested": ["direct client ask 1", "direct client ask 2"],
  "creative_problem": "2-3 sentences describing the core creative challenge",
  "audience_reality": ["bullet 1", "bullet 2", "bullet 3"],
  "creative_pov": ["short opinionated line 1", "line 2"],
  "tone_guardrails": {
    "bullets": ["guardrail 1", "guardrail 2", "guardrail 3"],
    "sample_line": "optional example of the right tone"
  },
  "deliverables": ["deliverable 1", "deliverable 2"],
  "watch_outs": ["watch out 1", "watch out 2"]
}

Rules:
- Total brief should be ~300 words max
- Sound like a creative director, not a strategist or PM
- Be opinionated and direct
- No jargon, no fluff
- CRITICAL: Only include claims — about audience, context, or strategy — that are directly supported by the original request. Do not infer, embellish, or invent. If the request doesn't say it, don't say it.
- main_message must be a single declarative sentence rooted in what the request actually asks for
- explicitly_requested: lift these directly and literally from the source material — these are client mandates, not interpretation
- creative_pov should be 2 lines max — opinionated guidance, not requirements
- deliverables: list exactly what is being asked for, taken from the request — no additions
- watch_outs should be specific to this project`;

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return await file.text();
  }

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);
    return data.text;
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

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

    const briefContext = `
Project Source: ${file.name}

ORIGINAL REQUEST (primary source — trust this above all else):
${requestText}

SUPPLEMENTARY CONTEXT (use only where directly supported by the original request above — do not introduce claims from here that aren't in the request):
- Stated Purpose: ${intent?.intent?.why?.stated || "Not specified"}
- Deliverables: ${intent?.intent?.what?.deliverables?.map((d: any) => d.deliverable_name).join(", ") || "Not specified"}
- Channels: ${intent?.intent?.where?.channels?.join(", ") || "Not specified"}
- Creative Constraints: ${intent?.intent?.where?.constraints?.join("; ") || "None specified"}

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
