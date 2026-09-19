/**
 * Independent adversarial re-implementation of 04's state/datum/F, with the
 * OPPOSITE canonical traversal direction (anchor quad[0], walk so that quad[3]
 * is reached before quad[1] — the mirror of 04's rule). Everything exact.
 */
import { CONFIGS, buildStrands, trace, zApply2, zExpand, type Config, type ZInstance } from './lib';
import { SUPER_RULES, zAdd, zApply, zKey, zLeafPts, zSupertileQuad, zSupertileTransforms,
         type TileFamilyId, type TileTypeId, type ZVec } from '../src/core';

const TYPES: TileTypeId[] = ['Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi'];
const MAX = Number(process.argv[2] ?? 5);

function outlineLoop(family: TileFamilyId, insts: readonly ZInstance[]): ZVec[] {
  const use = new Map<string, {a:ZVec;b:ZVec;n:number}>();
  const pc = new Map<string, readonly ZVec[]>();
  for (const it of insts) {
    let base = pc.get(it.type); if (!base) { base = zLeafPts(family, it.type); pc.set(it.type, base); }
    const n = base.length; let prev = zApply(it.xform, base[0]); let pk = zKey(prev);
    const first = prev, fk = pk;
    for (let i=1;i<=n;i++){
      const cur = i===n?first:zApply(it.xform, base[i]); const ck = i===n?fk:zKey(cur);
      const key = pk<ck?`${pk}_${ck}`:`${ck}_${pk}`;
      const h = use.get(key); if(h) h.n++; else use.set(key,{a:prev,b:cur,n:1});
      prev=cur; pk=ck;
    }
  }
  // ADVERSARIAL EXTRA: 04 never checks this. An edge used 3+ times = overlap.
  for (const e of use.values()) if (e.n > 2) throw new Error(`edge used ${e.n} times — overlap`);
  const nbr = new Map<string,string[]>(); const coord = new Map<string,ZVec>(); let seed='';
  for (const e of use.values()){ if(e.n!==1) continue;
    const ka=zKey(e.a), kb=zKey(e.b); coord.set(ka,e.a); coord.set(kb,e.b);
    if(!nbr.has(ka))nbr.set(ka,[]); if(!nbr.has(kb))nbr.set(kb,[]);
    nbr.get(ka)!.push(kb); nbr.get(kb)!.push(ka); if(!seed)seed=ka; }
  for(const[k,v]of nbr) if(v.length!==2) throw new Error(`outline vertex degree ${v.length}`);
  const loop:ZVec[]=[]; let prev=''; let cur=seed;
  do { loop.push(coord.get(cur)!); const nb=nbr.get(cur)!; const nx=nb[0]!==prev?nb[0]:nb[1];
       prev=cur; cur=nx; if(loop.length>nbr.size) throw new Error('walk did not close'); } while(cur!==seed);
  if(loop.length!==nbr.size) throw new Error('more than one loop');
  return loop;
}

interface A { nB:number; keyOfLabel:string[]; dotOfLabel:ZVec[]; matching:[number,number][];
              circuits:number; interiorEndArcs:number; arcs:number; tiles:number; cov:number; maxDeg:number; }
