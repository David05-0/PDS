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
        <button class="btn btn-sm btn-green" onclick="fillDocxPDS('${e.id}')">📄 DOCX</button>
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
    <button class="btn btn-green" onclick="fillDocxPDS('${id}')">📄 Download DOCX</button>
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
  const _hasKey = !!(sessionStorage.getItem('pds_ai_key'));
  const importBanner = `<div class="sim-import-banner">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">🤖</span>
      <div><div style="font-weight:700;font-size:13px;color:var(--navy)">AI Smart Import</div><div style="font-size:11px;color:var(--text-muted)">Upload a passport, ID, or existing PDS to auto-fill this form</div></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      ${_hasKey ? `<button class="btn btn-outline" style="font-size:11px;padding:5px 10px;color:var(--green);border-color:var(--green)" onclick="sessionStorage.removeItem('pds_ai_key');buildPDSForm();toast('API key cleared.','success')">🔑 Key Set ✓ Clear</button>` : ''}
      <button class="btn btn-primary" onclick="openSmartImport()">📄 Import from Document</button>
    </div>
  </div>`;
  document.getElementById('pdsFormWrap').innerHTML = importBanner + `<div class="tab-bar">${tabBar}</div><div class="form-body">${body}</div>${footer}`;
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
        <button class="btn btn-green" onclick="fillDocxPDS('${emp.id}')">📄 Download DOCX</button>
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

