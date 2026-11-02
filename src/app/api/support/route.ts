import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
 try {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const category = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return NextResponse.json({error:"Enter a valid email address."},{status:400});
  if (!["Account & login","Tournament registration","Team management","Technical issue","Report a player","Other"].includes(category)) return NextResponse.json({error:"Choose a valid support category."},{status:400});
  if (message.length < 10 || message.length > 5000) return NextResponse.json({error:"Your message must be between 10 and 5000 characters."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return NextResponse.json({error:"Support is not configured."},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from("support_tickets").insert({email,category,message}).select("ticket_number").single();
  if(error) return NextResponse.json({error:"Could not create ticket."},{status:500});
  return NextResponse.json({ok:true,ticket_number:data.ticket_number});
 } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
}