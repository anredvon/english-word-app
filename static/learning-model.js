/* Shared learning model — one source of truth for mastery and garden growth. */
(() => {
  const num=v=>Number(v||0);
  function mastery(w){
    const correct=num(w.correct),wrong=num(w.wrong),attempts=num(w.attempts)||correct+wrong,ratio=attempts?correct/attempts:0;
    if(!attempts)return{key:'new',label:'처음 만남',attempts,ratio};
    if(attempts<2)return{key:'learning',label:'배우는 중',attempts,ratio};
    if(attempts<3||ratio<.7)return{key:'growing',label:'익숙해지는 중',attempts,ratio};
    if(ratio<.8)return{key:'almost',label:'거의 암기',attempts,ratio};
    return{key:'master',label:'완전 암기',attempts,ratio};
  }
  function needsReview(w){const m=mastery(w);return num(w.wrong)>0&&m.ratio<.7}
  function growth(words){
    const list=Array.isArray(words)?words:[],states=list.map(mastery),mastered=states.filter(m=>m.key==='master').length,growing=states.filter(m=>m.key!=='new'&&m.key!=='master').length,learned=mastered+growing,score=mastered*3+growing,stage=score===0?0:score<4?1:score<10?2:score<20?3:4;
    return{mastered,growing,learned,score,stage,level:Math.max(1,Math.floor(score/8)+1),stageName:['씨앗','새싹','잎이 자라는 중','꽃봉오리','활짝 핀 정원'][stage]};
  }
  function selectMission(words,limit=10){
    const max=Math.max(0,Math.min(10,Math.floor(num(limit)))),list=Array.isArray(words)?words:[],tag=(w,missionType)=>({...w,missionType}),date=v=>String(v||''),id=w=>num(w.id);
    const pools={
      new:list.filter(w=>mastery(w).key==='new').sort((a,b)=>date(b.registered_on).localeCompare(date(a.registered_on))||id(b)-id(a)),
      review:list.filter(w=>['learning','growing'].includes(mastery(w).key)).sort((a,b)=>mastery(a).ratio-mastery(b).ratio||num(b.wrong)-num(a.wrong)||date(a.last_studied_at).localeCompare(date(b.last_studied_at))||id(b)-id(a)),
      almost:list.filter(w=>mastery(w).key==='almost').sort((a,b)=>mastery(b).ratio-mastery(a).ratio||mastery(b).attempts-mastery(a).attempts||id(b)-id(a))
    };
    const newQuota=Math.ceil(max*.4),reviewQuota=Math.min(Math.ceil(max*.4),max-newQuota),quotas={new:newQuota,review:reviewQuota,almost:max-newQuota-reviewQuota},selected={new:[],review:[],almost:[]};
    Object.keys(selected).forEach(key=>{selected[key]=pools[key].splice(0,quotas[key])});
    let remaining=max-Object.values(selected).reduce((sum,items)=>sum+items.length,0);
    while(remaining>0&&Object.values(pools).some(items=>items.length)){for(const key of ['new','review','almost']){if(!remaining)break;if(pools[key].length){selected[key].push(pools[key].shift());remaining--;}}}
    const ordered=[];while(ordered.length<max&&Object.values(selected).some(items=>items.length)){for(const key of ['new','review','almost'])if(ordered.length<max&&selected[key].length)ordered.push(tag(selected[key].shift(),key));}
    return{words:ordered,counts:ordered.reduce((counts,w)=>{counts[w.missionType]++;return counts},{new:0,review:0,almost:0})};
  }
  window.DinoLearning={num,mastery,needsReview,growth,selectMission};
})();
