const SUPABASE_URL = 'https://gbdyeijiqphebgljfxgs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHllaWppcXBoZWJnbGpmeGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzcyNTYsImV4cCI6MjEwNTgxMzI1Nn0.8Oqg9MNEGFosFGxc3U5G2kn5wXtjXwdYNXl5JLSIluo';
let gateMode = 'signup';
let currentPlan = 'free';
let currentEmail = '';
 
// Si l'URL ou la clé sont mal collées, on affiche la vraie raison au lieu de casser tout le site
let sb;
try{
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}catch(e){
  const raison = e.message;
  const boom = () => { throw new Error(raison); };
  sb = { auth: { signUp: boom, signInWithPassword: boom, getUser: boom, getSession: boom, signOut: async()=>{} }, from: boom };
}
 
function toggleAuthMode(e){
  e.preventDefault();
  gateMode = gateMode === 'signup' ? 'login' : 'signup';
  document.getElementById('gate-title').textContent = gateMode === 'signup' ? 'Créez votre compte' : 'Content de vous revoir';
  document.getElementById('gate-btn').textContent = gateMode === 'signup' ? 'Créer mon compte' : 'Se connecter';
  document.getElementById('gate-toggle').textContent = gateMode === 'signup' ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire";
  document.getElementById('gate-error').textContent = '';
}
 
async function handleAuth(){
  const err = document.getElementById('gate-error');
  const email = document.getElementById('gate-email').value.trim();
  const password = document.getElementById('gate-password').value;
  err.style.color = 'var(--red)'; err.textContent = '';
  try{
    if(gateMode === 'signup'){
      const { data, error } = await sb.auth.signUp({ email, password });
      if(error){ err.textContent = error.message; return; }
      if(!data.session){ // confirmation par email activée dans Supabase
        err.style.color = 'var(--primary)';
        err.textContent = 'Compte créé ! Clique sur le lien reçu par email, puis reviens te connecter.';
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){ err.textContent = error.message; return; }
    }
    document.getElementById('gate').classList.add('hidden');
    loadPlan();
  }catch(e){
    err.textContent = 'Erreur : ' + e.message + ' (vérifie SUPABASE_URL et SUPABASE_ANON_KEY dans app.js)';
  }
}
 
let currentUserId = '';
let userProfile = { prenom:'', activite:'', objectif:'' };
let profileColumns = true; // passe à false si le SQL de mise à jour n'a pas encore été lancé
 
const ACTIVITES = {
  freelance:{ h:"Votre activité de freelance, sous contrôle.", p:"Suivez vos encaissements, relancez vos factures en retard et gardez un œil sur vos charges." },
  micro:{ h:"Votre chiffre d’affaires, sans mauvaise surprise.", p:"Suivez vos recettes et vos cotisations pour rester serein face aux échéances." },
  pme:{ h:"Le pilotage de votre entreprise, en un coup d’œil.", p:"Trésorerie, factures clients et dépenses : l’essentiel pour décider vite." },
  autre:{ h:"Bienvenue sur Lucide.", p:"Explorez le tableau de bord et testez les outils de pilotage financier." }
};
const OBJECTIFS = {
  tresorerie:{ label:"Suivre ma trésorerie", actions:[["transactions","+ Ajouter une transaction"],["forecast","Voir mes prévisions"],["analytics","Analyser mes dépenses"]] },
  facturation:{ label:"Gérer mes factures", actions:[["invoices","+ Créer une facture"],["invoices","Suivre les impayés"],["transactions","Exporter mes transactions"]] },
  prix:{ label:"Fixer mes prix et ma marge", actions:[["simulator","Simuler un prix"],["analytics","Voir mes dépenses"],["optimization","Trouver des économies"]] },
  decouvrir:{ label:"Découvrir Lucide", actions:[["transactions","Voir les transactions"],["invoices","Voir les factures"],["plans","Comparer les plans"]] }
};
 
function greeting(){ return userProfile.prenom ? 'Bonjour, ' + userProfile.prenom + ' 👋' : 'Bonjour 👋'; }
 
