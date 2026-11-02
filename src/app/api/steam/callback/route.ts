import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createHmac,timingSafeEqual} from "crypto";
export async function GET(req:NextRequest){
 const fail=(s:string)=>NextResponse.redirect(new URL("/account?steam_error="+encodeURIComponent(s),req.url));
 const secret=process.env.STEAM_OPENID_SECRET,raw=req.cookies.get("va_steam_state")?.value;
 if(!secret||!raw)return fail("Verification expired.");
 const parts=raw.split("."),payload=parts[0],sig=parts[1],expected=createHmac("sha256",secret).update(payload).digest("base64url");
 if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return fail("Invalid verification state.");
 let state:{uid:string;exp:number};try{state=JSON.parse(Buffer.from(payload,"base64url").toString());}catch{return fail("Invalid state.");}
 if(state.exp<Date.now())return fail("Verification expired.");
 const params=new URLSearchParams(req.nextUrl.searchParams);params.set("openid.mode","check_authentication");
 const check=await fetch("https://steamcommunity.com/openid/login",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params.toString(),cache:"no-store"});
 if(!check.ok||!(await check.text()).includes("is_valid:true"))return fail("Steam verification failed.");
 const claimed=req.nextUrl.searchParams.get("openid.claimed_id")||"",id=claimed.substring(claimed.lastIndexOf("/")+1);
 if(!/^[0-9]{17}$/.test(id))return fail("Invalid Steam ID.");
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
 const {data:old}=await db.from("profiles").select("id").eq("steam_id",id).maybeSingle();if(old&&old.id!==state.uid)return fail("Steam account already linked.");
 const {error}=await db.from("profiles").update({steam_id:id,steam_linked_at:new Date().toISOString()}).eq("id",state.uid);if(error)return fail("Could not save Steam account.");
 const res=NextResponse.redirect(new URL("/account?steam=linked",req.url));res.cookies.delete("va_steam_state");return res;
}