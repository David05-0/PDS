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

  const tr  = empTr(id);
  const pr  = e.personal  || {};
  const fam = e.family    || {};
  const q   = e.questions || {};
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
    // Load JSZip
    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')).default
      || window.JSZip
      || (await new Promise(res => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
          s.onload = () => res(window.JSZip);
          document.head.appendChild(s);
        }));

    // Fetch the docx template
    const res = await fetch('pds_template.docx');
    if (!res.ok) throw new Error('Could not load pds_template.docx. Make sure it is deployed with the app.');
    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    // Get document.xml as text
    let xml = await zip.file('word/document.xml').async('string');

    // ── Parse tables: split XML into 4 table chunks ─────────────────────────
    // We'll use a cell accessor that works on the raw XML string via
    // splitting by <w:tbl> and <w:tr> and <w:tc> boundaries.

    const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

    // Split into table blocks
    const tblSplit = xml.split(/<w:tbl(?:\s|>)/);
    // tblSplit[0] = before tables, tblSplit[1..4] = table bodies (without opening tag)
    // We need to reconstruct: work table by table, row by row, cell by cell

    // Build a mutable structure: array of tables, each = array of rows, each = array of cell XML strings
    function parseTables(rawXml) {
      const tables = [];
      const tblRx = /<w:tbl[\s\S]*?<\/w:tbl>/g;
      let tblMatch;
      while ((tblMatch = tblRx.exec(rawXml)) !== null) {
        const tblXml = tblMatch[0];
        const rowRx = /<w:tr\b[\s\S]*?<\/w:tr>/g;
        const rows = [];
        let rowMatch;
        while ((rowMatch = rowRx.exec(tblXml)) !== null) {
          const rowXml = rowMatch[0];
          const cellRx = /<w:tc\b[\s\S]*?<\/w:tc>/g;
          const cells = [];
          let cellMatch;
          while ((cellMatch = cellRx.exec(rowXml)) !== null) {
            cells.push(cellMatch[0]);
          }
          rows.push({ xml: rowXml, cells });
        }
        tables.push({ xml: tblXml, rows, start: tblMatch.index, end: tblMatch.index + tblXml.length });
      }
      return tables;
    }

    const tables = parseTables(xml);
    if (tables.length < 4) throw new Error('Template structure error: expected 4 tables (one per page).');

    // Helper: set text in cell [tableIdx][rowIdx][cellIdx]
    function fill(tIdx, rIdx, cIdx, text, bold=false, size=16) {
      if (!text) return;
      const tbl = tables[tIdx];
      if (!tbl || rIdx >= tbl.rows.length) return;
      const row = tbl.rows[rIdx];
      if (!row || cIdx >= row.cells.length) return;
      const oldCell = row.cells[cIdx];
      row.cells[cIdx] = setCellText(oldCell, sv(text), bold, size);
    }

    // Rebuild a table's XML from mutated cells
    function rebuildTbl(tbl) {
      let out = tbl.xml;
      // Replace each row's original XML with the mutated version
      for (const row of tbl.rows) {
        let newRow = row.xml;
        for (let ci = 0; ci < row.cells.length; ci++) {
          const orig = row.cells[ci]; // already mutated in place
          // rebuild row by splicing cells back — since we mutated row.cells[]
          // we need to compare with original. Simplest: rebuild row from scratch.
        }
        // Actually re-build by replacing cell xmls in the row xml
        // We stored the mutated cell xml directly; reconstruct row from cells
        const cellBlock = row.cells.join('');
        // Extract trPr if any
        const trPr = (row.xml.match(/<w:trPr[\s\S]*?<\/w:trPr>/) || [''])[0];
        // Get the opening tag
        const openTag = row.xml.match(/^<w:tr\b[^>]*>/)[0];
        newRow = `${openTag}${trPr}${cellBlock}</w:tr>`;
        out = out.replace(row.xml, newRow);
      }
      return out;
    }

    // ── PAGE 1 / TABLE 0: Personal Info, Family, Education ──────────────────
    const T = (t,r,c,text,bold=false) => fill(t,r,c,text,bold,16);
    const TB= (t,r,c,text) => fill(t,r,c,text,true,18); // bigger bold for name

    // Row 3 (idx3): Surname in C1
    TB(0, 3, 1, sv(pr.surname).toUpperCase());
    // Row 4 (idx4): First name C0, NameExt C1
    TB(0, 4, 0, sv(pr.firstName).toUpperCase());
    T(0, 4, 1, sv(pr.nameExt));
    // Row 5 (idx5): Middle name C0
    TB(0, 5, 0, sv(pr.middleName).toUpperCase());

    // Row 6 (idx6): DOB in C1
    T(0, 6, 1, fd(pr.dob));
    // Citizenship row 7 C2 blank
    T(0, 7, 2, pr.dualCitizenship ? `Dual Citizenship — ${sv(pr.dualCountry)}` : 'Filipino');

    // Row 7 (idx7): Place of birth C1
    T(0, 7, 1, sv(pr.pob));
    // Row 8 (idx8): Sex C2
    T(0, 8, 2, sv(pr.sex));
    // Row 9 (idx9): Civil status C3, Residential ZIP
    T(0, 9, 3, sv(pr.civil));

    // Residential address (rows 11,12,13,14 — idx10,11,12,13)
    T(0, 11, 3, sv(pr.residHouseNo));
    T(0, 11, 4, sv(pr.residStreet));
    T(0, 12, 3, sv(pr.residSubdiv));
    T(0, 12, 4, sv(pr.residBrgy));
    T(0, 13, 3, sv(pr.residCity));
    T(0, 13, 4, sv(pr.residProv));
    // ZIP for residential goes in row 9 C3 — already filled with civil status above
    // Let's check: R10(idx9)C3 = "17. RESIDENTIAL ADDRESS ZIP CODE" — the ZIP input blank is C3
    // But C3 was set to civil status — check cell map:
    // R10C1=6 CIVIL STATUS, R10C2=Single..., R10C3=17. RESIDENTIAL ADDRESS ZIP CODE, R10C4=blank
    T(0, 9, 3, sv(pr.residZip));  // blank for ZIP in addr section

    // Height/Weight/Blood
    T(0, 13, 1, sv(pr.height));
    T(0, 15, 1, sv(pr.weight));
    T(0, 16, 1, sv(pr.blood));

    // Permanent address
    T(0, 18, 3, sv(pr.permHouseNo));
    T(0, 18, 4, sv(pr.permStreet));
    T(0, 19, 3, sv(pr.permSubdiv));
    T(0, 19, 4, sv(pr.permBrgy));
    T(0, 21, 3, sv(pr.permCity));
    T(0, 21, 4, sv(pr.permProv));
    T(0, 16, 3, sv(pr.permZip));

    // IDs
    T(0, 18, 1, sv(pr.umid));
    T(0, 20, 1, sv(pr.pagibig));
    T(0, 22, 1, sv(pr.philhealth));
    T(0, 23, 1, sv(pr.philsys));
    T(0, 24, 1, sv(pr.tin));
    T(0, 25, 1, sv(pr.agencyNo));

    // Contact
    T(0, 23, 3, sv(pr.telNo));
    T(0, 24, 3, sv(pr.mobileNo));
    T(0, 25, 3, sv(pr.email));

    // Family — Spouse (rows 27-33, idx 27-33)
    T(0, 27, 1, sv(fam.spouseSurname));
    T(0, 28, 1, sv(fam.spouseFirstName));
    T(0, 28, 2, sv(fam.spouseExt));
    T(0, 29, 1, sv(fam.spouseMiddleName));
    T(0, 30, 1, sv(fam.spouseOccupation));
    T(0, 31, 1, sv(fam.spouseEmployer));
    T(0, 32, 1, sv(fam.spouseBusiness));
    T(0, 33, 1, sv(fam.spouseTel));
    // Father (rows 34-36, idx 34-36)
    T(0, 34, 1, sv(fam.fatherSurname));
    T(0, 35, 1, sv(fam.fatherFirstName));
    T(0, 35, 2, sv(fam.fatherExt));
    T(0, 36, 1, sv(fam.fatherMiddleName));
    // Mother (rows 37-40, idx 37-40)
    T(0, 37, 1, sv(fam.motherSurname));
    T(0, 38, 1, sv(fam.motherFirstName));
    T(0, 39, 1, sv(fam.motherMiddleName));

    // Children — right side (last 2 cols of rows 27-40)
    const children = fam.children || [];
    children.slice(0,10).forEach((ch, i) => {
      const r = tables[0].rows[27 + i];
      if (!r) return;
      const n = r.cells.length;
      if (n >= 2) {
        r.cells[n-2] = setCellText(r.cells[n-2], sv(ch.name));
        r.cells[n-1] = setCellText(r.cells[n-1], fd(ch.dob));
      }
    });

    // Education (rows 44-48, idx 44-48) — Elementary/Secondary/Vocational/College/Graduate
    const eduMap = [['elementary',44],['secondary',45],['vocational',46],['college',47],['graduate',48]];
    eduMap.forEach(([lvl, ridx]) => {
      const ed = (e.education||[]).find(x => (x.level||'').toLowerCase().startsWith(lvl));
      if (!ed) return;
      T(0, ridx, 1, sv(ed.school));
      T(0, ridx, 2, sv(ed.course));
      T(0, ridx, 3, fd(ed.from)||sv(ed.from));
      T(0, ridx, 4, fd(ed.to)||sv(ed.to));
      T(0, ridx, 5, sv(ed.units));
      T(0, ridx, 6, sv(ed.yearGrad));
      T(0, ridx, 7, sv(ed.honors));
    });

    // ── PAGE 2 / TABLE 1: Eligibility + Work Experience ─────────────────────
    // Eligibility rows 3-10 (idx 2-9)
    (e.eligibility||[]).slice(0,8).forEach((el, i) => {
      T(1, 2+i, 0, sv(el.name));
      T(1, 2+i, 1, sv(el.rating));
      T(1, 2+i, 2, fd(el.dateConf)||sv(el.dateConf));
      T(1, 2+i, 3, sv(el.place));
      T(1, 2+i, 4, sv(el.licNo));
      T(1, 2+i, 5, sv(el.licValid));
    });

    // Work Experience rows 14-41 (idx 13-40) — header at idx13 has From/To cols
    // Data starts idx 14
    (e.workExp||[]).slice(0,28).forEach((wk, i) => {
      const ridx = 14 + i;
      T(1, ridx, 0, fd(wk.from)||sv(wk.from));
      T(1, ridx, 1, fd(wk.to)||sv(wk.to));
      T(1, ridx, 2, sv(wk.position));
      T(1, ridx, 3, sv(wk.dept));
      T(1, ridx, 4, sv(wk.status));
      const gs = wk.govtService;
      T(1, ridx, 5, (gs==='Yes'||gs===true||gs==='Y') ? 'Y' : (gs==='No'||gs===false||gs==='N') ? 'N' : sv(gs));
    });

    // ── PAGE 3 / TABLE 2: Voluntary Work + Training + Other Info ────────────
    // Voluntary Work rows 3-10 (idx 2-9) — header at idx2 has From/To
    // Data from idx 3
    (e.voluntaryWork||[]).slice(0,7).forEach((vw, i) => {
      const ridx = 3 + i;
      T(2, ridx, 0, sv(vw.org||vw.name||''));
      T(2, ridx, 1, fd(vw.from)||sv(vw.from));
      T(2, ridx, 2, fd(vw.to)||sv(vw.to));
      T(2, ridx, 3, sv(vw.hours));
      T(2, ridx, 4, sv(vw.position));
    });

    // Training rows 14-35 (idx 13-34) — header at idx13
    tr.slice(0,22).forEach((t, i) => {
      const ridx = 14 + i;
      T(2, ridx, 0, sv(t.title));
      T(2, ridx, 1, fd(t.from)||sv(t.from));
      T(2, ridx, 2, fd(t.to)||sv(t.to));
      T(2, ridx, 3, sv(t.hours));
      T(2, ridx, 4, sv(t.type));
      T(2, ridx, 5, sv(t.conductedBy));
    });

    // Other Info rows 38-44 (idx 38-44) — one item per row per column
    const oi = e.otherInfo || {};
    const skills = (oi.skills||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const dists  = (oi.distinctions||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const membs  = (oi.memberships||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
    const maxOI  = Math.max(skills.length, dists.length, membs.length, 1);
    for (let i = 0; i < Math.min(maxOI, 7); i++) {
      if (skills[i]) T(2, 38+i, 0, skills[i]);
      if (dists[i])  T(2, 38+i, 1, dists[i]);
      if (membs[i])  T(2, 38+i, 2, membs[i]);
    }

    // ── PAGE 4 / TABLE 3: Declarations + References + Gov't ID ──────────────
    // Q40 details in blank cells rows 7-8 (idx 7-8)
    if (q.q40aSpec) T(3, 7, 2, `Yes — ${sv(q.q40aSpec)}`);
    if (q.q40bId)   T(3, 8, 2, `Yes — ${sv(q.q40bId)}`);
    if (q.q40cId)   T(3, 8, 2, `Yes — ${sv(q.q40cId)}`);

    // References rows 12-14 (idx 11-13)
    refs.forEach((ref, i) => {
      T(3, 11+i, 0, sv(ref.name));
      T(3, 11+i, 1, sv(ref.address));
      T(3, 11+i, 2, sv(ref.contact));
    });

    // Gov't ID rows 19-23 (idx 18-22)
    T(3, 18, 2, sv(e.govtId));
    T(3, 19, 2, sv(e.govtIdNo));
    T(3, 21, 2, sv(e.govtIdIssuance));
    T(3, 22, 4, sv(e.dateAccomplished));

    // ── Rebuild XML ─────────────────────────────────────────────────────────
    // Replace each original table XML block with rebuilt version
    let newXml = xml;
    // Process in reverse order so string positions don't shift
    for (let i = tables.length-1; i >= 0; i--) {
      const tbl = tables[i];
      const rebuilt = rebuildTbl(tbl);
      newXml = newXml.slice(0, tbl.start) + rebuilt + newXml.slice(tbl.end);
    }

    // Save back into the zip and download
    zip.file('word/document.xml', newXml);
    const outBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

    const url = URL.createObjectURL(outBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `PDS_${sv(pr.surname).toUpperCase()}_${sv(pr.firstName).toUpperCase()}_CS212_2025.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast('DOCX downloaded! Open in MS Word or LibreOffice. ✓', 'success');

  } catch(err) {
    console.error('DOCX fill error:', err);
    toast('DOCX error: ' + err.message, 'error');
  }
}

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