function applyPersonalization(){
  const g = id => document.getElementById(id);
  const name = userProfile.prenom;
  g('title').textContent = greeting();
  g('avatar').textContent = (name || currentEmail || 'L').slice(0,2).toUpperCase();
  g('ws-name').textContent = name ? 'Espace de ' + name : 'Mon entreprise';
  g('today').textContent = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 
  const act = ACTIVITES[userProfile.activite];
  if(act){ g('welcome-h').textContent = act.h; g('welcome-p').textContent = act.p; }
 
  const box = g('perso-actions'); box.innerHTML = '';
  const obj = OBJECTIFS[userProfile.objectif] || OBJECTIFS.decouvrir;
  obj.actions.forEach(([target, label], i) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (i === 0 ? 'primary' : 'ghost');
    b.textContent = label + (requiresPlan(target) ? ' 🔒' : '');
    b.onclick = () => view(target);
    box.appendChild(b);
  });
 
  // libellé du plan + boutons de la page des plans
  g('plan-label').textContent = currentPlan === 'premium' ? 'Plan Premium' : currentPlan === 'pro' ? 'Plan Pro' : 'Plan Free';
  const free = g('stripeFree'), pro = g('stripePro'), prem = g('stripePremium');
  if(free) free.textContent = currentPlan === 'free' ? 'Plan actuel' : 'Inclus';
  if(pro){
    pro.textContent = currentPlan === 'pro' ? 'Plan actuel' : currentPlan === 'premium' ? 'Inclus dans Premium' : 'Passer à Pro';
    pro.disabled = currentPlan !== 'free';
  }
  if(prem){
    prem.textContent = currentPlan === 'premium' ? 'Plan actuel' : 'Passer à Premium';
    prem.disabled = currentPlan === 'premium';
  }
}
 
function showOnboarding(){
  modal(`<h2>Personnalisons Lucide</h2><p>Trois réponses pour adapter votre tableau de bord.</p><div class="modal-form">
    <label>Prénom<input id="ob-prenom" maxlength="40" autocomplete="given-name"></label>
    <label>Votre activité<select id="ob-activite">
      <option value="freelance">Freelance / indépendant</option>
      <option value="micro">Micro-entrepreneur</option>
      <option value="pme">Petite entreprise</option>
      <option value="autre">Autre / je découvre</option></select></label>
    <label>Votre objectif principal<select id="ob-objectif">
      <option value="tresorerie">Suivre ma trésorerie</option>
      <option value="facturation">Gérer mes factures</option>
      <option value="prix">Fixer mes prix et ma marge</option>
      <option value="decouvrir">Découvrir Lucide</option></select></label>
    <p class="muted" id="ob-err" style="color:var(--red)"></p>
    <button class="btn primary" id="ob-save">Enregistrer</button></div>`);
  document.getElementById('ob-prenom').value = userProfile.prenom || '';
  if(userProfile.activite) document.getElementById('ob-activite').value = userProfile.activite;
  if(userProfile.objectif) document.getElementById('ob-objectif').value = userProfile.objectif;
  document.getElementById('ob-save').onclick = async () => {
    const prenom = document.getElementById('ob-prenom').value.trim();
    const activite = document.getElementById('ob-activite').value;
    const objectif = document.getElementById('ob-objectif').value;
    const err = document.getElementById('ob-err');
    if(!prenom){ err.textContent = 'Indique ton prénom.'; return; }
    const { error } = await sb.from('profils').update({ prenom, activite, objectif }).eq('id', currentUserId);
    if(error){ err.textContent = 'Enregistrement impossible : ' + error.message; return; }
    userProfile = { prenom, activite, objectif };
    document.getElementById('modal').classList.add('hidden');
    applyPersonalization();
  };
}
 
async function loadPlan(silent){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) return;
  currentUserId = user.id; currentEmail = user.email || '';
  let res = await sb.from('profils').select('plan,prenom,activite,objectif').eq('id', user.id).maybeSingle();
  if(res.error){ // colonnes de personnalisation absentes : on relit au moins le plan
    profileColumns = false;
    res = await sb.from('profils').select('plan').eq('id', user.id).maybeSingle();
  }
  const profil = res.data || {};
  currentPlan = profil.plan || 'free';
  userProfile = { prenom: profil.prenom || '', activite: profil.activite || '', objectif: profil.objectif || '' };
  applyPersonalization();
  if(!silent) loadData();
  if(!silent && profileColumns && !userProfile.prenom) showOnboarding();
}
 
async function pollAfterPayment(){
  if(!/[?&]paid=1/.test(location.search)) return;
  history.replaceState(null, '', location.pathname);
  modal('<h2>Paiement reçu 🎉</h2><p>Nous activons votre plan…</p>');
  for(let i = 0; i < 10 && currentPlan === 'free'; i++){
    await new Promise(r => setTimeout(r, 3000));
    await loadPlan(true);
  }
  modal(currentPlan !== 'free'
    ? '<h2>Votre plan ' + (currentPlan === 'premium' ? 'Premium' : 'Pro') + ' est activé ✅</h2><p>Les fonctionnalités sont débloquées.</p>'
    : '<h2>Activation en cours</h2><p>Cela peut prendre une minute. Recharge la page dans un instant.</p>');
}
 
