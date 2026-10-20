// Supabase → Project Settings → API. The anon key is safe to expose; row-level security protects the data.
const SUPABASE_URL = 'https://lmamkxzovliynecodzmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j6w0niT11Bu6KwubMe-27w_X8zxfpKm';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const other = (a) => (a === 'online' ? 'cash' : 'online');
let txns = [];

// ---- Auth ----
$('#auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const creds = { email: $('#email').value, password: $('#password').value };
  const signUp = e.submitter.value === 'signup';
  const { data, error } = signUp ? await db.auth.signUp(creds) : await db.auth.signInWithPassword(creds);
  $('#auth-msg').textContent = error ? error.message : signUp && !data.session ? 'Check your email to confirm.' : '';
};
$('#logout').onclick = () => db.auth.signOut();

db.auth.onAuthStateChange((_event, session) => {
  $('#auth').hidden = !!session;
  $('#app').hidden = !session;
  if (session) {
    $('#who').textContent = session.user.email;
    setTimeout(load); // don't call Supabase inside this callback directly
  }
});

// ---- Data ----
async function load() {
  const { data, error } = await db.from('transactions').select('*')
    .order('date', { ascending: false }).order('id', { ascending: false });
  if (error) return alert(error.message);
  txns = data;
  render();
}

async function insert(row) {
  const { error } = await db.from('transactions').insert({ date: today(), ...row });
  if (error) return alert(error.message);
  await load();
}

function balances() {
  const b = { online: 0, cash: 0 };
  for (const t of txns) {
    const a = +t.amount;
    if (t.kind === 'expense') b[t.account] -= a;
    else if (t.kind === 'transfer') { b[t.account] -= a; b[t.to_account] += a; }
    else b[t.account] += a; // income, adjust
  }
  return b;
}

// ---- Add transaction ----
const form = $('#txn-form');
function syncForm() {
  const k = form.kind.value;
  $('#to-label').hidden = k !== 'transfer';
  $('#to-label').textContent = `→ ${other(form.account.value)}`;
  form.category.hidden = k !== 'expense';
}
form.kind.onchange = form.account.onchange = syncForm;

form.onsubmit = async (e) => {
  e.preventDefault();
  const k = form.kind.value, account = form.account.value;
  await insert({
    kind: k,
    account,
    to_account: k === 'transfer' ? other(account) : null,
    amount: form.amount.value,
    category: k === 'expense' ? form.category.value.trim() || 'Other' : null,
    note: form.note.value.trim() || null,
    date: form.date.value,
  });
  form.amount.value = form.category.value = form.note.value = '';
};

// ---- Set balance: records the difference so history stays consistent ----
$('#bal-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target, account = f.account.value;
  const diff = Math.round((+f.amount.value - balances()[account]) * 100) / 100;
  if (diff) await insert({ kind: 'adjust', account, amount: diff, note: 'Balance set' });
  f.reset();
};

// ---- Render ----
const month = $('#month');
month.onchange = render;

function describe(t) {
  if (t.kind === 'transfer') return `Transfer ${t.account} → ${t.to_account}`;
  if (t.kind === 'adjust') return `Balance set · ${t.account}`;
  return `${t.kind === 'income' ? 'Income' : esc(t.category)} · ${t.account}`;
}

function signed(t) {
  const a = +t.amount;
  if (t.kind === 'transfer') return `<span>${fmt(a)}</span>`;
  const v = t.kind === 'expense' ? -a : a;
  return `<span class="${v < 0 ? 'neg' : 'pos'}">${fmt(v)}</span>`;
}

function render() {
  const b = balances();
  $('#bal-online').textContent = fmt(b.online);
  $('#bal-cash').textContent = fmt(b.cash);
  $('#bal-total').textContent = fmt(b.online + b.cash);

  const rows = txns.filter((t) => t.date.startsWith(month.value));
  let income = 0, expense = 0;
  const byCat = {};
  for (const t of rows) {
    if (t.kind === 'income') income += +t.amount;
    if (t.kind === 'expense') { expense += +t.amount; byCat[t.category] = (byCat[t.category] || 0) + +t.amount; }
  }
  const cats = Object.entries(byCat).sort((x, y) => y[1] - x[1])
    .map(([c, v]) => `<div class="row"><span>${esc(c)}</span><span>${fmt(v)}</span></div>`).join('');
  $('#summary').innerHTML = `
    <div class="row"><span>Income</span><span class="pos">${fmt(income)}</span></div>
    <div class="row"><span>Expenses</span><span class="neg">${fmt(expense)}</span></div>
    <div class="row"><b>Net</b><b>${fmt(income - expense)}</b></div>
    ${cats && `<h2 style="margin-top:16px">By category</h2>${cats}`}
    <h2 style="margin-top:16px">Transactions</h2>`;

  $('#list').innerHTML = rows.map((t) => `
    <div class="row">
      <span>${describe(t)}<br><small>${t.date}${t.note ? ' · ' + esc(t.note) : ''}</small></span>
      <span>${signed(t)} <button class="link" data-del="${t.id}" title="Delete">✕</button></span>
    </div>`).join('') || '<small>No transactions.</small>';
}

$('#list').onclick = async (e) => {
  const id = e.target.dataset.del;
  if (!id || !confirm('Delete this transaction?')) return;
  const { error } = await db.from('transactions').delete().eq('id', id);
  error ? alert(error.message) : load();
};

// ---- Init ----
form.date.value = today();
month.value = today().slice(0, 7);
syncForm();
