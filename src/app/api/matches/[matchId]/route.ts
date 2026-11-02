import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(req:NextRequest,{params}:{params:Promise<{matchId:string}>}){
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");if(!token)return NextResponse.json({error:"Sign in required."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,auth=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
 const {data:{user},error}=await auth.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
 const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!);const {matchId}=await params;
 const {data:match}=await db.from("tournament_matches").select("id,tournament_id,round_number,match_number,team_a,team_b,winner_team,status,cybershoke_url,map_name,scheduled_at").eq("id",matchId).maybeSingle();
 if(!match)return NextResponse.json({error:"Match not found."},{status:404});
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 const {data:member}=await db.from("tournament_players").select("id").eq("tournament_id",match.tournament_id).eq("user_id",user.id).maybeSingle();
 if(profile?.role!=="SUPER_ADMIN"&&!member)return NextResponse.json({error:"Registered players only."},{status:403});
 return NextResponse.json({match});
}