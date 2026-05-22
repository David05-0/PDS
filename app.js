// ══════════ AUTH ══════════
let currentUser = null; // { username, role, empId|null }
let loginRole = 'admin';

function loadUsers() {
  try {
    const u = localStorage.getItem('pds:users');
    if (u) return JSON.parse(u);
  } catch {}
  // Default accounts
  return [
    { username:'admin', password:'admin123', role:'admin', empId:null },
  ];
}
function saveUsers(users) {
  try { localStorage.setItem('pds:users', JSON.stringify(users)); } catch {}
}

function setLoginRole(r) {
  loginRole = r;
  document.getElementById('lrtAdmin').classList.toggle('active', r==='admin');
  document.getElementById('lrtEmp').classList.toggle('active', r==='employee');
  document.getElementById('adminLoginFields').style.display = r==='admin' ? 'block' : 'none';
  document.getElementById('empLoginFields').style.display = r==='employee' ? 'block' : 'none';
  document.getElementById('loginErr').style.display = 'none';
  // populate employee dropdown
  if (r==='employee') {
    const sel = document.getElementById('loginEmpSel');
    const emps = loadEmployeesRaw();
    const users = loadUsers();
    sel.innerHTML = '<option value="">— Choose your name —</option>' +
      emps.map(e => {
        const linked = users.find(u => u.empId === e.id && u.role === 'employee');
        return `<option value="${esc(e.id)}">${esc(e.personal.surname)}, ${esc(e.personal.firstName)} (${esc(e.id)})</option>`;
      }).join('');
  }
}

function loadEmployeesRaw() {
  try { const e = localStorage.getItem('pds:employees'); return e ? JSON.parse(e) : []; } catch { return []; }
}

function showLoginErr(msg) {
  const el = document.getElementById('loginErr');
  el.textContent = msg; el.style.display = 'block';
}

function doLogin() {
  const users = loadUsers();
  document.getElementById('loginErr').style.display = 'none';
  if (loginRole === 'admin') {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if (!u || !p) return showLoginErr('Please enter username and password.');
    const found = users.find(x => x.username === u && x.password === p && x.role === 'admin');
    if (!found) return showLoginErr('Invalid username or password.');
    currentUser = { username: u, role: 'admin', empId: null };
  } else {
    const empId = document.getElementById('loginEmpSel').value;
    const p = document.getElementById('loginEmpPass').value;
    if (!empId) return showLoginErr('Please select your name.');
    if (!p) return showLoginErr('Please enter your password.');
    const emps = loadEmployeesRaw();
    const emp = emps.find(e => e.id === empId);
    if (!emp) return showLoginErr('Employee not found.');
    // Find linked user account OR allow default password
    const linked = users.find(x => x.empId === empId && x.role === 'employee');
    const correctPw = linked ? linked.password : 'pds2025';
    const correctUser = linked ? linked.username : empId;
    if (p !== correctPw) return showLoginErr('Incorrect password.');
    currentUser = { username: linked ? linked.username : empId, role: 'employee', empId };
  }
  document.getElementById('loginOverlay').classList.add('hidden');
  initApp();
}

function doLogout() {
  currentUser = null;
  // Reset fields
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginEmpPass').value = '';
  document.getElementById('loginErr').style.display = 'none';
  setLoginRole('admin');
  document.getElementById('loginOverlay').classList.remove('hidden');
}

function initApp() {
  // Set topbar chip
  const avatarMap = { admin:'👤', employee:'🧑‍💼' };
  document.getElementById('tbAvatar').textContent = avatarMap[currentUser.role];
  document.getElementById('tbRoleLbl').textContent = currentUser.role === 'admin' ? 'Admin / HR' : 'Employee';
  let displayName = currentUser.username;
  if (currentUser.empId) {
    const emps = loadEmployeesRaw();
    const emp = emps.find(e => e.id === currentUser.empId);
    if (emp) displayName = emp.personal.surname + ', ' + emp.personal.firstName;
  }
  document.getElementById('tbName').textContent = displayName;
  // Apply role
  role = currentUser.role;
  document.getElementById('adminNav').style.display = role === 'admin' ? 'block' : 'none';
  document.getElementById('empNav').style.display = role === 'employee' ? 'block' : 'none';
  if (role === 'employee') {
    currentEmpId = currentUser.empId || 'NEW';
    // If the empId from the user account isn't in employees yet, that's okay — renderMyPDS handles 'NEW'
  }
  loadData();
  popEmpSels();
  document.getElementById('reportMonth').value = new Date().toISOString().slice(0,7);
  if (role === 'admin') { renderDashboard(); navigate('dashboard'); }
  else { renderMyPDS(); navigate('myPDS'); }
}

