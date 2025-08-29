/* Patched app.js: KST-safe today(), subjective quiz support, modal UX */ 
function $(id){return document.getElementById(id)};function today(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${da}`;}
/* ... full patched JS from previous step was generated ... */