// ══════════ PRINT PDS — HTML replica of CS Form 212 (Revised 2025) ══════════
function printPDS(id) {
  const e = employees.find(x => x.id === id);
  if (!e) { toast('Employee not found.', 'error'); return; }
  toast('Opening print preview…', 'success');

  const tr = empTr(id);
  const pr = e.personal;
  const fam = e.family || {};
  const q = e.questions || {};
  const refs = (e.references && e.references.filter(r=>r&&r.name).length)
    ? [...e.references, {name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}].slice(0,3)
    : [{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}];

  // helpers
  function fd(d) {
    if (!d) return '';
    const p = d.split('-');
    if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
    return d;
  }
  function v(s) { return (s||'').toString().trim(); }
  function box(checked) { return `<span style="display:inline-block;width:9px;height:9px;border:1px solid #333;text-align:center;line-height:9px;font-size:7px;font-weight:bold">${checked?'✓':''}</span>`; }
  function yn(val) { return (val===true||val==='Y'||val==='Yes'||val==='yes') ? 'YES' : 'NO'; }
  function ynBox(val) {
    const yes = val===true||val==='Y'||val==='Yes';
    return `${box(yes)} YES &nbsp; ${box(!yes)} NO`;
  }
  function row(lbl, val, opts={}) {
    const h = opts.h || 18;
    return `<tr><td class="lbl" style="height:${h}px">${lbl}</td><td class="val" style="height:${h}px">${v(val)}</td></tr>`;
  }

  // Build edu rows for each level
  function eduRow(level) {
    const ed = (e.education||[]).find(x=>x.level&&x.level.toLowerCase().startsWith(level.toLowerCase()));
    return `<tr style="height:22px">
      <td class="val" style="font-size:7pt">${ed?v(ed.school):''}</td>
      <td class="val" style="font-size:7pt">${ed?v(ed.course):''}</td>
      <td class="val" style="font-size:7pt;text-align:center">${ed?v(ed.from):''}</td>
      <td class="val" style="font-size:7pt;text-align:center">${ed?v(ed.to):''}</td>
      <td class="val" style="font-size:7pt;text-align:center">${ed?v(ed.units):''}</td>
      <td class="val" style="font-size:7pt;text-align:center">${ed?v(ed.yearGrad):''}</td>
      <td class="val" style="font-size:7pt">${ed?v(ed.honors):''}</td>
    </tr>`;
  }

  const w = window.open('','_blank','width=900,height=700');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>PDS — ${v(pr.surname)}, ${v(pr.firstName)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #000; background: #fff; }
  .page { width: 100%; page-break-after: always; border: 1px solid #555; padding: 4px; }
  .page:last-child { page-break-after: auto; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 0.5px solid #444; padding: 1px 3px; vertical-align: top; }
  .lbl { font-size: 6.5pt; color: #333; white-space: nowrap; background: #f7f7f7; width: 1%; }
  .val { font-size: 8pt; font-weight: bold; }
  .val-sm { font-size: 7pt; }
  .sec-hdr { background: #1a3a6e; color: #fff; font-size: 7pt; font-weight: bold; padding: 2px 4px; letter-spacing: 0.5px; }
  .form-title { text-align: center; font-size: 16pt; font-weight: 900; letter-spacing: 1px; padding: 4px 0 2px; }
  .form-sub { text-align: center; font-size: 6.5pt; margin-bottom: 3px; }
  .warn { font-size: 6pt; font-style: italic; margin-bottom: 2px; border: 0.5px solid #888; padding: 2px 4px; }
  .no-border td, .no-border th { border: none; }
  h-lbl { font-size: 6pt; color: #555; display: block; font-weight: normal; }
  .chk-row { font-size: 7.5pt; }
  .print-btn { position: fixed; top: 10px; right: 10px; padding: 8px 18px; background: #1a3a6e; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; z-index: 999; }
  @media print { .print-btn { display: none; } .page { border: none; } }
  .addr-lbl { font-size: 6pt; color: #555; font-style: italic; }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

<!-- ═══════════════════════ PAGE 1 ═══════════════════════ -->
<div class="page">
  <div style="text-align:right;font-size:6pt;margin-bottom:1px">CS Form No. 212 &nbsp; Revised 2025</div>
  <div class="form-title">PERSONAL DATA SHEET</div>
  <div class="warn"><b>WARNING:</b> Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person concerned.<br>
  READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORM.<br>
  Print legibly if accomplished through own handwriting. Tick appropriate boxes (✓) and use separate sheet if necessary. Indicate N/A if not applicable. <b>DO NOT ABBREVIATE.</b></div>

  <!-- PERSONAL INFO HEADER -->
  <table style="margin-bottom:1px">
    <tr><td colspan="4" class="sec-hdr">I. PERSONAL INFORMATION</td></tr>
    <tr>
      <td class="lbl" style="width:110px">1. SURNAME</td>
      <td class="val" colspan="2" style="font-size:9pt;font-weight:900">${v(pr.surname)}</td>
      <td style="width:160px">
        <div class="lbl">NAME EXTENSION (JR., SR)</div>
        <div class="val">${v(pr.nameExt)}</div>
      </td>
    </tr>
    <tr>
      <td class="lbl">2. FIRST NAME</td>
      <td class="val" colspan="2" style="font-size:9pt;font-weight:900">${v(pr.firstName)}</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <td class="lbl">&nbsp;&nbsp;&nbsp;MIDDLE NAME</td>
      <td class="val" colspan="3" style="font-size:9pt;font-weight:900">${v(pr.middleName)}</td>
    </tr>
  </table>

  <!-- TWO-COLUMN: LEFT (personal fields) RIGHT (citizenship + address) -->
  <table>
    <tr>
      <!-- LEFT PERSONAL FIELDS -->
      <td style="width:50%;vertical-align:top;border:none;padding:0">
        <table>
          <tr>
            <td class="lbl" style="width:130px">3. DATE OF BIRTH (dd/mm/yyyy)</td>
            <td class="val">${fd(pr.dob)}</td>
          </tr>
          <tr>
            <td class="lbl">4. PLACE OF BIRTH</td>
            <td class="val">${v(pr.pob)}</td>
          </tr>
          <tr>
            <td class="lbl">5. SEX AT BIRTH</td>
            <td class="val chk-row">${box(pr.sex==='Male')} Male &nbsp;&nbsp; ${box(pr.sex==='Female')} Female</td>
          </tr>
          <tr>
            <td class="lbl">6. CIVIL STATUS</td>
            <td class="val chk-row">
              ${box(pr.civil==='Single')} Single &nbsp;
              ${box(pr.civil==='Married')} Married &nbsp;
              ${box(pr.civil==='Widow/er'||pr.civil==='Widowed')} Widowed<br>
              ${box(pr.civil==='Separated')} Separated &nbsp;
              ${box(!['Single','Married','Widow/er','Widowed','Separated'].includes(pr.civil)&&!!pr.civil)} Other/s:
              ${!['Single','Married','Widow/er','Widowed','Separated'].includes(pr.civil)?v(pr.civil):''}
            </td>
          </tr>
          <tr><td class="lbl">7. HEIGHT (m)</td><td class="val">${v(pr.height)}</td></tr>
          <tr><td class="lbl">8. WEIGHT (kg)</td><td class="val">${v(pr.weight)}</td></tr>
          <tr><td class="lbl">9. BLOOD TYPE</td><td class="val">${v(pr.blood)}</td></tr>
          <tr><td class="lbl">10. UMID ID NO.</td><td class="val">${v(pr.umid)}</td></tr>
          <tr><td class="lbl">11. PAG-IBIG ID NO.</td><td class="val">${v(pr.pagibig)}</td></tr>
          <tr><td class="lbl">12. PHILHEALTH NO.</td><td class="val">${v(pr.philhealth)}</td></tr>
          <tr><td class="lbl">13. PhilSys Number (PSN)</td><td class="val">${v(pr.philsys)}</td></tr>
          <tr><td class="lbl">14. TIN NO.</td><td class="val">${v(pr.tin)}</td></tr>
          <tr><td class="lbl">15. AGENCY EMPLOYEE NO.</td><td class="val">${v(pr.agencyNo)}</td></tr>
        </table>
      </td>
      <!-- RIGHT: Citizenship + Addresses + Contact -->
      <td style="width:50%;vertical-align:top;border:none;padding:0">
        <table>
          <tr>
            <td class="lbl" style="width:90px">16. CITIZENSHIP</td>
            <td class="val chk-row">
              ${box(!pr.dualCitizenship)} Filipino &nbsp;
              ${box(!!pr.dualCitizenship)} Dual Citizenship<br>
              <span style="font-size:6pt">${box(pr.dualCitizenship&&pr.dualHow==='birth')} by birth &nbsp;
              ${box(pr.dualCitizenship&&pr.dualHow==='naturalization')} by naturalization</span><br>
              ${pr.dualCitizenship?`<span style="font-size:6.5pt">Country: <b>${v(pr.dualCountry)}</b></span>`:''}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0">
              <table>
                <tr><td colspan="2" class="lbl" style="background:#e8e8e8">17. RESIDENTIAL ADDRESS</td></tr>
                <tr>
                  <td style="width:50%">
                    <div class="addr-lbl">House/Block/Lot No.</div>
                    <div class="val">${v(pr.residHouseNo)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Street</div>
                    <div class="val">${v(pr.residStreet)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="addr-lbl">Subdivision/Village</div>
                    <div class="val">${v(pr.residSubdiv)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Barangay</div>
                    <div class="val">${v(pr.residBrgy)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="addr-lbl">City/Municipality</div>
                    <div class="val">${v(pr.residCity)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Province</div>
                    <div class="val">${v(pr.residProv)}</div>
                  </td>
                </tr>
                <tr>
                  <td class="lbl">ZIP CODE</td>
                  <td class="val">${v(pr.residZip)}</td>
                </tr>
                <tr><td colspan="2" class="lbl" style="background:#e8e8e8">18. PERMANENT ADDRESS</td></tr>
                <tr>
                  <td>
                    <div class="addr-lbl">House/Block/Lot No.</div>
                    <div class="val">${v(pr.permHouseNo)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Street</div>
                    <div class="val">${v(pr.permStreet)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="addr-lbl">Subdivision/Village</div>
                    <div class="val">${v(pr.permSubdiv)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Barangay</div>
                    <div class="val">${v(pr.permBrgy)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="addr-lbl">City/Municipality</div>
                    <div class="val">${v(pr.permCity)}</div>
                  </td>
                  <td>
                    <div class="addr-lbl">Province</div>
                    <div class="val">${v(pr.permProv)}</div>
                  </td>
                </tr>
                <tr>
                  <td class="lbl">ZIP CODE</td>
                  <td class="val">${v(pr.permZip)}</td>
                </tr>
                <tr><td class="lbl">19. TELEPHONE NO.</td><td class="val">${v(pr.telNo)}</td></tr>
                <tr><td class="lbl">20. MOBILE NO.</td><td class="val">${v(pr.mobileNo)}</td></tr>
                <tr><td class="lbl">21. E-MAIL ADDRESS (if any)</td><td class="val">${v(pr.email)}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- FAMILY BACKGROUND -->
  <table style="margin-top:2px">
    <tr><td colspan="6" class="sec-hdr">II. FAMILY BACKGROUND</td></tr>
    <tr>
      <!-- SPOUSE -->
      <td style="width:50%;vertical-align:top;border:none;padding:0">
        <table>
          <tr><td class="lbl" style="width:140px">22. SPOUSE'S SURNAME</td><td class="val">${v(fam.spouseSurname)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;FIRST NAME</td><td class="val">${v(fam.spouseFirstName)}&nbsp;<span style="font-size:6.5pt;font-weight:normal">${v(fam.spouseExt)}</span></td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;MIDDLE NAME</td><td class="val">${v(fam.spouseMiddleName)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;OCCUPATION</td><td class="val">${v(fam.spouseOccupation)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;EMPLOYER/BUSINESS NAME</td><td class="val">${v(fam.spouseEmployer)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;BUSINESS ADDRESS</td><td class="val">${v(fam.spouseBusiness)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;TELEPHONE NO.</td><td class="val">${v(fam.spouseTel)}</td></tr>
          <tr><td class="lbl">24. FATHER'S SURNAME</td><td class="val">${v(fam.fatherSurname)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;FIRST NAME</td><td class="val">${v(fam.fatherFirstName)}&nbsp;<span style="font-size:6.5pt;font-weight:normal">${v(fam.fatherExt)}</span></td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;MIDDLE NAME</td><td class="val">${v(fam.fatherMiddleName)}</td></tr>
          <tr><td class="lbl">25. MOTHER'S MAIDEN NAME</td><td class="val"></td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;SURNAME</td><td class="val">${v(fam.motherSurname)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;FIRST NAME</td><td class="val">${v(fam.motherFirstName)}</td></tr>
          <tr><td class="lbl">&nbsp;&nbsp;&nbsp;MIDDLE NAME</td><td class="val">${v(fam.motherMiddleName)}</td></tr>
        </table>
      </td>
      <!-- CHILDREN -->
      <td style="width:50%;vertical-align:top;border:none;padding:0">
        <table>
          <tr>
            <th class="lbl" style="text-align:left">23. NAME of CHILDREN (Write full name and list all)</th>
            <th class="lbl" style="width:90px;text-align:center">DATE OF BIRTH (dd/mm/yyyy)</th>
          </tr>
          ${(fam.children||[]).map(c=>`<tr style="height:16px"><td class="val" style="font-size:7.5pt">${v(c.name)}</td><td class="val" style="font-size:7.5pt;text-align:center">${fd(c.dob)}</td></tr>`).join('')}
          ${Array.from({length:Math.max(0,10-(fam.children||[]).length)},()=>`<tr style="height:16px"><td class="val">&nbsp;</td><td class="val">&nbsp;</td></tr>`).join('')}
        </table>
      </td>
    </tr>
  </table>

  <!-- EDUCATION -->
  <table style="margin-top:2px">
    <tr><td colspan="7" class="sec-hdr">III. EDUCATIONAL BACKGROUND</td></tr>
    <tr>
      <th class="lbl" style="width:12%">26. LEVEL</th>
      <th class="lbl" style="width:22%">NAME OF SCHOOL (Write in full)</th>
      <th class="lbl" style="width:22%">BASIC EDUCATION/DEGREE/COURSE (Write in full)</th>
      <th class="lbl" style="width:8%;text-align:center">From</th>
      <th class="lbl" style="width:8%;text-align:center">To</th>
      <th class="lbl" style="width:12%;text-align:center">HIGHEST LEVEL/UNITS EARNED (if not graduated)</th>
      <th class="lbl" style="width:8%;text-align:center">YEAR GRADUATED</th>
      <th class="lbl" style="width:8%;text-align:center">SCHOLARSHIP/ ACADEMIC HONORS RECEIVED</th>
    </tr>
    ${'<tr style="height:22px"><td class="lbl" style="font-size:7pt;font-weight:bold">ELEMENTARY</td>'+eduRow('Elementary').replace('<tr style="height:22px">','').replace('</tr>','')+'</tr>'}
    ${'<tr style="height:22px"><td class="lbl" style="font-size:7pt;font-weight:bold">SECONDARY</td>'+eduRow('Secondary').replace('<tr style="height:22px">','').replace('</tr>','')+'</tr>'}
    ${'<tr style="height:22px"><td class="lbl" style="font-size:7pt;font-weight:bold">VOCATIONAL / TRADE COURSE</td>'+eduRow('Vocational').replace('<tr style="height:22px">','').replace('</tr>','')+'</tr>'}
    ${'<tr style="height:22px"><td class="lbl" style="font-size:7pt;font-weight:bold">COLLEGE</td>'+eduRow('College').replace('<tr style="height:22px">','').replace('</tr>','')+'</tr>'}
    ${'<tr style="height:22px"><td class="lbl" style="font-size:7pt;font-weight:bold">GRADUATE STUDIES</td>'+eduRow('Graduate').replace('<tr style="height:22px">','').replace('</tr>','')+'</tr>'}
  </table>

  <!-- Signature bar page 1 -->
  <table style="margin-top:2px">
    <tr>
      <td style="width:20%;text-align:center" class="lbl"><b>SIGNATURE</b></td>
      <td style="width:55%;text-align:center;font-size:6.5pt;color:#555">(wet signature/e-signature/digital certificate)</td>
      <td style="width:10%;text-align:center" class="lbl"><b>DATE</b></td>
      <td style="width:15%;text-align:center" class="val">${v(e.dateAccomplished)}</td>
    </tr>
  </table>
  <div style="font-size:5.5pt;text-align:right;margin-top:2px">CS FORM 212 (Revised 2025), Page 1 of 4</div>
</div>

<!-- ═══════════════════════ PAGE 2 ═══════════════════════ -->
<div class="page">
  <!-- IV. CIVIL SERVICE ELIGIBILITY -->
  <table style="margin-bottom:2px">
    <tr><td colspan="6" class="sec-hdr">IV. CIVIL SERVICE ELIGIBILITY</td></tr>
    <tr>
      <th class="lbl" style="width:34%">CES/CSEE/CAREER SERVICE/RA 1080 (BOARD/BAR)/UNDER SPECIAL LAWS/CATEGORY II/IV ELIGIBILITY and ELIGIBILITIES FOR UNIFORMED PERSONNEL</th>
      <th class="lbl" style="width:10%;text-align:center">RATING (If Applicable)</th>
      <th class="lbl" style="width:14%;text-align:center">DATE OF EXAMINATION / CONFERMENT</th>
      <th class="lbl" style="width:20%;text-align:center">PLACE OF EXAMINATION / CONFERMENT</th>
      <th class="lbl" style="width:12%;text-align:center">LICENSE NUMBER (if applicable)</th>
      <th class="lbl" style="width:10%;text-align:center">Valid Until</th>
    </tr>
    ${(e.eligibility||[]).map(r=>`
    <tr style="height:20px">
      <td class="val val-sm">${v(r.name)}</td>
      <td class="val val-sm" style="text-align:center">${v(r.rating)}</td>
      <td class="val val-sm" style="text-align:center">${fd(r.dateConf)}</td>
      <td class="val val-sm">${v(r.place)}</td>
      <td class="val val-sm" style="text-align:center">${v(r.licNo)}</td>
      <td class="val val-sm" style="text-align:center">${r.licValid==='N/A'?'N/A':fd(r.licValid)}</td>
    </tr>`).join('')}
    ${Array.from({length:Math.max(0,7-(e.eligibility||[]).length)},()=>`<tr style="height:20px"><td class="val">&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
  </table>

  <!-- V. WORK EXPERIENCE -->
  <table>
    <tr><td colspan="6" class="sec-hdr">V. WORK EXPERIENCE <span style="font-size:6pt;font-weight:normal">(Include private employment. Start from your recent work.)</span></td></tr>
    <tr>
      <th class="lbl" style="width:12%;text-align:center">From</th>
      <th class="lbl" style="width:12%;text-align:center">To</th>
      <th class="lbl" style="width:26%">POSITION TITLE (Write in full/Do not abbreviate)</th>
      <th class="lbl" style="width:30%">DEPARTMENT / AGENCY / OFFICE / COMPANY (Write in full/Do not abbreviate)</th>
      <th class="lbl" style="width:13%;text-align:center">STATUS OF APPOINTMENT</th>
      <th class="lbl" style="width:7%;text-align:center">GOV'T SERVICE (Y/N)</th>
    </tr>
    ${(e.workExp||[]).map(r=>`
    <tr style="height:20px">
      <td class="val val-sm" style="text-align:center">${fd(r.from)||v(r.from)}</td>
      <td class="val val-sm" style="text-align:center">${r.to==='Present'?'Present':fd(r.to)||v(r.to)}</td>
      <td class="val val-sm">${v(r.position)}</td>
      <td class="val val-sm">${v(r.dept)}</td>
      <td class="val val-sm" style="text-align:center">${v(r.status)}</td>
      <td class="val val-sm" style="text-align:center">${(r.govtService==='Yes'||r.govtService==='Y')?'Y':(r.govtService==='No'||r.govtService==='N')?'N':v(r.govtService)}</td>
    </tr>`).join('')}
    ${Array.from({length:Math.max(0,20-(e.workExp||[]).length)},()=>`<tr style="height:20px"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
  </table>

  <!-- Signature page 2 -->
  <table style="margin-top:2px">
    <tr>
      <td style="width:20%;text-align:center" class="lbl"><b>SIGNATURE</b></td>
      <td style="width:55%;text-align:center;font-size:6.5pt;color:#555">(wet signature/e-signature/digital certificate)</td>
      <td style="width:10%;text-align:center" class="lbl"><b>DATE</b></td>
      <td style="width:15%;text-align:center" class="val">${v(e.dateAccomplished)}</td>
    </tr>
  </table>
  <div style="font-size:5.5pt;text-align:right;margin-top:2px">CS FORM 212 (Revised 2025), Page 2 of 4</div>
</div>

<!-- ═══════════════════════ PAGE 3 ═══════════════════════ -->
<div class="page">
  <!-- VI. VOLUNTARY WORK -->
  <table style="margin-bottom:2px">
    <tr><td colspan="5" class="sec-hdr">VI. VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATION/S</td></tr>
    <tr>
      <th class="lbl" style="width:38%">29. NAME &amp; ADDRESS OF ORGANIZATION (Write in full)</th>
      <th class="lbl" style="width:12%;text-align:center">From</th>
      <th class="lbl" style="width:12%;text-align:center">To</th>
      <th class="lbl" style="width:10%;text-align:center">NUMBER OF HOURS</th>
      <th class="lbl" style="width:28%">POSITION / NATURE OF WORK</th>
    </tr>
    ${(e.voluntaryWork||[]).map(r=>`
    <tr style="height:20px">
      <td class="val val-sm">${v(r.org||r.name||'')}</td>
      <td class="val val-sm" style="text-align:center">${fd(r.from)||v(r.from)}</td>
      <td class="val val-sm" style="text-align:center">${fd(r.to)||v(r.to)}</td>
      <td class="val val-sm" style="text-align:center">${v(r.hours)}</td>
      <td class="val val-sm">${v(r.position)}</td>
    </tr>`).join('')}
    ${Array.from({length:Math.max(0,7-(e.voluntaryWork||[]).length)},()=>`<tr style="height:20px"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`).join('')}
  </table>

  <!-- VII. L&D TRAINING -->
  <table style="margin-bottom:2px">
    <tr><td colspan="6" class="sec-hdr">VII. LEARNING AND DEVELOPMENT (L&amp;D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED</td></tr>
    <tr>
      <th class="lbl" style="width:35%">30. TITLE OF LEARNING AND DEVELOPMENT INTERVENTIONS / TRAINING PROGRAMS (Write in full)</th>
      <th class="lbl" style="width:11%;text-align:center">From</th>
      <th class="lbl" style="width:11%;text-align:center">To</th>
      <th class="lbl" style="width:9%;text-align:center">NUMBER OF HOURS</th>
      <th class="lbl" style="width:12%;text-align:center">Type of L&amp;D (Managerial/Supervisory/Technical/etc)</th>
      <th class="lbl" style="width:22%">CONDUCTED / SPONSORED BY (Write in full)</th>
    </tr>
    ${tr.map(t=>`
    <tr style="height:20px">
      <td class="val val-sm">${v(t.title)}</td>
      <td class="val val-sm" style="text-align:center">${fd(t.from)||v(t.from)}</td>
      <td class="val val-sm" style="text-align:center">${fd(t.to)||v(t.to)}</td>
      <td class="val val-sm" style="text-align:center">${v(t.hours)}</td>
      <td class="val val-sm" style="text-align:center">${v(t.type)}</td>
      <td class="val val-sm">${v(t.conductedBy)}</td>
    </tr>`).join('')}
    ${Array.from({length:Math.max(0,15-tr.length)},()=>`<tr style="height:20px"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
  </table>

  <!-- VIII. OTHER INFO -->
  <table>
    <tr><td colspan="3" class="sec-hdr">VIII. OTHER INFORMATION</td></tr>
    <tr>
      <th class="lbl" style="width:33%">31. SPECIAL SKILLS and HOBBIES</th>
      <th class="lbl" style="width:34%">32. NON-ACADEMIC DISTINCTIONS / RECOGNITION (Write in full)</th>
      <th class="lbl" style="width:33%">33. MEMBERSHIP IN ASSOCIATION/ORGANIZATION (Write in full)</th>
    </tr>
    ${(()=>{
      const skillLines=((e.otherInfo||{}).skills||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
      const distLines=((e.otherInfo||{}).distinctions||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
      const membLines=((e.otherInfo||{}).memberships||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
      const max=Math.max(5,skillLines.length,distLines.length,membLines.length);
      return Array.from({length:max},(_,i)=>`<tr style="height:18px">
        <td class="val val-sm">${skillLines[i]?v(skillLines[i]):''}&nbsp;</td>
        <td class="val val-sm">${distLines[i]?v(distLines[i]):''}&nbsp;</td>
        <td class="val val-sm">${membLines[i]?v(membLines[i]):''}&nbsp;</td>
      </tr>`).join('');
    })()}
  </table>

  <!-- Signature page 3 -->
  <table style="margin-top:2px">
    <tr>
      <td style="width:20%;text-align:center" class="lbl"><b>SIGNATURE</b></td>
      <td style="width:55%;text-align:center;font-size:6.5pt;color:#555">(wet signature/e-signature/digital certificate)</td>
      <td style="width:10%;text-align:center" class="lbl"><b>DATE</b></td>
      <td style="width:15%;text-align:center" class="val">${v(e.dateAccomplished)}</td>
    </tr>
  </table>
  <div style="font-size:5.5pt;text-align:right;margin-top:2px">CS FORM 212 (Revised 2025), Page 3 of 4</div>
</div>

<!-- ═══════════════════════ PAGE 4 ═══════════════════════ -->
<div class="page">
  <!-- Declarations -->
  <table style="margin-bottom:2px">
    <tr><td colspan="2" class="sec-hdr">IX. QUESTIONS / DECLARATIONS</td></tr>

    ${[
      ['34. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed,<br>a. within the third degree?', 'q34a', null],
      ['&nbsp;&nbsp;&nbsp;b. within the fourth degree (for Local Government Unit - Career Employees)?', 'q34b', 'q34det'],
      ['35. a. Have you ever been found guilty of any administrative offense?', 'q35a', 'q35aDet'],
      ['&nbsp;&nbsp;&nbsp;b. Have you been criminally charged before any court?', 'q35b', 'q35bDet'],
      ['36. Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?', 'q36', 'q36Det'],
      ['37. Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?', 'q37', 'q37Det'],
      ['38. a. Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?', 'q38a', 'q38aDet'],
      ['&nbsp;&nbsp;&nbsp;b. Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?', 'q38b', 'q38bDet'],
      ['39. Have you acquired the status of an immigrant or permanent resident of another country?', 'q39', 'q39Det'],
      ['40. Pursuant to: (a) Indigenous People\'s Act (RA 8371); (b) Magna Carta for Disabled Persons (RA 7277, as amended); and (c) Expanded Solo Parents Welfare Act (RA 11861), please answer the following items:<br>a. Are you a member of any indigenous group?', 'q40a', 'q40aSpec'],
      ['&nbsp;&nbsp;&nbsp;b. Are you a person with disability?', 'q40b', 'q40bId'],
      ['&nbsp;&nbsp;&nbsp;c. Are you a solo parent?', 'q40c', 'q40cId'],
    ].map(([lbl,qk,detK])=>{
      const val = q[qk];
      const yes = val===true||val==='Y'||val==='Yes';
      const detVal = detK ? v(q[detK]) : '';
      return `<tr>
        <td style="font-size:7pt;padding:2px 4px;width:72%">${lbl}${detVal?`<div style="color:#800;font-size:6.5pt;margin-top:1px">If YES: ${detVal}</div>`:''}</td>
        <td style="width:28%;text-align:center;vertical-align:middle">
          <div style="display:inline-flex;gap:8px;align-items:center;font-size:7pt">
            ${box(yes)} <b>YES</b> &nbsp; ${box(!yes)} <b>NO</b>
          </div>
        </td>
      </tr>`;
    }).join('')}
  </table>

  <!-- References -->
  <table style="margin-bottom:2px">
    <tr><td colspan="3" class="sec-hdr">41. REFERENCES (Person not related by consanguinity or affinity to applicant/appointee)</td></tr>
    <tr>
      <th class="lbl" style="width:40%">NAME</th>
      <th class="lbl" style="width:35%">OFFICE / RESIDENTIAL ADDRESS</th>
      <th class="lbl" style="width:25%">CONTACT NO. AND/OR EMAIL</th>
    </tr>
    ${refs.map(r=>`<tr style="height:20px">
      <td class="val val-sm">${v(r.name)}</td>
      <td class="val val-sm">${v(r.address)}</td>
      <td class="val val-sm">${v(r.contact)}</td>
    </tr>`).join('')}
  </table>

  <!-- Declaration oath + Gov't ID + Photo -->
  <table style="margin-bottom:2px">
    <tr>
      <td style="width:60%;vertical-align:top;font-size:6.5pt;padding:3px">
        <b>42.</b> I declare under oath that I have personally accomplished this Personal Data Sheet which is a true, correct, and
        complete statement pursuant to the provisions of pertinent laws, rules, and regulations of the Republic of the
        Philippines. I authorize the agency head/authorized representative to verify/validate the contents stated herein.
        I agree that any misrepresentation made in this document and its attachments shall cause the filing of
        administrative/criminal case/s against me.
        <br><br>
        <table style="margin-top:6px">
          <tr>
            <td style="width:50%;border:none">
              <div style="font-size:6.5pt;margin-bottom:2px">Government Issued ID (i.e. Passport, GSIS, SSS, PRC, Driver's License, etc.)</div>
              <div style="font-size:6pt;margin-bottom:2px;font-style:italic">PLEASE INDICATE ID Number and Date of Issuance</div>
              <table>
                <tr><td class="lbl" style="width:110px">Government Issued ID:</td><td class="val val-sm">${v(e.govtId)}</td></tr>
                <tr><td class="lbl">ID/License/Passport No.:</td><td class="val val-sm">${v(e.govtIdNo)}</td></tr>
                <tr><td class="lbl">Date/Place of Issuance:</td><td class="val val-sm">${v(e.govtIdIssuance)}</td></tr>
              </table>
            </td>
            <td style="width:50%;border:none;vertical-align:bottom">
              <div style="border:1px solid #555;height:50px;text-align:center;line-height:50px;font-size:6.5pt;color:#888">Signature (Sign inside the box)</div>
              <table style="margin-top:3px">
                <tr><td class="lbl">Date Accomplished:</td><td class="val val-sm">${v(e.dateAccomplished)}</td></tr>
                <tr><td class="lbl">Right Thumbmark:</td><td style="height:28px">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
      <td style="width:40%;text-align:center;vertical-align:top;font-size:6.5pt">
        <div style="border:1px solid #555;width:90px;height:110px;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#888;text-align:center;padding:4px">
          Passport-sized unfiltered digital picture taken within the last 6 months<br>4.5 cm. X 3.5 cm
        </div>
        <b>PHOTO</b>
      </td>
    </tr>
  </table>

  <!-- Subscribed & Sworn -->
  <table>
    <tr>
      <td style="font-size:6.5pt;padding:4px">
        SUBSCRIBED AND SWORN to before me this ___________________________,
        affiant exhibiting his/her validly issued government ID as indicated above.
        <br><br>
        <div style="border:1px solid #555;height:40px;text-align:center;padding-top:10px;font-size:6.5pt;color:#888">(wet signature/e-signature/digital certificate except for notary public)</div>
        <div style="text-align:center;font-size:6.5pt;margin-top:2px">Person Administering Oath</div>
      </td>
    </tr>
  </table>

  <div style="font-size:5.5pt;text-align:right;margin-top:2px">CS FORM 212 (Revised 2025), Page 4 of 4</div>
</div>

</body></html>`;

  w.document.write(html);
  w.document.close();
}


// ══════════ FILL DOCX PDS — fills pds_template.docx directly ══════════
// Uses JSZip to open the uploaded .docx, edits document.xml cells by position,
// then streams the filled .docx back as a download.

async function fillExcelPDS(id) {
  // Alias kept for backward compat with button calls — routes to docx filler
  return fillDocxPDS(id);
}

async function fillDocxPDS(id) {
  const e = employees.find(x => x.id === id);
  if (!e) { toast('Employee not found.', 'error'); return; }
  toast('Generating filled DOCX…', 'success');

  const tr   = empTr(id);
  const pr   = e.personal  || {};
  const fam  = e.family    || {};
  const q    = e.questions || {};
  const refs = (() => {
    const base = (e.references || []).filter(r => r && r.name);
    while (base.length < 3) base.push({name:'',address:'',contact:''});
    return base.slice(0,3);
  })();

  // ── Helpers ──────────────────────────────────────────────────────────────
  function fd(d) {
    if (!d) return '';
    const p = String(d).split('-');
    if (p.length===3 && p[0].length===4) return `${p[2]}/${p[1]}/${p[0]}`;
    return String(d);
  }
  const sv = s => (s||'').toString().trim();

  // Build a minimal <w:r><w:t>TEXT</w:t></w:r> XML string
  function makeRun(text, bold=false, size=16) {
    if (!text) return '';
    const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const rpr = `<w:rPr>`
      + `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`
      + (bold ? `<w:b/>` : '')
      + `<w:sz w:val="${size}"/>`
      + `</w:rPr>`;
    return `<w:r>${rpr}<w:t xml:space="preserve">${escaped}</w:t></w:r>`;
  }

  // Clear all <w:r> runs from the first <w:p> of a cell XML string
  // and inject new run. We work with the raw XML string via regex for speed.
  function setCellText(cellXml, text, bold=false, size=16) {
    if (!text) return cellXml;
    const run = makeRun(text, bold, size);
    // Remove existing runs inside the first paragraph
    return cellXml.replace(/(<w:p\b[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (m, open, inner, close) => {
        // Keep pPr, remove all w:r and w:ins/w:del
        const ppr = (inner.match(/<w:pPr[\s\S]*?<\/w:pPr>/) || [''])[0];
        return `${open}${ppr}${run}${close}`;
      });
  }

  try {
    // ── Load JSZip ────────────────────────────────────────────────────────────
    let JSZip = null;
    try { JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default; } catch {}
    if (!JSZip) JSZip = window.JSZip;
    if (!JSZip) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = () => { JSZip = window.JSZip; res(); };
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    if (!JSZip) throw new Error('JSZip failed to load.');

    // ── Fetch template ────────────────────────────────────────────────────────
    const res = await fetch('pds_template.docx');
    if (!res.ok) throw new Error('Could not load pds_template.docx. Make sure it is deployed alongside the app.');
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    let xml = await zip.file('word/document.xml').async('string');

    // ── Helpers ───────────────────────────────────────────────────────────────
    // Format ISO date → dd/mm/yyyy
    function fd(d) {
      if (!d) return '';
      const p = String(d).split('-');
      return (p.length === 3 && p[0].length === 4) ? `${p[2]}/${p[1]}/${p[0]}` : String(d);
    }
    const sv = s => (s || '').toString().trim();
    const yn = b => (b === true || b === 'Yes' || b === 'Y') ? 'YES' : 'NO';

    // Inject text into a cell's first paragraph, preserving paragraph properties
    function setCellText(cellXml, text) {
      if (!text) return cellXml;
      const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const run = `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
      return cellXml.replace(/(<w:p\b[^>]*>)([\s\S]*?)(<\/w:p>)/, (m, open, inner, close) => {
        const ppr = (inner.match(/<w:pPr[\s\S]*?<\/w:pPr>/) || [''])[0];
        return `${open}${ppr}${run}${close}`;
      });
    }

    // ── Parse tables ──────────────────────────────────────────────────────────
    function parseTables(rawXml) {
      const tables = [];
      const tblRx = /<w:tbl[\s\S]*?<\/w:tbl>/g;
      let m;
      while ((m = tblRx.exec(rawXml)) !== null) {
        const rows = [];
        const rowRx = /<w:tr\b[\s\S]*?<\/w:tr>/g;
        let rm;
        while ((rm = rowRx.exec(m[0])) !== null) {
          const cells = [];
          const cellRx = /<w:tc\b[\s\S]*?<\/w:tc>/g;
          let cm;
          while ((cm = cellRx.exec(rm[0])) !== null) cells.push(cm[0]);
          rows.push({ xml: rm[0], cells });
        }
        tables.push({ xml: m[0], rows, start: m.index, end: m.index + m[0].length });
      }
      return tables;
    }

    const tables = parseTables(xml);
    if (tables.length < 4) throw new Error(`Template has ${tables.length} table(s); expected 4 (one per page).`);

    // fill(tableIdx, rowIdx, cellIdx, text)
    function fill(ti, ri, ci, text) {
      if (!sv(text)) return;
      const tbl = tables[ti]; if (!tbl) return;
      const row = tbl.rows[ri]; if (!row) return;
      const cell = row.cells[ci]; if (cell === undefined) return;
      row.cells[ci] = setCellText(cell, sv(text));
    }

    // Rebuild each table's XML from its (mutated) cells
    function rebuildTbl(tbl) {
      let out = tbl.xml;
      for (const row of tbl.rows) {
        const trPr = (row.xml.match(/<w:trPr[\s\S]*?<\/w:trPr>/) || [''])[0];
        const openTag = row.xml.match(/^<w:tr\b[^>]*>/)[0];
        const newRow = `${openTag}${trPr}${row.cells.join('')}</w:tr>`;
        out = out.replace(row.xml, newRow);
      }
      return out;
    }

    // ── TABLE 0 — Page 1: Personal Info + Family + Education ─────────────────
    // Verified cell map from actual template structure:
    // R03(2c): [label | SURNAME entry]
    // R04(3c): [FIRST NAME entry | MIDDLE NAME entry | NAME EXT label]  — EXT entry is in R04c2
    // R05(2c): [MIDDLE NAME entry | blank]
    // R06(5c): [DOB label | DOB entry | CITIZENSHIP label | Filipino chk | Dual chk]
    // R07(5c): [POB label | POB entry | blank | blank | blank]
    // R08(4c): [SEX label | Male/Female | blank | blank]
    // R09(4c): [CIVIL STATUS label | Single/Married/etc | RESIDENTIAL ADDR+ZIP label | ZIP entry]
    // R10(5c): [blank | blank | blank | House/Block label | Street label]
    // R11(4c): [blank | blank | blank | blank] ← House entry | Street entry
    // R12(5c): [blank | blank | blank | Subdiv label | Barangay label]
    // R13(4c): [HEIGHT label | HEIGHT entry | blank | blank] ← Subdiv entry | Brgy entry
    // R14(5c): [blank | blank | blank | City label | Province label]
    // R15(4c): [WEIGHT label | WEIGHT entry | blank | blank] ← City entry | Prov entry
    // R16(4c): [BLOOD label | BLOOD entry | PERMANENT ADDR+ZIP label | ZIP entry]
    // R17(5c): [blank | blank | blank | House/Block label | Street label]
    // R18(4c): [UMID label | UMID entry | blank | blank] ← Perm House | Perm Street
    // R19(5c): [blank | blank | blank | Subdiv label | Barangay label]
    // R20(4c): [PAG-IBIG label | PAG-IBIG entry | blank | blank] ← Perm Subdiv | Perm Brgy
    // R21(5c): [blank | blank | blank | City label | Province label]
    // R22(4c): [PHILHEALTH label | PHILHEALTH entry | blank | blank] ← Perm City | Perm Prov
    // R23(4c): [PhilSys label | PhilSys entry | TEL label | TEL entry]
    // R24(4c): [TIN label | TIN entry | MOBILE label | MOBILE entry]
    // R25(4c): [AGENCY NO label | AGENCY NO entry | EMAIL label | EMAIL entry]
    // R27(4c): [SPOUSE SURNAME/FIRST/MIDDLE labels | SPOUSE entry | CHILDREN NAME header | DOB header]
    // R28(5c): [blank | blank | NAME EXT label | blank | blank]
    // R29(4c): [blank | SPOUSE MIDDLE entry | blank | blank]  ← children row
    // R30(4c): [OCCUPATION label | OCC entry | blank | blank]
    // R31(4c): [EMPLOYER label | EMP entry | blank | blank]
    // R32(4c): [BUSINESS ADDR label | BUS entry | blank | blank]
    // R33(4c): [TELEPHONE label | TEL entry | blank | blank]
    // R34(4c): [FATHER SURNAME/FIRST/MIDDLE labels | FATHER SURNAME entry | blank | blank]
    // R35(5c): [blank | FATHER FIRST entry | NAME EXT label | FATHER EXT entry | blank]
    // R36(4c): [blank | FATHER MIDDLE entry | blank | blank]
    // R37(3c): [MOTHER label | MOTHER SURNAME entry | blank]
    // R38(4c): [SURNAME/FIRST/MIDDLE labels | MOTHER FIRST entry | blank | blank]
    // R39(4c): [blank | MOTHER MIDDLE entry | blank | blank]
    // R44(8c): [ELEMENTARY | school | course | from | to | units | yearGrad | honors]
    // R45(8c): [SECONDARY | ...]
    // R46(8c): [VOCATIONAL | ...]
    // R47(8c): [COLLEGE | ...]
    // R48(8c): [GRADUATE | ...]

    // Personal info
    fill(0, 3,  1, sv(pr.surname).toUpperCase());
    fill(0, 4,  0, sv(pr.firstName).toUpperCase());
    fill(0, 5,  0, sv(pr.middleName).toUpperCase());
    fill(0, 4,  2, sv(pr.nameExt));   // NAME EXTENSION label is R04c2; entry fills same cell area
    fill(0, 6,  1, fd(pr.dob));
    fill(0, 6,  3, pr.dualCitizenship ? '' : 'Filipino ✓');
    fill(0, 6,  4, pr.dualCitizenship ? `Dual ✓ — ${sv(pr.dualCountry)}` : '');
    fill(0, 7,  1, sv(pr.pob));
    fill(0, 8,  1, sv(pr.sex));
    fill(0, 9,  1, sv(pr.civil));
    fill(0, 9,  3, sv(pr.residZip));

    // Height / Weight / Blood (left col, rows 13/15/16)
    fill(0, 13, 1, sv(pr.height));
    fill(0, 15, 1, sv(pr.weight));
    fill(0, 16, 1, sv(pr.blood));

    // Residential address
    // R10(5c): labels [blank|blank|blank|House/Block|Street]
    // R11(4c): data   [blank|blank|blank|house entry] — street merges rightward
    fill(0, 11, 3, sv(pr.residHouseNo) + (pr.residStreet ? ', ' + sv(pr.residStreet) : ''));
    // R12(5c): labels [blank|blank|blank|Subdiv|Barangay]
    // R13(4c): data (HEIGHT row) — right side has subdiv/brgy
    fill(0, 13, 2, sv(pr.residSubdiv));
    fill(0, 13, 3, sv(pr.residBrgy));
    // R14(5c): labels [blank|blank|blank|City|Province]
    // R15(4c): data (WEIGHT row) — right side has city/prov
    fill(0, 15, 2, sv(pr.residCity));
    fill(0, 15, 3, sv(pr.residProv));

    // Permanent address
    fill(0, 16, 3, sv(pr.permZip));
    // R17(5c): labels [blank|blank|blank|House|Street]
    // R18(4c): data (UMID row) — right side has perm house/street
    fill(0, 18, 2, sv(pr.permHouseNo) + (pr.permStreet ? ', ' + sv(pr.permStreet) : ''));
    // R19(5c): labels → R20(4c): data (PAGIBIG row)
    fill(0, 20, 2, sv(pr.permSubdiv));
    fill(0, 20, 3, sv(pr.permBrgy));
    // R21(5c): labels → R22(4c): data (PHILHEALTH row)
    fill(0, 22, 2, sv(pr.permCity));
    fill(0, 22, 3, sv(pr.permProv));

    // IDs (left column)
    fill(0, 18, 1, sv(pr.umid));
    fill(0, 20, 1, sv(pr.pagibig));
    fill(0, 22, 1, sv(pr.philhealth));
    fill(0, 23, 1, sv(pr.philsys));
    fill(0, 24, 1, sv(pr.tin));
    fill(0, 25, 1, sv(pr.agencyNo));

    // Contact (right column)
    fill(0, 23, 3, sv(pr.telNo));
    fill(0, 24, 3, sv(pr.mobileNo));
    fill(0, 25, 3, sv(pr.email));

    // Family — Spouse (R27–R33)
    // R27: c0=labels, c1=Surname entry, c2=Children Name header, c3=DOB header
    fill(0, 27, 1, sv(fam.spouseSurname).toUpperCase());
    fill(0, 28, 1, sv(fam.spouseFirstName).toUpperCase());
    fill(0, 28, 3, sv(fam.spouseExt));
    fill(0, 29, 1, sv(fam.spouseMiddleName).toUpperCase());
    fill(0, 30, 1, sv(fam.spouseOccupation));
    fill(0, 31, 1, sv(fam.spouseEmployer));
    fill(0, 32, 1, sv(fam.spouseBusiness));
    fill(0, 33, 1, sv(fam.spouseTel));

    // Children (right side of R27–R39, c2=name, c3=dob)
    (fam.children || []).slice(0, 11).forEach((ch, i) => {
      const row = tables[0].rows[27 + i]; if (!row) return;
      const n = row.cells.length;
      if (n >= 4) {
        row.cells[n-2] = setCellText(row.cells[n-2], sv(ch.name));
        row.cells[n-1] = setCellText(row.cells[n-1], fd(ch.dob));
      }
    });

    // Father (R34–R36)
    fill(0, 34, 1, sv(fam.fatherSurname).toUpperCase());
    fill(0, 35, 1, sv(fam.fatherFirstName).toUpperCase());
    fill(0, 35, 3, sv(fam.fatherExt));
    fill(0, 36, 1, sv(fam.fatherMiddleName).toUpperCase());

    // Mother (R37–R39)
    fill(0, 37, 1, sv(fam.motherSurname).toUpperCase());
    fill(0, 38, 1, sv(fam.motherFirstName).toUpperCase());
    fill(0, 39, 1, sv(fam.motherMiddleName).toUpperCase());

    // Education (R44–R48: 8 cells each: [level | school | course | from | to | units | yearGrad | honors])
    [['elementary',44],['secondary',45],['vocational',46],['college',47],['graduate',48]].forEach(([lvl, ri]) => {
      const ed = (e.education||[]).find(x => (x.level||'').toLowerCase().startsWith(lvl));
      if (!ed) return;
      fill(0, ri, 1, sv(ed.school));
      fill(0, ri, 2, sv(ed.course));
      fill(0, ri, 3, sv(ed.from));
      fill(0, ri, 4, sv(ed.to));
      fill(0, ri, 5, sv(ed.units));
      fill(0, ri, 6, sv(ed.yearGrad));
      fill(0, ri, 7, sv(ed.honors));
    });

    // ── TABLE 1 — Page 2: Eligibility + Work Experience ──────────────────────
    // R00: section header
    // R01(5c): header row — [eligibility name | rating | date | place | license]
    // R02(6c): sub-header — [...| | | | NUMBER | Valid Until]
    // R03–R09(6c): data rows — [name | rating | date | place | licNo | licValid]
    // R11: WORK EXPERIENCE header
    // R12(5c): WE header row
    // R13(6c): From | To | (position spans cols 2-3) | (dept spans) | status | govtSvc
    // R14–R41(6c): data rows — [from | to | position | dept | status | govtSvc]

    (e.eligibility||[]).slice(0, 7).forEach((el, i) => {
      fill(1, 3+i, 0, sv(el.name));
      fill(1, 3+i, 1, sv(el.rating));
      fill(1, 3+i, 2, fd(el.dateConf) || sv(el.dateConf));
      fill(1, 3+i, 3, sv(el.place));
      fill(1, 3+i, 4, sv(el.licNo));
      fill(1, 3+i, 5, sv(el.licValid));
    });

    (e.workExp||[]).slice(0, 28).forEach((wk, i) => {
      const ri = 14 + i;
      fill(1, ri, 0, fd(wk.from) || sv(wk.from));
      fill(1, ri, 1, wk.to === 'Present' ? 'Present' : fd(wk.to) || sv(wk.to));
      fill(1, ri, 2, sv(wk.position));
      fill(1, ri, 3, sv(wk.dept));
      fill(1, ri, 4, sv(wk.status));
      const gs = wk.govtService;
      fill(1, ri, 5, (gs==='Yes'||gs===true||gs==='Y') ? 'Y' : (gs==='No'||gs===false||gs==='N') ? 'N' : sv(gs));
    });

    // ── TABLE 2 — Page 3: Voluntary Work + L&D Training + Other Info ─────────
    // R00: section header
    // R01(4c): header — [org | inclusive dates | hours | position]
    // R02(5c): sub-header — [blank | From | To | blank | blank]
    // R03–R09(5c): data — [org | from | to | hours | position]
    // R11: L&D header
    // R12(5c): L&D header row
    // R13(6c): sub-header — [blank | From | To | blank | blank | blank]
    // R14–R34(6c): data — [title | from | to | hours | type | conductedBy]
    // R36: OTHER INFO section
    // R37(3c): column headers
    // R38–R44(3c): data — [skills | distinctions | memberships]

    (e.voluntaryWork||[]).slice(0, 7).forEach((vw, i) => {
      fill(2, 3+i, 0, sv(vw.org || vw.name || ''));
      fill(2, 3+i, 1, fd(vw.from) || sv(vw.from));
      fill(2, 3+i, 2, fd(vw.to)   || sv(vw.to));
      fill(2, 3+i, 3, sv(vw.hours));
      fill(2, 3+i, 4, sv(vw.position));
    });

    tr.slice(0, 21).forEach((t, i) => {
      fill(2, 14+i, 0, sv(t.title));
      fill(2, 14+i, 1, fd(t.from) || sv(t.from));
      fill(2, 14+i, 2, fd(t.to)   || sv(t.to));
      fill(2, 14+i, 3, sv(t.hours));
      fill(2, 14+i, 4, sv(t.type));
      fill(2, 14+i, 5, sv(t.conductedBy));
    });

    const oi = e.otherInfo || {};
    const skills = (oi.skills||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const dists  = (oi.distinctions||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const membs  = (oi.memberships||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    for (let i = 0; i < Math.min(Math.max(skills.length, dists.length, membs.length, 1), 7); i++) {
      if (skills[i]) fill(2, 38+i, 0, skills[i]);
      if (dists[i])  fill(2, 38+i, 1, dists[i]);
      if (membs[i])  fill(2, 38+i, 2, membs[i]);
    }

    // ── TABLE 3 — Page 4: Declarations + References + Gov't ID ───────────────
    // R00(2c): Q34 — [question | YES/NO + details]
    // R01(2c): Q35a
    // R02(2c): Q35b (criminally charged)
    // R03(2c): Q36
    // R04(2c): Q37
    // R05(2c): Q38 (a+b combined)
    // R06(2c): Q39
    // R07(3c): Q40 (a+b+c)
    // R08(3c): Q40 details continuation
    // R09(2c): REFERENCES section header + photo box
    // R10(4c): References column headers — [NAME | ADDRESS | CONTACT | blank]
    // R11–R13(4c): reference data rows
    // R14(2c): Declaration oath
    // R17(7c): Gov't ID section
    // R18(7c): Government Issued ID: [blank | label | ID entry | ...]
    // R19(7c): ID/License/Passport No.: [blank | label | entry | ...]
    // R21(7c): Date/Place of Issuance: [blank | label | entry | ...]
    // R22(7c): Date Accomplished row

    // YES/NO answers go in cell index 1 (right column) of each declaration row
    const declFill = (ri, val, detail) => {
      fill(3, ri, 1, yn(val) + (detail ? ` — ${sv(detail)}` : ''));
    };
    declFill(0, q.q34a || q.q34b, q.q34det);
    declFill(1, q.q35a, q.q35aDet);
    declFill(2, q.q35b, q.q35bDet);
    declFill(3, q.q36,  q.q36Det);
    declFill(4, q.q37,  q.q37Det);
    declFill(5, q.q38a || q.q38b, (q.q38aDet || q.q38bDet));
    declFill(6, q.q39,  q.q39Det);
    // Q40 (row 7 has 3 cells)
    fill(3, 7, 1,
      `40a: ${yn(q.q40a)}${q.q40aSpec?' ('+q.q40aSpec+')':''} | ` +
      `40b: ${yn(q.q40b)}${q.q40bId?' ID:'+q.q40bId:''} | ` +
      `40c: ${yn(q.q40c)}${q.q40cId?' ID:'+q.q40cId:''}`
    );

    // References (R11–R13, 4 cells each)
    refs.forEach((ref, i) => {
      fill(3, 11+i, 0, sv(ref.name));
      fill(3, 11+i, 1, sv(ref.address));
      fill(3, 11+i, 2, sv(ref.contact));
    });

    // Gov't ID (R18–R22)
    fill(3, 18, 2, sv(e.govtId));
    fill(3, 19, 2, sv(e.govtIdNo));
    fill(3, 21, 2, sv(e.govtIdIssuance));
    fill(3, 22, 4, sv(e.dateAccomplished));

    // ── Rebuild + download ────────────────────────────────────────────────────
    let newXml = xml;
    for (let i = tables.length - 1; i >= 0; i--) {
      const tbl = tables[i];
      newXml = newXml.slice(0, tbl.start) + rebuildTbl(tbl) + newXml.slice(tbl.end);
    }
    zip.file('word/document.xml', newXml);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `PDS_${sv(pr.surname).toUpperCase()}_${sv(pr.firstName).toUpperCase()}_CS212_2025.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast('DOCX downloaded! Open in MS Word or LibreOffice. ✓', 'success');

  } catch (err) {
    console.error('DOCX fill error:', err);
    toast('DOCX error: ' + err.message, 'error');
  }
}

// ══════════ AI SMART IMPORT ══════════
function openSmartImport() {
  // Remove existing modal if any
  const existing = document.getElementById('smartImportModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'smartImportModal';
  modal.innerHTML = `
    <div class="sim-backdrop" onclick="closeSmartImport()"></div>
    <div class="sim-box">
      <div class="sim-hdr">
        <div>
          <div class="sim-title">🤖 AI Smart Import</div>
          <div class="sim-sub">Upload a document image — the AI will auto-fill your PDS form</div>
        </div>
        <button class="sim-close" onclick="closeSmartImport()">✕</button>
      </div>
      <div class="sim-body">
        <div class="sim-tip">
          <b>📌 Accepts:</b> Passport, Driver's License, Old PDS, Birth Certificate, UMID, PhilSys ID, DFA form, or any government ID image
        </div>
        <div class="sim-drop" id="simDrop" onclick="document.getElementById('simFileInput').click()" ondragover="event.preventDefault();this.classList.add('sim-drop-hover')" ondragleave="this.classList.remove('sim-drop-hover')" ondrop="simHandleDrop(event)">
          <div class="sim-drop-icon">📄</div>
          <div class="sim-drop-text">Click to upload or drag & drop</div>
          <div class="sim-drop-sub">Supports JPG, PNG, PDF (first page) · Max 10MB</div>
        </div>
        <input type="file" id="simFileInput" accept="image/*,.pdf" style="display:none" onchange="simHandleFile(this.files[0])">
        <div id="simPreviewWrap" style="display:none;margin-top:12px;text-align:center">
          <img id="simPreview" style="max-height:220px;max-width:100%;border-radius:8px;border:1px solid var(--border);display:block;margin:0 auto">
          <div id="simFileName" style="font-size:11px;color:var(--text-muted);margin-top:8px"></div>
        </div>
        <div id="simStatus" style="display:none"></div>
        <div id="simResults" style="display:none"></div>
      </div>
      <div class="sim-footer">
        <button class="btn btn-outline" onclick="closeSmartImport()">Cancel</button>
        <button class="btn btn-primary" id="simExtractBtn" onclick="runSmartImport()" disabled style="opacity:.5">🔍 Extract &amp; Fill</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeSmartImport() {
  const m = document.getElementById('smartImportModal');
  if (m) m.remove();
}

let simFileData = null; // base64 data
let simFileType = null;

function simHandleDrop(e) {
  e.preventDefault();
  document.getElementById('simDrop').classList.remove('sim-drop-hover');
  const file = e.dataTransfer.files[0];
  if (file) simHandleFile(file);
}

let _simPdfDoc = null; // holds loaded PDF for page switching

async function simHandleFile(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) { alert('File is too large. Please use an image under 15MB.'); return; }

  const statusEl = document.getElementById('simStatus');
  const previewWrap = document.getElementById('simPreviewWrap');
  const previewImg = document.getElementById('simPreview');
  const fileNameEl = document.getElementById('simFileName');

  simFileData = null; simFileType = null; _simPdfDoc = null;
  const btn = document.getElementById('simExtractBtn');
  btn.disabled = true; btn.style.opacity = '.5';
  document.getElementById('simResults').style.display = 'none';

  if (file.type === 'application/pdf') {
    statusEl.style.display = 'block';
    statusEl.className = 'sim-status-loading';
    statusEl.innerHTML = '<span class="sim-spinner"></span> Loading PDF…';
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const arrayBuf = await file.arrayBuffer();
      _simPdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const totalPages = _simPdfDoc.numPages;
      statusEl.style.display = 'none';

      // Build page-picker UI
      previewWrap.style.display = 'block';
      previewImg.style.display = '';
      fileNameEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:6px">
          <span style="font-weight:600;color:var(--text)">${esc(file.name)}</span>
          <span style="color:var(--text-muted)">(${totalPages} page${totalPages>1?'s':''})</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--text-muted)">Select page with your data:</span>
          ${Array.from({length:totalPages},(_,i)=>`<button class="btn btn-sm btn-outline" id="simPgBtn${i+1}" onclick="simRenderPage(${i+1},${totalPages})">${i+1}</button>`).join('')}
        </div>`;

      // Auto-render page 1 to start
      await simRenderPage(1, totalPages);
    } catch(err) {
      statusEl.style.display = 'block';
      statusEl.className = 'sim-status-err';
      statusEl.innerHTML = '⚠ Could not load PDF: ' + esc(err.message) + '. Try exporting as JPG or PNG instead.';
    }
  } else {
    simFileType = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = (ev) => {
      simFileData = ev.target.result.split(',')[1];
      previewImg.src = ev.target.result; previewImg.style.display = '';
      previewWrap.style.display = 'block';
      fileNameEl.innerHTML = `<span style="color:var(--text-muted)">${esc(file.name)} (${(file.size/1024).toFixed(1)} KB)</span>`;
      btn.disabled = false; btn.style.opacity = '1';
      document.getElementById('simStatus').style.display = 'none';
      document.getElementById('simResults').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

async function simRenderPage(pageNum, totalPages) {
  if (!_simPdfDoc) return;
  const previewImg = document.getElementById('simPreview');
  const btn = document.getElementById('simExtractBtn');
  const statusEl = document.getElementById('simStatus');

  // Highlight active page button
  for (let i = 1; i <= totalPages; i++) {
    const pb = document.getElementById('simPgBtn' + i);
    if (pb) { pb.className = i === pageNum ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'; }
  }

  statusEl.style.display = 'block';
  statusEl.className = 'sim-status-loading';
  statusEl.innerHTML = `<span class="sim-spinner"></span> Rendering page ${pageNum} of ${totalPages}…`;
  btn.disabled = true; btn.style.opacity = '.5';
  document.getElementById('simResults').style.display = 'none';

  try {
    const page = await _simPdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.2 }); // high resolution
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
    simFileData = dataUrl.split(',')[1];
    simFileType = 'image/jpeg';
    previewImg.src = dataUrl;
    statusEl.style.display = 'none';
    btn.disabled = false; btn.style.opacity = '1';
  } catch(err) {
    statusEl.className = 'sim-status-err';
    statusEl.innerHTML = '⚠ Could not render page ' + pageNum + ': ' + esc(err.message);
  }
}

async function runSmartImport() {
  if (!simFileData) return;
  const btn = document.getElementById('simExtractBtn');
  const statusEl = document.getElementById('simStatus');
  const resultsEl = document.getElementById('simResults');
  btn.disabled = true; btn.style.opacity = '.5'; btn.textContent = '⏳ Extracting…';
  statusEl.style.display = 'block';
  statusEl.className = 'sim-status-loading';
  statusEl.innerHTML = '<span class="sim-spinner"></span> AI is reading your document… this may take a few seconds.';
  resultsEl.style.display = 'none';

  const mediaType = (simFileType && simFileType.startsWith('image/')) ? simFileType : 'image/jpeg';

  try {
    // Get API key — prompt once per session, then cache in sessionStorage
    let apiKey = sessionStorage.getItem('pds_ai_key') || '';
    if (!apiKey) {
      apiKey = (prompt('Enter your Anthropic API key to use AI Smart Import.\n\nGet a free key at: console.anthropic.com\n(Stored in this browser tab only — never sent anywhere except Anthropic)') || '').trim();
      if (!apiKey) { btn.textContent = '🔍 Extract & Fill'; btn.disabled = false; btn.style.opacity = '1'; statusEl.style.display = 'none'; return; }
      if (!apiKey.startsWith('sk-ant-')) { throw new Error('That does not look like a valid Anthropic API key (should start with sk-ant-). Please try again.'); }
      sessionStorage.setItem('pds_ai_key', apiKey);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: simFileData } },
            { type: 'text', text: 'Extract all personal data from this Philippine government document or ID. Return ONLY valid JSON, no markdown, no explanation. Use "" for missing fields. Keys: {"surname":"","firstName":"","middleName":"","nameExt":"","dob":"","pob":"","sex":"","civil":"","height":"","weight":"","blood":"","citizenship":"","umid":"","pagibig":"","philhealth":"","philsys":"","tin":"","agencyNo":"","mobileNo":"","telNo":"","email":"","residHouseNo":"","residStreet":"","residSubdiv":"","residBrgy":"","residCity":"","residProv":"","residZip":"","permHouseNo":"","permStreet":"","permSubdiv":"","permBrgy":"","permCity":"","permProv":"","permZip":"","department":"","position":"","spouseSurname":"","spouseFirstName":"","spouseMiddleName":"","fatherSurname":"","fatherFirstName":"","fatherMiddleName":"","motherSurname":"","motherFirstName":"","motherMiddleName":"","govtId":"","govtIdNo":"","govtIdIssuance":""}. Use YYYY-MM-DD for dob. JSON only.' }
          ]
        }]
      })
    });

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem('pds_ai_key');
      throw new Error('Invalid API key. Please try again with a valid key from console.anthropic.com');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Extraction failed (HTTP ' + response.status + ')');
    }

    const rawText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    let extracted;
    try {
      extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      throw new Error('AI returned unreadable data. Please try a clearer image.');
    }
    if (!extracted) throw new Error('No data returned from AI.');

    // Count filled fields
    const filled = Object.values(extracted).filter(v => v && v.toString().trim() !== '').length;
    if (filled === 0) throw new Error('No data could be extracted. Please upload a clearer image of your document.');

    window._simExtracted = extracted;

    // Build preview table
    const fieldLabels = {
      surname:'Surname', firstName:'First Name', middleName:'Middle Name', nameExt:'Extension',
      dob:'Date of Birth', pob:'Place of Birth', sex:'Sex', civil:'Civil Status',
      height:'Height (m)', weight:'Weight (kg)', blood:'Blood Type', citizenship:'Citizenship',
      umid:'UMID', pagibig:'Pag-IBIG', philhealth:'PhilHealth', philsys:'PhilSys (PSN)',
      tin:'TIN', agencyNo:'Agency Employee No.',
      mobileNo:'Mobile No.', telNo:'Tel No.', email:'Email',
      residHouseNo:'House/Lot No.', residStreet:'Street', residSubdiv:'Subdiv./Village',
      residBrgy:'Barangay', residCity:'City/Municipality', residProv:'Province', residZip:'ZIP',
      permHouseNo:'Perm. House/Lot No.', permStreet:'Perm. Street',
      permBrgy:'Perm. Barangay', permCity:'Perm. City', permProv:'Perm. Province', permZip:'Perm. ZIP',
      department:'Department', position:'Position',
      spouseSurname:"Spouse Surname", spouseFirstName:"Spouse First Name", spouseMiddleName:"Spouse Middle Name",
      fatherSurname:"Father's Surname", fatherFirstName:"Father's First Name", fatherMiddleName:"Father's Middle Name",
      motherSurname:"Mother's Surname", motherFirstName:"Mother's First Name", motherMiddleName:"Mother's Middle Name",
      govtId:'Govt. Issued ID', govtIdNo:'ID/Passport No.', govtIdIssuance:'Date/Place of Issuance'
    };

    const rows = Object.entries(extracted)
      .filter(([,v]) => v && String(v).trim())
      .map(([k,v]) => `<tr>
        <td style="color:var(--text-muted);font-size:10.5px;padding:5px 10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap">${fieldLabels[k]||k}</td>
        <td style="font-weight:600;font-size:12.5px;padding:5px 10px;color:var(--navy)">${esc(String(v))}</td>
      </tr>`).join('');

    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
      <div class="sim-results-hdr">✅ Extracted <b>${filled}</b> fields from your document — review below:</div>
      <div class="sim-results-table-wrap">
        <table class="sim-results-table"><tbody>${rows}</tbody></table>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:12px;font-size:13px;padding:10px" onclick="applySmartImport()">✅ Apply All Fields to PDS Form</button>
    `;
    statusEl.className = 'sim-status-ok';
    statusEl.innerHTML = '✓ Extraction complete — review the fields above, then click Apply.';
    btn.textContent = '🔍 Extract & Fill'; btn.disabled = false; btn.style.opacity = '1';

  } catch(err) {
    statusEl.className = 'sim-status-err';
    statusEl.innerHTML = `<b>⚠ Error:</b> ${esc(err.message || 'Extraction failed. Please try again.')}`;
    btn.textContent = '🔍 Extract & Fill'; btn.disabled = false; btn.style.opacity = '1';
  }
}

function applySmartImport() {
  const d = window._simExtracted;
  if (!d) { toast('No extracted data found. Please run extraction first.', 'error'); return; }

  const p = editingPDS;
  const pr = p.personal;
  const fam = p.family;

  // Personal fields mapping: extractedKey → personal object key
  const personalMap = {
    surname:'surname', firstName:'firstName', middleName:'middleName', nameExt:'nameExt',
    dob:'dob', pob:'pob', sex:'sex', civil:'civil',
    height:'height', weight:'weight', blood:'blood', citizenship:'citizenship',
    umid:'umid', pagibig:'pagibig', philhealth:'philhealth', philsys:'philsys',
    tin:'tin', agencyNo:'agencyNo',
    residHouseNo:'residHouseNo', residStreet:'residStreet', residSubdiv:'residSubdiv',
    residBrgy:'residBrgy', residCity:'residCity', residProv:'residProv', residZip:'residZip',
    permHouseNo:'permHouseNo', permStreet:'permStreet', permSubdiv:'permSubdiv',
    permBrgy:'permBrgy', permCity:'permCity', permProv:'permProv', permZip:'permZip',
    telNo:'telNo', mobileNo:'mobileNo', email:'email'
  };

  let applied = 0;
  Object.entries(personalMap).forEach(([src, dst]) => {
    if (d[src] && String(d[src]).trim()) { pr[dst] = String(d[src]).trim(); applied++; }
  });

  if (d.department && String(d.department).trim()) { p.department = String(d.department).trim(); applied++; }
  if (d.position && String(d.position).trim()) { p.position = String(d.position).trim(); applied++; }

  // Family
  const famMap = {
    spouseSurname:'spouseSurname', spouseFirstName:'spouseFirstName', spouseMiddleName:'spouseMiddleName',
    fatherSurname:'fatherSurname', fatherFirstName:'fatherFirstName', fatherMiddleName:'fatherMiddleName',
    motherSurname:'motherSurname', motherFirstName:'motherFirstName', motherMiddleName:'motherMiddleName'
  };
  Object.entries(famMap).forEach(([src, dst]) => {
    if (d[src] && String(d[src]).trim()) { fam[dst] = String(d[src]).trim(); applied++; }
  });

  // Govt ID
  if (d.govtId) { p.govtId = String(d.govtId).trim(); applied++; }
  if (d.govtIdNo) { p.govtIdNo = String(d.govtIdNo).trim(); applied++; }
  if (d.govtIdIssuance) { p.govtIdIssuance = String(d.govtIdIssuance).trim(); applied++; }

  window._simExtracted = null;
  closeSmartImport();
  activeTab = 0;
  buildPDSForm();
  toast(`✅ ${applied} fields imported from document! Please review and complete any missing info.`, 'success');
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