window.addEventListener('focus', () => { if(currentUserId) loadPlan(true); });
 
async function loadData(){
  const fr = d => new Date(d).toLocaleDateString('fr-FR');
  const [t, f] = await Promise.all([
    sb.from('transactions').select('*').order('date',{ascending:false}).order('created_at',{ascending:false}),
    sb.from('factures').select('*').order('created_at',{ascending:false})
  ]);
  if(t.error || f.error) console.error('Lecture données :', (t.error || f.error).message);
  state.tx = (t.data||[]).map(x=>({d:fr(x.date).slice(0,5),l:x.libelle,c:x.categorie,t:x.type,a:+x.montant}));
  state.invoices = (f.data||[]).map(x=>({n:x.numero,c:x.client,d:fr(x.date_emission),e:x.echeance?fr(x.echeance):'À définir',a:+x.montant,s:x.statut}));
  renderTx(); renderInvoices();
}
 
function requiresPlan(id){
  if(id === 'team' && currentPlan !== 'premium') return 'premium';
  if(['simulator','forecast','optimization'].includes(id) && currentPlan === 'free') return 'pro';
  return null;
}
 
async function handleLogout(){
  await sb.auth.signOut();
  location.reload();
}
 
(async function(){
  try{
    const { data: { session } } = await sb.auth.getSession();
    if(session){ document.getElementById('gate').classList.add('hidden'); loadPlan().then(pollAfterPayment); }
  }catch(e){}
})();
 
const state={tx:[
{d:"26/09",l:"Paiement client — Studio Nova",c:"Ventes",t:"income",a:1840},
{d:"25/09",l:"Adobe Creative Cloud",c:"Logiciels",t:"expense",a:59},
{d:"24/09",l:"Prestation — Maison L.",c:"Ventes",t:"income",a:720},
{d:"23/09",l:"URSSAF",c:"Charges sociales",t:"expense",a:620},
{d:"21/09",l:"Coworking",c:"Locaux",t:"expense",a:190},
{d:"20/09",l:"Prestation — Atelier 17",c:"Ventes",t:"income",a:1250}],invoices:[
{n:"FAC-2026-018",c:"Studio Nova",d:"26/09/2026",e:"26/10/2026",a:1840,s:"pending"},
{n:"FAC-2026-017",c:"Maison L.",d:"24/09/2026",e:"24/10/2026",a:720,s:"pending"},
{n:"FAC-2026-016",c:"Atelier 17",d:"20/09/2026",e:"20/10/2026",a:1250,s:"paid"},
{n:"FAC-2026-015",c:"Lila Studio",d:"14/09/2026",e:"14/10/2026",a:990,s:"paid"},
{n:"FAC-2026-014",c:"Agence K.",d:"05/09/2026",e:"20/09/2026",a:620,s:"late"}],
scenarios:JSON.parse(localStorage.getItem("lucideScenarios")||"[]")};
const $=id=>document.getElementById(id), eur=n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
 
function view(id){const need=requiresPlan(id);if(need){modal(`<h2>Fonction ${need==='premium'?'Premium':'Pro'}</h2><p>Cette section est réservée au plan ${need==='premium'?'Premium':'Pro'}.</p><button class="btn primary full" onclick="document.getElementById('modal').classList.add('hidden');view('plans')">Voir les plans</button>`);return}document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));$(id)?.classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===id));$("title").textContent=({dashboard:greeting(),transactions:"Transactions",invoices:"Facturation",simulator:"Simulateur",forecast:"Prévisions",analytics:"Analyses",optimization:"Optimisation",team:"Collaborateurs",settings:"Paramètres",plans:"Lucide Premium"})[id]||"Lucide";$("sidebar").classList.remove("open");if(id==="analytics")expenseChart();if(id==="forecast")forecastChart();}
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelectorAll("[data-view-target]").forEach(b=>b.onclick=()=>view(b.dataset.viewTarget));
$("mobile").onclick=()=>$("sidebar").classList.toggle("open");
$("theme").onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"light":"dark";localStorage.setItem("lucideTheme",document.documentElement.dataset.theme);mainChart();};
if(localStorage.getItem("lucideTheme"))document.documentElement.dataset.theme=localStorage.getItem("lucideTheme");
 
