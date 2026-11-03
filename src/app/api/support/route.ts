import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const categories = [
  "Account & login",
  "Tournament registration",
  "Team management",
  "Technical issue",
  "Report a player",
  "Other",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const category = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!categories.includes(category)) {
      return NextResponse.json({ error: "Choose a valid support category." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Your message must be between 10 and 5000 characters." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("Support API is missing Supabase server configuration.");
      return NextResponse.json({ error: "Support is temporarily unavailable." }, { status: 503 });
    }

    // Use the server-only service key so ticket creation and returning its reference
    // do not depend on public SELECT permissions for anonymous visitors.
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db
      .from("support_tickets")
      .insert({ email, category, message })
      .select("ticket_number")
      .single();

    if (error || !data) {
      console.error("Support ticket insert failed:", error?.message || "No ticket returned");
      return NextResponse.json({ error: "Could not create ticket. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ticket_number: data.ticket_number });
  } catch (error) {
    console.error("Support API request failed:", error);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
