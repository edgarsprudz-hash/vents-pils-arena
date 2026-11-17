import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const categories = [
  "Account & login",
  "Tournament registration",
  "Team management",
  "Technical issue",
  "Other",
] as const;

type ChatMessage = { role: "user" | "assistant"; content: string };

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 15;
}

const instructions = (language: string, page: string) => `
You are VENTSPILS ARENA's on-site technical and tournament support assistant.
Reply only in the visitor's selected website language: ${language}.
Current page: ${page}.
Be concise, calm, practical, and friendly. Give one or two actionable steps at a time.
Help with account access, profile settings, 2FA, Steam linking, friends, tournament registration, teams, matches, brackets, and site navigation.
Do not claim you can inspect private account data, change settings, or directly fix the website.
Never invent tournament dates, availability, account state, match results, policies, or admin actions. If information is not in this prompt or the visitor's message, say you cannot verify it.
Never request passwords, one-time 2FA codes, API keys, payment details, or other secrets.
If the issue is unresolved after reasonable troubleshooting, or is clearly a bug/outage/account-specific issue you cannot inspect, offer to create a support ticket. To create one, collect a reply email address if the visitor has not supplied one. The visitor does not need an account.
Once you have an email and enough information, call create_support_ticket. Include a clear summary and the relevant conversation details in the ticket. Do not tell the visitor a ticket was created until the tool succeeds.
If ticket creation fails, apologize and direct the visitor to the existing Technical Support page.
Do not create tickets for general questions that you can answer. Do not create more than one ticket for the same conversation.
`;

const tool = {
  type: "function",
  name: "create_support_ticket",
  description: "Create a ticket in the existing VENTSPILS ARENA technical support inbox when the visitor's problem cannot be resolved.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      email: { type: "string", description: "A valid email address where support can reply." },
      category: { type: "string", enum: [...categories] },
      summary: { type: "string", description: "A concise summary of the unresolved issue and troubleshooting already attempted." },
    },
    required: ["email", "category", "summary"],
    additionalProperties: false,
  },
};

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(forwarded)) {
    return NextResponse.json({ error: "Too many messages. Please wait a minute and try again." }, { status: 429 });
  }

  try {
    if (!process.env.aikey) {
      return NextResponse.json({ error: "The assistant is not configured yet." }, { status: 503 });
    }
    const body = await request.json();
    const language = body.language === "ru" ? "Russian" : body.language === "lv" ? "Latvian" : "English";
    const page = typeof body.page === "string" ? body.page.slice(0, 180) : "/";
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) as ChatMessage[] : [];
    if (!messages.length || messages.some((m) => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 2000)) {
      return NextResponse.json({ error: "Please send a valid message." }, { status: 400 });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.aikey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        instructions: instructions(language, page),
        input: messages.map((m) => ({ role: m.role, content: m.content })),
        tools: [tool],
        tool_choice: "auto",
        reasoning: { effort: "low" },
        max_output_tokens: 500,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    const result = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error("OpenAI assistant request failed:", result?.error?.code || result?.error?.type || openaiResponse.status);
      return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 502 });
    }

    const calls = Array.isArray(result.output) ? result.output.filter((item: any) => item.type === "function_call" && item.name === "create_support_ticket") : [];
    if (calls.length) {
      const call = calls[0];
      let args: any;
      try { args = JSON.parse(call.arguments || "{}"); } catch { args = {}; }
      if (!validEmail(args.email) || !categories.includes(args.category) || typeof args.summary !== "string" || args.summary.trim().length < 8) {
        return NextResponse.json({ reply: language === "Russian" ? "Чтобы оформить обращение, напишите, пожалуйста, действующий email для ответа." : language === "Latvian" ? "Lai izveidotu pieteikumu, lūdzu, norādiet derīgu e-pasta adresi atbildei." : "Please provide a valid email address so I can create the support ticket.", ticketCreated: false });
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey) {
        console.error("Assistant ticket creation is missing server-side Supabase configuration.");
        return NextResponse.json({ error: "Ticket creation is temporarily unavailable." }, { status: 503 });
      }
      const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const transcript = messages.map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`).join("\n");
      const ticketMessage = [
        "Created automatically by VENTSPILS ARENA AI assistant.",
        `Page: ${page}`,
        "",
        "AI summary:",
        args.summary.trim().slice(0, 2500),
        "",
        "Conversation:",
        transcript.slice(-9000),
      ].join("\n").slice(0, 5000);

      const { data, error } = await db.from("support_tickets")
        .insert({ email: args.email.trim(), category: args.category, message: ticketMessage })
        .select("ticket_number").single();
      if (error || !data) {
        console.error("AI support ticket insert failed:", error?.message || "No ticket returned");
        return NextResponse.json({ error: "I couldn't create the ticket. Please use the Technical Support page." }, { status: 500 });
      }

      const followup = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.aikey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          instructions: instructions(language, page) + "\nThe support ticket was successfully created. Confirm this clearly and include the ticket number. Do not call any tools.",
          input: [
            ...result.output,
            { type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ success: true, ticket_number: data.ticket_number }) },
          ],
          tool_choice: "none",
          max_output_tokens: 180,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const finalResult = await followup.json();
      const reply = followup.ok && typeof finalResult.output_text === "string" && finalResult.output_text.trim()
        ? finalResult.output_text.trim()
        : language === "Russian" ? `Обращение создано. Номер тикета: #${data.ticket_number}. Администратор сможет связаться с вами по указанному email.`
        : language === "Latvian" ? `Pieteikums izveidots. Biļetes numurs: #${data.ticket_number}. Administrators varēs ar jums sazināties pa norādīto e-pastu.`
        : `Your support ticket has been created. Ticket #${data.ticket_number}. An administrator can contact you at the email you provided.`;
      return NextResponse.json({ reply, ticketCreated: true, ticketNumber: data.ticket_number });
    }

    const outputText = Array.isArray(result.output)
      ? result.output
          .filter((item: any) => item.type === "message" && Array.isArray(item.content))
          .flatMap((item: any) => item.content)
          .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
          .map((part: any) => part.text)
          .join("\\n")
      : "";
    const reply = (typeof result.output_text === "string" && result.output_text.trim()
      ? result.output_text
      : outputText).trim();
    if (!reply) {
      console.error("OpenAI assistant returned no text:", JSON.stringify({
        status: result.status,
        outputTypes: Array.isArray(result.output) ? result.output.map((item: any) => item.type) : [],
        incompleteReason: result.incomplete_details?.reason || null,
      }));
      return NextResponse.json({ error: "The assistant returned an empty reply. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ reply, ticketCreated: false });
  } catch (error) {
    console.error("Assistant route error:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
