import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "crypto";
export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
 if(!token)return NextResponse.json({error:"Sign in first."},{status:401});
 const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const secret=process.env.STEAM_OPENID_SECRET;
 if(!secret)return NextResponse.json({error:"Steam login is not configured yet."},{status:503});
 const payload=Buffer.from(JSON.stringify({uid:user.id,exp:Date.now()+600000})).toString("base64url");
 const sig=createHmac("sha256",secret).update(payload).digest("base64url");
 const origin=new URL(req.url).origin,callback=origin+"/api/steam/callback",url=new URL("https://steamcommunity.com/openid/login");
 const params:Record<string,string>={"openid.ns":"http://specs.openid.net/auth/2.0","openid.mode":"checkid_setup","openid.return_to":callback,"openid.realm":origin,"openid.identity":"http://specs.openid.net/auth/2.0/identifier_select","openid.claimed_id":"http://specs.openid.net/auth/2.0/identifier_select"};
 Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
 const response=NextResponse.json({url:url.toString()});
 response.cookies.set("va_steam_state",payload+"."+sig,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/steam",maxAge:600});
 return response;
}