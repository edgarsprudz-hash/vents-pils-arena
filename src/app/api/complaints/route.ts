import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const categories = ["Cheating","Rule Violation","Unsportsmanlike Conduct","Match Manipulation","Team Violation","Referee Complaint","Staff Complaint"];
function clients(token?: string) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY!;
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 return {auth,db,token};
}
async function identity(req:NextRequest) {
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
 if(!token) return null;
 const {auth}=clients(token);
 const {data,error}=await auth.auth.getUser(token);
 return error||!data.user ? null : data.user;
}
export async function POST(req:NextRequest) {
 try {
  const user=await identity(req); if(!user)return NextResponse.json({error:"Sign in to submit a complaint."},{status:401});
  const body=await req.json();
  const category=String(body.category||""); const reported_player=String(body.reported_player||"").trim();
  const subject=String(body.subject||"").trim(); const description=String(body.description||"").trim();
  const evidence_url=String(body.evidence_url||"").trim();
  if(!categories.includes(category))return NextResponse.json({error:"Choose a valid complaint category."},{status:400});
  if(reported_player.length<2||reported_player.length>100||subject.length<4||subject.length>160||description.length<20||description.length>5000)return NextResponse.json({error:"Check the reported player, subject and description lengths."},{status:400});
  if(evidence_url && (!/^https:\/\//i.test(evidence_url)||evidence_url.length>1000))return NextResponse.json({error:"Evidence must be a valid HTTPS link."},{status:400});
  const {db}=clients();
  const {data,error}=await db.from("complaints").insert({complainant_id:user.id,category,reported_player,subject,description,evidence_url:evidence_url||null,tournament_id:body.tournament_id||null,match_reference:String(body.match_reference||"").trim()||null}).select("id,complaint_number,status,created_at").single();
  if(error){console.error("Complaint insert failed:",error.message);return NextResponse.json({error:"Could not submit complaint. Check that the complaints migration has been run."},{status:500});}
  return NextResponse.json({ok:true,complaint:data});
 } catch(e){console.error("Complaint API error:",e);return NextResponse.json({error:"Invalid request."},{status:400});}
}
export async function GET(req:NextRequest) {
 const user=await identity(req); if(!user)return NextResponse.json({error:"Sign in first."},{status:401});
 const {db}=clients();
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 const isAdmin=profile?.role==="SUPER_ADMIN";
 const query=db.from("complaints").select("*").order("created_at",{ascending:false});
 const {data,error}=isAdmin?await query:await query.eq("complainant_id",user.id);
 if(error)return NextResponse.json({error:"Could not load complaints."},{status:500});
 return NextResponse.json({complaints:data||[],isAdmin});
}
export async function PATCH(req:NextRequest) {
 const user=await identity(req); if(!user)return NextResponse.json({error:"Sign in first."},{status:401});
 const {db}=clients();
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 const body=await req.json();
 if(profile?.role==="SUPER_ADMIN") {
  const allowed=["PENDING","IN_REVIEW","EVIDENCE_REQUESTED","APPROVED","REJECTED","CLOSED","APPEAL_REVIEW"];
  if(!allowed.includes(body.status)||typeof body.id!=="string")return NextResponse.json({error:"Invalid update."},{status:400});
  const update:any={status:body.status,reviewer_id:user.id,updated_at:new Date().toISOString()};
  if(typeof body.verdict==="string")update.verdict=body.verdict.slice(0,5000);
  if(body.status==="EVIDENCE_REQUESTED")update.evidence_deadline=new Date(Date.now()+48*60*60*1000).toISOString();
  const {error}=await db.from("complaints").update(update).eq("id",body.id);
  if(error)return NextResponse.json({error:"Could not update complaint."},{status:500});
  if(typeof body.message==="string"&&body.message.trim()){
   const {error:msgError}=await db.from("complaint_messages").insert({complaint_id:body.id,sender_id:user.id,message:body.message.trim().slice(0,4000),internal:!!body.internal});
   if(msgError)return NextResponse.json({error:"Status saved, but message could not be added."},{status:500});
  }
  return NextResponse.json({ok:true});
 }
 if(body.action==="appeal"&&typeof body.id==="string") {
  const appeal=String(body.appeal||"").trim();
  if(appeal.length<20||appeal.length>4000)return NextResponse.json({error:"Appeal must be between 20 and 4000 characters."},{status:400});
  const {data:row}=await db.from("complaints").select("id,status,appeal_used").eq("id",body.id).eq("complainant_id",user.id).maybeSingle();
  if(!row||row.appeal_used||!["APPROVED","REJECTED","CLOSED"].includes(row.status))return NextResponse.json({error:"This complaint cannot be appealed."},{status:400});
  const {error}=await db.from("complaints").update({appeal_text:appeal,appeal_used:true,appeal_submitted_at:new Date().toISOString(),status:"APPEAL_REVIEW",updated_at:new Date().toISOString()}).eq("id",body.id).eq("complainant_id",user.id);
  if(error)return NextResponse.json({error:"Could not submit appeal."},{status:500});
  return NextResponse.json({ok:true});
 }
 return NextResponse.json({error:"Access denied."},{status:403});
}
