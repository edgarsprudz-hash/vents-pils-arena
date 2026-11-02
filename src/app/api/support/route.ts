import { NextResponse } from "next/server";

export async function POST(request: Request) {
 try {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({error:"Enter a valid email address."},{status:400});
  if (!["Account & login","Tournament registration","Team management","Technical issue","Report a player","Other"].includes(subject)) return NextResponse.json({error:"Choose a valid support category."},{status:400});
  if (message.length < 10 || message.length > 5000) return NextResponse.json({error:"Your message must be between 10 and 5000 characters."},{status:400});
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return NextResponse.json({error:"Support email is not configured yet. Please contact us through Discord."},{status:503});
  const response = await fetch("https://api.resend.com/emails", {
   method:"POST", headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({from,to:["vcupsupport@gmail.com"],reply_to:email,subject:"[VENTSPILS ARENA SUPPORT] "+subject,text:"New support request\n\nFrom: "+email+"\nCategory: "+subject+"\n\nMessage:\n"+message})
  });
  if (!response.ok) return NextResponse.json({error:"We could not send your request right now. Please try again later."},{status:502});
  return NextResponse.json({ok:true});
 } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
}