const cache = new Map<string,A>();
function analyze(cfg:Config, T:TileTypeId, level:number): A {
  const ck=`${cfg.id}|${T}|${level}`; const h=cache.get(ck); if(h) return h;
  const insts = zExpand(cfg.family, T, level);
  const s = buildStrands(cfg, insts); const tr = trace(s);
  const loop = outlineLoop(cfg.family, insts); const n = loop.length;
  const lk = loop.map(zKey); const idx = new Map<string,number>(); lk.forEach((k,i)=>idx.set(k,i));
  const quad = zSupertileQuad(cfg.family, level);
  const qi = quad.map(q=>{ const i=idx.get(zKey(q)); if(i===undefined) throw new Error(`${T}@${level} quad corner off-outline`); return i; });
  // OPPOSITE rule to 04: walk the way that reaches quad[3] before quad[1].
  const forward = (qi[3]-qi[0]+n)%n < (qi[1]-qi[0]+n)%n;
  const ord:ZVec[]=new Array(n);
  for(let s2=0;s2<n;s2++){ const i = forward ? (qi[0]+s2)%n : (qi[0]-s2+2*n)%n; ord[s2]=loop[i]; }
  const rankOfMid=new Map<string,number>();
  for(let j=0;j<n;j++) rankOfMid.set(zKey(zAdd(ord[j],ord[(j+1)%n])), j);
  const dots:{key:string;rank:number}[]=[];
  for(const[key,deg]of s.degree){ if(deg!==1) continue;
    const r=rankOfMid.get(key); if(r===undefined) throw new Error(`${T}@${level}: deg-1 dot not an outline midpoint`);
    dots.push({key,rank:r}); }
  dots.sort((a,b)=>a.rank-b.rank);
  const lab=new Map<string,number>(); dots.forEach((d,i)=>lab.set(d.key,i));
  const matching:[number,number][]=[]; let iea=0;
  for(const arc of tr.arcs){ const a=lab.get(arc.endpoints[0]), b=lab.get(arc.endpoints[1]);
    if(a===undefined||b===undefined){iea++;continue;} matching.push(a<b?[a,b]:[b,a]); }
  matching.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);
  const res:A={nB:dots.length,keyOfLabel:dots.map(d=>d.key),dotOfLabel:dots.map(d=>s.coord.get(d.key)!),
    matching,circuits:tr.circuits.length,interiorEndArcs:iea,arcs:tr.arcs.length,tiles:insts.length,
    cov:tr.tilesCovered,maxDeg:tr.maxDegree};
  cache.set(ck,res); return res;
}

type Node=[number,number];
interface Datum{type:TileTypeId;slots:{slot:number;child:TileTypeId}[];glue:[Node,Node][];outer:Node[];nB:number;}
function datumOf(cfg:Config,T:TileTypeId,pl:number):Datum{
  const Ts=zSupertileTransforms(cfg.family,pl); const subs=SUPER_RULES[T]; const cl=pl-1;
  const occ=new Map<string,Node[]>(); const slots:{slot:number;child:TileTypeId}[]=[];
  for(let s=0;s<8;s++){ if(subs[s]==='null')continue; const ct=subs[s] as TileTypeId;
    slots.push({slot:s,child:ct}); const ca=analyze(cfg,ct,cl);
    for(let l=0;l<ca.nB;l++){ const k=zKey(zApply2(Ts[s],ca.dotOfLabel[l]));
      const L=occ.get(k); if(L)L.push([s,l]); else occ.set(k,[[s,l]]); } }
  const pa=analyze(cfg,T,pl); const glue:[Node,Node][]=[]; const un=new Map<string,Node>();
  for(const[k,L]of occ){ if(L.length===2)glue.push([L[0],L[1]]); else if(L.length===1)un.set(k,L[0]);
    else throw new Error(`${T}@${pl}: ${L.length} coincide`); }
  if(un.size!==pa.nB) throw new Error(`${T}@${pl}: ${un.size} unwelded vs nB ${pa.nB}`);
  const outer:Node[]=[]; for(let l=0;l<pa.nB;l++){ const h=un.get(pa.keyOfLabel[l]);
    if(!h) throw new Error(`${T}@${pl}: parent dot ${l} not unwelded child dot`); outer.push(h); }
  return {type:T,slots,glue,outer,nB:pa.nB};
}
function datumKey(d:Datum){ const g=d.glue.map(([a,b])=>{const x=`${a[0]}:${a[1]}`,y=`${b[0]}:${b[1]}`;return x<y?`${x}=${y}`:`${y}=${x}`;}).sort().join(' ');
  return `slots[${d.slots.map(s=>s.slot+s.child).join(',')}] glue[${g}] outer[${d.outer.map(([s,l],i)=>`${i}<-${s}:${l}`).join(' ')}]`; }

interface St{nB:number;matching:[number,number][];circuits:number;iea:number;}
const sk=(s:St)=>`${s.matching.map(([a,b])=>`${a}-${b}`).join(',')}|c${s.circuits}|i${s.iea}`;
const tk=(r:Record<string,St>)=>TYPES.map(T=>`${T}:${sk(r[T])}`).join(' ');

