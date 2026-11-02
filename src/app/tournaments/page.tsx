"use client";

import { useEffect, useState } from "react";
import ArenaSection from "../components/ArenaSection";
import { supabase } from "../../lib/supabase";

type Tournament = { id:string; title:string; game:string; description:string; event_date:string|null; location:string; status:string; format:string };
export default function Page(){
  const [items,setItems]=useState<Tournament[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      if(!supabase){setLoaded(true);return;}
      const {data,error}=await supabase.from("tournaments").select("id,title,game,description,event_date,location,status,format").in("status",["REGISTRATION","LIVE"]).order("event_date",{ascending:true});
      if(active){if(!error)setItems(data||[]);setLoaded(true);}
    }
    load();
    return ()=>{active=false;};
  },[]);
  const cards=items.map((item)=>({
    tag:item.game+" · "+item.status,
    title:item.title,
    description:[item.event_date?new Date(item.event_date).toLocaleString():"Date to be announced",item.location,item.format,item.description].filter(Boolean).join(" · "),
    href:"/tournaments/"+item.id,
    action:"VIEW & REGISTER",
    accent:item.game.toUpperCase().slice(0,3)
  }));
  return <ArenaSection section="TOURNAMENTS" title="TOURNAMENTS" accent="." description="Find your next challenge. Follow upcoming competitions hosted by VENTSPILS ARENA." cards={cards} emptyTitle={loaded?"NO OPEN TOURNAMENTS YET":"LOADING TOURNAMENTS"} emptyText={loaded?"Published tournaments will appear here when their status is set to REGISTRATION or LIVE in the admin panel.":"Loading events from the arena database."}/>;
}