function renderTx(){let q=$("search").value.toLowerCase(),f=$("filter").value;let a=state.tx.filter(x=>(f==="all"||x.t===f)&&(`${x.l} ${x.c}`).toLowerCase().includes(q));$("txTable").innerHTML=a.map(x=>`<tr><td>${x.d}</td><td><b>${x.l}</b></td><td>${x.c}</td><td class="${x.t==="income"?"type-in":"type-out"}">${x.t==="income"?"Recette":"Dépense"}</td><td>${x.t==="income"?"+":"−"} ${eur(x.a)}</td></tr>`).join("")}
$("search").oninput=renderTx;$("filter").onchange=renderTx;
function renderInvoices(){$("invoiceTable").innerHTML=state.invoices.map(x=>`<tr><td>${x.n}</td><td>${x.c}</td><td>${x.d}</td><td>${x.e}</td><td>${eur(x.a)}</td><td><span class="status ${x.s}">${x.s==="paid"?"Payée":x.s==="late"?"En retard":"À encaisser"}</span></td></tr>`).join("")}
 
function modal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden")}
$("closeModal").onclick=()=>$("modal").classList.add("hidden");
$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};
 
$("addTx").onclick=()=>{modal(`<h2>Ajouter une transaction</h2><div class="modal-form"><label>Libellé<input id="ml"></label><label>Montant<input id="ma" type="number"></label><label>Type<select id="mt"><option value="income">Recette</option><option value="expense">Dépense</option></select></label><label>Catégorie<input id="mc" placeholder="Ventes, logiciel…"></label><button class="btn primary" id="ms">Ajouter</button></div>`);$("ms").onclick=async()=>{const{error}=await sb.from('transactions').insert({libelle:$("ml").value||"Nouvelle transaction",categorie:$("mc").value||"Autre",type:$("mt").value,montant:Math.abs(+$("ma").value||0)});if(error){alert("Enregistrement impossible : "+error.message);return}$("modal").classList.add("hidden");loadData()}};
 
$("newInvoice").onclick=()=>{modal(`<h2>Nouvelle facture</h2><p>Cette version crée une facture de démonstration. La transmission électronique devra être connectée à une PDP compatible.</p><div class="modal-form"><label>Client<input id="ic"></label><label>Montant<input id="ia" type="number"></label><button class="btn primary" id="is">Créer</button></div>`);$("is").onclick=async()=>{const{error}=await sb.from('factures').insert({numero:`FAC-${new Date().getFullYear()}-${String(state.invoices.length+1).padStart(3,"0")}`,client:$("ic").value||"Nouveau client",echeance:new Date(Date.now()+30*864e5).toISOString().slice(0,10),montant:Math.abs(+$("ia").value||0)});if(error){alert("Enregistrement impossible : "+error.message);return}$("modal").classList.add("hidden");loadData()}};
 
function slider(id,out,fmt){$(id).oninput=()=>{ $(out).textContent=fmt(+$(id).value);simulate()};$(id).oninput()}
slider("price","priceO",v=>eur(v));slider("sales","salesO",v=>v);slider("variable","varO",v=>v+" %");slider("fixed","fixedO",v=>eur(v));
function simulate(){let ca=+$("price").value*+$("sales").value,v=ca*+$("variable").value/100,f=+$("fixed").value,p=ca-v-f,m=ca?p/ca*100:0;$("simCa").textContent=eur(ca);$("simVar").textContent=eur(v);$("simFix").textContent=eur(f);$("profit").textContent=eur(p);$("margin").textContent=m.toFixed(1).replace(".",",")+" %";$("simMessage").textContent=p<0?"Scénario déficitaire : testez un autre prix, volume ou niveau de charges.":m<30?"Marge serrée : testez une hausse de tarif ou une baisse des charges.":"Scénario confortable avant impôts et cotisations personnelles."}
$("saveScenario").onclick=()=>{state.scenarios.push({n:"Scénario "+(state.scenarios.length+1),p:$("profit").textContent,m:$("margin").textContent,d:new Date().toLocaleDateString("fr-FR")});localStorage.setItem("lucideScenarios",JSON.stringify(state.scenarios));renderScenarios()};
function renderScenarios(){$("scenarios").innerHTML=state.scenarios.length?state.scenarios.map(x=>`<div class="scenario"><b>${x.n}</b><small>${x.d} · ${x.p} · ${x.m}</small></div>`).join(""):`<div class="scenario"><b>Aucun scénario</b><small>Enregistrez votre première simulation.</small></div>`}
 
