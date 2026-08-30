// Adapts the uploaded standalone WordPress-embed customizer into a CRM tool
// under public/tools/. Kept as a script (not hand-editing) so the source
// upload stays the source of truth and the patch is repeatable/reviewable.
import { readFile, writeFile } from "node:fs/promises";

const SRC = "C:/Users/kamal/.claude/uploads/bb3ecc9a-17b3-4e6b-8dbf-d94e383e35dc/93765b96-takaful4usquotationcustomizer.html";
const OUT = "c:/Dev/7. Prestige Legacy CRM/Repo/prestigelegacycrm/public/tools/quotation-customizer.html";
const SUPABASE_FN = "https://icvxnjtqppieghcumpdw.supabase.co/functions/v1/capture-quotation";

let s = await readFile(SRC, "utf8");
const before = s.length;
const applied = [];
function patch(name, find, replace) {
  if (!s.includes(find)) throw new Error(`anchor not found: ${name}`);
  s = s.replace(find, replace);
  applied.push(name);
}

// 1) CRM endpoint alongside the existing config.
patch(
  "config",
  "  const CONFIG = {\n",
  `  const CONFIG = {
    // CRM fan-out -- same endpoint the other two calculators post to.
    CAPTURE_QUOTATION_URL : ${JSON.stringify(SUPABASE_FN)},
`,
);

// 2) Replace the Pabbly save with a CRM save that writes a real quotation row
//    against the lead, and tells the parent frame so it can refresh.
patch(
  "save",
  "  // SAVE -> Pabbly webhook\n  document.getElementById('btnSave').addEventListener('click', async ()=>{",
  `  // SAVE -> CRM (capture-quotation). Falls back to the original Pabbly
  // webhook only when this isn't opened against a lead.
  document.getElementById('btnSave').addEventListener('click', async ()=>{
    if(CRM.leadId){ return CRM.save(); }`,
);

// 3) CRM integration block, inserted inside the module closure so it can reach
//    state/render/buildPayload, just before the existing init call.
patch(
  "crm-block",
  "  /* ---------- INIT ---------- */\n  render();",
  `  /* ---------- CRM INTEGRATION ---------- */
  const CRM = (function(){
    const q = new URLSearchParams(location.search);
    const leadId = q.get('lead_id') || '';
    const quotationId = q.get('quotation_id') || '';
    let savedId = null;

    function post(msg){ try{ if(window.parent!==window) window.parent.postMessage(msg,'*'); }catch(e){} }

    // Prefill the customer card from the lead the CRM opened this for.
    function prefill(){
      const name = q.get('name'), dob = q.get('dob'), phone = q.get('phone');
      if(name){ state.profile.name = name; pfName.value = name; }
      if(phone){ state.profile.phone = phone; pfPhone.value = phone; }
      if(dob){ state.profile.dob = dob; pfDob.value = dob; pfAge.value = calcANB(dob); }
    }

    // Reopening a saved quotation: restore the exact columns/tab/language it
    // was saved with so it can be reviewed and edited, not just re-created.
    async function restore(){
      if(!quotationId) return;
      try{
        const res = await fetch('/api/quotations/' + quotationId, { headers:{ 'Accept':'application/json' } });
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const { raw_payload: p } = await res.json();
        if(!p || !p.__customizer) return;
        state.active = p.tab === 'hibah' ? 'hibah' : 'medical';
        state.lang = p.lang === 'en' ? 'en' : 'bm';
        if(p.customer){
          state.profile.name = p.customer.name || '';
          state.profile.phone = p.customer.phone || '';
          state.profile.dob = p.customer.dob || '';
          pfName.value = state.profile.name;
          pfPhone.value = state.profile.phone;
          pfDob.value = state.profile.dob;
          pfAge.value = calcANB(state.profile.dob);
        }
        if(Array.isArray(p.__columns) && p.__columns.length){
          state[state.active].columns = p.__columns;
        }
        document.querySelectorAll('#t4u-qc .qc-pill').forEach(x=>{
          x.classList.toggle('active', x.dataset.tab === state.active);
        });
        document.getElementById('t4u-qc').className = 'tab-' + state.active;
        render();
        showToast('Quotation loaded for editing.','ok');
      }catch(err){
        showToast('Could not load the saved quotation.','err');
      }
    }

    async function save(){
      const p = buildPayload();
      const tab = p.tab;
      // The customizer spans both product families; map onto the existing
      // quotation_product enum rather than widening it.
      const product = tab === 'hibah' ? 'hibah_mixed' : 'imedi_evolusi';
      // A blank column is one the agent hasn't filled in yet, not a real
      // option -- saving it would put RM0 plans on the lead and drag down the
      // pipeline/statistics figures that average over plans.
      const cols = p.columns.filter(c => (c.yearly_contribution || 0) > 0);
      if(!cols.length){
        showToast('Enter a yearly contribution for at least one plan first.','warn');
        return;
      }
      const plans = cols.map((c,i)=>({
        sort_order: i,
        plan_label: c.name || ((tab==='hibah' ? 'Hibah' : 'Medical') + ' Option ' + (i+1)),
        monthly_contribution: c.monthly_contribution || 0,
        annual_contribution: c.yearly_contribution || 0,
        coverage_detail: c
      }));

      showToast('Saving to lead...');
      try{
        const res = await fetch(CONFIG.CAPTURE_QUOTATION_URL, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            lead_id: leadId, product, language: state.lang,
            // __customizer/__columns let restore() rebuild the editor exactly;
            // the rest stays human-readable for anything else reading it.
            raw_payload: Object.assign({}, p, { __customizer:true, __columns: state[tab].columns }),
            plans
          })
        });
        const json = await res.json().catch(()=>null);
        if(!res.ok || !json || !json.quotation_id) throw new Error((json&&json.error)||('HTTP '+res.status));
        savedId = json.quotation_id;
        showToast('Saved to lead.','ok');
        post({ type:'t4u-quotation-saved', quotation_id: savedId });
      }catch(err){
        showToast('Save failed: ' + (err&&err.message?err.message:''),'err');
      }
    }

    return { leadId, quotationId, prefill, restore, save };
  })();

  /* ---------- INIT ---------- */
  render();
  CRM.prefill();
  CRM.restore();`,
);

// 4) The upload is a WordPress fragment (no <html>/<head>/<body>); wrap it so
//    it stands up as its own page inside the CRM's quotation iframe.
s = `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quotation Customizer — Prestige Legacy</title>
<style>html,body{margin:0;padding:0;background:#fbf4e4}</style>
</head>
<body>
${s}
</body>
</html>
`;

await writeFile(OUT, s, "utf8");
console.log("patches applied:", applied.join(", "));
console.log("bytes:", before, "->", s.length);
