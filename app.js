(function(){
'use strict';
const E=window.DivEngine, $=id=>document.getElementById(id);
const money=n=>(n<0?'-':'')+'$'+Math.round(Math.abs(n)).toLocaleString('en-US');
const short=n=>{const a=Math.abs(n);return (n<0?'-':'')+'$'+(a>=1e6?(a/1e6).toFixed(a>=1e7?0:1)+'M':a>=1e3?Math.round(a/1e3)+'k':Math.round(a))};
const dfmt=t=>{const p=E.parts(t);return String(p.d).padStart(2,'0')+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.m-1]+' '+p.y};
const COL=['var(--s1)','var(--s2)','var(--s3)','var(--s4)'];
const P=E.PRODUCTS;
let tab='single', quarterly={single:false,mixed:false};

// ---------- setup ----------
function fillSelect(el,ids){el.innerHTML=ids.map(i=>`<option value="${i}">${P[i].name}</option>`).join('')}
fillSelect($('s-product'),['SP','AH','FP','EP','TP','SRS']);
fillSelect($('m-reg'),['FP','EP','TP']);
fillSelect($('m-lump'),['SP','AH']);
(function(){const t=new Date();$('date').value=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')})();
function buildWd(id){const el=$(id);let h='';for(let i=1;i<=25;i++)h+=`<div class="r"><span>${i}.</span><input type="number" min="1" placeholder="Year" data-k="y" inputmode="numeric" aria-label="Withdrawal ${i} year"><input type="number" min="0" placeholder="Amount" data-k="a" inputmode="numeric" aria-label="Withdrawal ${i} amount"></div>`;el.innerHTML=h}
buildWd('s-wd');buildWd('m-wd');
function readWd(id){const out=[];document.querySelectorAll('#'+id+' .r').forEach(r=>{const y=parseInt(r.querySelector('[data-k=y]').value,10),a=parseFloat(r.querySelector('[data-k=a]').value);if(y>=1&&a>0)out.push({year:y,amount:a})});return out}
function dateVal(){const v=$('date').value;if(!v)return E.mk(2026,1,1);const[y,m,d]=v.split('-').map(Number);return E.mk(y,m,d)}
const age=()=>Math.max(0,Math.min(99,parseInt($('age').value,10)||0));

// ---------- chart ----------
function chart(el,series,labels){
  const W=900,H=340,L=64,R=16,T=14,B=34,n=labels.length;
  let max=0;series.forEach(s=>s.values.forEach(v=>{if(v>max)max=v}));
  const step=niceStep(max/5||1);max=Math.ceil(max/step)*step||step;
  const x=i=>L+(n<2?0:i*(W-L-R)/(n-1)),y=v=>T+(H-T-B)*(1-v/max);
  let g='';for(let v=0;v<=max+1e-9;v+=step){g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="var(--mute)">${short(v)}</text>`}
  const every=Math.max(1,Math.ceil(n/10));labels.forEach((l,i)=>{if(i%every===0||i===n-1)g+=`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="12" fill="var(--mute)">${l}</text>`});
  const paths=series.map((s,k)=>`<path d="${s.values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('')}" fill="none" stroke="${COL[k%4]}" stroke-width="2.5" stroke-linejoin="round"/>`).join('');
  el.innerHTML=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Projection chart">${g}${paths}<line class="cur" y1="${T}" y2="${H-B}" stroke="var(--gold)" stroke-width="1.5" style="display:none"/></svg><div class="tip"></div></div>
  <div class="legend">${series.map((s,k)=>`<span><i style="background:${COL[k%4]}"></i>${s.name}</span>`).join('')}</div>`;
  const svg=el.querySelector('svg'),tip=el.querySelector('.tip'),cur=el.querySelector('.cur'),box=el.querySelector('.chart');
  function move(ev){const r=svg.getBoundingClientRect(),cx=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left;const px=cx/r.width*W;let i=Math.round((px-L)/((W-L-R)/Math.max(1,n-1)));i=Math.max(0,Math.min(n-1,i));
    cur.setAttribute('x1',x(i));cur.setAttribute('x2',x(i));cur.style.display='';tip.style.display='block';tip.style.left=(x(i)/W*r.width)+'px';tip.style.top='8px';tip.style.transform='translate(-50%,0)';
    tip.innerHTML=`<b>${labels[i]}</b><br>`+series.map(s=>`${s.name}: ${money(s.values[i])}`).join('<br>')}
  svg.addEventListener('mousemove',move);svg.addEventListener('touchmove',move,{passive:true});svg.addEventListener('touchstart',move,{passive:true});svg.addEventListener('mouseleave',()=>{cur.style.display='none';tip.style.display='none'});
}
function niceStep(r){const p=Math.pow(10,Math.floor(Math.log10(r)));const f=r/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
const kpi=(l,v,s,hero)=>`<div class="kpi${hero?' hero':''}"><div class="l">${l}</div><div class="v">${v}</div>${s?`<div class="s">${s}</div>`:''}</div>`;
function segHtml(key){return `<div class="seg" data-seg="${key}"><button data-q="0" class="${quarterly[key]?'':'on'}">Yearly</button><button data-q="1" class="${quarterly[key]?'on':''}">Quarterly</button></div>`}
function wireSeg(root,key,fn){root.querySelectorAll('[data-seg] button').forEach(b=>b.onclick=()=>{quarterly[key]=b.dataset.q==='1';fn()})}
function table(cols,rows,hl){return `<div class="tablewrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.cls||''}">${r.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function setWdCount(id,n){$(id).textContent=n?n+' entered':'none'}

// ---------- single ----------
function renderSingle(){
  const pid=$('s-product').value,p=P[pid],A=parseFloat($('s-amount').value)||0,opt=$('s-option').value,freq=$('s-freq').value;
  $('s-amountLabel').textContent=p.kind==='regular'?'Annual premium':'Investment amount';
  $('s-freqWrap').style.display=(pid==='FP'||pid==='EP')?'':'none';
  const info=p.kind==='regular'?`${p.rate*100}% p.a. dividends paid quarterly · ${p.term} years of premium · minimum $${p.min.toLocaleString('en-US')} a year`:`${p.rate*100}% p.a. dividends paid quarterly · single payment`+(p.min?` · minimum $${p.min.toLocaleString('en-US')}`:'')+(p.admin?` · ${p.admin*100}% admin charge`:' · no admin charge');$('s-info').textContent=info+(p.lock?` · capital locked until year ${p.lock}`:'');const m=E.checkMin(pid,A);const w=$('s-warn');w.hidden=!m;if(m)w.textContent='⚠ '+m;
  const yrs=E.horizon(age()),sel=Math.min(Math.max(1,parseInt($('showYear').value,10)||yrs),yrs);
  const wd=readWd('s-wd');setWdCount('s-wdCount',wd.length);
  const o={product:pid,amount:A,invDate:dateVal(),freq,option:opt,years:yrs};
  const base=E.project(o),W=E.projectWithdrawals(o,wd),useW=wd.length>0;
  const by=E.yearly(base),wy=E.yearly(W);const bs=by[sel-1],ws=wy[sel-1];
  const paid=p.kind==='lump'?A:A*Math.min(sel,p.term);
  const totalW=useW?W.slice(0,sel*4).reduce((a,b)=>a+b.withdrawn,0):0;
  const bonuses=[];if(bs.welcome>0)bonuses.push(['Welcome bonus',bs.welcome]);if(bs.investment>0)bonuses.push(['Investment bonus',bs.investment]);if(bs.performance>0)bonuses.push(['Performance bonus',bs.performance]);
  const divShown=p.kind==='lump'&&false;
  let h=`<section class="card"><h2>Results at year ${sel} · age ${age()+sel}</h2><p class="disc-top"><b>Non-guaranteed.</b> Dividends are projections only; fund price is assumed to stay at $1 throughout.</p><div class="kpis">`;
  h+=kpi('Total account value',money(useW?ws.total:bs.total),opt==='Cash out'?'dividends paid out in cash are excluded':'',true);
  h+=kpi('Capital paid in',money(paid),p.admin?`${money(A*(1-p.admin))} invested after ${(p.admin*100)}% admin charge`:'');
  h+=kpi('Dividends earned to date',money(bs.cumDiv),opt==='Cash out'?`${money(bs.cashPaid)} paid out in cash`:'earned across all quarters');
  h+=kpi(useW?'Total withdrawn':'Bonuses to date',useW?money(totalW):money(bs.bonus),useW?(W.slice(0,sel*4).some(r=>r.shortfall>0.005)?'⚠ some withdrawals not fully met':'all withdrawals met'):'welcome + investment + performance');
  h+=`</div>`;
  if(bonuses.length)h+=`<div class="bonuses">${bonuses.map(b=>`<span>${b[0]}: <b>${money(b[1])}</b></span>`).join('')}</div>`;
  h+=`</section>`;
  const labels=by.map((_,i)=>'Y'+(i+1));
  const ser=useW?[{name:'Total value (after withdrawals)',values:wy.map(r=>r.total)},{name:'Capital',values:wy.map(r=>r.capital)},{name:'Total dividends earned',values:by.map(r=>r.cumDiv)}]
    :[{name:'Total account value',values:by.map(r=>r.total)},{name:'Capital + bonus',values:by.map(r=>r.main+r.bonus)},{name:'Total dividends earned',values:by.map(r=>r.cumDiv)}];
  h+=`<section class="card"><h2>Growth over time</h2><div id="s-chart"></div></section>`;
  h+=`<section class="card"><div class="sec-h"><h2>Year-by-year</h2>${segHtml('single')}</div><div id="s-table"></div></section>`;
  $('s-out').innerHTML=h;chart($('s-chart'),ser,labels);
  const ar=age();let cols,rows;
  if(!quarterly.single){
    if(useW){cols=['Year','Age','Capital (main + bonus)','Dividend account','Dividends this year','Withdrawn this year','Total value'];
      rows=wy.map((r,i)=>{const yq=W.slice(i*4,i*4+4);const wdn=yq.reduce((a,b)=>a+b.withdrawn,0),sh=yq.reduce((a,b)=>a+b.shortfall,0),dv=yq.reduce((a,b)=>a+b.qDiv,0);
        return {cls:(i+1===sel?'hl ':'')+(sh>0.005?'short':''),cells:[i+1,ar+i+1,money(r.capital),money(r.divAcct),money(dv),money(wdn)+(sh>0.005?' ⚠':''),money(r.total)]}})}
    else{cols=['Year','Age','Main account','Bonus account','Dividend account','Dividends this year','Total value'];
      rows=by.map((r,i)=>{const dv=base.slice(i*4,i*4+4).reduce((a,b)=>a+b.qDiv,0);return {cls:i+1===sel?'hl':'',cells:[i+1,ar+i+1,money(r.main),money(r.bonus),money(r.divAcct),money(dv),money(r.total)]}})}
  }else{
    if(useW){cols=['Quarter','Pay date','Capital','Dividend account','Quarterly dividend','Withdrawn','Total value'];rows=W.map(r=>({cls:r.shortfall>0.005?'short':'',cells:['Y'+r.year+' Q'+r.qtr,dfmt(r.date),money(r.capital),money(r.divAcct),money(r.qDiv),money(r.withdrawn)+(r.shortfall>0.005?' ⚠':''),money(r.total)]}))}
    else{cols=['Quarter','Pay date','Main account','Bonus account','Dividend account','Quarterly dividend','Total value'];rows=base.map(r=>({cells:['Y'+r.year+' Q'+r.qtr,dfmt(r.date),money(r.main),money(r.bonus),money(r.divAcct),money(r.qDiv),money(r.total)]}))}
  }
  $('s-table').innerHTML=table(cols,rows);wireSeg($('s-out'),'single',renderSingle);
}

// ---------- mixed ----------
function renderMixed(){
  const reg=$('m-reg').value,lump=$('m-lump').value,prem=parseFloat($('m-prem').value)||0,la=parseFloat($('m-lumpAmt').value)||0;
  const yrs=E.horizon(age()),sel=Math.min(Math.max(1,parseInt($('showYear').value,10)||yrs),yrs);
  const mn=E.checkMin(reg,prem);const wEl=$('m-warn');
  const wd=readWd('m-wd');setWdCount('m-wdCount',wd.length);
  const rows=E.mixed({regProduct:reg,lumpProduct:lump,regPremium:prem,lumpAmount:la,invDate:dateVal(),regOption:$('m-regOpt').value,lumpOption:$('m-lumpOpt').value,years:yrs},wd);
  const yr=E.yearly(rows),r=yr[sel-1];
  const short=rows.find(x=>x.premiumShort>0.5);
  const msgs=[];if(mn)msgs.push('⚠ '+mn);
  if(short)msgs.push(`⚠ The lump-sum side runs out of money — from Y${short.year} Q${short.qtr} a regular-pay premium can't be fully funded. The shortfall must come from cash.`);
  wEl.hidden=!msgs.length;wEl.innerHTML=msgs.join('<br>');
  const base=E.project({product:reg,amount:prem,invDate:dateVal(),freq:'Yearly',option:$('m-regOpt').value,years:yrs});const bb=E.yearly(base)[sel-1];
  const totalW=rows.slice(0,sel*4).reduce((a,b)=>a+b.withdrawn,0);
  const bonuses=[];if(bb.welcome>0)bonuses.push(['Welcome bonus',bb.welcome]);if(bb.investment>0)bonuses.push(['Investment bonus',bb.investment]);if(bb.performance>0)bonuses.push(['Performance bonus',bb.performance]);
  let h=`<section class="card"><h2>Results at year ${sel} · age ${age()+sel}</h2><p class="disc-top"><b>Non-guaranteed.</b> Dividends are projections only; fund price is assumed to stay at $1 throughout.</p><div class="kpis">`;
  h+=kpi('Combined total value',money(r.total),'regular-pay + lump-sum',true);
  h+=kpi('Regular-pay plan',money(r.regTotal),'incl. '+money(r.regDiv)+' dividends');
  h+=kpi('Lump-sum policy',money(r.lumpTotal),'capital '+money(r.lumpCap)+' · dividends '+money(r.lumpDiv));
  h+=kpi(wd.length?'Ad-hoc withdrawn':'Dividends this year',wd.length?money(totalW):money(rows.slice(sel*4-4,sel*4).reduce((a,b)=>a+b.qDiv,0)),wd.length?'on top of premium funding':'both sides combined');
  h+=`</div>`;if(bonuses.length)h+=`<div class="bonuses">${bonuses.map(b=>`<span>${b[0]}: <b>${money(b[1])}</b></span>`).join('')}</div>`;h+=`</section>`;
  h+=`<section class="card"><h2>Growth over time</h2><div id="m-chart"></div></section>`;
  h+=`<section class="card"><div class="sec-h"><h2>Year-by-year</h2>${segHtml('mixed')}</div><div id="m-table"></div></section>`;
  $('m-out').innerHTML=h;
  chart($('m-chart'),[{name:'Combined total',values:yr.map(x=>x.total)},{name:'Regular-pay plan',values:yr.map(x=>x.regTotal)},{name:'Lump-sum policy',values:yr.map(x=>x.lumpTotal)}],yr.map((_,i)=>'Y'+(i+1)));
  const ar=age();let cols,tr;
  if(!quarterly.mixed){cols=['Year','Age','Regular: capital','Regular: dividends','Lump: capital','Lump: dividends','Withdrawn (ad-hoc)','Combined total'];
    tr=yr.map((x,i)=>{const yq=rows.slice(i*4,i*4+4);const w=yq.reduce((a,b)=>a+b.withdrawn,0),sh=yq.some(z=>z.shortfall>0.005||z.premiumShort>0.5);return {cls:(i+1===sel?'hl ':'')+(sh?'short':''),cells:[i+1,ar+i+1,money(x.regMain),money(x.regDiv),money(x.lumpCap),money(x.lumpDiv),w>0?money(w):'–',money(x.total)]}})}
  else{cols=['Quarter','Pay date','Regular: capital','Regular: dividends','Lump: capital','Lump: dividends','Withdrawn','Combined total'];
    tr=rows.map(x=>({cls:x.premiumShort>0.5?'short':'',cells:['Y'+x.year+' Q'+x.qtr,dfmt(x.date),money(x.regMain),money(x.regDiv),money(x.lumpCap),money(x.lumpDiv),x.withdrawn>0?money(x.withdrawn):'–',money(x.total)]}))}
  $('m-table').innerHTML=table(cols,tr);wireSeg($('m-out'),'mixed',renderMixed);
}

// ---------- compare ----------
function renderCompare(){
  const yrs=E.horizon(age()),sel=Math.min(Math.max(1,parseInt($('showYear').value,10)||yrs),yrs);
  const ids=['SP','FP','EP','TP'],amt={};ids.forEach(i=>amt[i]=parseFloat($('c-'+i).value)||0);
  const msgs=ids.map(i=>E.checkMin(i,amt[i])).filter(Boolean);$('c-warn').hidden=!msgs.length;$('c-warn').innerHTML=msgs.map(m=>'⚠ '+m).join('<br>');
  const res=ids.map(i=>E.yearly(E.project({product:i,amount:amt[i],invDate:dateVal(),freq:$('c-freq').value,option:$('c-option').value,years:yrs})));
  const row=(l,f)=>({cells:[l].concat(ids.map((i,k)=>f(i,res[k][sel-1])))});
  const cap=(i,r)=>P[i].kind==='lump'?amt[i]*(1-P[i].admin):amt[i]*Math.min(sel,P[i].term);
  const tr=[row('Capital invested',(i,r)=>money(cap(i,r))),row('Welcome bonus',(i,r)=>r.welcome>0?money(r.welcome):'–'),row('Investment bonus',(i,r)=>r.investment>0?money(r.investment):'–'),row('Performance bonus',(i,r)=>r.performance>0?money(r.performance):'–'),
    row('Dividend account',(i,r)=>money(r.divAcct)),row('Total dividends earned',(i,r)=>money(r.cumDiv)),Object.assign(row('Total account value',(i,r)=>money(r.total)),{cls:'hl'})];
  let h=`<section class="card cmp"><h2>At year ${sel} · age ${age()+sel}</h2><p class="disc-top"><b>Non-guaranteed.</b> Dividends are projections only; fund price is assumed to stay at $1 throughout.</p>${table(['Metric'].concat(ids.map(i=>P[i].name)),tr)}</section>`;
  h+=`<section class="card"><h2>Total account value over time</h2><div id="c-chart"></div></section>`;
  $('c-out').innerHTML=h;
  chart($('c-chart'),ids.map((i,k)=>({name:P[i].short,values:res[k].map(r=>r.total)})),res[0].map((_,i)=>'Y'+(i+1)));
}

// ---------- funds ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function customFunds(){try{return JSON.parse(localStorage.getItem('aiaCustomFunds')||'[]')}catch(e){return []}}
function saveCustom(l){try{localStorage.setItem('aiaCustomFunds',JSON.stringify(l))}catch(e){}}
function fundBtns(f,M){const b=[];if(f.page)b.push(`<a class="btn" href="${esc(f.page)}" target="_blank" rel="noopener">Open fund page ↗</a>`);else b.push(`<a class="btn ghost" href="${esc(M)}" target="_blank" rel="noopener" title="Direct link not added yet — opens AIA's full fund list">Find on AIA ↗</a>`);
  (f.docs||[]).forEach(d=>b.push(`<a class="btn ghost" href="${esc(d[1])}" target="_blank" rel="noopener">${esc(d[0])} ↗</a>`));return b.join('')}
function renderFunds(){
  const F=window.AIA_FUNDS,M=F.master;$('f-all').href=M;
  $('f-main').innerHTML=F.main.map(f=>`<div class="fund"><div class="fn">${esc(f.name)}</div><div class="fb">${fundBtns(f,M)}</div>${f.page?'':'<div class="hint">No direct link yet — add one below.</div>'}</div>`).join('');
  const q=($('f-search').value||'').toLowerCase();const cust=customFunds().map((c,i)=>({name:c.name,page:c.url,docs:[],custom:i}));
  const list=F.other.concat(cust).filter(f=>f.name.toLowerCase().includes(q)).sort((x,y)=>x.name.localeCompare(y.name));
  $('f-other').innerHTML=list.length?list.map(f=>`<div class="frow"><span class="fn">${esc(f.name)}${f.custom!==undefined?' <span class="pill">added</span>':''}</span><span class="fb">${fundBtns(f,M)}${f.custom!==undefined?`<button class="btn ghost" data-del="${f.custom}" type="button">Remove</button>`:''}</span></div>`).join(''):'<p class="hint">No match — try "Browse all AIA funds".</p>';
  $('f-other').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const l=customFunds();l.splice(+b.dataset.del,1);saveCustom(l);renderFunds()});
}
$('f-search').addEventListener('input',renderFunds);
$('f-add').onclick=()=>{const n=$('f-newName').value.trim(),u=$('f-newUrl').value.trim();if(!n||!/^https?:\/\//i.test(u)){alert('Enter a fund name and a link starting with https://');return}const l=customFunds();l.push({name:n,url:u});saveCustom(l);$('f-newName').value='';$('f-newUrl').value='';renderFunds()};

// ---------- wiring ----------
function renderAll(){
  const yrs=E.horizon(age());$('horizonHint').textContent=`Projection runs to age 100 (${yrs} years), capped at 85 years.`;$('showYear').max=yrs;
  $('profile').hidden=tab==='funds';$('disc').hidden=tab==='funds';if(tab==='single')renderSingle();else if(tab==='mixed')renderMixed();else if(tab==='compare')renderCompare();else renderFunds();
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));['single','mixed','compare','funds'].forEach(t=>$('tab-'+t).hidden=t!==tab);renderAll()});
document.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',()=>{clearTimeout(window.__t);window.__t=setTimeout(renderAll,120)});el.addEventListener('change',renderAll)});
$('printBtn').onclick=()=>{document.querySelectorAll('details.wd').forEach(d=>{});window.print()};
renderAll();
})();