let charts={};function base(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:getComputedStyle(document.documentElement).getPropertyValue("--text")}}},scales:{x:{ticks:{color:getComputedStyle(document.documentElement).getPropertyValue("--muted")},grid:{color:getComputedStyle(document.documentElement).getPropertyValue("--line")}},y:{ticks:{color:getComputedStyle(document.documentElement).getPropertyValue("--muted")},grid:{color:getComputedStyle(document.documentElement).getPropertyValue("--line")},beginAtZero:true}}}}
function mainChart(){if(charts.main)charts.main.destroy();charts.main=new Chart($("mainChart"),{type:"line",data:{labels:["Avr.","Mai","Juin","Juil.","Août","Sept."],datasets:[{label:"Encaissements",data:[5400,6200,7100,6800,7490,8420],borderColor:"#26765e",backgroundColor:"#26765e22",fill:true,tension:.35},{label:"Dépenses",data:[2400,2650,3100,2940,3055,3180],borderColor:"#ad7625",tension:.35}]},options:base()})}
function expenseChart(){if(charts.exp)charts.exp.destroy();charts.exp=new Chart($("expenseChart"),{type:"doughnut",data:{labels:["Social","Logiciels","Locaux","Marketing","Autres"],datasets:[{data:[36,17,14,11,22],backgroundColor:["#26765e","#62a989","#ad7625","#7c8f86","#b74d4d"],borderWidth:0}]},options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}})}
function forecastChart(){if(charts.fc)charts.fc.destroy();charts.fc=new Chart($("forecastChart"),{type:"line",data:{labels:["Aujourd’hui","30 j","60 j","90 j"],datasets:[{label:"Trésorerie",data:[12680,14120,15060,15920],borderColor:"#26765e",tension:.3}]},options:base()})}
 
const inviteBtn = $("invite");

if (inviteBtn) {
  inviteBtn.onclick = () => {
    modal(`
      <h2>Inviter un collaborateur</h2>
      <p>
        Le collaborateur recevra un lien d’invitation.
        Les rôles seront appliqués côté serveur dans la version connectée.
      </p>

      <div class="modal-form">
        <label>
          Email
          <input id="em" type="email" placeholder="prenom@entreprise.fr">
        </label>

        <label>
          Rôle
          <select>
            <option>Comptable</option>
            <option>Collaborateur</option>
            <option>Administrateur</option>
          </select>
        </label>

        <button class="btn primary" id="send">
          Envoyer l'invitation
        </button>
      </div>
    `);

    $("send").onclick = () => {
      modal(`
        <h2>Invitation prête</h2>
        <p>
          Invitation de démonstration créée pour
          <b>${$("em").value || "le collaborateur"}</b>.
          Dans la version production, elle sera envoyée par le backend.
        </p>
      `);
    };
  };
}

function stripePlan(plan){const id=plan==="pro"?LUCIDE_STRIPE.proPriceId:LUCIDE_STRIPE.premiumPriceId;if(!id){modal(`<h2>Stripe n’est pas encore relié</h2><p>Ajoute le <b>lien de paiement</b> de ${plan==="pro"?"Lucide Pro":"Lucide Premium"} dans <code>config.js</code> (créé depuis Stripe > Payment Links).</p><p>Ne mets jamais ta clé secrète Stripe dans ce fichier.</p>`);return}
  if(plan==="premium" && currentPlan==="pro"){
    if(LUCIDE_STRIPE.customerPortalUrl){ window.location.href = LUCIDE_STRIPE.customerPortalUrl; return }
    modal(`<h2>Passer de Pro à Premium</h2><p>Pour éviter un double abonnement, change de formule depuis ton espace de gestion d’abonnement Stripe (lien présent sur tes reçus), ou contacte-nous.</p>`);return
  }
  if(/^https?:\/\//.test(id)){
    const u = new URL(id);
    if(currentEmail) u.searchParams.set("prefilled_email", currentEmail);
    if(currentUserId) u.searchParams.set("client_reference_id", currentUserId);
    window.location.href = u.toString(); return
  } // lien de paiement Stripe : redirection directe, aucun serveur requis
  modal(`<h2>${plan==="pro"?"Lucide Pro":"Lucide Premium"}</h2><p>Price ID configuré : ${id}</p><p>Un Price ID brut (contrairement à un lien de paiement) nécessite un endpoint Stripe Checkout côté serveur pour créer la session d’abonnement.</p>`)};
$("stripePro").onclick=()=>stripePlan("pro");$("stripePremium").onclick=()=>stripePlan("premium");
 
$("csv").onclick=()=>{let rows=[["Date","Libellé","Catégorie","Type","Montant"],...state.tx.map(x=>[x.d,x.l,x.c,x.t,x.a])];let csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="lucide-transactions.csv";a.click()};
renderTx();renderInvoices();renderScenarios();simulate();mainChart();
 
