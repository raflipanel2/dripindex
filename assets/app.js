'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 2) => Number.isFinite(n) ? new Intl.NumberFormat('en-US', {maximumFractionDigits:d}).format(n) : '—';
  const num = (id) => Number($(id)?.value);
  const setText = (id, value) => { if ($(id)) $(id).textContent = String(value); };
  const menu = $('menu-toggle');
  const nav = $('nav-links');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); }));
  }
  const search = $('guide-search');
  const cards = [...document.querySelectorAll('#guides-list .guide-card')];
  if (search && cards.length) {
    let active = 'all';
    const update = () => {
      const q = search.value.trim().toLowerCase();
      let count = 0;
      cards.forEach(card => {
        const category = card.querySelector('.card-kicker')?.textContent.toLowerCase().replace(/[0-9]/g, '').trim() || '';
        const visible = (active === 'all' || category.includes(active.toLowerCase())) && (!q || card.textContent.toLowerCase().includes(q));
        card.hidden = !visible;
        if (visible) count++;
      });
      setText('result-count', `${count} ${count === 1 ? 'guide' : 'guides'}`);
      if ($('empty-message')) $('empty-message').hidden = count !== 0;
    };
    search.addEventListener('input', update);
    document.querySelectorAll('[data-category]').forEach(b => b.addEventListener('click', () => {
      active = b.dataset.category || 'all';
      document.querySelectorAll('[data-category]').forEach(x => x.classList.toggle('active', x === b));
      update();
    }));
    update();
  }
  const drip = $('drip-form');
  if (drip) drip.addEventListener('submit', e => {
    e.preventDefault();
    const rate = num('drops-per-minute'), ml = num('drop-ml'), days = num('days-per-month'), price = num('water-rate');
    if (![rate, ml, days, price].every(Number.isFinite) || rate < 0 || ml <= 0 || days < 1 || days > 365 || price < 0) return;
    const daily = rate * ml * 1440 / 1000, period = daily * days, cubic = period / 1000;
    setText('drip-daily', fmt(daily, 3)); setText('drip-period', fmt(period, 2)); setText('drip-cubic', fmt(cubic, 4));
    setText('drip-price', price > 0 ? `Estimated variable-use cost for this water volume: ${fmt(cubic * price, 2)} in your currency (does not include fixed charges, sewer pricing or tiers).` : 'Optional unit-rate estimate not included. A utility bill may have fixed charges or tiered pricing.');
    $('drip-results').classList.add('show');
  });
  const flow = $('flow-form');
  if (flow) flow.addEventListener('submit', e => {
    e.preventDefault();
    const liters = num('flow-liters'), sec = num('flow-seconds'), duration = num('flow-duration');
    if (![liters,sec,duration].every(Number.isFinite) || liters <= 0 || sec <= 0 || duration < 0) return;
    const lpm = liters/sec*60;
    setText('flow-lpm', fmt(lpm,2)); setText('flow-use',fmt(lpm*duration,2)); setText('flow-gpm',fmt(lpm/3.785411784,2));
    $('flow-results').classList.add('show');
  });
  const form = $('meter-form');
  if (!form) return;
  const KEY='dripindex-meter-v1';
  let entries=[];
  let storageOK=true;
  const notice = message => setText('meter-notice',message);
  try {
    const value=JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(value)) entries=value.filter(e=>e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number.isFinite(e.value)).map(e=>({date:e.date,value:e.value,note:String(e.note||'').slice(0,160)}));
  } catch(err) {storageOK=false;notice('Browser storage is unavailable. You can still use this page in memory; export your records before leaving.');}
  if ($('meter-date')) $('meter-date').value = new Date().toLocaleDateString('en-CA');
  const save = () => {
    try {localStorage.setItem(KEY,JSON.stringify(entries));storageOK=true;return true;} catch(e){storageOK=false;notice('Local storage is blocked or full. Export CSV before leaving this page.');return false;}
  };
  const asDate = iso => Date.parse(`${iso}T00:00:00Z`);
  const sorted = () => [...entries].sort((a,b)=>a.date.localeCompare(b.date));
  const td=(tr, value) => {const x=document.createElement('td');x.textContent=String(value);tr.appendChild(x);};
  const draw=()=>{
    const rows=$('meter-rows');rows.replaceChildren();
    const list=sorted();
    if(!list.length){const tr=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.textContent='No readings yet. Save one above to begin.';tr.appendChild(cell);rows.appendChild(tr);return;}
    list.forEach((e,i)=>{
      const prev=list[i-1], tr=document.createElement('tr');
      const delta=prev?e.value-prev.value:null, days=prev?Math.round((asDate(e.date)-asDate(prev.date))/86400000):0;
      td(tr,e.date);td(tr,fmt(e.value,3));td(tr,delta===null?'—':(delta<0?'Check reading':fmt(delta,3)));td(tr,delta===null||delta<0||days<=0?'—':fmt(delta*1000/days,1));td(tr,e.note);
      const last=document.createElement('td'),b=document.createElement('button');b.type='button';b.textContent='Delete';b.setAttribute('aria-label',`Delete reading for ${e.date}`);
      b.addEventListener('click',()=>{entries=entries.filter(x=>x.date!==e.date);save();draw();notice(`Reading for ${e.date} deleted.`);});
      last.appendChild(b);tr.appendChild(last);rows.appendChild(tr);
    });
  };
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const date=$('meter-date').value, value=num('meter-value'), note=String($('meter-note').value||'').trim().slice(0,160);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)|| !Number.isFinite(value)||value<0) {notice('Check the date and non-negative reading.');return;}
    if(entries.some(x=>x.date===date)){notice('A reading already exists for that date. Delete it first if you want to replace it.');return;}
    entries.push({date,value,note});save();draw();notice(storageOK?'Reading saved in this browser.':'Reading saved in memory only. Export before closing the page.');form.reset();$('meter-date').value = date;
  });
  const escapeCsv = val => {
    let text=String(val??'');
    // Defang spreadsheet formula injection in any user-provided CSV field.
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const exportBtn=$('export-meter');
  exportBtn?.addEventListener('click',()=>{
    const records=sorted();
    if(!records.length){notice('Add a reading before exporting.');return;}
    const body=[['date','reading_m3','note'],...records.map(e=>[e.date,e.value.toFixed(3),e.note])].map(r=>r.map(escapeCsv).join(',')).join('\r\n');
    const blob=new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dripindex-meter-readings.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice(`Exported ${records.length} readings to a local CSV file.`);
  });
  $('clear-meter')?.addEventListener('click',()=>{
    if(!entries.length){notice('No readings to clear.');return;}
    if(confirm('Delete all locally stored water readings? This cannot be undone unless you exported a copy.')){entries=[];save();draw();notice('All entries cleared.');}
  });
  draw();
})();
