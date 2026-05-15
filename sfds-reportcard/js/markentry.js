/**
 * markentry.js — SFS Connect Mark Entry System — Phase 1 & 2
 * Subject Teacher: Login → Dashboard → Class Grid
 * Class Teacher:   Login → CT Dashboard → Student List → Student Form
 */

'use strict';

// ─── ROMAN NUMERAL → INTEGER ─────────────────────────────────────────────────
const ROMAN_TO_INT = { I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10 };
function classNumFromId(classId) {
  // "IX-A" → 9, "3-A" → 3, "III" → 3
  const raw = String(classId).split('-')[0].trim().toUpperCase();
  return ROMAN_TO_INT[raw] || parseInt(raw) || null;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
const ME = {
  user:         null,
  teacher:      null,      // full teacher document data
  isClassTeacher: false,
  ctClassId:    null,      // e.g. "III-A"
  ctClassNum:   null,      // e.g. 3
  activeClass:  null,      // subject teacher grid context
  activeStudent: null,     // { studentId, studentData, hyData, ftData }
  saveTimer:    null,
  pendingSaves: new Map(),
  backUrl:      '../index.html'   // SFS Connect portal
};

// ─── GRADES ───────────────────────────────────────────────────────────────────
const GRADES = ['O','A+','A','B+','B','C'];

function computeGrade(total, max = 100) {
  const pct = (total / max) * 100;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
}

// ─── DOM HELPERS ──────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// ─── SCREEN MANAGER ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.me-screen').forEach(s => s.classList.remove('active'));
  const target = $(id);
  if (target) {
    target.style.display = '';   // ensure display is restored if hidden
    target.classList.add('active');
  }
}

// ─── SAVE INDICATOR ──────────────────────────────────────────────────────────
function showSaveIndicator(msg = 'Saving…') {
  const el = $('saveIndicator');
  if (el) { el.textContent = msg; el.style.opacity = '1'; }
}
function hideSaveIndicator(msg = 'Saved ✓') {
  const el = $('saveIndicator');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.style.opacity = '0'; el.textContent = ''; }, 2000);
}

// ─── URL PARAMS ───────────────────────────────────────────────────────────────
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    classId:  p.get('classId')  || '',
    subject:  p.get('subject')  || '',
    term:     p.get('term')     || 'HY',
    action:   p.get('action')   || ''
  };
}

