"use client";

import { useEffect, useState } from "react";
import ArenaSection from "../components/ArenaSection";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../components/LanguageProvider";

type Tournament = { id:string; title:string; game:string; description:string; event_date:string|null; location:string; status:string; format:string };
export default function Page(){
  const {language}=useLanguage();
  const copy=language==="ru"?{tag:"ТУРНИРЫ",title:"ТУРНИРЫ",desc:"Найди следующий вызов. Следи за предстоящими соревнованиями VENTSPILS ARENA.",empty:"ПОКА НЕТ ОТКРЫТЫХ ТУРНИРОВ",loading:"ЗАГРУЗКА ТУРНИРОВ",date:"Дата уточняется",action:"ПОДРОБНЕЕ И РЕГИСТРАЦИЯ"}:language==="lv"?{tag:"TURNĪRI",title:"TURNĪRI",desc:"Atrodi nākamo izaicinājumu. Seko līdzi VENTSPILS ARENA sacensībām.",empty:"PAGAIDĀM NAV ATVĒRTU TURNĪRU",loading:"IELĀDĒ TURNĪRUS",date:"Datums tiks paziņots",action:"SKATĪT UN REĢISTRĒTIES"}:{tag:"TOURNAMENTS",title:"TOURNAMENTS",desc:"Find your next challenge. Follow upcoming competitions hosted by VENTSPILS ARENA.",empty:"NO OPEN TOURNAMENTS YET",loading:"LOADING TOURNAMENTS",date:"Date to be announced",action:copy.action};
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
    description:[item.event_date?new Date(item.event_date).toLocaleString(language==="ru"?"ru-RU":language==="lv"?"lv-LV":"en-GB"):copy.date,item.location,item.format,item.description].filter(Boolean).join(" · "),
    href:"/tournaments/"+item.id,
    action:"VIEW & REGISTER",
    accent:item.game.toUpperCase().slice(0,3)
  }));
  return <ArenaSection section={copy.tag} title={copy.title} accent="." description={copy.desc} cards={cards} emptyTitle={loaded?copy.empty:copy.loading} emptyText={loaded?(language==="ru"?"Опубликованные турниры появятся здесь после открытия регистрации.":language==="lv"?"Publicētie turnīri šeit parādīsies, tiklīdz tiks atvērta reģistrācija.":"Published tournaments will appear here when registration opens."):(language==="ru"?"Загружаем события из базы арены.":language==="lv"?"Ielādē arēnas pasākumus.":"Loading events from the arena database.")}/>;
}
