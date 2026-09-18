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
  window.DinoLearning={num,mastery,needsReview,growth};
})();