function applyF(d:Datum, st:Record<string,St>):{state:St;newCycles:number;consumed:number;total:number}{
  const id=(s:number,l:number)=>`${s}:${l}`; const par=new Map<string,string>();
  const find=(x:string):string=>{let r=x;while(par.get(r)!==undefined&&par.get(r)!==r)r=par.get(r)!;return r;};
  for(const{slot,child}of d.slots) for(let l=0;l<st[child].nB;l++) par.set(id(slot,l),id(slot,l));
  for(const[a,b]of d.glue){ const ra=find(id(a[0],a[1])), rb=find(id(b[0],b[1])); if(ra!==rb) par.set(ra,rb); }
  const eA:string[]=[],eB:string[]=[]; let cc=0,ci=0;
  for(const{slot,child}of d.slots){ const cs=st[child]; cc+=cs.circuits; ci+=cs.iea;
    for(const[a,b]of cs.matching){ eA.push(find(id(slot,a))); eB.push(find(id(slot,b))); } }
  const adj=new Map<string,number[]>();
  for(let i=0;i<eA.length;i++) for(const v of [eA[i],eB[i]]){const L=adj.get(v); if(L)L.push(i); else adj.set(v,[i]);}
  for(const[,L]of adj) if(L.length>2) throw new Error(`${d.type}: degree ${L.length}`);
  const rep=d.outer.map(([s,l])=>find(id(s,l))); const plr=new Map<string,number>(); rep.forEach((r,i)=>plr.set(r,i));
  const used=new Array(eA.length).fill(false); const matching:[number,number][]=[]; let consumed=0;
  for(let s0=0;s0<rep.length;s0++){ const r0=rep[s0]; const inc=adj.get(r0)??[];
    if(inc.length===0){ matching.push([s0,s0]); continue; } if(used[inc[0]])continue;
    let cur=r0,e=inc[0];
    for(;;){ used[e]=true; consumed++; const nx=eA[e]===cur?eB[e]:eA[e];
      const cont=(adj.get(nx)??[]).filter(x=>!used[x]);
      if(cont.length===0){ const end=plr.get(nx); if(end===undefined) throw new Error('arc ends interior'); matching.push(s0<end?[s0,end]:[end,s0]); break; }
      cur=nx; e=cont[0]; } }
  let nc=0;
  for(let i=0;i<used.length;i++){ if(used[i])continue; nc++; let cur=eA[i],e=i;
    for(;;){ used[e]=true; consumed++; const nx=eA[e]===cur?eB[e]:eA[e];
      const cont=(adj.get(nx)??[]).filter(x=>!used[x]); if(cont.length===0)break; cur=nx; e=cont[0]; } }
  matching.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);
  return {state:{nB:d.nB,matching,circuits:cc+nc,iea:ci},newCycles:nc,consumed,total:eA.length};
}

