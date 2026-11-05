const E=require('./engine.js'); const X=require('./excel_expected.json');
const P=E.PRODUCTS, T=0.05; let checks=0,bad=[];
const d=s=>{const [y,m,dd]=s.slice(0,10).split('-').map(Number);return E.mk(y,m,dd)};
const id=n=>E.BY_NAME[n].id;
function cmp(tag,a,b){checks++; if(a==null||Math.abs(a-b)>T) bad.push([tag,a,+b.toFixed(2)]);}
for(const [k,{inp:s,exp}] of Object.entries(X)){
  const PY=E.horizon(s.age), MY=E.horizon(s.mage), CY=E.horizon(s.cage);
  const base={product:id(s.p),amount:s.a,invDate:d(s.inv),freq:s.fq,option:s.op,years:PY};
  const r=E.project(base);
  r.forEach((x,i)=>{const ex=exp.qs[i]; [x.main,x.bonus,x.divAcct,x.qDiv,x.cumDiv,x.total].forEach((v,j)=>cmp(`${k} QS ${i} c${j}`,ex[j],v));});
  const w=E.projectWithdrawals(base,s.ypw.map(([year,amount])=>({year,amount})));
  E.yearly(w).forEach((x,i)=>{const ex=exp.ypw[i]; cmp(`${k} YPW ${i+1} base`,ex[0],x.capital);cmp(`${k} YPW ${i+1} divs`,ex[1],x.total-x.capital);cmp(`${k} YPW ${i+1} total`,ex[3],x.total);
    cmp(`${k} YPW ${i+1} wd`,ex[2],w.slice(i*4,i*4+4).reduce((a,b)=>a+b.withdrawn,0));});
  const m=E.mixed({regProduct:id(s.mrp),lumpProduct:id(s.mlp),regPremium:s.mrpm,lumpAmount:s.mlsa,invDate:d(s.minv),regOption:s.mrop,lumpOption:s.mlop,years:MY},s.mpw.map(([year,amount])=>({year,amount})));
  E.yearly(m).forEach((x,i)=>{const ex=exp.mpw[i]; cmp(`${k} MPW ${i+1} regplan`,ex[0],x.regMain);cmp(`${k} MPW ${i+1} regdiv`,ex[1],x.regDiv);cmp(`${k} MPW ${i+1} lump`,ex[2],x.lumpCap);cmp(`${k} MPW ${i+1} lumpdiv`,ex[3],x.lumpDiv);
    cmp(`${k} MPW ${i+1} wd`,ex[4],m.slice(i*4,i*4+4).reduce((a,b)=>a+b.withdrawn,0));cmp(`${k} MPW ${i+1} total`,ex[5],x.total);});
  ['SP','FP','EP','TP'].forEach((pid,ci)=>{const rr=E.project({product:pid,amount:s.ca[ci],invDate:d(s.cinv),freq:s.cfq,option:s.cop,years:CY}); const l=rr[rr.length-1]; cmp(`${k} CMP ${pid} total`,exp.cmp[ci][0],l.total);cmp(`${k} CMP ${pid} divs`,exp.cmp[ci][1],l.cumDiv);});
}
console.log('checks',checks,'mismatches',bad.length); bad.slice(0,15).forEach(b=>console.log(b));