// ─── CONFIG HELPERS ───────────────────────────────────────────────────────────
function getSubjectKeyFromLabel(subjectLabel) {
  if (!window._sfsConfig) return '';
  const cfg = window._sfsConfig;
  if (!cfg || !cfg.subjects) return '';
  const found = cfg.subjects.find(s => s.label === subjectLabel);
  return found ? found.key : '';
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  if (user) {
    ME.user = user;
    await loadTeacherAndRoute(user.uid);
  } else {
    ME.user = null;
    ME.teacher = null;
    // Redirect to main portal — auth is shared via Firebase session
    window.location.href = ME.backUrl || '../index.html';
    return;
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function idToEmail(id) {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '@stfrancis.school';
}

// Login is now handled by the main portal (pro-leo-site/index.html).
// Unauthenticated users are redirected there by onAuthStateChanged above.
// The loginForm submit handler is intentionally disabled.
/*
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = idToEmail($('loginEmail').value);
  const password = $('loginPassword').value;
  const errEl    = $('loginError');
  errEl.textContent = '';
  $('btnLogin').disabled = true;
  $('btnLogin').textContent = 'Signing in…';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    $('btnLogin').disabled = false;
    $('btnLogin').textContent = 'Sign In as Teacher';
  }
});
*/

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email':          'Invalid Teacher ID.',
    'auth/user-not-found':         'No account found for this ID.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/too-many-requests':      'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };
  return map[code] || 'Sign-in failed. Please try again.';
}

$('btnLogout').addEventListener('click', () => auth.signOut());

// ─── LOAD TEACHER & ROUTE ─────────────────────────────────────────────────────
async function loadTeacherAndRoute(uid) {
  try {
    let teacherData = null;

    // Try master-prompt structure: /teachers/{uid}
    const directSnap = await db.collection('teachers').doc(uid).get();
    if (directSnap.exists) {
      teacherData = directSnap.data();
    } else {
      // Fall back to existing site structure: /users/{uid} → /teachers?teacherId=...
      const userSnap = await db.collection('users').doc(uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        const tid = userData.teacherId || userData.loginId || '';
        if (tid) {
          // Try exact match on teacherId field
          let tSnap = await db.collection('teachers')
            .where('teacherId', '==', tid).limit(1).get();
          // Try case-insensitive variant (uppercase)
          if (tSnap.empty) {
            tSnap = await db.collection('teachers')
              .where('teacherId', '==', tid.toUpperCase()).limit(1).get();
          }
          // Try loginId field as fallback
          if (tSnap.empty) {
            tSnap = await db.collection('teachers')
              .where('loginId', '==', tid).limit(1).get();
          }
          if (!tSnap.empty) teacherData = tSnap.docs[0].data();
        }
        // Also merge user-level tpAssignments / tpRole written by TA panel
        if (teacherData) {
          if (userData.tpRole)            teacherData.role            = userData.tpRole;
          if (userData.tpClassTeacherOf)  teacherData.classTeacherOf  = userData.tpClassTeacherOf;
          if (userData.tpAssignments)     teacherData.assignments     = userData.tpAssignments;
        } else {
          // Build minimal teacher doc from userData
          teacherData = {
            role:          userData.tpRole || 'subject_teacher',
            classTeacherOf: userData.tpClassTeacherOf || null,
            assignments:   userData.tpAssignments || [],
            name:          userData.name || userData.displayName || ''
          };
        }
      }
    }

    if (!teacherData) {
      console.warn('markentry: No teacher document found for uid', uid);
      showScreen('screenLogin');   // unexpected — show login as fallback
      return;
    }

    ME.teacher = teacherData;

    // Update header name
    const nameEl = $('headerTeacherName');
    if (nameEl) nameEl.textContent = teacherData.name || '';

    // Route based on URL params
    const params = getParams();

    if (params.action === 'review') {
      // Class-teacher review flow (deep-linked from portal)
      const ctClassId = params.classId || teacherData.classTeacherOf || '';
      if (ctClassId) {
        await initCTDashboard(ctClassId, params.term);
      } else {
        showScreen('screenDashboard');
        await loadDashboard(uid, teacherData);
      }
      return;
    }

    if (params.classId && params.subject) {
      // Subject-teacher deep link — go straight to grid
      await openMarkGrid(params.classId, params.subject, params.term);
      return;
    }

    // No params — show dashboard (subject teacher default)
    showScreen('screenDashboard');
    await loadDashboard(uid, teacherData);

  } catch (err) {
    console.error('loadTeacherAndRoute:', err);
    showScreen('screenLogin');   // fallback
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard(uid, teacherData) {
  const tbody = $('dashboardBody');
  if (!tbody) return;

  const role         = teacherData.role || 'subject_teacher';
  const assignments  = teacherData.assignments || [];

  // Class-teacher with no subject assignments → go to CT dashboard
  if (role === 'class_teacher' && !assignments.length) {
    const ctId = teacherData.classTeacherOf || '';
    if (ctId) { await initCTDashboard(ctId); return; }
  }

  if (!assignments.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">No subject assignments found.</td></tr>';
    return;
  }

  const params = getParams();
  const term   = params.term || 'HY';

  tbody.innerHTML = assignments.map(a => {
    const classId    = a.classId || (a.class + (a.section ? '-'+a.section : '-A'));
    const subjectKey = a.subjectKey || getSubjectKeyFromLabel(a.subjectLabel);
    return `<tr>
      <td>${classId.split('-')[0]}</td>
      <td>${classId.split('-')[1] || 'A'}</td>
      <td>${a.subjectLabel || subjectKey}</td>
      <td><button class="btn btn-gold btn-sm" onclick="openMarkGrid('${classId}','${subjectKey}','HY')">Enter HY Marks</button></td>
      <td><button class="btn btn-sm btn-secondary" onclick="openMarkGrid('${classId}','${subjectKey}','FT')">Enter FT Marks</button></td>
    </tr>`;
  }).join('');
}

// ─── MARK ENTRY GRID ─────────────────────────────────────────────────────────
async function openMarkGrid(classId, subjectKey, term) {
  ME.activeClass = { classId, subjectKey, term };
  const params   = getParams();

  // Load config
  if (!window._sfsConfig) {
    const cfgSnap = await db.collection('settings').doc('config').get();
    if (cfgSnap.exists) window._sfsConfig = cfgSnap.data();
  }

  $('gridTitle').textContent    = `Class ${classId} — ${subjectKey} — ${term === 'HY' ? 'Half Yearly' : 'Final Term'}`;
  $('gridSubtitle').textContent = `Academic Year 2026–2027`;
  showScreen('screenGrid');

  await loadGrid(classId, subjectKey, term);
}

async function loadGrid(classId, subjectKey, term) {
  const wrap = $('gridTableWrap');
  wrap.innerHTML = '<div class="me-loading"><div class="me-spinner"></div><br>Loading students…</div>';

  try {
    const classNum = classNumFromId(classId);
    const sSnap    = await db.collection('students')
      .where('class', '==', String(classNum))
      .orderBy('rollNo')
      .get();

    if (sSnap.empty) {
      wrap.innerHTML = '<p style="text-align:center;padding:2rem;">No students found for this class.</p>';
      return;
    }

    // Load existing marks
    const termKey  = `${classId}_${term}`;
    const marksRef = db.collection('marks').doc(termKey).collection('students');
    const existingMarks = {};
    try {
      const mSnap = await marksRef.get();
      mSnap.forEach(d => { existingMarks[d.id] = d.data(); });
    } catch(e) { /* ok — no marks yet */ }

    // Build grid
    const cfg = window._sfsConfig || {};
    const subjectCfg = (cfg.subjects || []).find(s => s.key === subjectKey) || {};
    const maxMarks   = subjectCfg.maxMarks || 100;

    let html = `<table class="me-table"><thead><tr>
      <th>#</th><th>Student Name</th><th>Roll No</th>
      <th>Marks (max ${maxMarks})</th><th>Grade</th><th>Remarks</th>
    </tr></thead><tbody>`;

    sSnap.docs.forEach((doc, i) => {
      const s   = doc.data();
      const sid = doc.id;
      const existing = existingMarks[sid] || {};
      const subMarks  = existing[subjectKey] || {};
      const marks     = subMarks.marks != null ? subMarks.marks : '';
      const remarks   = subMarks.remarks || '';
      const grade     = marks !== '' ? computeGrade(Number(marks), maxMarks) : '—';
      const locked    = existing.status === 'locked';

      html += `<tr data-sid="${sid}">
        <td>${i+1}</td>
        <td>${s.name || '—'}</td>
        <td>${s.rollNo || '—'}</td>
        <td><input type="number" class="me-mark-input" data-sid="${sid}" data-max="${maxMarks}"
            value="${marks}" min="0" max="${maxMarks}" placeholder="—"
            ${locked ? 'disabled' : ''}
            oninput="onMarkInput(this)"></td>
        <td class="grade-cell" id="grade-${sid}">${grade}</td>
        <td><input type="text" class="me-remark-input" data-sid="${sid}"
            value="${remarks}" placeholder="Optional…"
            ${locked ? 'disabled' : ''}
            oninput="scheduleSave()"></td>
      </tr>`;
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;

  } catch(err) {
    console.error(err);
    wrap.innerHTML = `<p style="color:red;padding:2rem;">Error loading grid: ${err.message}</p>`;
  }
}

window.onMarkInput = function(input) {
  const max   = Number(input.dataset.max) || 100;
  const val   = Number(input.value);
  const sid   = input.dataset.sid;
  const grade = (input.value !== '' && !isNaN(val)) ? computeGrade(val, max) : '—';
  const gradeEl = document.getElementById('grade-' + sid);
  if (gradeEl) gradeEl.textContent = grade;
  scheduleSave();
};

function scheduleSave() {
  clearTimeout(ME.saveTimer);
  ME.saveTimer = setTimeout(saveDraft, 2000);
  showSaveIndicator('Saving…');
}

async function saveDraft() {
  const { classId, subjectKey, term } = ME.activeClass;
  const termKey  = `${classId}_${term}`;
  const marksRef = db.collection('marks').doc(termKey).collection('students');
  const batch    = db.batch();

  document.querySelectorAll('.me-mark-input').forEach(input => {
    const sid     = input.dataset.sid;
    const marks   = input.value !== '' ? Number(input.value) : null;
    const remarkInput = document.querySelector(`.me-remark-input[data-sid="${sid}"]`);
    const remarks = remarkInput ? remarkInput.value : '';

    if (marks !== null) {
      const ref = marksRef.doc(sid);
      batch.set(ref, {
        [subjectKey]: { marks, remarks, grade: computeGrade(marks, Number(input.dataset.max) || 100) },
        lastUpdatedBy: ME.user.uid,
        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  });

  try {
    await batch.commit();
    hideSaveIndicator('Saved ✓');
  } catch(err) {
    console.error(err);
    hideSaveIndicator('Save failed ✗');
  }
}

$('btnSaveDraft').addEventListener('click', saveDraft);

$('btnSubmit').addEventListener('click', () => {
  const { classId, subjectKey, term } = ME.activeClass;
  $('submitModalMsg').textContent = `Submit marks for ${subjectKey} (${term}) to the Class Teacher?`;
  $('submitModal').classList.remove('hidden');
});

$('btnCancelSubmit').addEventListener('click', () => $('submitModal').classList.add('hidden'));

$('btnConfirmSubmit').addEventListener('click', async () => {
  $('submitModal').classList.add('hidden');
  await saveDraft();
  const { classId, subjectKey, term } = ME.activeClass;
  const termKey  = `${classId}_${term}`;
  const marksRef = db.collection('marks').doc(termKey).collection('students');
  showSaveIndicator('Submitting…');
  try {
    const snap  = await marksRef.get();
    const batch = db.batch();
    snap.forEach(doc => {
      if (doc.data()[subjectKey]) {
        batch.update(doc.ref, { [`${subjectKey}.status`]: 'submitted' });
      }
    });
    await batch.commit();
    hideSaveIndicator('Submitted ✓');
  } catch(err) {
    console.error(err);
    hideSaveIndicator('Submit failed ✗');
  }
});

$('btnBackToDashboard').addEventListener('click', async () => {
  ME.activeClass = null;
  showScreen('screenDashboard');
  await loadDashboard(ME.user.uid, ME.teacher);
});

// ─── CLASS TEACHER DASHBOARD ─────────────────────────────────────────────────
async function initCTDashboard(ctClassId, term = 'HY') {
  ME.isClassTeacher = true;
  ME.ctClassId      = ctClassId;
  ME.ctClassNum     = classNumFromId(ctClassId);
  ME.activeClass    = { classId: ctClassId, term };

  $('ctDashTitle').textContent   = `Class Teacher Dashboard — Class ${ctClassId}`;
  $('ctDashTeacher').textContent = `${ME.teacher.name || ''} | Class ${ctClassId}`;
  showScreen('screenCTDashboard');

  await loadCTStatus(ctClassId);
}

async function loadCTStatus(ctClassId) {
  // Load config for subject list
  if (!window._sfsConfig) {
    const cfgSnap = await db.collection('settings').doc('config').get();
    if (cfgSnap.exists) window._sfsConfig = cfgSnap.data();
  }
  const cfg      = window._sfsConfig || {};
  const subjects = cfg.subjects || [];

  for (const termKey of ['HY','FT']) {
    const tbody   = termKey === 'HY' ? $('ctHyStatusBody') : $('ctFtStatusBody');
    const progEl  = termKey === 'HY' ? $('ctHyProgress')   : $('ctFtProgress');
    const lockBtn = termKey === 'HY' ? $('ctBtnReviewHY')  : $('ctBtnReviewFT');

    tbody.innerHTML = '<tr><td colspan="3" class="me-loading"><div class="me-spinner"></div></td></tr>';

    try {
      const marksDocKey = `${ctClassId}_${termKey}`;
      const snap        = await db.collection('marks').doc(marksDocKey).collection('students').get();
      const marksMap    = {};
      snap.forEach(d => { marksMap[d.id] = d.data(); });

      let entered = 0;
      tbody.innerHTML = subjects.map(s => {
        // Find any student who has this subject's marks
        const anyEntry = Object.values(marksMap).find(m => m[s.key] && m[s.key].marks != null);
        const status   = anyEntry ? (anyEntry[s.key].status || 'draft') : 'pending';
        if (anyEntry) entered++;
        const badge = status === 'submitted' ? '<span class="status-badge status-submitted">Submitted</span>'
                    : status === 'draft'     ? '<span class="status-badge status-draft">Draft</span>'
                    : '<span class="status-badge">Pending</span>';
        return `<tr><td>${s.label}</td><td>${anyEntry ? (ME.teacher.name || '—') : '—'}</td><td>${badge}</td></tr>`;
      }).join('');

      progEl.textContent = `${entered} / ${subjects.length} subjects entered`;
      if (entered === subjects.length) {
        lockBtn.disabled = false;
      }
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:red">Error: ${e.message}</td></tr>`;
    }
  }
}

$('ctBtnRefresh').addEventListener('click', () => loadCTStatus(ME.ctClassId));
$('ctBtnLogout').addEventListener('click', () => auth.signOut());

$('ctBtnReviewHY').addEventListener('click', () => openStudentList('HY'));
$('ctBtnReviewFT').addEventListener('click', () => openStudentList('FT'));

// ─── STUDENT LIST ─────────────────────────────────────────────────────────────
async function openStudentList(term) {
  ME.activeClass = { ...ME.activeClass, term };
  $('slTitle').textContent    = `Student Records — Class ${ME.ctClassId}`;
  $('slSubtitle').textContent = `${term === 'HY' ? 'Half Yearly' : 'Final Term'} | Session 2026–2027`;
  showScreen('screenStudentList');

  await loadStudentList(term);
}

async function loadStudentList(term) {
  const tbody = $('slTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="me-loading"><div class="me-spinner"></div></td></tr>';

  try {
    const sSnap = await db.collection('students')
      .where('class', '==', String(ME.ctClassNum))
      .orderBy('rollNo').get();

    if (sSnap.empty) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;">No students found.</td></tr>';
      return;
    }

    // Load marks
    const termKey  = `${ME.ctClassId}_${term}`;
    const mSnap    = await db.collection('marks').doc(termKey).collection('students').get();
    const marksMap = {};
    mSnap.forEach(d => { marksMap[d.id] = d.data(); });

    // Compute totals and rank
    const cfg      = window._sfsConfig || {};
    const subjects = cfg.subjects || [];

    const rows = sSnap.docs.map(doc => {
      const s   = doc.data();
      const sid = doc.id;
      const m   = marksMap[sid] || {};

      // HY total
      let hyTotal = 0;
      subjects.forEach(sub => {
        const entry = m[sub.key];
        if (entry && entry.marks != null) hyTotal += Number(entry.marks);
      });
      const hyMax = subjects.reduce((acc, sub) => acc + (sub.maxMarks || 100), 0);
      const hyPct = hyMax ? Math.round((hyTotal / hyMax) * 100) : 0;

      // FT total (placeholder — same structure)
      const ftTermKey = `${ME.ctClassId}_FT`;
      return { sid, s, m, hyTotal, hyMax, hyPct, status: m.status || 'draft' };
    });

    // Sort by HY total for rank
    const sorted = [...rows].sort((a,b) => b.hyTotal - a.hyTotal);
    const rankMap = {};
    sorted.forEach((r, i) => { rankMap[r.sid] = i + 1; });

    // Write ranks back
    const batch = db.batch();
    const mRef  = db.collection('marks').doc(termKey).collection('students');
    rows.forEach(r => {
      batch.set(mRef.doc(r.sid), { hyRank: rankMap[r.sid], totalStudents: rows.length }, { merge: true });
    });
    try { await batch.commit(); } catch(e) { /* ok */ }

    tbody.innerHTML = rows.map((r, i) => {
      const rank   = rankMap[r.sid];
      const status = r.status === 'locked'
        ? '<span class="status-badge status-locked">Locked</span>'
        : '<span class="status-badge status-draft">Draft</span>';
      return `<tr>
        <td>${r.s.rollNo || i+1}</td>
        <td>${r.s.name || '—'}</td>
        <td>${r.hyTotal}</td>
        <td>${r.hyPct}%</td>
        <td>—</td><td>—</td>
        <td>${rank}</td>
        <td>${status}</td>
        <td><button class="btn btn-sm btn-primary" onclick="openStudentForm('${r.sid}')">Open</button></td>
      </tr>`;
    }).join('');

  } catch(err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

$('btnBackToCTDash').addEventListener('click', async () => {
  ME.activeStudent = null;
  showScreen('screenCTDashboard');
});

// ─── STUDENT FORM ─────────────────────────────────────────────────────────────
window.openStudentForm = async function(studentId) {
  const term    = ME.activeClass.term;
  const classId = ME.ctClassId;

  // Load student data
  const sDoc  = await db.collection('students').doc(studentId).get();
  const sData = sDoc.exists ? sDoc.data() : {};

  // Load marks
  const termKey  = `${classId}_${term}`;
  const mRef     = db.collection('marks').doc(termKey).collection('students').doc(studentId);
  const mSnap    = await mRef.get();
  const marksData = mSnap.exists ? mSnap.data() : {};

  // Load FT marks too
  const ftTermKey = `${classId}_FT`;
  const ftRef     = db.collection('marks').doc(ftTermKey).collection('students').doc(studentId);
  const ftSnap    = await ftRef.get();
  const ftData    = ftSnap.exists ? ftSnap.data() : {};

  ME.activeStudent = { studentId, studentData: sData, hyData: marksData, ftData, classId };

  $('sfStudentName').textContent = sData.name || studentId;
  $('sfClass').textContent       = `Class ${classId}`;
  $('sfTerm').textContent        = term === 'HY' ? 'Half Yearly' : 'Final Term';
  $('sfRollNo').textContent      = sData.rollNo || '—';

  const locked = marksData.status === 'locked';
  $('sfLockStatus').style.display = locked ? '' : 'none';
  $('btnLockRecord').style.display = locked ? 'none' : '';
  $('btnSaveCT').disabled = locked;

  // Render academic table
  const cfg      = window._sfsConfig || {};
  const subjects = cfg.subjects || [];
  let html = '<table class="me-table"><thead><tr><th>Subject</th><th>HY Marks</th><th>HY Grade</th></tr></thead><tbody>';
  subjects.forEach(sub => {
    const entry = marksData[sub.key] || {};
    const marks = entry.marks != null ? entry.marks : '—';
    const grade = marks !== '—' ? computeGrade(Number(marks), sub.maxMarks || 100) : '—';
    html += `<tr><td>${sub.label}</td><td>${marks}</td><td>${grade}</td></tr>`;
  });
  html += '</tbody></table>';
  $('sfAcademicTable').innerHTML = html;

  // Attendance
  const hyAtt = marksData.attendance || {};
  const ftAtt = ftData.attendance   || {};
  $('sfHyPresent').value = hyAtt.present || '';
  $('sfHyTotal').value   = hyAtt.total   || '';
  $('sfFtPresent').value = ftAtt.present || '';
  $('sfFtTotal').value   = ftAtt.total   || '';

  // Remarks
  $('sfHyRemark').value        = marksData.remark          || '';
  $('sfFtRemark').value        = ftData.remark             || '';
  $('sfPrincipalRemark').value = marksData.principalRemark || '';

  // Ranks
  $('sfHyRank').value        = marksData.hyRank       || '';
  $('sfFtRank').value        = ftData.hyRank          || '';
  $('sfTotalStudents').value = marksData.totalStudents || '';

  // Result
  const allPass = subjects.every(sub => {
    const entry = marksData[sub.key] || {};
    return entry.marks != null && computeGrade(Number(entry.marks), sub.maxMarks || 100) !== 'F';
  });
  const badge = $('sfResultBadge');
  badge.textContent = allPass ? 'PASS' : 'FAIL';
  badge.className   = `ct-result-badge ${allPass ? 'ct-result-pass' : 'ct-result-fail'}`;

  // Co-scholastic
  $('sfCoScholastic').innerHTML = '<p style="color:var(--me-muted);font-size:0.82rem;">Co-scholastic data managed via report card generator.</p>';

  showScreen('screenStudentForm');
};

async function saveCTData() {
  const { studentId, classId } = ME.activeStudent;
  const term    = ME.activeClass.term;
  const termKey = `${classId}_${term}`;
  const ftTermKey = `${classId}_FT`;
  showSaveIndicator('Saving…');

  try {
    const mRef  = db.collection('marks').doc(termKey).collection('students').doc(studentId);
    const ftRef = db.collection('marks').doc(ftTermKey).collection('students').doc(studentId);

    await mRef.set({
      attendance:       { present: Number($('sfHyPresent').value)||0, total: Number($('sfHyTotal').value)||0 },
      remark:           $('sfHyRemark').value,
      principalRemark:  $('sfPrincipalRemark').value,
      lastUpdatedBy:    ME.user.uid,
      lastUpdatedAt:    firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await ftRef.set({
      attendance: { present: Number($('sfFtPresent').value)||0, total: Number($('sfFtTotal').value)||0 },
      remark:     $('sfFtRemark').value,
      lastUpdatedBy: ME.user.uid,
      lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    hideSaveIndicator('Saved ✓');
  } catch(err) {
    console.error(err);
    hideSaveIndicator('Save failed ✗');
  }
}

$('btnSaveCT').addEventListener('click', saveCTData);

$('btnLockRecord').addEventListener('click', () => {
  $('lockModal').dataset.mode = 'single';
  $('lockModalMsg').textContent = `Lock the record for ${ME.activeStudent.studentData.name || ME.activeStudent.studentId}? This cannot be undone.`;
  $('lockModal').classList.remove('hidden');
});

$('btnLockAll').addEventListener('click', () => {
  $('lockModal').dataset.mode = 'all';
  $('lockModalMsg').textContent = `Lock ALL student records for Class ${ME.ctClassId}? This cannot be undone.`;
  $('lockModal').classList.remove('hidden');
});

$('btnCancelLock').addEventListener('click', () => $('lockModal').classList.add('hidden'));

$('btnConfirmLock').addEventListener('click', async () => {
  $('lockModal').classList.add('hidden');
  const mode = $('lockModal').dataset.mode;

  if (mode === 'single') {
    await saveCTData();
    await lockSingleRecord(ME.activeStudent.studentId);
    $('btnLockRecord').style.display = 'none';
    $('sfLockStatus').style.display  = '';
    $('btnSaveCT').disabled           = true;
    hideSaveIndicator('Locked ✓');
  } else {
    await lockAllRecords();
  }
});

async function lockSingleRecord(studentId) {
  const { classId } = ME.activeStudent;
  showSaveIndicator('Locking…');
  const batch = db.batch();
  for (const t of ['HY','FT']) {
    const ref = db.collection('marks').doc(`${classId}_${t}`)
                  .collection('students').doc(studentId);
    batch.set(ref, {
      status:        'locked',
      lastUpdatedBy: ME.user.uid,
      lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
}

async function lockAllRecords() {
  const classId = ME.ctClassId;
  showSaveIndicator('Locking all…');
  try {
    for (const t of ['HY','FT']) {
      const termKey = `${classId}_${t}`;
      const snap    = await db.collection('marks').doc(termKey).collection('students').get();
      const batch   = db.batch();
      snap.forEach(doc => {
        batch.update(doc.ref, {
          status:        'locked',
          lastUpdatedBy: ME.user.uid,
          lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    }
    hideSaveIndicator('All locked ✓');
    await openStudentList(ME.activeClass.term);
  } catch (err) {
    console.error(err);
    hideSaveIndicator('Lock failed ✗');
  }
}

$('btnBackToStudentList').addEventListener('click', async () => {
  ME.activeStudent = null;
  await openStudentList(ME.activeClass.term);
});