// ══════════ MANAGE USERS ══════════
function renderUsers() {
  const users = loadUsers();
  const uEmpLink = document.getElementById('uEmpLink');
  if (uEmpLink) {
    uEmpLink.innerHTML = '<option value="">— None —</option>' +
      employees.map(e => `<option value="${esc(e.id)}">${esc(e.personal.surname)}, ${esc(e.personal.firstName)} (${esc(e.id)})</option>`).join('');
  }
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  tbody.innerHTML = users.map((u,i) => {
    const empLabel = u.empId ? (() => { const e = employees.find(x=>x.id===u.empId); return e ? esc(empName(e)) + ' (' + esc(u.empId) + ')' : esc(u.empId); })() : '—';
    const isSelf = currentUser && u.username === currentUser.username;
    return `<tr>
      <td style="font-weight:600;font-family:'IBM Plex Mono',monospace">${esc(u.username)}${isSelf?'<span style="margin-left:6px;font-size:10px;color:var(--accent);font-family:\'IBM Plex Sans\',sans-serif;font-weight:400">(you)</span>':''}</td>
      <td><span class="badge ${u.role==='admin'?'badge-approved':'badge-tech'}">${esc(u.role)}</span></td>
      <td style="color:var(--text-muted)">${empLabel}</td>
      <td><div class="btn-group">
        <button class="btn btn-sm btn-blue" onclick="editUser(${i})">✏ Edit</button>
        ${!isSelf?`<button class="btn btn-sm btn-red" onclick="deleteUser(${i})">✕ Delete</button>`:''}
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No users yet.</td></tr>';
}

function editUser(i) {
  const users = loadUsers();
  const u = users[i];
  document.getElementById('uRole').value = u.role;
  document.getElementById('uUser').value = u.username;
  document.getElementById('uPass').value = '';
  document.getElementById('uEmpLink').value = u.empId || '';
  document.getElementById('uUser').dataset.editIdx = i;
}

function saveUser() {
  const uRole = document.getElementById('uRole').value;
  const uUser = document.getElementById('uUser').value.trim();
  const uPass = document.getElementById('uPass').value;
  const uEmpId = document.getElementById('uEmpLink').value;
  const errEl = document.getElementById('uErr');
  errEl.textContent = '';
  if (!uUser) return errEl.textContent = 'Username is required.';
  const users = loadUsers();
  const editIdx = document.getElementById('uUser').dataset.editIdx;
  const isEdit = editIdx !== undefined && editIdx !== '';
  const dupIdx = users.findIndex((u,i) => u.username === uUser && (!isEdit || i !== Number(editIdx)));
  if (dupIdx >= 0) return errEl.textContent = 'Username already exists.';
  if (isEdit) {
    users[Number(editIdx)].role = uRole;
    users[Number(editIdx)].username = uUser;
    if (uPass) users[Number(editIdx)].password = uPass;
    users[Number(editIdx)].empId = uEmpId || null;
    delete document.getElementById('uUser').dataset.editIdx;
  } else {
    if (!uPass) return errEl.textContent = 'Password is required for new users.';
    users.push({ username:uUser, password:uPass, role:uRole, empId:uEmpId||null });
  }
  saveUsers(users);
  document.getElementById('uUser').value=''; document.getElementById('uPass').value=''; document.getElementById('uEmpLink').value='';
  toast('User account saved.'); renderUsers();
}

function deleteUser(i) {
  if (!confirm('Delete this user account?')) return;
  const users = loadUsers();
  users.splice(i,1); saveUsers(users); renderUsers(); toast('User deleted.','warning');
}

// ══════════ STATE ══════════
let role = 'admin', currentEmpId = 'NEW', editingPDS = null, activeTab = 0;
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
let employees = [], trainings = [];

// ══════════ STORAGE ══════════
const DUMMY_EMPLOYEE = {
  id:'EMP-001', status:'approved', submittedAt:'2025-03-10', updatedAt:'2025-03-10',
  department:'Administrative Division', position:'Administrative Officer II', dateHired:'2019-06-15',
  personal:{
    surname:'DELA CRUZ', firstName:'JUAN', middleName:'SANTOS', nameExt:'JR.',
    dob:'1990-04-22', pob:'Baguio City, Benguet', sex:'Male', civil:'Married',
    height:'1.70', weight:'68', blood:'O+',
    umid:'1234-5678-9012', pagibig:'1234-5678-9012', philhealth:'12-345678901-2',
    philsys:'1234-5678-9012-3', tin:'123-456-789', agencyNo:'2019-0615-001',
    citizenship:'Filipino', dualCitizenship:false, dualCountry:'',
    residHouseNo:'123', residStreet:'Session Road', residSubdiv:'', residBrgy:'Brgy. Lualhati',
    residCity:'Baguio City', residProv:'Benguet', residZip:'2600',
    permHouseNo:'123', permStreet:'Session Road', permSubdiv:'', permBrgy:'Brgy. Lualhati',
    permCity:'Baguio City', permProv:'Benguet', permZip:'2600',
    telNo:'074-442-1234', mobileNo:'0917-123-4567', email:'juan.delacruz@gov.ph'
  },
  family:{
    spouseSurname:'DELA CRUZ', spouseFirstName:'MARIA', spouseMiddleName:'REYES', spouseExt:'',
    spouseOccupation:'Teacher', spouseEmployer:'DepEd Baguio City', spouseBusiness:'', spouseTel:'0918-765-4321',
    fatherSurname:'DELA CRUZ', fatherFirstName:'PEDRO', fatherMiddleName:'GARCIA', fatherExt:'SR.',
    motherSurname:'SANTOS', motherFirstName:'ROSARIO', motherMiddleName:'BAUTISTA',
    children:[
      {name:'DELA CRUZ, JOSE SANTOS', dob:'2015-08-12'},
      {name:'DELA CRUZ, ANA MARIA', dob:'2018-02-27'}
    ]
  },
  education:[
    {level:'College', school:'University of the Philippines Baguio', course:'Bachelor of Public Administration', from:'2008', to:'2012', units:'', yearGrad:'2012', honors:'Cum Laude'},
    {level:'Secondary', school:'Baguio City National High School', course:'', from:'2004', to:'2008', units:'', yearGrad:'2008', honors:'With Honors'},
    {level:'Elementary', school:'Baguio City Central School', course:'', from:'1998', to:'2004', units:'', yearGrad:'2004', honors:''}
  ],
  eligibility:[
    {name:'Career Service Professional', rating:'84.50', dateConf:'2013-08-18', place:'PRC Testing Center, Baguio City', licNo:'CSP-2013-08541', licValid:'N/A'}
  ],
  workExp:[
    {from:'2019-06-15', to:'Present', position:'Administrative Officer II', dept:'Administrative Division, Baguio City Government', status:'Permanent', govtService:'Yes'},
    {from:'2014-03-01', to:'2019-06-14', position:'Administrative Aide VI', dept:'Civil Registrar\'s Office, Baguio City', status:'Permanent', govtService:'Yes'},
    {from:'2012-07-01', to:'2014-02-28', position:'Records Officer I', dept:'Department of Interior and Local Government – CAR', status:'Contractual', govtService:'Yes'}
  ],
  voluntaryWork:[
    {org:'Baguio City Red Cross Chapter', from:'2016-01-01', to:'2016-12-31', hours:'80', position:'Volunteer Coordinator'}
  ],
  otherInfo:{
    skills:'Computer Literacy (MS Office, Google Workspace), Public Speaking, Records Management',
    distinctions:'Best Employee Award – Baguio City Government (2022), Outstanding Public Servant – CAR Regional Office (2020)',
    memberships:'Philippine Association of Administrative Professionals, Baguio City Government Employees Association'
  },
  questions:{
    q34a:false, q34b:false, q34det:'', q35a:false, q35aDet:'', q35b:false, q35bDet:'', q35bDate:'', q35bStatus:'',
    q36:false, q36Det:'', q37:false, q37Det:'', q38a:false, q38aDet:'', q38b:false, q38bDet:'',
    q39:false, q39Det:'', q40a:false, q40aSpec:'', q40b:false, q40bId:'', q40c:false, q40cId:''
  },
  references:[
    {name:'ANTONIO REYES', address:'Baguio City Hall, Baguio City', contact:'074-442-8000'},
    {name:'DR. CYNTHIA LOZANO', address:'UP Baguio, Gov. Pack Road, Baguio City', contact:'074-442-3045'},
    {name:'ENGR. MARK VALDEZ', address:'DPWH-CAR, Baguio City', contact:'0920-888-1234'}
  ],
  govtId:'Philippine Passport', govtIdNo:'P1234567A', govtIdIssuance:'2021-05-10 / DFA Baguio',
  dateAccomplished:'2025-03-10'
};

const DUMMY_TRAINING = {
  id:'TR-001', empId:'EMP-001', title:'Records Management and E-Government Systems Training',
  from:'2025-02-03', to:'2025-02-07', hours:'40', type:'Technical',
  conductedBy:'Civil Service Commission – CAR Regional Office', addedAt:'2025-02-10'
};

function loadData() {
  try {
    const e = localStorage.getItem('pds:employees');
    const t = localStorage.getItem('pds:trainings');
    employees = e ? JSON.parse(e) : [];
    trainings = t ? JSON.parse(t) : [];
    // Seed dummy data if empty
    if (employees.length === 0) {
      employees = [DUMMY_EMPLOYEE];
      trainings = [DUMMY_TRAINING];
      saveData();
    }
  } catch { employees = [DUMMY_EMPLOYEE]; trainings = [DUMMY_TRAINING]; }
}
function saveData() {
  try {
    localStorage.setItem('pds:employees', JSON.stringify(employees));
    localStorage.setItem('pds:trainings', JSON.stringify(trainings));
  } catch {}
}

// ══════════ UTILS ══════════
function fmt(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-PH', {year:'numeric',month:'short',day:'numeric'}) } catch { return d } }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function gv(id) { const el = document.getElementById(id); return el ? el.value : '' }
function newEmpId() { return 'EMP-' + String(employees.length + 1).padStart(3,'0') }
function newTrId() { return 'TR-' + String(trainings.length + 1).padStart(3,'0') }
function sbadge(s) {
  const m = {approved:'badge-approved',pending:'badge-pending',rejected:'badge-rejected',draft:'badge-draft'};
  return `<span class="badge ${m[s]||'badge-draft'}">${s}</span>`;
}
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = type; t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3200);
}
function getDepts() { return [...new Set(employees.map(e => e.department).filter(Boolean))] }
function empName(e) { return `${e.personal.surname}, ${e.personal.firstName}${e.personal.middleName ? ' ' + e.personal.middleName[0] + '.' : ''}` }
function empTr(id) { return trainings.filter(t => t.empId === id) }

function blankPDS() {
  return {
    id:'', status:'draft', submittedAt:null, updatedAt: new Date().toISOString().slice(0,10),
    department:'', position:'', dateHired:'',
    personal:{ surname:'',firstName:'',middleName:'',nameExt:'',dob:'',pob:'',sex:'',civil:'',height:'',weight:'',blood:'',
      umid:'',pagibig:'',philhealth:'',philsys:'',tin:'',agencyNo:'',citizenship:'Filipino',dualCitizenship:false,dualCountry:'',
      residHouseNo:'',residStreet:'',residSubdiv:'',residBrgy:'',residCity:'',residProv:'',residZip:'',
      permHouseNo:'',permStreet:'',permSubdiv:'',permBrgy:'',permCity:'',permProv:'',permZip:'',
      telNo:'',mobileNo:'',email:'' },
    family:{ spouseSurname:'',spouseFirstName:'',spouseMiddleName:'',spouseExt:'',spouseOccupation:'',
      spouseEmployer:'',spouseBusiness:'',spouseTel:'',
      fatherSurname:'',fatherFirstName:'',fatherMiddleName:'',fatherExt:'',
      motherSurname:'',motherFirstName:'',motherMiddleName:'', children:[] },
    education:[], eligibility:[], workExp:[], voluntaryWork:[],
    otherInfo:{ skills:'',distinctions:'',memberships:'' },
    questions:{ q34a:false,q34b:false,q34det:'',q35a:false,q35aDet:'',q35b:false,q35bDet:'',q35bDate:'',q35bStatus:'',
      q36:false,q36Det:'',q37:false,q37Det:'',q38a:false,q38aDet:'',q38b:false,q38bDet:'',
      q39:false,q39Det:'',q40a:false,q40aSpec:'',q40b:false,q40bId:'',q40c:false,q40cId:'' },
    references:[{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}],
    govtId:'', govtIdNo:'', govtIdIssuance:'', dateAccomplished:''
  };
}

// ══════════ NAVIGATION ══════════
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  if (page === 'dashboard') renderDashboard();
  else if (page === 'employees') renderEmployees();
  else if (page === 'training') renderTraining();
  else if (page === 'reports') renderReports();
  else if (page === 'myPDS') renderMyPDS();
  else if (page === 'users') renderUsers();
}

// switchRole is now handled by the login system (initApp)
function switchRole(r) {
  role = r;
  document.getElementById('adminNav').style.display = r === 'admin' ? 'block' : 'none';
  document.getElementById('empNav').style.display = r === 'employee' ? 'block' : 'none';
  navigate(r === 'admin' ? 'dashboard' : 'myPDS');
}

// ══════════ DASHBOARD ══════════
function renderDashboard() {
  const now = new Date().toISOString().slice(0,7);
  const mo = trainings.filter(t => t.addedAt && t.addedAt.startsWith(now)).length;
  const pending = employees.filter(e => e.status === 'pending').length;
  const approved = employees.filter(e => e.status === 'approved').length;
  document.getElementById('statGrid').innerHTML = [
    {label:'Total Employees', val:employees.length, color:'var(--accent)', bg:'var(--accent-light)'},
    {label:'Pending PDS', val:pending, color:'var(--amber)', bg:'var(--amber-light)'},
    {label:'Approved PDS', val:approved, color:'var(--green)', bg:'var(--green-light)'},
    {label:'Trainings This Month', val:mo, color:'var(--violet)', bg:'var(--violet-light)'}
  ].map(s => `<div class="stat-card" style="background:${s.bg}"><div class="stat-lbl" style="color:${s.color}">${s.label}</div><div class="stat-val" style="color:${s.color}">${s.val}</div></div>`).join('');

  const recent = [...employees].sort((a,b) => (b.submittedAt||'').localeCompare(a.submittedAt||'')).slice(0,8);
  document.getElementById('dashTable').innerHTML = recent.length ? recent.map(e => `
    <tr>
      <td class="mono">${e.id}</td>
      <td style="font-weight:500">${esc(empName(e))}</td>
      <td style="color:var(--text-muted)">${esc(e.department)}</td>
      <td style="color:var(--text-muted)">${esc(e.position)}</td>
      <td style="color:var(--text-muted)">${fmt(e.submittedAt)}</td>
      <td>${sbadge(e.status)}</td>
      <td><div class="btn-group">
        <button class="btn btn-sm btn-blue" onclick="viewPDS('${e.id}')">View</button>
        ${e.status==='pending' ? `<button class="btn btn-sm btn-green" onclick="approvePDS('${e.id}')">✓ Approve</button><button class="btn btn-sm btn-red" onclick="rejectPDS('${e.id}')">↩ Return</button>` : ''}
      </div></td>
    </tr>`).join('') :
    `<tr><td colspan="7"><div class="empty-state"><div class="icon">📋</div><h3>No Submissions Yet</h3><p>Employees will submit their PDS here.</p></div></td></tr>`;
}

// ══════════ EMPLOYEES ══════════
function renderEmployees() {
  const df = document.getElementById('filterDept'); const dv = df.value;
  df.innerHTML = '<option value="">All Departments</option>' + getDepts().map(d => `<option value="${esc(d)}"${dv===d?' selected':''}>${esc(d)}</option>`).join('');
  df.value = dv;
  const q = gv('filterQ').toLowerCase(), dept = gv('filterDept'), stat = gv('filterStatus');
  const f = employees.filter(e => {
    const nm = `${e.personal.surname} ${e.personal.firstName} ${e.personal.middleName} ${e.id} ${e.position}`.toLowerCase();
    return (!q || nm.includes(q)) && (!dept || e.department === dept) && (!stat || e.status === stat);
  });
  document.getElementById('empCount').textContent = `${f.length} employee(s) found`;
  document.getElementById('empTable').innerHTML = f.length ? f.map(e => `
    <tr>
      <td class="mono">${e.id}</td>
      <td style="font-weight:500">${esc(empName(e))}</td>
      <td style="color:var(--text-muted)">${esc(e.department)}</td>
      <td style="color:var(--text-muted)">${esc(e.position)}</td>
      <td style="color:var(--text-muted)">${fmt(e.dateHired)}</td>
      <td style="text-align:center;font-weight:700;color:var(--accent)">${empTr(e.id).length}</td>
      <td>${sbadge(e.status)}</td>
      <td><div class="btn-group">
        <button class="btn btn-sm btn-blue" onclick="viewPDS('${e.id}')">View</button>
        <button class="btn btn-sm btn-outline" onclick="printPDS('${e.id}')">⬇ PDF</button>
        <button class="btn btn-sm btn-green" onclick="fillExcelPDS('${e.id}')">📊 Excel</button>
        ${e.status==='pending' ? `<button class="btn btn-sm btn-green" onclick="approvePDS('${e.id}')">✓</button><button class="btn btn-sm btn-red" onclick="rejectPDS('${e.id}')">↩</button>` : ''}
        <button class="btn btn-sm btn-outline" onclick="editPDS('${e.id}')">✏ Edit</button>
      </div></td>
    </tr>`).join('') :
    `<tr><td colspan="8"><div class="empty-state"><div class="icon">👥</div><h3>No Employees Found</h3><p>No records match your filters, or no employees have been added yet.</p><button class="btn btn-primary" onclick="openNewPDS()">+ Add First Employee</button></div></td></tr>`;
}

function openNewPDS() { editingPDS = blankPDS(); navigate('pdsForm'); renderPDSForm(); }
function editPDS(id) { editingPDS = JSON.parse(JSON.stringify(employees.find(e => e.id === id) || blankPDS())); navigate('pdsForm'); renderPDSForm(); }

// ══════════ PDS VIEW ══════════
function viewPDS(id) {
  navigate('pdsView');
  const e = employees.find(x => x.id === id); if (!e) return;
  document.getElementById('pdsViewActions').innerHTML = `
    <button class="btn btn-outline" onclick="navigate('employees')">← Back</button>
    <button class="btn btn-primary" onclick="printPDS('${id}')">⬇ Download PDF</button>
    <button class="btn btn-green" onclick="fillExcelPDS('${id}')">📊 Download Excel</button>
    <button class="btn btn-outline" onclick="editPDS('${id}')">✏ Edit</button>
    ${e.status==='pending' ? `<button class="btn btn-green" onclick="approvePDS('${id}');viewPDS('${id}')">✓ Approve</button><button class="btn btn-red" onclick="rejectPDS('${id}');viewPDS('${id}')">↩ Return</button>` : ''}`;
  const tr = empTr(id);
  const ir = (lbl, val) => `<div class="iitem"><div class="lbl">${lbl}</div><div class="val">${val ? esc(val) : '<span style="color:var(--gray-400);font-style:italic;font-weight:400">—</span>'}</div></div>`;
  const sec = (t, b) => `<div class="vsec"><div class="vsec-title">${t}</div>${b}</div>`;
  const tbl = (hs, rows) => `<table><thead><tr>${hs.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('pdsViewContent').innerHTML = `
    <div class="pds-hero">
      <div><div class="pds-name">${esc(e.personal.surname)}, ${esc(e.personal.firstName)} ${esc(e.personal.middleName)}</div><div class="pds-sub">${esc(e.position)} · ${esc(e.department)}</div></div>
      <div class="pds-meta">${sbadge(e.status)}<br>Submitted: ${fmt(e.submittedAt)}<br><span class="mono">${e.id}</span></div>
    </div>
    ${sec('I. Personal Information', `<div class="info-grid">
      ${ir('Surname',e.personal.surname)}${ir('First Name',e.personal.firstName)}${ir('Middle Name',e.personal.middleName)}
      ${ir('Name Extension',e.personal.nameExt)}${ir('Date of Birth',e.personal.dob)}${ir('Place of Birth',e.personal.pob)}
      ${ir('Sex',e.personal.sex)}${ir('Civil Status',e.personal.civil)}${ir('Blood Type',e.personal.blood)}
      ${ir('Height (m)',e.personal.height)}${ir('Weight (kg)',e.personal.weight)}${ir('Citizenship',e.personal.citizenship)}
      ${ir('UMID',e.personal.umid)}${ir('Pag-IBIG',e.personal.pagibig)}${ir('PhilHealth',e.personal.philhealth)}
      ${ir('PhilSys (PSN)',e.personal.philsys)}${ir('TIN',e.personal.tin)}${ir('Agency Employee No.',e.personal.agencyNo)}
      ${ir('Mobile',e.personal.mobileNo)}${ir('Tel',e.personal.telNo)}${ir('Email',e.personal.email)}
    </div>`)}
    ${sec('III. Educational Background', e.education.length ?
      tbl(['Level','School','Course/Degree','Period','Year Grad','Honors'],
        e.education.map(r=>`<tr><td>${esc(r.level)}</td><td>${esc(r.school)}</td><td>${esc(r.course)}</td><td>${esc(r.from)}–${esc(r.to)}</td><td>${esc(r.yearGrad)||'N/A'}</td><td>${esc(r.honors)||'—'}</td></tr>`).join(''))
      : '<p class="empty-note">No records.</p>')}
    ${sec('IV. Civil Service Eligibility', e.eligibility.length ?
      tbl(['Eligibility','Rating','Date','Place','License No.','Valid Until'],
        e.eligibility.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.rating)||'N/A'}</td><td>${esc(r.dateConf)}</td><td>${esc(r.place)}</td><td>${esc(r.licNo)||'N/A'}</td><td>${esc(r.licValid)||'N/A'}</td></tr>`).join(''))
      : '<p class="empty-note">No records.</p>')}
    ${sec('V. Work Experience', e.workExp.length ?
      tbl(['From','To','Position','Department/Agency','Status','Gov\'t'],
        e.workExp.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td style="font-weight:500">${esc(r.position)}</td><td>${esc(r.dept)}</td><td>${esc(r.status)}</td><td>${esc(r.govtService)}</td></tr>`).join(''))
      : '<p class="empty-note">No records.</p>')}
    ${sec('VII. L&D / Training Programs', tr.length ?
      tbl(['Title','From','To','Hours','Type','Conducted By'],
        tr.map(t=>`<tr><td style="font-weight:500">${esc(t.title)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${esc(t.hours)}</td><td><span class="badge badge-tech">${esc(t.type)}</span></td><td>${esc(t.conductedBy)}</td></tr>`).join(''))
      : '<p class="empty-note">No training records yet.</p>')}
    ${sec('VIII. Other Information', `<div class="info-grid">
      ${ir('Special Skills/Hobbies',e.otherInfo.skills)}${ir('Non-Academic Distinctions',e.otherInfo.distinctions)}${ir('Memberships',e.otherInfo.memberships)}
    </div>`)}`;
}

function approvePDS(id) {
  const i = employees.findIndex(e => e.id === id); if (i < 0) return;
  employees[i].status = 'approved'; saveData(); toast('PDS approved.');
  if (document.getElementById('page-employees').classList.contains('active')) renderEmployees();
  renderDashboard();
}
function rejectPDS(id) {
  const i = employees.findIndex(e => e.id === id); if (i < 0) return;
  employees[i].status = 'rejected'; saveData(); toast('PDS returned to employee.', 'warning');
  if (document.getElementById('page-employees').classList.contains('active')) renderEmployees();
}

// ══════════ PDS FORM ══════════
const TABS = ['Personal','Family','Education','Eligibility','Work Exp','Voluntary','L&D Info','Other Info','Declarations','References'];

function renderPDSForm() {
  document.getElementById('pdsFormTitle').textContent = (editingPDS.id ? 'Edit' : 'New') + ' Personal Data Sheet';
  activeTab = 0; buildPDSForm();
}

function buildPDSForm() {
  const p = editingPDS;
  const tabBar = TABS.map((t,i) => `<div class="tab-item${i===activeTab?' active':''}" onclick="swTab(${i})">${t}</div>`).join('');
  let body = '';
  if (activeTab===0) body = tabPersonal(p);
  else if (activeTab===1) body = tabFamily(p);
  else if (activeTab===2) body = tabEdu(p);
  else if (activeTab===3) body = tabElig(p);
  else if (activeTab===4) body = tabWork(p);
  else if (activeTab===5) body = tabVol(p);
  else if (activeTab===6) body = tabLD(p);
  else if (activeTab===7) body = tabOther(p);
  else if (activeTab===8) body = tabDecl(p);
  else if (activeTab===9) body = tabRefs(p);
  const isAdmin = (role === 'admin');
  const footer = `<div class="form-footer">
    <button class="btn btn-outline" onclick="cancelForm()">Cancel</button>
    ${!isAdmin ? `<button class="btn btn-outline" onclick="saveDraft()" style="color:var(--accent);border-color:var(--accent)">💾 Save Draft</button>` : ''}
    <button class="btn btn-primary" onclick="${isAdmin ? 'adminSave()' : 'submitPDS()'}">${isAdmin ? 'Save Changes' : 'Submit to Admin'}</button>
  </div>`;
  document.getElementById('pdsFormWrap').innerHTML = `<div class="tab-bar">${tabBar}</div><div class="form-body">${body}</div>${footer}`;
}

function swTab(i) { collectForm(); activeTab = i; buildPDSForm(); }
function inp(id, val, ph='', type='text') { return `<input type="${type}" id="${id}" value="${esc(val)}" placeholder="${ph}">`; }
function sel(id, val, opts) { return `<select id="${id}"><option value="">—</option>${opts.map(o=>`<option${val===o?' selected':''}>${esc(o)}</option>`).join('')}</select>`; }
function fld(lbl, content, cls='') { return `<div class="fld${cls?' '+cls:''}""><label>${lbl}</label>${content}</div>`; }

function tabPersonal(p) {
  const pr = p.personal;
  return `
  <div class="fsec"><div class="fsec-title">I. Personal Information</div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('1. Surname *', inp('f_surname',pr.surname,'DELA CRUZ'))}
    ${fld('2. First Name *', inp('f_firstName',pr.firstName,'JUAN'))}
    ${fld('Middle Name', inp('f_middleName',pr.middleName))}
    ${fld('Name Extension', inp('f_nameExt',pr.nameExt,'JR., SR'))}
  </div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('3. Date of Birth *', inp('f_dob',pr.dob,'','date'))}
    ${fld('4. Place of Birth *', inp('f_pob',pr.pob,'City/Municipality'))}
    ${fld('5. Sex at Birth *', sel('f_sex',pr.sex,['Male','Female']))}
    ${fld('6. Civil Status *', sel('f_civil',pr.civil,['Single','Married','Widow/er','Separated','Solo Parent','Others']))}
  </div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('7. Height (m)', inp('f_height',pr.height,'1.70'))}
    ${fld('8. Weight (kg)', inp('f_weight',pr.weight,'65'))}
    ${fld('9. Blood Type', sel('f_blood',pr.blood,['A+','A-','B+','B-','O+','O-','AB+','AB-']))}
    ${fld('16. Citizenship', inp('f_citizenship',pr.citizenship,'Filipino'))}
  </div>
  <div class="fg g3" style="margin-bottom:10px">
    ${fld('10. UMID ID No.', inp('f_umid',pr.umid))}
    ${fld('11. Pag-IBIG ID No.', inp('f_pagibig',pr.pagibig))}
    ${fld('12. PhilHealth No.', inp('f_philhealth',pr.philhealth))}
    ${fld('13. PhilSys No. (PSN)', inp('f_philsys',pr.philsys))}
    ${fld('14. TIN No.', inp('f_tin',pr.tin))}
    ${fld('15. Agency Employee No.', inp('f_agencyNo',pr.agencyNo))}
  </div>
  <div class="fsec-title">17. Residential Address</div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('House/Block/Lot No.', inp('f_rHouseNo',pr.residHouseNo))}
    ${fld('Street', inp('f_rStreet',pr.residStreet),'s2')}
    ${fld('Subdivision/Village', inp('f_rSubdiv',pr.residSubdiv))}
  </div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('Barangay', inp('f_rBrgy',pr.residBrgy))}
    ${fld('City/Municipality', inp('f_rCity',pr.residCity))}
    ${fld('Province', inp('f_rProv',pr.residProv))}
    ${fld('ZIP Code', inp('f_rZip',pr.residZip))}
  </div>
  <div class="fsec-title">18. Permanent Address</div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('House/Block/Lot No.', inp('f_pHouseNo',pr.permHouseNo))}
    ${fld('Street', inp('f_pStreet',pr.permStreet),'s2')}
    ${fld('Subdivision/Village', inp('f_pSubdiv',pr.permSubdiv))}
  </div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('Barangay', inp('f_pBrgy',pr.permBrgy))}
    ${fld('City/Municipality', inp('f_pCity',pr.permCity))}
    ${fld('Province', inp('f_pProv',pr.permProv))}
    ${fld('ZIP Code', inp('f_pZip',pr.permZip))}
  </div>
  <div class="fg g3">
    ${fld('19. Telephone No.', inp('f_telNo',pr.telNo,'074-xxx-xxxx'))}
    ${fld('20. Mobile No. *', inp('f_mobileNo',pr.mobileNo,'09xx-xxx-xxxx'))}
    ${fld('21. E-mail Address', inp('f_email',pr.email,'','email'))}
  </div></div>
  <div class="fsec"><div class="fsec-title">Department / Position</div>
  <div class="fg g3">
    ${fld('Department / Office *', inp('f_dept',p.department))}
    ${fld('Position Title *', inp('f_pos',p.position))}
    ${fld('Date Hired', inp('f_hired',p.dateHired,'','date'))}
  </div></div>`;
}

function tabFamily(p) {
  const f = p.family;
  return `
  <div class="fsec"><div class="fsec-title">22. Spouse Information</div>
  <div class="fg g4" style="margin-bottom:10px">
    ${fld('Surname', inp('f_spSur',f.spouseSurname))}
    ${fld('First Name', inp('f_spFn',f.spouseFirstName))}
    ${fld('Middle Name', inp('f_spMn',f.spouseMiddleName))}
    ${fld('Name Extension', inp('f_spExt',f.spouseExt,'JR., SR'))}
    ${fld('Occupation', inp('f_spOcc',f.spouseOccupation))}
    ${fld('Employer/Business Name', inp('f_spEmp',f.spouseEmployer))}
    ${fld('Business Address', inp('f_spBiz',f.spouseBusiness))}
    ${fld('Telephone No.', inp('f_spTel',f.spouseTel))}
  </div></div>
  <div class="fsec"><div class="fsec-title">24. Father's Name</div>
  <div class="fg g4">
    ${fld('Surname', inp('f_fatSur',f.fatherSurname))}
    ${fld('First Name', inp('f_fatFn',f.fatherFirstName))}
    ${fld('Middle Name', inp('f_fatMn',f.fatherMiddleName))}
    ${fld('Name Extension', inp('f_fatExt',f.fatherExt,'JR., SR'))}
  </div></div>
  <div class="fsec"><div class="fsec-title">25. Mother's Maiden Name</div>
  <div class="fg g4">
    ${fld('Surname', inp('f_motSur',f.motherSurname))}
    ${fld('First Name', inp('f_motFn',f.motherFirstName))}
    ${fld('Middle Name', inp('f_motMn',f.motherMiddleName))}
  </div></div>
  <div class="fsec"><div class="fsec-title">23. Children (Write full name and list all)</div>
  <div id="childRows">${f.children.map((c,i) => `
    <div class="row-card"><div class="row-card-hdr"><span class="row-idx">Child #${i+1}</span><button class="btn btn-sm btn-red" onclick="remChild(${i})">✕ Remove</button></div>
    <div class="fg g2"><div class="fld"><label>Full Name</label><input id="ch_n_${i}" value="${esc(c.name)}"></div>
    <div class="fld"><label>Date of Birth (dd/mm/yyyy)</label><input type="date" id="ch_d_${i}" value="${esc(c.dob)}"></div></div></div>`).join('')}</div>
  <button class="add-btn" onclick="addChild()">+ Add Child</button></div>`;
}
function addChild() { collectForm(); editingPDS.family.children.push({name:'',dob:''}); buildPDSForm(); }
function remChild(i) { collectForm(); editingPDS.family.children.splice(i,1); buildPDSForm(); }

function tabEdu(p) {
  return `<div class="fsec"><div class="fsec-title">III. Educational Background (26)</div>
  <div id="eduRows">${p.education.map((e,i) => `
    <div class="row-card"><div class="row-card-hdr"><span class="row-idx">Entry #${i+1}</span><button class="btn btn-sm btn-red" onclick="remEdu(${i})">✕ Remove</button></div>
    <div class="fg g3">
      ${fld('Level *', sel(`ed_lv_${i}`,e.level,['Elementary','Secondary','Vocational/Trade Course','College','Graduate Studies']))}
      ${fld('Name of School (Write in full) *', `<input id="ed_sc_${i}" value="${esc(e.school)}">`, 's2')}
      ${fld('Basic Education/Degree/Course (Write in full) *', `<input id="ed_co_${i}" value="${esc(e.course)}">`, 's2')}
      ${fld('From (year)', `<input id="ed_fr_${i}" value="${esc(e.from)}" placeholder="YYYY">`)}
      ${fld('To (year)', `<input id="ed_to_${i}" value="${esc(e.to)}" placeholder="YYYY">`)}
      ${fld('Highest Units Earned', `<input id="ed_un_${i}" value="${esc(e.units)}" placeholder="If not graduated">`)}
      ${fld('Year Graduated', `<input id="ed_yg_${i}" value="${esc(e.yearGrad)}" placeholder="YYYY">`)}
      ${fld('Scholarship/Academic Honors', `<input id="ed_ho_${i}" value="${esc(e.honors)}">`, 's2')}
    </div></div>`).join('')}</div>
  <button class="add-btn" onclick="addEdu()">+ Add Education</button></div>`;
}
function addEdu() { collectForm(); editingPDS.education.push({level:'',school:'',course:'',from:'',to:'',units:'',yearGrad:'',honors:''}); buildPDSForm(); }
function remEdu(i) { collectForm(); editingPDS.education.splice(i,1); buildPDSForm(); }

function tabElig(p) {
  return `<div class="fsec"><div class="fsec-title">IV. Civil Service Eligibility (27)</div>
  <div id="eligRows">${p.eligibility.map((e,i) => `
    <div class="row-card"><div class="row-card-hdr"><span class="row-idx">Entry #${i+1}</span><button class="btn btn-sm btn-red" onclick="remElig(${i})">✕ Remove</button></div>
    <div class="fg g3">
      ${fld('Career Service/RA 1080/Board/Bar/Special Laws Eligibility *', `<input id="el_nm_${i}" value="${esc(e.name)}">`, 's2')}
      ${fld('Rating (if applicable)', `<input id="el_rt_${i}" value="${esc(e.rating)}">`)}
      ${fld('Date of Exam/Conferment', `<input type="date" id="el_dt_${i}" value="${esc(e.dateConf)}">`, 's2')}
      ${fld('Place of Exam/Conferment', `<input id="el_pl_${i}" value="${esc(e.place)}">`)}
      ${fld('License No.', `<input id="el_ln_${i}" value="${esc(e.licNo)}">`)}
      ${fld('License Valid Until', `<input type="date" id="el_lv_${i}" value="${esc(e.licValid)}">`)}
    </div></div>`).join('')}</div>
  <button class="add-btn" onclick="addElig()">+ Add Eligibility</button></div>`;
}
function addElig() { collectForm(); editingPDS.eligibility.push({name:'',rating:'',dateConf:'',place:'',licNo:'',licValid:''}); buildPDSForm(); }
function remElig(i) { collectForm(); editingPDS.eligibility.splice(i,1); buildPDSForm(); }

function tabWork(p) {
  return `<div class="fsec"><div class="fsec-title">V. Work Experience (28) — Start from most recent work</div>
  <div id="weRows">${p.workExp.map((e,i) => `
    <div class="row-card"><div class="row-card-hdr"><span class="row-idx">Entry #${i+1}</span><button class="btn btn-sm btn-red" onclick="remWork(${i})">✕ Remove</button></div>
    <div class="fg g4">
      ${fld('Date From *', `<input type="date" id="we_fr_${i}" value="${esc(e.from)}">`)}
      ${fld('Date To', `<input id="we_to_${i}" value="${esc(e.to)}" placeholder="Present or date">`)}
      ${fld('Gov\'t Service', sel(`we_gv_${i}`,e.govtService,['Y','N']))}
      ${fld('Status of Appointment', sel(`we_st_${i}`,e.status,['Permanent','Temporary','Co-Terminus','Contractual','Casual']))}
      ${fld('Position Title (Write in full) *', `<input id="we_po_${i}" value="${esc(e.position)}">`, 's2')}
      ${fld('Department/Agency/Office/Company (Write in full) *', `<input id="we_de_${i}" value="${esc(e.dept)}">`, 's2')}
    </div></div>`).join('')}</div>
  <button class="add-btn" onclick="addWork()">+ Add Work Experience</button></div>`;
}
function addWork() { collectForm(); editingPDS.workExp.push({from:'',to:'',position:'',dept:'',status:'Permanent',govtService:'Y'}); buildPDSForm(); }
function remWork(i) { collectForm(); editingPDS.workExp.splice(i,1); buildPDSForm(); }

function tabVol(p) {
  return `<div class="fsec"><div class="fsec-title">VI. Voluntary Work / Civic Organizations (29)</div>
  <div id="volRows">${p.voluntaryWork.map((e,i) => `
    <div class="row-card"><div class="row-card-hdr"><span class="row-idx">Entry #${i+1}</span><button class="btn btn-sm btn-red" onclick="remVol(${i})">✕ Remove</button></div>
    <div class="fg g3">
      ${fld('Name & Address of Organization (Write in full) *', `<input id="vl_or_${i}" value="${esc(e.org||'')}">`, 's2')}
      ${fld('From (dd/mm/yyyy)', `<input type="date" id="vl_fr_${i}" value="${esc(e.from||'')}">`)}
      ${fld('To (dd/mm/yyyy)', `<input type="date" id="vl_to_${i}" value="${esc(e.to||'')}">`)}
      ${fld('Number of Hours', `<input type="number" id="vl_hr_${i}" value="${esc(e.hours||'')}">`)}
      ${fld('Position/Nature of Work', `<input id="vl_po_${i}" value="${esc(e.position||'')}">`)}
    </div></div>`).join('')}</div>
  <button class="add-btn" onclick="addVol()">+ Add Voluntary Work</button></div>`;
}
function addVol() { collectForm(); editingPDS.voluntaryWork.push({org:'',from:'',to:'',hours:'',position:''}); buildPDSForm(); }
function remVol(i) { collectForm(); editingPDS.voluntaryWork.splice(i,1); buildPDSForm(); }

function tabLD(p) {
  const tr = empTr(p.id);
  return `<div class="fsec"><div class="fsec-title">VII. Learning & Development (L&D) Interventions/Training Programs (30)</div>
  ${!tr.length
    ? `<div class="empty-state"><div class="icon">🎓</div><h3>No Training Records</h3><p>${role==='admin' ? 'Add records from the Training & L&D module.' : 'Your admin will add your training records on your behalf.'}</p></div>`
    : `<table><thead><tr><th>Title</th><th>From</th><th>To</th><th>Hours</th><th>Type</th><th>Conducted By</th></tr></thead><tbody>
       ${tr.map(t=>`<tr><td style="font-weight:500">${esc(t.title)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${esc(t.hours)}</td><td><span class="badge badge-tech">${esc(t.type)}</span></td><td>${esc(t.conductedBy)}</td></tr>`).join('')}
       </tbody></table>`
  }</div>`;
}

function tabOther(p) {
  const o = p.otherInfo;
  return `<div class="fsec"><div class="fsec-title">VIII. Other Information</div>
  <div class="fg g1">
    <div class="fld"><label>31. Special Skills and Hobbies</label><textarea id="f_skills" rows="4" placeholder="List your special skills and hobbies">${esc(o.skills)}</textarea></div>
    <div class="fld"><label>32. Non-Academic Distinctions / Recognition (Write in full)</label><textarea id="f_dists" rows="4" placeholder="Write in full">${esc(o.distinctions)}</textarea></div>
    <div class="fld"><label>33. Membership in Association/Organization (Write in full)</label><textarea id="f_membs" rows="4" placeholder="Write in full">${esc(o.memberships)}</textarea></div>
  </div></div>`;
}

function tabDecl(p) {
  const q = p.questions;
  function di(qk, lbl, detId) {
    const ch = q[qk];
    const det = detId && ch ? `<div class="decl-det"><input type="text" id="decl_${detId}" value="${esc(q[detId])}" placeholder="If YES, give details…"></div>` : '';
    return `<div class="decl-item"><div class="decl-row">
      <div class="decl-radios">
        <label><input type="radio" name="dq_${qk}" value="y"${ch?' checked':''} onchange="setDecl('${qk}','${detId||''}',true)"> Yes</label>
        <label><input type="radio" name="dq_${qk}" value="n"${!ch?' checked':''} onchange="setDecl('${qk}','${detId||''}',false)"> No</label>
      </div>
      <div class="decl-text">${lbl}</div>
    </div>${det}</div>`;
  }
  return `<div class="fsec"><div class="fsec-title">IX. Declarations (Questions 34–40)</div>
    ${di('q34a','<b>34a.</b> Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, <b>within the third degree?</b>','q34det')}
    ${di('q34b','<b>34b.</b> Within the <b>fourth degree</b> (for Local Government Unit - Career Employees)?',null)}
    ${di('q35a','<b>35a.</b> Have you ever been found guilty of any administrative offense?','q35aDet')}
    ${di('q35b','<b>35b.</b> Have you been criminally charged before any court?','q35bDet')}
    ${di('q36','<b>36.</b> Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?','q36Det')}
    ${di('q37','<b>37.</b> Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?','q37Det')}
    ${di('q38a','<b>38a.</b> Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?','q38aDet')}
    ${di('q38b','<b>38b.</b> Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?','q38bDet')}
    ${di('q39','<b>39.</b> Have you acquired the status of an immigrant or permanent resident of another country?','q39Det')}
    ${di('q40a','<b>40a.</b> Are you a member of any indigenous group? (RA 8371)','q40aSpec')}
    ${di('q40b','<b>40b.</b> Are you a person with disability? (RA 7277, as amended)','q40bId')}
    ${di('q40c','<b>40c.</b> Are you a solo parent? (RA 11861)','q40cId')}
  </div>`;
}
function setDecl(qk, detId, val) { collectForm(); editingPDS.questions[qk] = val; buildPDSForm(); swTab(8); }

function tabRefs(p) {
  const refs = p.references || [{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}];
  return `<div class="fsec"><div class="fsec-title">41. References (Person not related by consanguinity or affinity to applicant/appointee)</div>
  ${refs.map((r,i) => `<div class="row-card"><div class="row-card-hdr"><span class="row-idx">Reference #${i+1}</span></div>
  <div class="fg g3">
    ${fld('Name', `<input id="rf_nm_${i}" value="${esc(r.name)}">`)}
    ${fld('Office/Residential Address', `<input id="rf_ad_${i}" value="${esc(r.address)}">`)}
    ${fld('Contact No. and/or Email', `<input id="rf_ct_${i}" value="${esc(r.contact)}">`)}
  </div></div>`).join('')}</div>
  <div class="fsec"><div class="fsec-title">42. Government Issued ID</div>
  <div class="fg g3">
    ${fld('Government Issued ID (e.g. Passport, GSIS, SSS, PRC, Driver\'s License)', inp('f_govtId',p.govtId), 's2')}
    ${fld('ID/License/Passport No.', inp('f_govtIdNo',p.govtIdNo))}
    ${fld('Date/Place of Issuance', inp('f_govtIss',p.govtIdIssuance), 's2')}
    ${fld('Date Accomplished', inp('f_dateAcc',p.dateAccomplished,'','date'))}
  </div></div>`;
}

// ══════════ COLLECT FORM ══════════
function collectForm() {
  const p = editingPDS; const pr = p.personal;
  if (document.getElementById('f_surname')) {
    pr.surname=gv('f_surname'); pr.firstName=gv('f_firstName'); pr.middleName=gv('f_middleName'); pr.nameExt=gv('f_nameExt');
    pr.dob=gv('f_dob'); pr.pob=gv('f_pob'); pr.sex=gv('f_sex'); pr.civil=gv('f_civil');
    pr.height=gv('f_height'); pr.weight=gv('f_weight'); pr.blood=gv('f_blood'); pr.citizenship=gv('f_citizenship');
    pr.umid=gv('f_umid'); pr.pagibig=gv('f_pagibig'); pr.philhealth=gv('f_philhealth'); pr.philsys=gv('f_philsys');
    pr.tin=gv('f_tin'); pr.agencyNo=gv('f_agencyNo');
    pr.residHouseNo=gv('f_rHouseNo'); pr.residStreet=gv('f_rStreet'); pr.residSubdiv=gv('f_rSubdiv');
    pr.residBrgy=gv('f_rBrgy'); pr.residCity=gv('f_rCity'); pr.residProv=gv('f_rProv'); pr.residZip=gv('f_rZip');
    pr.permHouseNo=gv('f_pHouseNo'); pr.permStreet=gv('f_pStreet'); pr.permSubdiv=gv('f_pSubdiv');
    pr.permBrgy=gv('f_pBrgy'); pr.permCity=gv('f_pCity'); pr.permProv=gv('f_pProv'); pr.permZip=gv('f_pZip');
    pr.telNo=gv('f_telNo'); pr.mobileNo=gv('f_mobileNo'); pr.email=gv('f_email');
    p.department=gv('f_dept'); p.position=gv('f_pos'); p.dateHired=gv('f_hired');
  }
  const f = p.family;
  [['f_spSur','spouseSurname'],['f_spFn','spouseFirstName'],['f_spMn','spouseMiddleName'],['f_spExt','spouseExt'],
   ['f_spOcc','spouseOccupation'],['f_spEmp','spouseEmployer'],['f_spBiz','spouseBusiness'],['f_spTel','spouseTel'],
   ['f_fatSur','fatherSurname'],['f_fatFn','fatherFirstName'],['f_fatMn','fatherMiddleName'],['f_fatExt','fatherExt'],
   ['f_motSur','motherSurname'],['f_motFn','motherFirstName'],['f_motMn','motherMiddleName']
  ].forEach(([id,key]) => { if (document.getElementById(id)) f[key] = gv(id); });
  f.children.forEach((c,i) => { if (document.getElementById(`ch_n_${i}`)) { c.name=gv(`ch_n_${i}`); c.dob=gv(`ch_d_${i}`); } });
  p.education.forEach((e,i) => { if (document.getElementById(`ed_lv_${i}`)) { e.level=gv(`ed_lv_${i}`); e.school=gv(`ed_sc_${i}`); e.course=gv(`ed_co_${i}`); e.from=gv(`ed_fr_${i}`); e.to=gv(`ed_to_${i}`); e.units=gv(`ed_un_${i}`); e.yearGrad=gv(`ed_yg_${i}`); e.honors=gv(`ed_ho_${i}`); } });
  p.eligibility.forEach((e,i) => { if (document.getElementById(`el_nm_${i}`)) { e.name=gv(`el_nm_${i}`); e.rating=gv(`el_rt_${i}`); e.dateConf=gv(`el_dt_${i}`); e.place=gv(`el_pl_${i}`); e.licNo=gv(`el_ln_${i}`); e.licValid=gv(`el_lv_${i}`); } });
  p.workExp.forEach((e,i) => { if (document.getElementById(`we_fr_${i}`)) { e.from=gv(`we_fr_${i}`); e.to=gv(`we_to_${i}`); e.position=gv(`we_po_${i}`); e.dept=gv(`we_de_${i}`); e.status=gv(`we_st_${i}`); e.govtService=gv(`we_gv_${i}`); } });
  p.voluntaryWork.forEach((e,i) => { if (document.getElementById(`vl_or_${i}`)) { e.org=gv(`vl_or_${i}`); e.from=gv(`vl_fr_${i}`); e.to=gv(`vl_to_${i}`); e.hours=gv(`vl_hr_${i}`); e.position=gv(`vl_po_${i}`); } });
  if (document.getElementById('f_skills')) { p.otherInfo.skills=gv('f_skills'); p.otherInfo.distinctions=gv('f_dists'); p.otherInfo.memberships=gv('f_membs'); }
  ['q34det','q35aDet','q35bDet','q36Det','q37Det','q38aDet','q38bDet','q39Det','q40aSpec','q40bId','q40cId'].forEach(k => { if (document.getElementById('decl_'+k)) p.questions[k] = gv('decl_'+k); });
  if (p.references) p.references.forEach((r,i) => { if (document.getElementById(`rf_nm_${i}`)) { r.name=gv(`rf_nm_${i}`); r.address=gv(`rf_ad_${i}`); r.contact=gv(`rf_ct_${i}`); } });
  if (document.getElementById('f_govtId')) { p.govtId=gv('f_govtId'); p.govtIdNo=gv('f_govtIdNo'); p.govtIdIssuance=gv('f_govtIss'); p.dateAccomplished=gv('f_dateAcc'); }
}

function cancelForm() { editingPDS = null; navigate(role === 'admin' ? 'employees' : 'myPDS'); }
function saveDraft() {
  collectForm(); const p = editingPDS; p.updatedAt = new Date().toISOString().slice(0,10);
  if (!p.id) {
    p.id = (currentUser && currentUser.empId && currentUser.empId !== 'NEW') ? currentUser.empId : newEmpId();
    employees.push(p);
  } else {
    const i = employees.findIndex(e => e.id === p.id); if (i >= 0) employees[i] = p; else employees.push(p);
  }
  if (currentUser && role === 'employee') { currentUser.empId = p.id; currentEmpId = p.id; }
  saveData(); popEmpSels(); toast('Draft saved.'); navigate(role === 'admin' ? 'employees' : 'myPDS');
}
function adminSave() {
  collectForm(); const p = editingPDS; p.updatedAt = new Date().toISOString().slice(0,10);
  if (!p.id) { p.id = newEmpId(); p.status = 'approved'; employees.push(p); }
  else { const i = employees.findIndex(e => e.id === p.id); if (i >= 0) employees[i] = p; }
  saveData(); popEmpSels(); toast('PDS saved.'); navigate('employees');
}
function submitPDS() {
  collectForm(); const p = editingPDS;
  if (!p.personal.surname || !p.personal.firstName) { toast('Please fill in at least Surname and First Name.', 'error'); return; }
  p.status = 'pending'; p.submittedAt = new Date().toISOString().slice(0,10); p.updatedAt = p.submittedAt;
  if (!p.id) {
    // Try to use currentUser.empId if set, otherwise generate new
    p.id = (currentUser && currentUser.empId && currentUser.empId !== 'NEW') ? currentUser.empId : newEmpId();
    employees.push(p);
  } else {
    const i = employees.findIndex(e => e.id === p.id);
    if (i >= 0) employees[i] = p; else employees.push(p);
  }
  // Keep currentEmpId in sync so My PDS renders after submit
  if (currentUser) { currentUser.empId = p.id; currentEmpId = p.id; }
  saveData(); editingPDS = null; popEmpSels(); toast('PDS submitted to admin! ✓'); navigate('myPDS');
}

// ══════════ TRAINING ══════════
function renderTraining() {
  popEmpSels();
  document.getElementById('trCount').textContent = `(${trainings.length} total)`;
  document.getElementById('trTable').innerHTML = trainings.length ?
    [...trainings].reverse().map(t => {
      const emp = employees.find(e => e.id === t.empId);
      return `<tr>
        <td style="font-weight:500">${emp ? esc(emp.personal.surname)+', '+esc(emp.personal.firstName) : esc(t.empId)}</td>
        <td>${esc(t.title)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td>
        <td style="text-align:center">${esc(t.hours)}</td>
        <td><span class="badge badge-tech">${esc(t.type)}</span></td>
        <td style="color:var(--text-muted)">${esc(t.conductedBy)}</td>
        <td style="color:var(--text-muted);font-size:11px">${fmt(t.addedAt)}</td>
        <td><button class="btn btn-sm btn-red" onclick="delTr('${t.id}')">✕</button></td>
      </tr>`;
    }).join('') :
    `<tr><td colspan="9"><div class="empty-state"><div class="icon">🎓</div><h3>No Training Records Yet</h3><p>Add training records for employees above.</p></div></td></tr>`;
}
function addTraining() {
  const empId=gv('trEmpId'), title=gv('trTitle').trim(), from=gv('trFrom'), to=gv('trTo'), hours=gv('trHours'), type=gv('trType'), by=gv('trBy').trim();
  if (!empId || !title || !from || !to || !hours) { toast('Please fill all required fields.', 'error'); return; }
  trainings.push({ id:newTrId(), empId, title, from, to, hours, type, conductedBy:by, addedAt:new Date().toISOString().slice(0,10) });
  saveData();
  ['trTitle','trFrom','trTo','trHours','trBy'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('trEmpId').value = '';
  toast('Training record added.'); renderTraining();
}
function delTr(id) {
  if (!confirm('Delete this training record?')) return;
  trainings = trainings.filter(t => t.id !== id); saveData(); toast('Deleted.', 'warning'); renderTraining();
}

// ══════════ REPORTS ══════════
function renderReports() {
  const rm = gv('reportMonth'); if (!rm) return;
  const [yr, mo] = rm.split('-'); const moLabel = `${MONTHS[parseInt(mo)]} ${yr}`;
  const moTr = trainings.filter(t => t.from && t.from.startsWith(rm));
  const approved = employees.filter(e => e.status==='approved').length;
  const pending = employees.filter(e => e.status==='pending').length;
  const byDept = getDepts().map(d => ({
    dept:d, total:employees.filter(e=>e.department===d).length,
    approved:employees.filter(e=>e.department===d&&e.status==='approved').length,
    pending:employees.filter(e=>e.department===d&&e.status==='pending').length,
    trainings:moTr.filter(t => { const emp=employees.find(e=>e.id===t.empId); return emp&&emp.department===d; }).length
  }));
  const statusDist = ['approved','pending','rejected','draft'].map(s => {
    const cnt = employees.filter(e=>e.status===s).length;
    const pct = employees.length ? Math.round(cnt/employees.length*100) : 0;
    const cols = {approved:'#0b6e4f',pending:'#8a5c00',rejected:'#9b1c1c',draft:'#5a6474'};
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="font-weight:500;text-transform:capitalize">${s}</span>
        <span style="font-weight:700;color:${cols[s]}">${cnt} (${pct}%)</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${cols[s]}"></div></div>
    </div>`;
  }).join('');
  document.getElementById('reportContent').innerHTML = `
    <div style="font-size:17px;font-weight:700;color:var(--navy);margin-bottom:16px">${moLabel}</div>
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card" style="background:var(--accent-light)"><div class="stat-lbl" style="color:var(--accent)">Total Employees</div><div class="stat-val" style="color:var(--accent)">${employees.length}</div></div>
      <div class="stat-card" style="background:var(--green-light)"><div class="stat-lbl" style="color:var(--green)">Approved PDS</div><div class="stat-val" style="color:var(--green)">${approved}</div></div>
      <div class="stat-card" style="background:var(--amber-light)"><div class="stat-lbl" style="color:var(--amber)">Pending PDS</div><div class="stat-val" style="color:var(--amber)">${pending}</div></div>
      <div class="stat-card" style="background:var(--violet-light)"><div class="stat-lbl" style="color:var(--violet)">Trainings This Month</div><div class="stat-val" style="color:var(--violet)">${moTr.length}</div></div>
    </div>
    <div class="report-grid">
      <div class="card"><div class="card-hdr">📂 By Department</div>
        <table><thead><tr><th>Department</th><th>Total</th><th>Approved</th><th>Pending</th><th>Trainings</th></tr></thead>
        <tbody>${byDept.length ? byDept.map(d=>`<tr><td style="font-weight:500">${esc(d.dept)}</td><td style="text-align:center">${d.total}</td><td style="text-align:center;color:var(--green);font-weight:700">${d.approved}</td><td style="text-align:center;color:var(--amber);font-weight:700">${d.pending}</td><td style="text-align:center;color:var(--violet);font-weight:700">${d.trainings}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No department data.</td></tr>'}</tbody>
        </table></div>
      <div class="card"><div class="card-hdr">📊 PDS Status Distribution</div><div style="padding:18px">${statusDist}</div></div>
    </div>
    <div class="card"><div class="card-hdr">🎓 Trainings / L&D — ${moLabel} (${moTr.length})</div>
      <table><thead><tr><th>Employee</th><th>Training Title</th><th>Type</th><th>Hours</th><th>From</th><th>To</th><th>Conducted By</th></tr></thead>
      <tbody>${moTr.length ? moTr.map(t=>{const emp=employees.find(e=>e.id===t.empId);return`<tr><td style="font-weight:500">${emp?esc(emp.personal.surname)+', '+esc(emp.personal.firstName):esc(t.empId)}</td><td>${esc(t.title)}</td><td><span class="badge badge-tech">${esc(t.type)}</span></td><td style="text-align:center">${esc(t.hours)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td style="color:var(--text-muted)">${esc(t.conductedBy)}</td></tr>`;}).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">No trainings recorded for this month.</td></tr>'}</tbody>
      </table></div>`;
}

function printReport() {
  const rm = gv('reportMonth'); if (!rm) { toast('Select a month.', 'error'); return; }
  const [yr, mo] = rm.split('-'); const moLabel = `${MONTHS[parseInt(mo)]} ${yr}`;
  const moTr = trainings.filter(t => t.from && t.from.startsWith(rm));
  const byDept = getDepts().map(d => ({dept:d,total:employees.filter(e=>e.department===d).length,approved:employees.filter(e=>e.department===d&&e.status==='approved').length,pending:employees.filter(e=>e.department===d&&e.status==='pending').length,trainings:moTr.filter(t=>{const emp=employees.find(e=>e.id===t.empId);return emp&&emp.department===d}).length}));
  const w = window.open('','_blank');
  w.document.write(`<html><head><title>Monthly Report ${moLabel}</title><style>body{font-family:Arial,sans-serif;font-size:10px;margin:12mm}h2{font-size:14px;text-align:center;margin:0 0 4px}h3{font-size:10px;margin:10px 0 4px;border-bottom:1px solid #aaa;padding-bottom:2px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{border:.5px solid #bbb;padding:4px 8px;font-size:9px}th{background:#e8e8e8;font-weight:bold;text-align:left}.sum{display:flex;gap:20px;margin-bottom:10px}.sb{border:1px solid #ccc;padding:6px 12px;border-radius:4px}.sl{font-size:8px;text-transform:uppercase;color:#555}.sv{font-size:18px;font-weight:bold}<\/style><\/head><body>
<h2>MONTHLY PERSONNEL REPORT — ${moLabel.toUpperCase()}</h2>
<p style="text-align:center;font-size:8px;margin:0 0 8px">CS Form 212 (Revised 2025) PDS Management System | Generated: ${new Date().toLocaleDateString('en-PH')}</p>
<div class="sum"><div class="sb"><div class="sl">Total Employees</div><div class="sv">${employees.length}</div></div><div class="sb"><div class="sl">Approved PDS</div><div class="sv">${employees.filter(e=>e.status==='approved').length}</div></div><div class="sb"><div class="sl">Pending PDS</div><div class="sv">${employees.filter(e=>e.status==='pending').length}</div></div><div class="sb"><div class="sl">Trainings This Month</div><div class="sv">${moTr.length}</div></div></div>
<h3>By Department</h3><table><tr><th>Department</th><th>Total</th><th>Approved</th><th>Pending</th><th>Trainings</th></tr>${byDept.length?byDept.map(d=>`<tr><td>${d.dept}</td><td>${d.total}</td><td>${d.approved}</td><td>${d.pending}</td><td>${d.trainings}</td></tr>`).join(''):'<tr><td colspan="5">No data</td></tr>'}</table>
<h3>Training Records — ${moLabel}</h3><table><tr><th>Employee</th><th>Title</th><th>Type</th><th>Hours</th><th>From</th><th>To</th><th>Conducted By</th></tr>${moTr.length?moTr.map(t=>{const emp=employees.find(e=>e.id===t.empId);return`<tr><td>${emp?emp.personal.surname+', '+emp.personal.firstName:t.empId}</td><td>${t.title}</td><td>${t.type}</td><td>${t.hours}</td><td>${t.from}</td><td>${t.to}</td><td>${t.conductedBy}</td></tr>`;}).join(''):'<tr><td colspan="7">No trainings this month</td></tr>'}</table>
<\/body><\/html>`);
  w.document.close(); w.print();
}

// ══════════ MY PDS ══════════
function renderMyPDS() {
  const content = document.getElementById('myPDSContent');
  const emp = employees.find(e => e.id === currentEmpId);
  if (!emp) {
    content.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No PDS on File</h3><p>Create and submit your Personal Data Sheet to your administrator for review.</p><button class="btn btn-primary" onclick="openMyNew()">+ Create My PDS</button></div>`;
    return;
  }
  const tr = empTr(emp.id);
  const ir = (lbl, val) => `<div class="iitem"><div class="lbl">${lbl}</div><div class="val">${val ? esc(String(val)) : '<span style="color:var(--gray-400);font-style:italic;font-weight:400">—</span>'}</div></div>`;
  const sec = (icon, t, b) => `<div class="vsec"><div class="vsec-title">${icon} ${t}</div>${b}</div>`;
  const tbl = (hs, rows) => `<table><thead><tr>${hs.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  const yn = v => v ? '<span style="color:var(--red);font-weight:700">YES</span>' : '<span style="color:var(--green);font-weight:700">NO</span>';
  const fam = emp.family || {};
  const q = emp.questions || {};
  const refs = emp.references || [];

  content.innerHTML = `
    <div class="my-banner">
      <div>
        <div style="font-size:18px;font-weight:700;color:var(--navy)">${esc(emp.personal.surname)}, ${esc(emp.personal.firstName)}${emp.personal.middleName ? ' ' + esc(emp.personal.middleName) : ''}${emp.personal.nameExt ? ' ' + esc(emp.personal.nameExt) : ''}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${esc(emp.position)} · ${esc(emp.department)}</div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:2px">Employee ID: <span style="font-family:'IBM Plex Mono',monospace;font-weight:600">${esc(emp.id)}</span> &nbsp;·&nbsp; Last updated: ${fmt(emp.updatedAt)}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        ${sbadge(emp.status)}
        ${emp.status==='rejected' ? '<span style="font-size:12px;padding:6px 12px;border-radius:6px;background:var(--red-light);color:var(--red);font-weight:500">⚠ Returned by Admin — please update and resubmit.</span>' : ''}
        ${emp.status==='pending' ? '<span style="font-size:12px;padding:6px 12px;border-radius:6px;background:var(--amber-light);color:var(--amber);font-weight:500">⏳ Awaiting admin review.</span>' : ''}
        ${emp.status==='approved' ? '<span style="font-size:12px;padding:6px 12px;border-radius:6px;background:var(--green-light);color:var(--green);font-weight:500">✓ PDS approved.</span>' : ''}
        <button class="btn btn-primary" onclick="openMyEdit('${emp.id}')">✏ Edit &amp; ${emp.status==='draft'||emp.status==='rejected'?'Submit':'Update'} PDS</button>
        <button class="btn btn-outline" onclick="printPDS('${emp.id}')">⬇ Download PDF</button>
        <button class="btn btn-green" onclick="fillExcelPDS('${emp.id}')">📊 Download Excel</button>
      </div>
    </div>
    <div class="pds-view">
      ${sec('👤','I. Personal Information', `<div class="info-grid">
        ${ir('Surname',emp.personal.surname)}${ir('First Name',emp.personal.firstName)}${ir('Middle Name',emp.personal.middleName)}${ir('Name Extension',emp.personal.nameExt)}
        ${ir('Date of Birth',emp.personal.dob)}${ir('Place of Birth',emp.personal.pob)}${ir('Sex at Birth',emp.personal.sex)}${ir('Civil Status',emp.personal.civil)}
        ${ir('Height (m)',emp.personal.height)}${ir('Weight (kg)',emp.personal.weight)}${ir('Blood Type',emp.personal.blood)}${ir('Citizenship',emp.personal.citizenship)}
        ${ir('UMID ID No.',emp.personal.umid)}${ir('Pag-IBIG ID No.',emp.personal.pagibig)}${ir('PhilHealth No.',emp.personal.philhealth)}${ir('PhilSys No. (PSN)',emp.personal.philsys)}
        ${ir('TIN No.',emp.personal.tin)}${ir('Agency Employee No.',emp.personal.agencyNo)}${ir('Telephone No.',emp.personal.telNo)}${ir('Mobile No.',emp.personal.mobileNo)}
        ${ir('E-mail Address',emp.personal.email)}
      </div>
      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:6px">17. Residential Address</div>
          <div style="font-size:12.5px;line-height:1.8;color:var(--text)">${[emp.personal.residHouseNo,emp.personal.residStreet,emp.personal.residSubdiv,emp.personal.residBrgy,emp.personal.residCity,emp.personal.residProv].filter(Boolean).join(', ')||'—'}<br>ZIP: ${esc(emp.personal.residZip||'—')}</div>
        </div>
        <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:6px">18. Permanent Address</div>
          <div style="font-size:12.5px;line-height:1.8;color:var(--text)">${[emp.personal.permHouseNo,emp.personal.permStreet,emp.personal.permSubdiv,emp.personal.permBrgy,emp.personal.permCity,emp.personal.permProv].filter(Boolean).join(', ')||'—'}<br>ZIP: ${esc(emp.personal.permZip||'—')}</div>
        </div>
      </div>`)}

      ${sec('👨‍👩‍👧','II. Family Background', `<div class="info-grid">
        <div style="grid-column:span 4;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);padding-bottom:4px;border-bottom:1px solid var(--border);margin-bottom:4px">22. Spouse</div>
        ${ir('Surname',fam.spouseSurname)}${ir('First Name',fam.spouseFirstName)}${ir('Middle Name',fam.spouseMiddleName)}${ir('Name Extension',fam.spouseExt)}
        ${ir('Occupation',fam.spouseOccupation)}${ir('Employer/Business Name',fam.spouseEmployer)}${ir('Business Address',fam.spouseBusiness)}${ir('Telephone No.',fam.spouseTel)}
        <div style="grid-column:span 4;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);padding-bottom:4px;border-bottom:1px solid var(--border);margin:8px 0 4px">24. Father</div>
        ${ir('Surname',fam.fatherSurname)}${ir('First Name',fam.fatherFirstName)}${ir('Middle Name',fam.fatherMiddleName)}${ir('Name Extension',fam.fatherExt)}
        <div style="grid-column:span 4;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);padding-bottom:4px;border-bottom:1px solid var(--border);margin:8px 0 4px">25. Mother's Maiden Name</div>
        ${ir('Surname',fam.motherSurname)}${ir('First Name',fam.motherFirstName)}${ir('Middle Name',fam.motherMiddleName)}
      </div>
      ${(fam.children||[]).length ? `<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:8px">23. Children</div>${tbl(['Full Name','Date of Birth'],(fam.children||[]).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.dob)}</td></tr>`).join(''))}</div>` : '<p class="empty-note" style="margin-top:8px">No children on record.</p>'}`)}

      ${sec('🎓','III. Educational Background', emp.education.length ?
        tbl(['Level','School','Course/Degree','From','To','Units Earned','Year Grad','Honors'],
          emp.education.map(r=>`<tr><td style="font-weight:600">${esc(r.level)}</td><td>${esc(r.school)}</td><td>${esc(r.course)||'—'}</td><td>${esc(r.from)||'—'}</td><td>${esc(r.to)||'—'}</td><td>${esc(r.units)||'—'}</td><td>${esc(r.yearGrad)||'—'}</td><td>${esc(r.honors)||'—'}</td></tr>`).join(''))
        : '<p class="empty-note">No education records.</p>')}

      ${sec('📜','IV. Civil Service Eligibility', emp.eligibility.length ?
        tbl(['Eligibility / Exam','Rating','Date of Exam/Conferment','Place','License No.','Valid Until'],
          emp.eligibility.map(r=>`<tr><td style="font-weight:500">${esc(r.name)}</td><td>${esc(r.rating)||'N/A'}</td><td>${esc(r.dateConf)||'—'}</td><td>${esc(r.place)||'—'}</td><td>${esc(r.licNo)||'N/A'}</td><td>${esc(r.licValid)||'N/A'}</td></tr>`).join(''))
        : '<p class="empty-note">No eligibility records.</p>')}

      ${sec('💼','V. Work Experience', emp.workExp.length ?
        tbl(['From','To','Position Title','Department / Agency / Company','Status','Gov\'t Service'],
          emp.workExp.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td style="font-weight:500">${esc(r.position)}</td><td>${esc(r.dept)}</td><td>${esc(r.status)}</td><td style="text-align:center">${esc(r.govtService)}</td></tr>`).join(''))
        : '<p class="empty-note">No work experience records.</p>')}

      ${sec('🤝','VI. Voluntary Work / Civic Organizations', (emp.voluntaryWork||[]).length ?
        tbl(['Organization & Address','From','To','No. of Hours','Position / Nature of Work'],
          (emp.voluntaryWork||[]).map(r=>`<tr><td>${esc(r.org)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td style="text-align:center">${esc(r.hours)}</td><td>${esc(r.position)}</td></tr>`).join(''))
        : '<p class="empty-note">No voluntary work records.</p>')}

      ${sec('📚','VII. Learning & Development (L&D) / Training Programs', tr.length ?
        tbl(['Title of Training / L&D','From','To','Hours','Type','Conducted / Sponsored By'],
          tr.map(t=>`<tr><td style="font-weight:500">${esc(t.title)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td style="text-align:center">${esc(t.hours)}</td><td><span class="badge badge-tech">${esc(t.type)}</span></td><td>${esc(t.conductedBy)}</td></tr>`).join(''))
        : '<p class="empty-note">No training records on file yet. Your admin will add these on your behalf.</p>')}

      ${sec('ℹ️','VIII. Other Information', `<div class="info-grid">
        ${ir('31. Special Skills &amp; Hobbies',(emp.otherInfo||{}).skills)}
        ${ir('32. Non-Academic Distinctions / Recognition',(emp.otherInfo||{}).distinctions)}
        ${ir('33. Membership in Association / Organization',(emp.otherInfo||{}).memberships)}
      </div>`)}

      ${sec('❓','IX. Declarations (Questions 34–40)', `<div style="display:grid;gap:8px">
        ${[
          ['34a','Are you related (3rd degree) to the appointing/recommending authority?',null],
          ['34b','Are you related (4th degree) — for LGU Career Employees?',null],
          ['35a','Have you ever been found guilty of any administrative offense?','q35aDet'],
          ['35b','Have you been criminally charged before any court?','q35bDet'],
          ['36','Have you ever been convicted of any crime?','q36Det'],
          ['37','Have you ever been separated from the service?','q37Det'],
          ['38a','Have you ever been a candidate in a national/local election (last year)?','q38aDet'],
          ['38b','Have you resigned from gov\'t service within 3 months before the last election?','q38bDet'],
          ['39','Have you acquired immigrant or permanent resident status in another country?','q39Det'],
          ['40a','Are you a member of any indigenous group? (RA 8371)','q40aSpec'],
          ['40b','Are you a person with disability? (RA 7277)','q40bId'],
          ['40c','Are you a solo parent? (RA 11861)','q40cId'],
        ].map(([k,lbl,detK]) => `<div class="decl-item" style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div style="flex:1;font-size:12px;color:var(--text)">${lbl}</div>
          <div>${yn(q['q'+k])}</div>
          ${detK && q['q'+k] && q[detK] ? `<div style="flex-basis:100%;font-size:11px;color:var(--red-light);background:var(--red-light);border-radius:4px;padding:4px 8px;color:var(--red)">Details: ${esc(q[detK])}</div>` : ''}
        </div>`).join('')}
      </div>`)}

      ${sec('📞','41. References', refs.filter(r=>r.name).length ?
        tbl(['Name','Office / Residential Address','Contact No. / Email'],
          refs.filter(r=>r.name).map(r=>`<tr><td style="font-weight:500">${esc(r.name)}</td><td>${esc(r.address)}</td><td>${esc(r.contact)}</td></tr>`).join(''))
        : '<p class="empty-note">No references listed.</p>')}

      ${sec('🪪','42. Government Issued ID', `<div class="info-grid">
        ${ir('Government Issued ID',emp.govtId)}
        ${ir('ID / License / Passport No.',emp.govtIdNo)}
        ${ir('Date / Place of Issuance',emp.govtIdIssuance)}
        ${ir('Date Accomplished',emp.dateAccomplished)}
      </div>`)}
    </div>`;
}
function openMyNew() {
  editingPDS = blankPDS();
  // Pre-assign the employee's own ID so it saves back to the right record
  if (currentUser && currentUser.empId && currentUser.empId !== 'NEW') {
    editingPDS.id = currentUser.empId;
  }
  navigate('pdsForm'); renderPDSForm();
}
function openMyEdit(id) { editingPDS = JSON.parse(JSON.stringify(employees.find(e=>e.id===id)||blankPDS())); navigate('pdsForm'); renderPDSForm(); }

// ══════════ PRINT PDS — fills official CS Form 212 (Revised 2025) PDF ══════════
async function printPDS(id) {
  const e = employees.find(x => x.id === id);
  if (!e) { toast('Employee not found.', 'error'); return; }
  toast('Generating PDF…', 'success');

  const tr = empTr(id);
  const pr = e.personal;
  const fam = e.family;
  const q = e.questions || {};
  const refs = (e.references && e.references.length >= 3)
    ? e.references
    : [{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}];

  try {
    const { PDFDocument, rgb, StandardFonts } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
    const templateRes = await fetch('pds_template.pdf');
    if (!templateRes.ok) throw new Error('Could not load pds_template.pdf');
    const templateBytes = await templateRes.arrayBuffer();
    const pdfDoc  = await PDFDocument.load(templateBytes);
    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const PH = 841.92; // A4 height in pts

    // ── Core draw helpers ──────────────────────────────────────────────────────
    // topY = pdfplumber "top" coordinate (measured from top of page)
    // pdf-lib y=0 is at BOTTOM, so: lib_y = PH - topY - fontSize
    function txt(page, text, x, topY, opts = {}) {
      if (text === null || text === undefined || text === '') return;
      const str   = String(text).trim();
      if (!str) return;
      const size  = opts.size  || 7.5;
      const maxW  = opts.maxW  || null;
      const lineH = opts.lineH || (size * 1.25);
      const f     = opts.bold  ? fontBold : font;

      if (maxW) {
        // Word-wrap: split into lines that fit within maxW
        const words = str.split(/\s+/);
        let lines = [], cur = '';
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (f.widthOfTextAtSize(test, size) <= maxW) {
            cur = test;
          } else {
            if (cur) lines.push(cur);
            // If single word still too wide, shrink font for that word
            if (f.widthOfTextAtSize(w, size) > maxW) {
              const fs = Math.max(4.5, size * (maxW / f.widthOfTextAtSize(w, size)));
              page.drawText(w, { x, y: PH - (topY + lines.length * lineH) - fs, size: fs, font: f, color: rgb(0,0,0) });
              lines.push(''); // placeholder so next word goes to new line
              cur = '';
            } else {
              cur = w;
            }
          }
        }
        if (cur) lines.push(cur);
        lines.forEach((line, li) => {
          if (!line) return;
          page.drawText(line, {
            x, y: PH - (topY + li * lineH) - size,
            size, font: f, color: rgb(0,0,0)
          });
        });
      } else {
        page.drawText(str, { x, y: PH - topY - size, size, font: f, color: rgb(0,0,0) });
      }
    }

    // Check mark — draws 'X' inside a checkbox at the given label's topY
    // xPos = left edge of the checkbox square (label x0 - ~8)
    function chk(page, val, yesX, noX, topY) {
      const mark = 'X';
      const sz   = 7;
      if (val === true || val === 'Y' || val === 'Yes' || val === 'y') {
        page.drawText(mark, { x: yesX, y: PH - topY - sz, size: sz, font: fontBold, color: rgb(0,0,0) });
      } else {
        page.drawText(mark, { x: noX,  y: PH - topY - sz, size: sz, font: fontBold, color: rgb(0,0,0) });
      }
    }

    // ══ PAGE 1 ══════════════════════════════════════════════════════════════════
    // Column layout measured via pdfplumber:
    //   Left data col:  x0=125.9  (fields 1-15)
    //   Name Ext col:   x0=432.0
    //   Right section:  x0=329.0  (address, family right side)
    //   Right far:      x0=432.0  for street/brgy/province
    const p1 = pages[0];

    // ── I. Personal Information ────────────────────────────────────────────────
    // Surname  cell: top=113.2 bot=129.1  → data at ~120
    txt(p1, pr.surname,    127, 118, {size:8, bold:true, maxW:290});
    // First Name cell: top=129.5 bot=145.4 → data at ~133
    txt(p1, pr.firstName,  127, 132, {size:8, bold:true, maxW:285});
    // Name Extension: right box top=129.5 bot=145.4, x0=432
    txt(p1, pr.nameExt,    434, 132, {size:7.5, maxW:118});
    // Middle Name: top=145.8 bot=160.8 → data at ~149
    txt(p1, pr.middleName, 127, 148, {size:8, bold:true, maxW:290});

    // Date of Birth: left sub-cell top=161.5 bot=187.9, x0=125.9 x1=252.2
    txt(p1, pr.dob,  127, 169, {size:7.5, maxW:118});
    // Place of Birth: top=187.8 bot=205.9
    txt(p1, pr.pob,  127, 193, {size:7.5, maxW:118, lineH:8});

    // Sex at Birth: top=205.8 bot=223.9
    // Male checkbox label x0=143.5 → checkbox square ≈ x=131
    // Female checkbox label x0=218.2 → checkbox square ≈ x=206
    if (pr.sex === 'Male')   txt(p1, 'X', 131, 212, {size:7, bold:true});
    if (pr.sex === 'Female') txt(p1, 'X', 206, 212, {size:7, bold:true});

    // Civil Status: top=223.8 bot=241.8 (Single/Married row)
    //              top=241.7 bot=259.2 (Widowed/Separated row)
    // Single x0=143.5→chk x=130; Married x0=218.2→chk x=206
    if (pr.civil === 'Single')            txt(p1, 'X', 130, 229, {size:7, bold:true});
    if (pr.civil === 'Married')           txt(p1, 'X', 206, 229, {size:7, bold:true});
    if (pr.civil === 'Widow/er' || pr.civil === 'Widowed')
                                          txt(p1, 'X', 130, 244, {size:7, bold:true});
    if (pr.civil === 'Separated')         txt(p1, 'X', 206, 244, {size:7, bold:true});
    if (!['Single','Married','Widow/er','Widowed','Separated'].includes(pr.civil) && pr.civil)
      txt(p1, pr.civil, 155, 252, {size:6.5, maxW:80});

    // Citizenship: Filipino chk label x0=388.6→chk x=375; Dual x0=437→chk x=424
    // row top=161.5 bot=187.9 → data at ~172
    if (!pr.dualCitizenship) txt(p1, 'X', 375, 172, {size:7, bold:true});
    else                     txt(p1, 'X', 424, 172, {size:7, bold:true});

    // Height: top=259.1 bot=276.6
    txt(p1, pr.height,     127, 263, {size:7.5, maxW:118});
    // Weight: top=276.5 bot=310.8 (tall cell, weight + zip share left)
    txt(p1, pr.weight,     127, 281, {size:7.5, maxW:118});
    // Blood Type: top=310.7 bot=328.7
    txt(p1, pr.blood,      127, 315, {size:7.5, maxW:118});
    // UMID: same row range as blood type right side? No — separate rows
    // From rects: Blood=310.7-328.7, UMID=? Let's use label tops:
    // 10.UMID top=316.6, 11.PAG-IBIG top=334.7, 12.PHILHEALTH top=353.5
    // 13.PhilSys top=371.5, 14.TIN top=389.0, 15.AGENCY top=407.5
    txt(p1, pr.umid,       127, 321, {size:7.5, maxW:118});
    txt(p1, pr.pagibig,    127, 339, {size:7.5, maxW:118});
    txt(p1, pr.philhealth, 127, 357, {size:7.5, maxW:118});
    txt(p1, pr.philsys,    127, 375, {size:7.5, maxW:118});
    txt(p1, pr.tin,        127, 392, {size:7.5, maxW:118});
    txt(p1, pr.agencyNo,   127, 410, {size:7.5, maxW:118});

    // ── 17. Residential Address ────────────────────────────────────────────────
    // Column edges (from pdfplumber vertical edges):
    //   x=329 (left of right section), x=432 (street/brgy/prov start)
    // Row headers (from pdfplumber words):
    //   House/Block/Lot header top=235.4 → data row top=241.8 bot~252.6 → data ~244
    //   Subdiv/Village header top=252.8  → data ~258-270 → data ~261
    //   City/Muni header top=270.4       → data ~276-281 → data ~272
    //   ZIP CODE label top=281.7         → data same row ~282

    // House/Block row (top=235.2 bot=241.8 is the label band; data below =241.7 bot=259.2)
    txt(p1, pr.residHouseNo, 330, 244, {size:7, maxW:96});
    txt(p1, pr.residStreet,  434, 244, {size:7, maxW:122});
    // Subdiv row data: top=252.6-259.2 Barangay sub-band
    txt(p1, pr.residSubdiv,  330, 259, {size:7, maxW:96});
    txt(p1, pr.residBrgy,    434, 259, {size:7, maxW:122});
    // City/Muni row data: top=270.5-276.6
    txt(p1, pr.residCity,    330, 272, {size:7, maxW:96});
    txt(p1, pr.residProv,    434, 272, {size:7, maxW:122});
    // ZIP CODE: same left sub-cell as weight section, top=281.7
    txt(p1, pr.residZip,     253, 281, {size:7, maxW:70});

    // ── 18. Permanent Address ──────────────────────────────────────────────────
    // House/Block label top=304.4 → data below top=310.7
    txt(p1, pr.permHouseNo, 330, 311, {size:7, maxW:96});
    txt(p1, pr.permStreet,  434, 311, {size:7, maxW:122});
    // Subdiv label top=322.1 → data ~329
    txt(p1, pr.permSubdiv,  330, 328, {size:7, maxW:96});
    txt(p1, pr.permBrgy,    434, 328, {size:7, maxW:122});
    // City label top=347.0 → data ~348
    txt(p1, pr.permCity,    330, 349, {size:7, maxW:96});
    txt(p1, pr.permProv,    434, 349, {size:7, maxW:122});
    // ZIP CODE label top=353.1 → data ~354
    txt(p1, pr.permZip,     253, 354, {size:7, maxW:70});

    // 19-21 Telephone / Mobile / Email — label tops 371.5 / 389.5 / 407.5
    txt(p1, pr.telNo,    330, 374, {size:7.5, maxW:224});
    txt(p1, pr.mobileNo, 330, 392, {size:7.5, maxW:224});
    txt(p1, pr.email,    330, 410, {size:7.5, maxW:224});

    // ── II. Family Background ──────────────────────────────────────────────────
    // Cell tops from rects: 431.0-446.4 (Spouse surname row)
    txt(p1, fam.spouseSurname,    127, 435, {size:7.5, maxW:118});
    // 446.3-461.6 (First Name row)
    txt(p1, fam.spouseFirstName,  127, 450, {size:7.5, maxW:118});
    txt(p1, fam.spouseExt,        253, 450, {size:7,   maxW:70});
    // 461.6-... (Middle Name row — not in rects above; label top=466.6)
    txt(p1, fam.spouseMiddleName, 127, 465, {size:7.5, maxW:118});
    // Occupation label top=481.9
    txt(p1, fam.spouseOccupation, 127, 484, {size:7.5, maxW:118});
    // Employer label top=497.1
    txt(p1, fam.spouseEmployer,   127, 499, {size:7.5, maxW:118, lineH:8});
    // Business Address label top=512.3
    txt(p1, fam.spouseBusiness,   127, 514, {size:7.5, maxW:118, lineH:8});
    // Tel label top=527.6
    txt(p1, fam.spouseTel,        127, 530, {size:7.5, maxW:118});

    // Father surname label top=542.8; rect top=? — use label
    txt(p1, fam.fatherSurname,    127, 546, {size:7.5, maxW:118});
    // First Name label top=558.1; rect 553.0-568.3
    txt(p1, fam.fatherFirstName,  127, 561, {size:7.5, maxW:118});
    txt(p1, fam.fatherExt,        253, 561, {size:7,   maxW:70});
    // Middle Name label top=573.3; rect 568.2-583.6
    txt(p1, fam.fatherMiddleName, 127, 576, {size:7.5, maxW:118});

    // Mother — Surname label top=603.8; rect 598.7-629.3 (tall merged)
    txt(p1, fam.motherSurname,    127, 605, {size:7.5, maxW:118});
    // First Name label top=619.0; rect 629.2-644.5
    txt(p1, fam.motherFirstName,  127, 620, {size:7.5, maxW:118});
    // Middle Name label top=634.3
    txt(p1, fam.motherMiddleName, 127, 637, {size:7.5, maxW:118});

    // 23. Children — right column x0=329, DOB x0≈487
    // Header row top=431.0; each child row height ≈15.3
    const children = fam.children || [];
    for (let i = 0; i < Math.min(children.length, 12); i++) {
      const ry = 435 + (i * 15.3);
      txt(p1, children[i].name, 330, ry, {size:6.5, maxW:148});
      txt(p1, children[i].dob,  482, ry, {size:6.5, maxW:74});
    }

    // ── III. Educational Background ────────────────────────────────────────────
    // Section rect top=655.8 bot=690.7 (headers)
    // Row label tops: ELEMENTARY=698.6, SECONDARY=719.3, VOCATIONAL=736.1
    //                 COLLEGE=760.9, GRADUATE=781.5
    // Column x edges (from pdfplumber words in header):
    //   School name: x=126 → x1≈253
    //   Course/Degree: x=253 → x1≈368 (approx, word BASIC starts 265)
    //   Period From: x≈372, To: x≈404
    //   Highest Units: x≈434
    //   Year Grad: x≈482
    //   Honors: x≈519
    const eduLevels = ['Elementary','Secondary','Vocational','College','Graduate'];
    const eduTops   = [700, 721, 739, 762, 783];
    for (let i = 0; i < 5; i++) {
      const ed = (e.education||[]).find(x => x.level && x.level.toLowerCase().startsWith(eduLevels[i].toLowerCase()));
      if (!ed) continue;
      const ry = eduTops[i];
      txt(p1, ed.school,   127, ry, {size:6.5, maxW:122, lineH:7});
      txt(p1, ed.course,   254, ry, {size:6.5, maxW:110, lineH:7});
      txt(p1, ed.from,     370, ry, {size:6.5, maxW:30});
      txt(p1, ed.to,       402, ry, {size:6.5, maxW:30});
      txt(p1, ed.units,    432, ry, {size:6.5, maxW:46});
      txt(p1, ed.yearGrad, 481, ry, {size:6.5, maxW:36});
      txt(p1, ed.honors,   520, ry, {size:6.5, maxW:40, lineH:7});
    }

    // ══ PAGE 2 — Eligibility + Work Experience ══════════════════════════════════
    // Eligibility column x edges: 75.6 | 238.0 | 294.1 | 353.4 | 430.9 | 480.7 | 531.0
    // Header tops from words: main row top≈29.5, data rows start ≈57, step ≈17.3
    const p2 = pages[1];
    const eligList = e.eligibility || [];
    for (let i = 0; i < Math.min(eligList.length, 9); i++) {
      const r  = eligList[i];
      const ry = 57 + (i * 17.3);
      txt(p2, r.name,     77,  ry, {size:6.5, maxW:156, lineH:7.5});
      txt(p2, r.rating,   239, ry, {size:6.5, maxW:50});
      txt(p2, r.dateConf, 295, ry, {size:6.5, maxW:54});
      txt(p2, r.place,    354, ry, {size:6.5, maxW:72,  lineH:7.5});
      txt(p2, r.licNo,    432, ry, {size:6.5, maxW:44});
      txt(p2, r.licValid, 482, ry, {size:6.5, maxW:44});
    }

    // Work Experience column x edges: 75.6 | 117.4 | 160.3 | 294.1 | 430.9 | 480.7 | 531.0
    // "From" label top=265.6 → first data row ≈275, step ≈19.3
    const workList = e.workExp || [];
    for (let i = 0; i < Math.min(workList.length, 28); i++) {
      const r  = workList[i];
      const ry = 275 + (i * 19.3);
      txt(p2, r.from,     77,  ry, {size:6.5, maxW:37});
      txt(p2, r.to,       118, ry, {size:6.5, maxW:38});
      txt(p2, r.position, 161, ry, {size:6.5, maxW:128, lineH:7.5});
      txt(p2, r.dept,     295, ry, {size:6.5, maxW:130, lineH:7.5});
      txt(p2, r.status,   432, ry, {size:6.5, maxW:44,  lineH:7.5});
      // Gov't Service — normalise Y/N display
      const gs = (r.govtService==='Yes'||r.govtService==='Y') ? 'Y' : (r.govtService==='No'||r.govtService==='N') ? 'N' : (r.govtService||'');
      txt(p2, gs,         481, ry, {size:6.5, maxW:44});
    }

    // ══ PAGE 3 — Voluntary Work + Training + Other Info ══════════════════════════
    // Voluntary Work column x edges: 36.5 | 267.2 | 308.2 | 349.1 | 390.0 | 569.8
    // "From" label top=64.1 → first data row ≈72, step ≈18
    const p3 = pages[2];
    const volList = e.voluntaryWork || [];
    for (let i = 0; i < Math.min(volList.length, 8); i++) {
      const r  = volList[i];
      const ry = 72 + (i * 18);
      txt(p3, r.org||r.name||'', 37,  ry, {size:6.5, maxW:225, lineH:7.5});
      txt(p3, r.from,            268, ry, {size:6.5, maxW:36});
      txt(p3, r.to,              309, ry, {size:6.5, maxW:36});
      txt(p3, r.hours,           350, ry, {size:6.5, maxW:36});
      txt(p3, r.position,        391, ry, {size:6.5, maxW:174, lineH:7.5});
    }

    // Training/L&D column x edges: 36.5 | 267.2 | 308.2 | 349.1 | 390.0 | 434.9 | 569.8
    // "From" label top=259.3 → first data row ≈267, step ≈17.5
    for (let i = 0; i < Math.min(tr.length, 25); i++) {
      const t  = tr[i];
      const ry = 267 + (i * 17.5);
      txt(p3, t.title,       37,  ry, {size:6.5, maxW:225, lineH:7.5});
      txt(p3, t.from,        268, ry, {size:6.5, maxW:36});
      txt(p3, t.to,          309, ry, {size:6.5, maxW:36});
      txt(p3, t.hours,       350, ry, {size:6.5, maxW:36});
      txt(p3, t.type,        391, ry, {size:6.5, maxW:40,  lineH:7.5});
      txt(p3, t.conductedBy, 436, ry, {size:6.5, maxW:128, lineH:7.5});
    }

    // VIII. Other Information — section top=641.9
    // Column x edges (from words): Skills x=37 →~218; Distinctions x=256→~435; Memberships x=437→~570
    // Data rows start at ≈674, step ≈17
    const skillLines = ((e.otherInfo||{}).skills||'').split(',').map(s=>s.trim()).filter(Boolean);
    const distLines  = ((e.otherInfo||{}).distinctions||'').split(',').map(s=>s.trim()).filter(Boolean);
    const membLines  = ((e.otherInfo||{}).memberships||'').split(',').map(s=>s.trim()).filter(Boolean);
    const maxOtherRows = Math.max(5, skillLines.length, distLines.length, membLines.length);
    for (let i = 0; i < maxOtherRows; i++) {
      const ry = 674 + (i * 17);
      if (skillLines[i]) txt(p3, skillLines[i], 37,  ry, {size:6.5, maxW:218});
      if (distLines[i])  txt(p3, distLines[i],  256, ry, {size:6.5, maxW:176});
      if (membLines[i])  txt(p3, membLines[i],  437, ry, {size:6.5, maxW:128});
    }

    // ══ PAGE 4 — Declarations + References + Gov't ID ══════════════════════════
    // YES/NO label positions (from pdfplumber):
    //   q34a: YES x0=392.9 top=65.8  / NO x0=447.1 → chk offset ~-10 from label x0
    //   q34b: YES x0=392.9 top=79.8  / NO x0=447.1
    //   q35a: YES x0=391.6 top=120.8 / NO x0=448.4
    //   q35b: YES x0=391.6 top=164.7 / NO x0=451.1
    //   q36:  YES x0=390.8 top=219.4 / NO x0=453.8
    //   q37:  YES x0=390.2 top=261.5 / NO x0=453.8
    //   q38a: YES x0=391.6 top=297.6 / NO x0=458.4
    //   q38b: YES x0=392.9 top=323.8 / NO x0=459.7
    //   q39:  YES x0=391.6 top=355.2 / NO x0=458.4
    //   q40a: YES x0=391.6 top=428.8 / NO x0=459.7
    //   q40b: YES x0=391.6 top=450.6 / NO x0=459.7
    //   q40c: YES x0=391.6 top=474.5 / NO x0=459.7
    // We place 'X' 9pt BEFORE the label x (inside the checkbox square)
    const p4 = pages[3];
    chk(p4, q.q34a, 382, 436, 65.8);
    chk(p4, q.q34b, 382, 436, 79.8);
    if (q.q34det)     txt(p4, q.q34det,     370, 99,  {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q35a, 381, 437, 120.8);
    if (q.q35aDet)    txt(p4, q.q35aDet,    370, 140, {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q35b, 381, 440, 164.7);
    if (q.q35bDet)    txt(p4, q.q35bDet,    370, 183, {size:6.5, maxW:192, lineH:7.5});
    if (q.q35bDate)   txt(p4, q.q35bDate,   435, 196, {size:6.5, maxW:125});
    if (q.q35bStatus) txt(p4, q.q35bStatus, 420, 208, {size:6.5, maxW:140});

    chk(p4, q.q36,  380, 442, 219.4);
    if (q.q36Det)     txt(p4, q.q36Det,     370, 238, {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q37,  380, 442, 261.5);
    if (q.q37Det)     txt(p4, q.q37Det,     370, 280, {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q38a, 381, 447, 297.6);
    if (q.q38aDet)    txt(p4, q.q38aDet,    370, 315, {size:6.5, maxW:192, lineH:7.5});
    chk(p4, q.q38b, 382, 448, 323.8);
    if (q.q38bDet)    txt(p4, q.q38bDet,    370, 342, {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q39,  381, 447, 355.2);
    if (q.q39Det)     txt(p4, q.q39Det,     370, 373, {size:6.5, maxW:192, lineH:7.5});

    chk(p4, q.q40a, 381, 448, 428.8);
    if (q.q40aSpec)   txt(p4, q.q40aSpec,   370, 445, {size:6.5, maxW:192, lineH:7.5});
    chk(p4, q.q40b, 381, 448, 450.6);
    if (q.q40bId)     txt(p4, q.q40bId,     370, 467, {size:6.5, maxW:192, lineH:7.5});
    chk(p4, q.q40c, 381, 448, 474.5);
    if (q.q40cId)     txt(p4, q.q40cId,     370, 491, {size:6.5, maxW:192, lineH:7.5});

    // 41. References — column x edges: 39.7 | 243.2 | 368.4 | 431.6
    // Row tops: header top≈514-529; data rows top=529, 548.5, 568.1
    for (let i = 0; i < 3; i++) {
      const ry = 531 + (i * 19.4);
      txt(p4, refs[i].name,    41,  ry, {size:7, maxW:196, lineH:8});
      txt(p4, refs[i].address, 244, ry, {size:7, maxW:119, lineH:8});
      txt(p4, refs[i].contact, 369, ry, {size:7, maxW:58,  lineH:8});
    }

    // 42. Gov't ID — Govt ID label top=659.8, PLEASE INDICATE top=669.6
    // Govt ID field: x=46 → x1≈229 (left box)
    // ID No field and Date/Place share left box
    // Date Accomplished: right of signature box ≈ x=442 top≈730
    txt(p4, e.govtId,           47, 673, {size:7, maxW:178});
    txt(p4, e.govtIdNo,         47, 691, {size:7, maxW:178});
    txt(p4, e.govtIdIssuance,   47, 723, {size:7, maxW:178});
    txt(p4, e.dateAccomplished, 442, 723, {size:7, maxW:108});

    // ── Download ───────────────────────────────────────────────────────────────
    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes], {type: 'application/pdf'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `PDS_${(pr.surname||'').toUpperCase()}_${(pr.firstName||'').toUpperCase()}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('PDF downloaded! ✓', 'success');

  } catch(err) {
    console.error('PDF generation error:', err);
    toast('PDF error: ' + err.message, 'error');
  }
}


// ══════════ FILL EXCEL PDS — CS Form 212 (Revised 2025) .xlsx ══════════
// Uses SheetJS (xlsx) to fill the official Excel template with employee data,
// writing each field into the exact unlocked input cells identified from the template.

async function fillExcelPDS(id) {
  const e = employees.find(x => x.id === id);
  if (!e) { toast('Employee not found.', 'error'); return; }
  toast('Generating Excel PDS…', 'success');

  const tr  = empTr(id);
  const pr  = e.personal;
  const fam = e.family;
  const q   = e.questions || {};
  const refs = (e.references && e.references.length >= 3)
    ? e.references
    : [{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}];

  // Helper: format YYYY-MM-DD → dd/mm/yyyy
  function fd(d) {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  }

  try {
    // Dynamically import SheetJS
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

    // Fetch the Excel template
    const res = await fetch('ANNEX_H-1_-_CS_Form_No__212_Revised_2025_-_Personal_Data_Sheet.xlsx');
    if (!res.ok) throw new Error('Could not load Excel template. Make sure it is deployed alongside the app.');
    const arrayBuf = await res.arrayBuffer();
    const wb = XLSX.read(arrayBuf, { type: 'array', cellStyles: true, bookVBA: true });

    // ── Helper: write a value to a specific cell (creates cell if missing) ──
    function setCell(sheetName, cellRef, value) {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].v = value === null || value === undefined ? '' : String(value);
      ws[cellRef].t = 's';
      // Remove formula so value shows directly
      delete ws[cellRef].f;
    }

    // ── Helper: YES/NO for declarations ──
    function yn(val) { return (val === true || val === 'Y' || val === 'Yes') ? 'YES' : 'NO'; }

    // ════════════════════════════════════════════════════════════════════
    // SHEET C1 — Personal Info, Family Background, Educational Background
    // ════════════════════════════════════════════════════════════════════

    // 1. SURNAME  → D10:N10 (merged input area; write to D10 as anchor)
    setCell('C1', 'D10', pr.surname?.toUpperCase());

    // 2. FIRST NAME → D11:K11
    setCell('C1', 'D11', pr.firstName?.toUpperCase());
    // NAME EXTENSION (JR., SR) → L11 (already has placeholder text; overwrite)
    setCell('C1', 'L11', pr.nameExt || '');

    // MIDDLE NAME → D12:K12
    setCell('C1', 'D12', pr.middleName?.toUpperCase());

    // 3. DATE OF BIRTH → D13:F13
    setCell('C1', 'D13', fd(pr.dob));

    // 4. PLACE OF BIRTH → D15:F15
    setCell('C1', 'D15', pr.pob);

    // 16. CITIZENSHIP — write text into the citizenship area
    // For Filipino: tick via text in H13; for dual, write country in M15
    setCell('C1', 'H13', pr.dualCitizenship ? '' : 'Filipino');
    if (pr.dualCitizenship) {
      setCell('C1', 'H13', 'Dual Citizenship');
      setCell('C1', 'M15', pr.dualCountry || '');
    }

    // 5. SEX AT BIRTH → D16:F16
    setCell('C1', 'D16', pr.sex);

    // 6. CIVIL STATUS → D17:F17
    setCell('C1', 'D17', pr.civil);

    // 7. HEIGHT → D22:F22
    setCell('C1', 'D22', pr.height);

    // 8. WEIGHT → D24:F24
    setCell('C1', 'D24', pr.weight);

    // 9. BLOOD TYPE → D25:F25
    setCell('C1', 'D25', pr.blood);

    // 10. UMID → D27:F27
    setCell('C1', 'D27', pr.umid);

    // 11. PAG-IBIG → D29:F29
    setCell('C1', 'D29', pr.pagibig);

    // 12. PHILHEALTH → D31:F31
    setCell('C1', 'D31', pr.philhealth);

    // 13. PhilSys → D32:F32
    setCell('C1', 'D32', pr.philsys);

    // 14. TIN → D33:F33
    setCell('C1', 'D33', pr.tin);

    // 15. AGENCY EMPLOYEE NO → D34:F34
    setCell('C1', 'D34', pr.agencyNo);

    // 17. RESIDENTIAL ADDRESS
    // House/Block/Lot: D18, Street: E18/F18 — use D18 for lot, F18 for street
    setCell('C1', 'D18', pr.residHouseNo);
    setCell('C1', 'E18', pr.residStreet);
    // Subdivision: D19, Barangay: E19
    setCell('C1', 'D19', pr.residSubdiv);
    setCell('C1', 'E19', pr.residBrgy);
    // City/Municipality: D20, Province: E20
    setCell('C1', 'D20', pr.residCity);
    setCell('C1', 'E20', pr.residProv);
    // ZIP: D21
    setCell('C1', 'D21', pr.residZip);

    // 18. PERMANENT ADDRESS
    setCell('C1', 'D26', pr.permHouseNo);
    setCell('C1', 'E26', pr.permStreet);
    setCell('C1', 'D27', pr.permSubdiv);  // note: also UMID — sheet uses separate rows
    // Re-check: permanent address rows 26-31 on C1
    // From structural analysis: Perm starts at row 25 (18. PERMANENT ADDRESS header)
    // Row 26: House/Lot | Street labels — input: H26/I26 area
    // Let's use the correct rows from sheet analysis:
    // Perm rows (separate from IDs in col D):
    // The layout has addresses in cols G-N (right side), IDs in cols D-F (left side)
    // Residential: H18/I18=House; L18/M18=Street; I21=Subdiv; L21=Brgy; I23=City; L23=Prov
    // So correct approach — write to G-N columns for addresses:
    setCell('C1', 'I18', pr.residHouseNo);
    setCell('C1', 'L18', pr.residStreet);
    setCell('C1', 'I21', pr.residSubdiv);
    setCell('C1', 'L21', pr.residBrgy);
    setCell('C1', 'I23', pr.residCity);
    setCell('C1', 'L23', pr.residProv);
    setCell('C1', 'I24', pr.residZip);   // ZIP in row 24

    setCell('C1', 'I26', pr.permHouseNo);
    setCell('C1', 'L26', pr.permStreet);
    setCell('C1', 'I28', pr.permSubdiv);
    setCell('C1', 'L28', pr.permBrgy);
    setCell('C1', 'I30', pr.permCity);
    setCell('C1', 'L30', pr.permProv);
    setCell('C1', 'I31', pr.permZip);   // ZIP row 31

    // 19. TEL NO → H32
    setCell('C1', 'H32', pr.telNo);
    // 20. MOBILE NO → H33
    setCell('C1', 'H33', pr.mobileNo);
    // 21. EMAIL → H34
    setCell('C1', 'H34', pr.email);

    // ── II. FAMILY BACKGROUND ────────────────────────────────────────────────
    // 22. SPOUSE — rows 36-42, input cols D-H
    setCell('C1', 'D36', fam.spouseSurname?.toUpperCase());
    setCell('C1', 'D37', fam.spouseFirstName?.toUpperCase());
    setCell('C1', 'G37', fam.spouseExt || '');  // name extension
    setCell('C1', 'D38', fam.spouseMiddleName?.toUpperCase());
    setCell('C1', 'D39', fam.spouseOccupation);
    setCell('C1', 'D40', fam.spouseEmployer);
    setCell('C1', 'D41', fam.spouseBusiness);
    setCell('C1', 'D42', fam.spouseTel);

    // 23. CHILDREN — right column, rows 37 onwards (cols I-N)
    // Each child: name in I, DOB in M (based on header I36=Name, M36=DOB)
    (fam.children || []).slice(0, 11).forEach((child, i) => {
      setCell('C1', `I${37 + i}`, child.name || '');
      setCell('C1', `M${37 + i}`, fd(child.dob) || '');
    });

    // 24. FATHER — rows 43-45
    setCell('C1', 'D43', fam.fatherSurname?.toUpperCase());
    setCell('C1', 'D44', fam.fatherFirstName?.toUpperCase());
    setCell('C1', 'G44', fam.fatherExt || '');
    setCell('C1', 'D45', fam.fatherMiddleName?.toUpperCase());

    // 25. MOTHER — rows 47-49 (Mother's Maiden Name header at row 46)
    setCell('C1', 'D47', fam.motherSurname?.toUpperCase());
    setCell('C1', 'D48', fam.motherFirstName?.toUpperCase());
    setCell('C1', 'D49', fam.motherMiddleName?.toUpperCase());

    // ── III. EDUCATIONAL BACKGROUND — rows 54-58 ────────────────────────────
    // Columns: B=Level label, G=School (input), I=Course (input), J=From, K=To, L=Units, M=YrGrad, N=Honors
    // From structure: edu input cols G-N; unlocked cells found at G54-N58
    const eduMap = { Elementary: 54, Secondary: 55, Vocational: 56, College: 57, Graduate: 58 };
    const eduLevelKeys = ['Elementary','Secondary','Vocational','College','Graduate'];
    eduLevelKeys.forEach(level => {
      const ed = (e.education || []).find(x => x.level && x.level.toLowerCase().startsWith(level.toLowerCase()));
      if (!ed) return;
      const row = eduMap[level];
      setCell('C1', `G${row}`, ed.school);
      setCell('C1', `I${row}`, ed.course);
      setCell('C1', `J${row}`, ed.from);
      setCell('C1', `K${row}`, ed.to);
      setCell('C1', `L${row}`, ed.units);
      setCell('C1', `M${row}`, ed.yearGrad);
      setCell('C1', `N${row}`, ed.honors);
    });

    // Signature date (C1 bottom)
    setCell('C1', 'L60', fd(e.dateAccomplished) || fd(e.updatedAt) || '');

    // ════════════════════════════════════════════════════════════════════
    // SHEET C2 — Civil Service Eligibility + Work Experience
    // ════════════════════════════════════════════════════════════════════

    // IV. ELIGIBILITY — rows 5-11 (up to 7 rows), cols A-K
    // Headers: A-E=Eligibility name, F=Rating, G-H=Date, I=Place, J=LicNo, K=LicValid
    (e.eligibility || []).slice(0, 7).forEach((el, i) => {
      const row = 5 + i;
      setCell('C2', `A${row}`, el.name);
      setCell('C2', `F${row}`, el.rating);
      setCell('C2', `G${row}`, fd(el.dateConf));
      setCell('C2', `I${row}`, el.place);
      setCell('C2', `J${row}`, el.licNo);
      setCell('C2', `K${row}`, el.licValid === 'N/A' ? 'N/A' : fd(el.licValid));
    });

    // V. WORK EXPERIENCE — rows 18-45 (up to 28 rows)
    // Headers: A-B=From, C-D=To, D-F=Position, G-I=Dept, J=Status, K=GovtService
    (e.workExp || []).slice(0, 28).forEach((w, i) => {
      const row = 18 + i;
      setCell('C2', `A${row}`, fd(w.from) || w.from);
      setCell('C2', `C${row}`, w.to === 'Present' ? 'Present' : fd(w.to) || w.to);
      setCell('C2', `D${row}`, w.position);
      setCell('C2', `G${row}`, w.dept);
      setCell('C2', `J${row}`, w.status);
      const gs = (w.govtService === 'Yes' || w.govtService === 'Y') ? 'Y'
               : (w.govtService === 'No'  || w.govtService === 'N') ? 'N'
               : (w.govtService || '');
      setCell('C2', `K${row}`, gs);
    });

    // Signature date C2
    setCell('C2', 'L47', fd(e.dateAccomplished) || fd(e.updatedAt) || '');

    // ════════════════════════════════════════════════════════════════════
    // SHEET C3 — Voluntary Work + L&D Training + Other Info
    // ════════════════════════════════════════════════════════════════════

    // VI. VOLUNTARY WORK — rows 6-12 (up to 7 entries)
    // Cols: A-D=Org, E=From, F=To, G=Hours, H-K=Position
    (e.voluntaryWork || []).slice(0, 7).forEach((v, i) => {
      const row = 6 + i;
      setCell('C3', `A${row}`, v.org || v.name || '');
      setCell('C3', `E${row}`, fd(v.from) || v.from || '');
      setCell('C3', `F${row}`, fd(v.to) || v.to || '');
      setCell('C3', `G${row}`, String(v.hours || ''));
      setCell('C3', `H${row}`, v.position || '');
    });

    // VII. L&D TRAINING — rows 18-38 (up to 21 entries)
    // Cols: A-D=Title, E=From, F=To, G=Hours, H=Type, I-K=ConductedBy
    tr.slice(0, 21).forEach((t, i) => {
      const row = 18 + i;
      setCell('C3', `A${row}`, t.title || '');
      setCell('C3', `E${row}`, fd(t.from) || t.from || '');
      setCell('C3', `F${row}`, fd(t.to) || t.to || '');
      setCell('C3', `G${row}`, String(t.hours || ''));
      setCell('C3', `H${row}`, t.type || '');
      setCell('C3', `I${row}`, t.conductedBy || '');
    });

    // VIII. OTHER INFORMATION — rows 42-48
    // Col A-C = Skills, D-G = Distinctions, H-K = Memberships
    const skillLines = ((e.otherInfo||{}).skills||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const distLines  = ((e.otherInfo||{}).distinctions||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const membLines  = ((e.otherInfo||{}).memberships||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const maxRows = Math.max(skillLines.length, distLines.length, membLines.length, 1);
    for (let i = 0; i < Math.min(maxRows, 7); i++) {
      const row = 42 + i;
      if (skillLines[i]) setCell('C3', `A${row}`, skillLines[i]);
      if (distLines[i])  setCell('C3', `D${row}`, distLines[i]);
      if (membLines[i])  setCell('C3', `H${row}`, membLines[i]);
    }

    // Signature date C3
    setCell('C3', 'K48', fd(e.dateAccomplished) || fd(e.updatedAt) || '');

    // ════════════════════════════════════════════════════════════════════
    // SHEET C4 — Declarations + References + Gov't ID
    // ════════════════════════════════════════════════════════════════════

    // Declarations YES/NO — write into I-L columns (right side)
    // Q34a → row 6, Q34b → row 8
    setCell('C4', 'I6',  yn(q.q34a));
    setCell('C4', 'I8',  yn(q.q34b));
    if (q.q34det) setCell('C4', 'I10', q.q34det);

    // Q35a → row 11, Q35b → row 15
    setCell('C4', 'I11', yn(q.q35a));
    if (q.q35aDet) setCell('C4', 'I12', q.q35aDet);
    setCell('C4', 'I15', yn(q.q35b));
    if (q.q35bDet) setCell('C4', 'I16', q.q35bDet);
    if (q.q35bDate) setCell('C4', 'L20', q.q35bDate);
    if (q.q35bStatus) setCell('C4', 'L21', q.q35bStatus);

    // Q36 → row 25
    setCell('C4', 'I25', yn(q.q36));
    if (q.q36Det) setCell('C4', 'I26', q.q36Det);

    // Q37 → row 29
    setCell('C4', 'I29', yn(q.q37));
    if (q.q37Det) setCell('C4', 'I30', q.q37Det);

    // Q38a → row 34, Q38b → row 37 (approx)
    setCell('C4', 'I34', yn(q.q38a));
    if (q.q38aDet) setCell('C4', 'I35', q.q38aDet);
    setCell('C4', 'I37', yn(q.q38b));  // using row for 38b

    // Q39 → row 39
    setCell('C4', 'I39', yn(q.q39));
    if (q.q39Det) setCell('C4', 'I40', q.q39Det);

    // Q40a/b/c → declarations rows
    setCell('C4', 'I43', yn(q.q40a));
    if (q.q40aSpec) setCell('C4', 'J44', q.q40aSpec);
    setCell('C4', 'I45', yn(q.q40b));
    if (q.q40bId) setCell('C4', 'J46', q.q40bId);
    setCell('C4', 'I47', yn(q.q40c));
    if (q.q40cId) setCell('C4', 'J48', q.q40cId);

    // 41. REFERENCES — rows 52, 53, 54 (cols A=Name, F=Address, G=Contact)
    refs.slice(0, 3).forEach((ref, i) => {
      const row = 52 + i;
      setCell('C4', `A${row}`, ref.name || '');
      setCell('C4', `F${row}`, ref.address || '');
      setCell('C4', `G${row}`, ref.contact || '');
    });

    // 42. GOV'T ID — rows 61-65
    setCell('C4', 'D61', e.govtId || '');
    setCell('C4', 'D62', e.govtIdNo || '');
    setCell('C4', 'D64', e.govtIdIssuance || '');
    setCell('C4', 'D65', fd(e.dateAccomplished) || fd(e.updatedAt) || '');

    // ── Generate and download ─────────────────────────────────────────────────
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob  = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `PDS_${(pr.surname||'').toUpperCase()}_${(pr.firstName||'').toUpperCase()}_CS212_2025.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast('Excel PDS downloaded! ✓', 'success');

  } catch(err) {
    console.error('Excel generation error:', err);
    toast('Excel error: ' + err.message, 'error');
  }
}

// ══════════ POPULATE SELECTS ══════════
function popEmpSels() {
  const ts = document.getElementById('trEmpId');
  if (ts) { const v=ts.value; ts.innerHTML='<option value="">— Select Employee —</option>'+employees.map(e=>`<option value="${e.id}">${esc(e.id)} — ${esc(e.personal.surname)}, ${esc(e.personal.firstName)}</option>`).join(''); ts.value=v; }
  const df = document.getElementById('filterDept');
  if (df) { const v=df.value; df.innerHTML='<option value="">All Departments</option>'+getDepts().map(d=>`<option value="${esc(d)}"${v===d?' selected':''}>${esc(d)}</option>`).join(''); df.value=v; }
}

// ══════════ INIT ══════════
document.addEventListener('DOMContentLoaded', () => {
  // Pre-load employees for employee login dropdown
  setLoginRole('admin');
  // Hide app shell until logged in — the overlay blocks it visually already
});