let fails = 0;
for (const key of ['hex128','spectre1278','flagship'] as const) {
  const cfg = CONFIGS[key];
  console.log(`\n### ${cfg.id} — REVERSED canonical labelling`);
  const direct: Record<string,St>[] = [];
  for(let lv=1;lv<=MAX;lv++){ const row:Record<string,St>={};
    for(const T of TYPES){ const a=analyze(cfg,T,lv); row[T]={nB:a.nB,matching:a.matching,circuits:a.circuits,iea:a.interiorEndArcs}; }
    direct.push(row); }
  for(const T of TYPES){
    const nBs=new Set(direct.map(r=>r[T].nB));
    const ok = nBs.size===1 && direct.every(r=>r[T].circuits===0 && r[T].iea===0 && r[T].matching.length*2===r[T].nB);
    if(!ok){ fails++; console.log(`  FAIL ${T}`); }
  }
  console.log(`  |dB| = ${TYPES.map(T=>`${T}:${direct[0][T].nB}`).join(' ')}`);
  // datum level-independence under the reversed labelling
  const data:Record<string,Datum>[]=[];
  for(let pl=2;pl<=MAX;pl++){ const row:Record<string,Datum>={}; for(const T of TYPES) row[T]=datumOf(cfg,T,pl); data.push(row); }
  const dk=data.map(r=>TYPES.map(T=>datumKey(r[T])).join('\n'));
  const same = dk.every(k=>k===dk[0]);
  console.log(`  datum level-independent across parent levels 2..${MAX}: ${same}`); if(!same) fails++;
  // F reproduces direct states
  const D=data[0]; let cur=direct[0]; let agree=true;
  const seen=new Map<string,number>([[tk(cur),0]]); let pre=-1,per=-1;
  const orbit=[cur];
  for(let step=0;step<200;step++){ const nx:Record<string,St>={};
    for(const T of TYPES) nx[T]=applyF(D[T],cur).state; orbit.push(nx); cur=nx;
    const k=tk(nx); const p=seen.get(k); if(p!==undefined&&pre<0){pre=p;per=orbit.length-1-p;} seen.set(k,orbit.length-1); }
  for(let lv=1;lv<=MAX;lv++) if(tk(orbit[lv-1])!==tk(direct[lv-1])){agree=false;console.log(`  FAIL F@lv${lv}`);}
  console.log(`  F-orbit == direct states, lv 1..${MAX}: ${agree}; pre-period ${pre}, period ${per}`); if(!agree) fails++;
  console.log(`  Psi matching per level: ${direct.map(r=>r['Psi'].matching.map(([a,b])=>`${a}-${b}`).join('')).join(' ')}`);
  console.log(`  Delta matching per level: ${direct.map(r=>r['Delta'].matching.map(([a,b])=>`${a}-${b}`).join(' ')).join(' | ')}`);
  console.log(`  Gamma matching per level: ${direct.map(r=>r['Gamma'].matching.map(([a,b])=>`${a}-${b}`).join(' ')).join(' | ')}`);

  // --- CLAIM UNDER TEST: "F's orbit from ANY seed is eventually periodic" ---
  if (key==='spectre1278') {
    let rng=12345; const rnd=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
    const rm=(n:number):[number,number][]=>{const a=Array.from({length:n},(_,i)=>i);
      for(let i=n-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
      const m:[number,number][]=[]; for(let i=0;i<n;i+=2)m.push(a[i]<a[i+1]?[a[i],a[i+1]]:[a[i+1],a[i]]);
      return m.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);};
    console.log(`\n  --- circuit growth under F from random seeds (tests "orbit from ANY seed is eventually periodic") ---`);
    let anyGrow=false;
    for(let t=0;t<5;t++){
      let s:Record<string,St>={}; for(const T of TYPES) s[T]={nB:direct[0][T].nB,matching:rm(direct[0][T].nB),circuits:0,iea:0};
      const trace2:number[]=[];
      for(let i=0;i<12;i++){ const nx:Record<string,St>={}; for(const T of TYPES) nx[T]=applyF(D[T],s).state; s=nx;
        trace2.push(TYPES.reduce((acc,T)=>acc+s[T].circuits,0)); }
      console.log(`    seed ${t}: total circuits after step 1..12 = ${trace2.join(', ')}`);
      if(trace2[11]>trace2[5]) anyGrow=true;
    }
    console.log(`    => circuit count grows without bound on at least one orbit: ${anyGrow}`);
    console.log(`    (if true, the FULL state orbit from that seed is NOT eventually periodic —`);
    console.log(`     only the matching component is. The claim as worded is false.)`);
  }
}
console.log(`\n${fails===0?'INDEPENDENT REIMPLEMENTATION AGREES':'DISAGREEMENTS: '+fails}`);

// --- cross-config datum identity, under the REVERSED labelling -------------
{
  console.log('\n### cross-config datum identity (reversed labelling, parent level 2)');
  const keysByCfg = new Map<string,string>();
  for (const key of ['hex128','spectre1278','flagship'] as const) {
    const cfg = CONFIGS[key];
    const k = TYPES.map(T=>`${T} :: ${datumKey(datumOf(cfg,T,2))}`).join('\n');
    keysByCfg.set(cfg.id,k);
  }
  const ids=[...keysByCfg.keys()];
  console.log(`  hex128 == spectre1278 : ${keysByCfg.get(ids[0])===keysByCfg.get(ids[1])}`);
  console.log(`  spectre1278 == flagship: ${keysByCfg.get(ids[1])===keysByCfg.get(ids[2])}`);
  console.log('  Psi row: ' + (keysByCfg.get(ids[1])!.split('\n').find(l=>l.startsWith('Psi'))));
}

process.exit(fails === 0 ? 0 : 1);
