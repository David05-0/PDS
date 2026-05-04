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
  if (role === 'employee') currentEmpId = currentUser.empId || 'NEW';
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
        <button class="btn btn-sm btn-outline" onclick="printPDS('${e.id}')">🖨 Print</button>
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
    <button class="btn btn-primary" onclick="printPDS('${id}')">🖨 Print PDS</button>
    <button class="btn btn-outline" onclick="editPDS('${id}')">✏ Edit</button>
    ${e.status==='pending' ? `<button class="btn btn-green" onclick="approvePDS('${id}');viewPDS('${id}')">✓ Approve</button><button class="btn btn-red" onclick="rejectPDS('${id}');viewPDS('${id}')">↩ Return</button>` : ''}`;
  const tr = empTr(id);
  const ir = (lbl, val) => `<div class="iitem"><div class="lbl">${lbl}</div><div class="val">${esc(val)||'—'}</div></div>`;
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
  if (!p.id) { p.id = newEmpId(); employees.push(p); }
  else { const i = employees.findIndex(e => e.id === p.id); if (i >= 0) employees[i] = p; }
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
  if (!p.id) { p.id = newEmpId(); employees.push(p); }
  else { const i = employees.findIndex(e => e.id === p.id); if (i >= 0) employees[i] = p; }
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
  if (currentEmpId === 'NEW' || !employees.find(e => e.id === currentEmpId)) {
    const emp = employees.find(e => e.id === currentEmpId);
    if (!emp) {
      content.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No PDS on File</h3><p>Create and submit your Personal Data Sheet to your administrator for review.</p><button class="btn btn-primary" onclick="openMyNew()">+ Create My PDS</button></div>`;
      return;
    }
  }
  const emp = employees.find(e => e.id === currentEmpId);
  if (!emp) { content.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>No PDS on File</h3><p>Create and submit your Personal Data Sheet to your administrator for review.</p><button class="btn btn-primary" onclick="openMyNew()">+ Create My PDS</button></div>`; return; }
  const tr = empTr(emp.id);
  const ir = (lbl, val) => `<div class="iitem"><div class="lbl">${lbl}</div><div class="val">${esc(val)||'—'}</div></div>`;
  const sec = (t, b) => `<div class="vsec"><div class="vsec-title">${t}</div>${b}</div>`;
  const tbl = (hs, rows) => `<table><thead><tr>${hs.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  content.innerHTML = `
    <div class="my-banner">
      <div>
        <div style="font-size:18px;font-weight:700;color:var(--navy)">${esc(emp.personal.surname)}, ${esc(emp.personal.firstName)} ${esc(emp.personal.middleName)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${esc(emp.position)} · ${esc(emp.department)}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        ${sbadge(emp.status)}
        ${emp.status==='rejected' ? '<span style="font-size:12px;padding:6px 12px;border-radius:6px;background:var(--red-light);color:var(--red);font-weight:500">⚠ Returned by Admin. Please update and resubmit.</span>' : ''}
        <button class="btn btn-primary" onclick="openMyEdit('${emp.id}')">✏ Edit &amp; Submit PDS</button>
        <button class="btn btn-outline" onclick="printPDS('${emp.id}')">🖨 Print</button>
      </div>
    </div>
    <div class="pds-view">
      ${sec('I. Personal Information', `<div class="info-grid">
        ${ir('Surname',emp.personal.surname)}${ir('First Name',emp.personal.firstName)}${ir('Middle Name',emp.personal.middleName)}
        ${ir('Date of Birth',emp.personal.dob)}${ir('Place of Birth',emp.personal.pob)}${ir('Sex',emp.personal.sex)}
        ${ir('Civil Status',emp.personal.civil)}${ir('Mobile',emp.personal.mobileNo)}${ir('Email',emp.personal.email)}
      </div>`)}
      ${sec('III. Education', emp.education.length ? tbl(['Level','School','Course','Period','Year Grad','Honors'], emp.education.map(r=>`<tr><td>${esc(r.level)}</td><td>${esc(r.school)}</td><td>${esc(r.course)}</td><td>${esc(r.from)}–${esc(r.to)}</td><td>${esc(r.yearGrad)||'N/A'}</td><td>${esc(r.honors)||'—'}</td></tr>`).join('')) : '<p class="empty-note">No records.</p>')}
      ${sec('V. Work Experience', emp.workExp.length ? tbl(['From','To','Position','Department','Status'], emp.workExp.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td style="font-weight:500">${esc(r.position)}</td><td>${esc(r.dept)}</td><td>${esc(r.status)}</td></tr>`).join('')) : '<p class="empty-note">No records.</p>')}
      ${sec('VII. Training/L&D', tr.length ? tbl(['Title','From','To','Hours','Type','Conducted By'], tr.map(t=>`<tr><td style="font-weight:500">${esc(t.title)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${esc(t.hours)}</td><td><span class="badge badge-tech">${esc(t.type)}</span></td><td>${esc(t.conductedBy)}</td></tr>`).join('')) : '<p class="empty-note">No training records on file yet.</p>')}
      ${sec('VIII. Other Info', `<div class="info-grid">${ir('Skills/Hobbies',emp.otherInfo.skills)}${ir('Distinctions',emp.otherInfo.distinctions)}${ir('Memberships',emp.otherInfo.memberships)}</div>`)}
    </div>`;
}
function openMyNew() { editingPDS = blankPDS(); navigate('pdsForm'); renderPDSForm(); }
function openMyEdit(id) { editingPDS = JSON.parse(JSON.stringify(employees.find(e=>e.id===id)||blankPDS())); navigate('pdsForm'); renderPDSForm(); }

// ══════════ PRINT PDS — fills official CS Form 212 (Revised 2025) PDF ══════════
async function printPDS(id) {
  const e = employees.find(x => x.id === id);
  if (!e) { toast('Employee not found.', 'error'); return; }
  toast('Generating PDF\u2026', 'success');

  const tr = empTr(id);
  const pr  = e.personal  || {};
  const fam = e.family    || {};
  const q   = e.questions || {};
  const refs = (e.references && e.references.length >= 3)
    ? e.references
    : [{name:'',address:'',contact:''},{name:'',address:'',contact:''},{name:'',address:'',contact:''}];

  try {
    const { PDFDocument, rgb, StandardFonts } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
    const templateRes = await fetch('pds_template.pdf');
    if (!templateRes.ok) throw new Error('Could not load pds_template.pdf — make sure it is deployed in the same folder as app.js');
    const templateBytes = await templateRes.arrayBuffer();

    const pdfDoc  = await PDFDocument.load(templateBytes);
    const font    = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages   = pdfDoc.getPages();
    const PH      = 841.92; // A4 height pts — pdfplumber top-from-top coords

    // Draw text using pdfplumber-style top coordinates
    // pdf-lib y=0 is at BOTTOM, so: lib_y = PH - topY - fontSize
    function t(page, text, x, topY, opts) {
      if (text === null || text === undefined || text === '') return;
      const s   = String(text);
      const sz  = (opts && opts.sz)   || 7.5;
      const mw  = (opts && opts.mw)   || null;
      const f   = (opts && opts.bold) ? fontB : font;
      let fs = sz;
      if (mw) {
        const w = f.widthOfTextAtSize(s, sz);
        if (w > mw) fs = Math.max(4, sz * (mw / w));
      }
      page.drawText(s, { x, y: PH - topY - fs, size: fs, font: f, color: rgb(0,0,0) });
    }

    // Tick a checkbox at PDF coords
    function tick(page, topY, x) {
      page.drawText('/', { x, y: PH - topY - 7, size: 9, font: fontB, color: rgb(0,0,0) });
    }
    function yn(page, val, yesX, noX, topY) {
      tick(page, topY, val ? yesX : noX);
    }

    // ══════════════════════════════════════════════════
    // PAGE 1
    // ══════════════════════════════════════════════════
    // Column structure (from PDF rects):
    //   Label col:  x0=35  → x1=125  (entry starts at x=128)
    //   Mid divider: x=252
    //   Right split: x=329
    //   Full right:  x1=562
    // Row tops (from horizontal dividers — row BOTTOM listed, entry ~6-8px above bottom):
    //   Surname  row: bottom=129.12  → entry top ≈ 119
    //   First    row: bottom=145.44  → entry top ≈ 135
    //   Middle   row: bottom=160.80  → entry top ≈ 152
    //   DOB      row: bottom=187.44  → entry top ≈ 169
    //   PlaceBirth:   bottom=205.44  → entry top ≈ 196
    //   Sex      row: bottom=223.44  → entry top ≈ 213
    //   Civil    row spans 223-258   → entry top ≈ 236 (center of block)
    //   Height   row: bottom=276.12  → entry top ≈ 267
    //   Weight   row: bottom=292.44  → entry top ≈ 283
    //   Blood    row: bottom=310.32  → entry top ≈ 301
    //   UMID     row: bottom=328.20  → entry top ≈ 319
    //   PAG-IBIG row: bottom=346.68  → entry top ≈ 337
    //   Philhth  row: bottom=364.68  → entry top ≈ 356
    //   PhilSys  row: bottom=382.68  → entry top ≈ 373
    //   TIN      row: bottom=400.68  → entry top ≈ 391
    //   Agency   row: bottom=418.32  → entry top ≈ 409
    const p1 = pages[0];
    const eX = 128; // entry x start (just after label column divider at 125)

    // 1-3. Name
    t(p1, pr.surname,    eX, 119, {sz:8, bold:true, mw:295});
    t(p1, pr.nameExt,    434, 130, {sz:7.5, mw:125});  // NAME EXTENSION box top-right
    t(p1, pr.firstName,  eX, 135, {sz:8, bold:true, mw:295});
    t(p1, pr.middleName, eX, 152, {sz:8, bold:true, mw:295});

    // 3. Date of Birth (dd/mm/yyyy) — right side of DOB row
    t(p1, pr.dob, eX, 169, {sz:7.5, mw:120});

    // 4. Place of Birth
    t(p1, pr.pob, eX, 196, {sz:7.5, mw:220});

    // 5. Sex — checkboxes at x≈142 (Male) and x≈184 (Female)
    if (pr.sex === 'Male')   tick(p1, 212, 140);
    if (pr.sex === 'Female') tick(p1, 212, 184);

    // 6. Civil Status — checkboxes
    // Row spans y=223-258; Single/Married at y≈231, Widowed/Separated at y≈244
    if (pr.civil === 'Single')    tick(p1, 230, 140);
    if (pr.civil === 'Married')   tick(p1, 230, 185);
    if (pr.civil === 'Widowed')   tick(p1, 243, 140);
    if (pr.civil === 'Separated') tick(p1, 243, 185);
    if (!['Single','Married','Widowed','Separated'].includes(pr.civil) && pr.civil)
      t(p1, pr.civil, 160, 254, {sz:7, mw:85});

    // 7-9. Physical
    t(p1, pr.height, eX, 267, {sz:7.5, mw:120});
    t(p1, pr.weight, eX, 283, {sz:7.5, mw:120});
    t(p1, pr.blood,  eX, 301, {sz:7.5, mw:120});

    // 10-15. IDs
    t(p1, pr.umid,       eX, 319, {sz:7.5, mw:120});
    t(p1, pr.pagibig,    eX, 337, {sz:7.5, mw:120});
    t(p1, pr.philhealth, eX, 356, {sz:7.5, mw:120});
    t(p1, pr.philsys,    eX, 373, {sz:7.5, mw:120});
    t(p1, pr.tin,        eX, 391, {sz:7.5, mw:120});
    t(p1, pr.agencyNo,   eX, 409, {sz:7.5, mw:120});

    // 16. Citizenship — "Filipino" checkbox at x≈390, "Dual" at x≈444
    // Row y ≈ 168-187; checkboxes at y≈173
    if (!pr.dualCitizenship) tick(p1, 172, 390);
    else                      tick(p1, 172, 444);

    // 17. Residential Address
    // Sub-rows use the right half (x=329-562):
    //   House/Lot  row: bottom=234.84 → entry top≈226
    //   Subdiv     row: bottom=241.32 → entry top≈233 (but the label splits: House/Lot | Street)
    // Looking at structure: x=329 splits House# from Street
    // House#: x=331-368(?)  Street: x=369-562
    // Subdiv/Village: x=331-480(?) Barangay: x=481-562
    // City/Municipality: x=331-480  Province: x=481-562
    // ZIP CODE field is at x=252-329, y≈281
    //
    // From rects: addr sub-rows at tops: 223.44, 234.84, 252.24, 270.12, 276.12
    // Row 1 (House/Street):   top=223.44 → bot=234.84  entry y≈225
    // Row 2 (Subdiv/Brgy):    top=234.84 → bot=252.24  entry y≈244 (taller row)
    //    Wait — looking at image, sub-rows are:
    //    House/Block/Lot No. | Street           (row: 223-234)  
    //    Subdivision/Village | Barangay          (row: 234-241)
    //    City/Municipality   | Province          (row: 241-258)
    //    ZIP CODE at x=252-329, y=276-292
    t(p1, pr.residHouseNo, 331, 226, {sz:6.5, mw:38});   // House/Block/Lot
    t(p1, pr.residStreet,  374, 226, {sz:6.5, mw:185});  // Street
    t(p1, pr.residSubdiv,  331, 236, {sz:6.5, mw:145});  // Subdivision/Village
    t(p1, pr.residBrgy,    480, 236, {sz:6.5, mw:80});   // Barangay
    t(p1, pr.residCity,    331, 248, {sz:6.5, mw:145});  // City/Municipality
    t(p1, pr.residProv,    480, 248, {sz:6.5, mw:80});   // Province
    t(p1, pr.residZip,     255, 283, {sz:7, mw:70});     // ZIP CODE

    // 18. Permanent Address — same structure, rows at y=292-358
    // Row tops: 292.44(header), 303.84, 310.32, 321.72, 328.20, 339.60, 346.68
    t(p1, pr.permHouseNo, 331, 296, {sz:6.5, mw:38});
    t(p1, pr.permStreet,  374, 296, {sz:6.5, mw:185});
    t(p1, pr.permSubdiv,  331, 306, {sz:6.5, mw:145});
    t(p1, pr.permBrgy,    480, 306, {sz:6.5, mw:80});
    t(p1, pr.permCity,    331, 317, {sz:6.5, mw:145});
    t(p1, pr.permProv,    480, 317, {sz:6.5, mw:80});
    t(p1, pr.permZip,     255, 355, {sz:7, mw:70});

    // 19-21. Tel / Mobile / Email — right half x=252 onwards
    t(p1, pr.telNo,    332, 373, {sz:7.5, mw:228});
    t(p1, pr.mobileNo, 332, 391, {sz:7.5, mw:228});
    t(p1, pr.email,    332, 409, {sz:7.5, mw:228});

    // ── II. Family Background ──
    // Spouse rows start at y≈431 (after section header at 418-430)
    // Divider at x=125 splits label from entry; x=252 and x=479 are other columns
    // Spouse Surname: y=430-445  entry≈435
    // Spouse First:   y=445-461  entry≈451
    // Spouse Middle:  y=461-476  entry≈467
    // Occupation:     y=476-491  entry≈482
    // Employer:       y=491-506  entry≈497
    // Business Addr:  y=506-522  entry≈512
    // Telephone:      y=522-537  entry≈528
    // Father Surname: y=537-552  entry≈543
    // Father First:   y=552-567  entry≈558
    // Father Middle:  y=567-583  entry≈574
    // Mother header:  y=583-598
    // Mother Surname: y=598-613  entry≈604
    // Mother First:   y=613-628  entry≈619
    // Mother Middle:  y=628-643  entry≈635
    t(p1, fam.spouseSurname,    eX, 435, {sz:7.5, mw:350});
    // NAME EXTENSION box is at x=252-479 row y=445-461 label area
    t(p1, fam.spouseExt,        332, 452, {sz:7,   mw:145});
    t(p1, fam.spouseFirstName,  eX, 452, {sz:7.5, mw:200});
    t(p1, fam.spouseMiddleName, eX, 468, {sz:7.5, mw:350});
    t(p1, fam.spouseOccupation, eX, 483, {sz:7.5, mw:480});
    t(p1, fam.spouseEmployer,   eX, 498, {sz:7.5, mw:480});
    t(p1, fam.spouseBusiness,   eX, 513, {sz:7.5, mw:480});
    t(p1, fam.spouseTel,        eX, 529, {sz:7.5, mw:480});
    t(p1, fam.fatherSurname,    eX, 544, {sz:7.5, mw:350});
    t(p1, fam.fatherExt,        332, 559, {sz:7,   mw:145});
    t(p1, fam.fatherFirstName,  eX, 559, {sz:7.5, mw:200});
    t(p1, fam.fatherMiddleName, eX, 574, {sz:7.5, mw:480});
    t(p1, fam.motherSurname,    eX, 604, {sz:7.5, mw:480});
    t(p1, fam.motherFirstName,  eX, 620, {sz:7.5, mw:480});
    t(p1, fam.motherMiddleName, eX, 635, {sz:7.5, mw:480});

    // 23. Children — right column x=355-562; Name up to x=479, DOB from x=479
    // Children rows at y=431-643, row height≈15.7
    const children = fam.children || [];
    for (let i = 0; i < Math.min(children.length, 13); i++) {
      const ry = 435 + i * 15.7;
      t(p1, children[i].name, 356, ry, {sz:6.5, mw:121});
      t(p1, children[i].dob,  481, ry, {sz:6.5, mw:79});
    }

    // ── III. Educational Background ──
    // Row structure (from rect tops): 690.24, 711.00, 731.76, 752.52, 773.28
    // Columns: x=35(Level), x=125(Name of School), x=252(Course), x=368(From), x=400(To), x=432(Units), x=480(YrGrad), x=518(Honors), x=562
    const eduMap = {
      'Elementary': 697, 'Secondary': 718, 'Vocational': 738,
      'College': 759, 'Graduate': 780
    };
    for (const [level, ry] of Object.entries(eduMap)) {
      const ed = (e.education||[]).find(x => x.level && x.level.toLowerCase().startsWith(level.toLowerCase()));
      if (!ed) continue;
      t(p1, ed.school,   eX,  ry, {sz:6.5, mw:124});
      t(p1, ed.course,   254, ry, {sz:6.5, mw:112});
      t(p1, ed.from,     370, ry, {sz:6,   mw:28});
      t(p1, ed.to,       402, ry, {sz:6,   mw:28});
      t(p1, ed.units,    433, ry, {sz:6.5, mw:45});
      t(p1, ed.yearGrad, 481, ry, {sz:6.5, mw:35});
      t(p1, ed.honors,   519, ry, {sz:6,   mw:41});
    }

    // ══════════════════════════════════════════════════
    // PAGE 2 — Civil Service Eligibility + Work Experience
    // ══════════════════════════════════════════════════
    // Eligibility columns: x=74(name), x=237(rating), x=293(date), x=353(place), x=430(licNo), x=480(valid), x=530
    // Eligibility rows: top=24.96, each row height≈20.88; data rows start after header at y≈56
    const p2 = pages[1];
    const eligList = e.eligibility || [];
    for (let i = 0; i < Math.min(eligList.length, 7); i++) {
      const r  = eligList[i];
      const ry = 38 + i * 20.88;
      t(p2, r.name,     76,  ry, {sz:6.5, mw:158});
      t(p2, r.rating,   239, ry, {sz:6.5, mw:52});
      t(p2, r.dateConf, 295, ry, {sz:6.5, mw:56});
      t(p2, r.place,    354, ry, {sz:6.5, mw:74});
      t(p2, r.licNo,    432, ry, {sz:6.5, mw:46});
      t(p2, r.licValid, 482, ry, {sz:6.5, mw:46});
    }

    // Work Experience columns: x=74(from), x=116(to), x=159(position), x=294(dept), x=430(salary), x=480(status), x=530(govt)
    // Work rows: first data row after header at y≈258; row height≈18.6 (from rect tops 275.64, 294.24...)
    const workList = e.workExp || [];
    for (let i = 0; i < Math.min(workList.length, 28); i++) {
      const r  = workList[i];
      const ry = 256 + i * 18.6;
      t(p2, r.from,        76,  ry, {sz:6,   mw:39});
      t(p2, r.to,          118, ry, {sz:6,   mw:39});
      t(p2, r.position,    161, ry, {sz:6,   mw:130});
      t(p2, r.dept,        295, ry, {sz:6,   mw:133});
      t(p2, r.salary||'',  432, ry, {sz:6,   mw:46});
      t(p2, r.status,      482, ry, {sz:6,   mw:46});
      t(p2, r.govtService, 532, ry, {sz:6,   mw:28});
    }

    // ══════════════════════════════════════════════════
    // PAGE 3 — Voluntary Work + L&D Training + Other Info
    // ══════════════════════════════════════════════════
    // Voluntary Work columns: x=36(org), x=267(from), x=308(to), x=349(hours), x=390(position), x=569
    // Rows start y≈44; row height≈19.32 (tops: 42.84, 70.92, 90.24...)
    const p3 = pages[2];
    const volList = e.voluntaryWork || [];
    for (let i = 0; i < Math.min(volList.length, 7); i++) {
      const r  = volList[i];
      const ry = 44 + i * 19.32 + 2;
      t(p3, r.org||r.name||'', 38,  ry, {sz:6.5, mw:226});
      t(p3, r.from,            269, ry, {sz:6.5, mw:37});
      t(p3, r.to,              310, ry, {sz:6.5, mw:37});
      t(p3, r.hours,           351, ry, {sz:6.5, mw:37});
      t(p3, r.position,        392, ry, {sz:6.5, mw:175});
    }

    // L&D Training columns: x=36(title), x=267(from), x=308(to), x=349(hours), x=390(type), x=435(conducted by), x=569
    // Training rows start y≈248; row height≈17.28 (from tops: 266.16, 283.44, 300.72...)
    for (let i = 0; i < Math.min(tr.length, 22); i++) {
      const tt = tr[i];
      const ry = 248 + i * 17.28 + 2;
      t(p3, tt.title,       38,  ry, {sz:6.5, mw:226});
      t(p3, tt.from,        269, ry, {sz:6.5, mw:37});
      t(p3, tt.to,          310, ry, {sz:6.5, mw:37});
      t(p3, tt.hours,       351, ry, {sz:6,   mw:37});
      t(p3, tt.type,        392, ry, {sz:6.5, mw:41});
      t(p3, tt.conductedBy, 437, ry, {sz:6.5, mw:130});
    }

    // Other Info — 3 columns: x=36(skills), x=172(distinctions), x=435(memberships)
    // Rows start y≈656; row height≈17.28 (from tops: 652.68, 676.56, 693.84...)
    const skillLines = ((e.otherInfo||{}).skills||'').split('\n').flatMap(s=>s.split(',')).map(s=>s.trim()).filter(Boolean);
    const distLines  = ((e.otherInfo||{}).distinctions||'').split('\n').flatMap(s=>s.split(',')).map(s=>s.trim()).filter(Boolean);
    const membLines  = ((e.otherInfo||{}).memberships||'').split('\n').flatMap(s=>s.split(',')).map(s=>s.trim()).filter(Boolean);
    for (let i = 0; i < Math.max(skillLines.length, distLines.length, membLines.length, 5); i++) {
      const ry = 655 + i * 17.28 + 2;
      if (skillLines[i]) t(p3, skillLines[i], 38,  ry, {sz:6.5, mw:131});
      if (distLines[i])  t(p3, distLines[i],  174, ry, {sz:6.5, mw:258});
      if (membLines[i])  t(p3, membLines[i],  437, ry, {sz:6.5, mw:130});
    }

    // ══════════════════════════════════════════════════
    // PAGE 4 — Declarations + References + Gov't ID
    // ══════════════════════════════════════════════════
    const p4 = pages[3];

    // YES/NO checkboxes: from the image, YES box ≈x=383, NO box ≈x=421
    const YX = 383, NX = 421;
    yn(p4, q.q34a,  YX, NX, 56);
    yn(p4, q.q34b,  YX, NX, 72);
    if (q.q34det) t(p4, q.q34det, 383, 90, {sz:6.5, mw:175});

    yn(p4, q.q35a,  YX, NX, 128);
    if (q.q35aDet)    t(p4, q.q35aDet,    383, 148, {sz:6.5, mw:175});
    yn(p4, q.q35b,  YX, NX, 168);
    if (q.q35bDet)    t(p4, q.q35bDet,    383, 186, {sz:6.5, mw:175});
    if (q.q35bDate)   t(p4, q.q35bDate,   383, 198, {sz:6.5, mw:85});
    if (q.q35bStatus) t(p4, q.q35bStatus, 383, 210, {sz:6.5, mw:85});

    yn(p4, q.q36,   YX, NX, 228);
    if (q.q36Det)     t(p4, q.q36Det,     383, 247, {sz:6.5, mw:175});

    yn(p4, q.q37,   YX, NX, 267);
    if (q.q37Det)     t(p4, q.q37Det,     383, 287, {sz:6.5, mw:175});

    yn(p4, q.q38a,  YX, NX, 302);
    if (q.q38aDet)    t(p4, q.q38aDet,    383, 320, {sz:6.5, mw:175});
    yn(p4, q.q38b,  YX, NX, 330);
    if (q.q38bDet)    t(p4, q.q38bDet,    383, 350, {sz:6.5, mw:175});

    yn(p4, q.q39,   YX, NX, 362);
    if (q.q39Det)     t(p4, q.q39Det,     383, 381, {sz:6.5, mw:175});

    yn(p4, q.q40a,  YX, NX, 427);
    if (q.q40aSpec)   t(p4, q.q40aSpec,   383, 446, {sz:6.5, mw:175});
    yn(p4, q.q40b,  YX, NX, 456);
    if (q.q40bId)     t(p4, q.q40bId,     383, 473, {sz:6.5, mw:175});
    yn(p4, q.q40c,  YX, NX, 483);
    if (q.q40cId)     t(p4, q.q40cId,     383, 500, {sz:6.5, mw:175});

    // References — 3 rows: NAME | OFFICE/RESIDENTIAL ADDRESS | CONTACT
    // Columns: x=36(name), x=195(address), x=375(contact)
    // Rows at y≈520, 538, 556
    for (let i = 0; i < 3; i++) {
      const ry = 521 + i * 18;
      t(p4, refs[i].name,    38,  ry, {sz:7, mw:155});
      t(p4, refs[i].address, 197, ry, {sz:7, mw:175});
      t(p4, refs[i].contact, 377, ry, {sz:7, mw:80});
    }

    // Gov't ID + signature area
    t(p4, e.govtId,           38, 663, {sz:7, mw:175});
    t(p4, e.govtIdNo,         38, 679, {sz:7, mw:175});
    t(p4, e.govtIdIssuance,   38, 694, {sz:7, mw:175});
    t(p4, e.dateAccomplished, 38, 709, {sz:7, mw:115});

    // ── Download ──
    const filledBytes = await pdfDoc.save();
    const blob = new Blob([filledBytes], {type:'application/pdf'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `PDS_${(pr.surname||'').toUpperCase()}_${(pr.firstName||'').toUpperCase()}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('PDF downloaded! \u2713', 'success');

  } catch(err) {
    console.error('PDF generation error:', err);
    toast('PDF error: ' + err.message, 'error');
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
