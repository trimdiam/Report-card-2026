/**
 * render.js — SFDS Report Card System
 * Reads studentData from sessionStorage and populates reportcard.html
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. LOAD DATA
   ═══════════════════════════════════════════════════════════════════════════ */
function loadData() {
  const raw = sessionStorage.getItem('sfds_studentData');
  if (!raw) {
    console.error('No student data found in sessionStorage.');
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse student data:', e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. GRADE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function getGradeFromMarks(marks) {
  if (marks >= 90) return 'O';
  if (marks >= 80) return 'A+';
  if (marks >= 70) return 'A';
  if (marks >= 60) return 'B+';
  if (marks >= 50) return 'B';
  if (marks >= 40) return 'C';
  if (marks >= 33) return 'D';
  return 'F';
}

function formatPct(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. MAIN RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
function render() {
  const data = loadData();
  if (!data) {
    document.body.innerHTML = `
      <div style="font-family:'Segoe UI',sans-serif;text-align:center;padding:60px 20px;color:#555;background:#FAF8F3;min-height:100vh;box-sizing:border-box;">
        <p style="font-size:2rem;margin-bottom:8px;">📋</p>
        <h2 style="color:#2C2C2C;margin-bottom:12px;">No student data found</h2>
        <p style="font-size:0.9rem;color:#888;margin-bottom:24px;">Please fill the mark entry form and click <strong>Preview Report Card</strong>.</p>
        <a href="index.html" style="display:inline-block;background:#C9A84C;color:#fff;padding:8px 20px;border-radius:4px;font-weight:600;text-decoration:none;font-size:0.9rem;">← Go to Mark Entry Form</a>
      </div>
    `;
    return;
  }

  const config = getClassConfig(parseInt(data.class, 10));
  if (!config) {
    console.error('Unknown class:', data.class);
    return;
  }

  renderHeader(data, config);
  renderLeftPanel(data, config);
  renderCenterPanel(data, config);
  renderRightPanel(data, config);

  // Auto-print if requested via URL param
  if (window.location.search.includes('print=1')) {
    setTimeout(() => window.print(), 800);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
function renderHeader(data, config) {
  document.getElementById('rcSchoolName').textContent = data.schoolName || config.schoolName;
  document.getElementById('rcClassNum').textContent = data.class || '—';
  document.getElementById('rcSection').textContent = data.section || '—';

  const passmark = config.passmark || 40;
  const scaleEl = document.getElementById('rcGradeScale');
  if (scaleEl) {
    scaleEl.textContent =
      `O ≥90% | A+ 80–89% | A 70–79% | B+ 60–69% | B 50–59% | C 40–49% | D 33–39% | F <33% – Fail | Pass mark: ${passmark}/100`;
  }

  const logo = document.getElementById('rcLogo');
  if (logo) {
    logo.onerror = function () {
      this.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#2C2C2C;color:#C9A84C;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;';
      placeholder.textContent = 'SFS';
      this.parentNode.insertBefore(placeholder, this);
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LEFT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function renderLeftPanel(data, config) {
  const s = data.student;
  document.getElementById('rcStudentName').textContent = s.name || 'Student Name';
  document.getElementById('rcRollNo').textContent = s.rollNo || '—';
  document.getElementById('rcSection2').textContent = data.section || '—';
  document.getElementById('rcClass2').textContent = data.class || '—';
  document.getElementById('rcAdmissionNo').textContent = s.admissionNo || '—';
  document.getElementById('rcDob').textContent = s.dob || '—';
  document.getElementById('rcAcademicYear').textContent = data.session || '2026–2027';
  document.getElementById('rcClassSection').textContent = `Class ${data.class || '—'}${data.section ? ' (' + data.section + ')' : ''}`;
  document.getElementById('rcHouse').textContent = s.house || '—';

  // Attendance
  const hyAtt = data.halfYearly.attendance;
  const ftAtt = data.finalTerm.attendance;
  const hyPct = hyAtt.total > 0 ? ((hyAtt.present / hyAtt.total) * 100) : 0;
  const ftPct = ftAtt.total > 0 ? ((ftAtt.present / ftAtt.total) * 100) : 0;

  // Helper: attendance visual category
  const attCls = (pct) => pct >= 75 ? 'att-good' : (pct >= 60 ? 'att-moderate' : 'att-poor');

  const hyPctEl = document.getElementById('rcHyAttPct');
  hyPctEl.textContent = formatPct(hyPct) + '%';
  hyPctEl.className = 'rc-att-pct ' + attCls(hyPct);
  const hyBarEl = document.getElementById('rcHyAttBar');
  hyBarEl.style.width = hyPct + '%';
  hyBarEl.className = 'rc-att-fill ' + attCls(hyPct);

  const ftPctEl = document.getElementById('rcFtAttPct');
  ftPctEl.textContent = formatPct(ftPct) + '%';
  ftPctEl.className = 'rc-att-pct ' + attCls(ftPct);
  const ftBarEl = document.getElementById('rcFtAttBar');
  ftBarEl.style.width = ftPct + '%';
  ftBarEl.className = 'rc-att-fill ' + attCls(ftPct);

  // Overall result (based on consolidated data)
  const consol = data.consolidated;
  const resultBadge = document.getElementById('rcResultBadge');
  resultBadge.textContent = consol.result || '—';
  resultBadge.className = 'rc-result-badge ' + (consol.result === 'PASS' ? '' : 'fail');

  document.getElementById('rcOverallGrade').textContent = consol.grade || '—';
  document.getElementById('rcOverallPct').textContent = formatPct(consol.percentage) + '%';
  document.getElementById('rcOverallRank').textContent = data.finalTerm.rank && data.finalTerm.totalStudents
    ? `${data.finalTerm.rank} / ${data.finalTerm.totalStudents}`
    : '—';
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. CENTER PANEL — TERM 1
   ═══════════════════════════════════════════════════════════════════════════ */
function renderCenterPanel(data, config) {
  const isStandard = config.markScheme === 'standard';

  // Table header
  const hyHead = document.getElementById('rcHyTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Grade</th>';
  hyHead.innerHTML = h;

  // Table body
  document.getElementById('rcHyTableBody').innerHTML = buildTableRows('hy', data, config, isStandard, false);

  // Footer
  const hyCols = isStandard ? 6 : 5;
  const hyColspan = hyCols - 3;
  const hyRankStr = data.halfYearly.rank
    ? `Term 1 Rank: ${data.halfYearly.rank} / ${data.halfYearly.totalStudents || '—'}`
    : '';
  document.getElementById('rcHyTableFoot').innerHTML = `
    <tr class="rc-term-total">
      <td colspan="${hyColspan}" class="rc-tt-label">Term 1 Total</td>
      <td class="rc-tt-max">Max: ${config.grandTotalMax}</td>
      <td class="rc-tt-val">${data.halfYearly.grandTotal}</td>
      <td class="rc-tt-grade">${data.halfYearly.grade}</td>
    </tr>
    ${hyRankStr ? `<tr class="rc-rank-row"><td colspan="${hyCols}" class="rc-rank-cell">${hyRankStr}</td></tr>` : ''}
  `;

  // Co-scholastic (show Final Term grades as annual assessment)
  document.getElementById('rcHyCoscholastic').innerHTML = buildCoScholastic(data.coScholastic, config);

  // Remarks
  document.getElementById('rcHyRemark').textContent = data.remarks.halfYearly ? `"${data.remarks.halfYearly}"` : '—';
  document.getElementById('rcFtRemark').textContent = data.remarks.finalTerm ? `"${data.remarks.finalTerm}"` : '—';
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. RIGHT PANEL — TERM 2
   ═══════════════════════════════════════════════════════════════════════════ */
function renderRightPanel(data, config) {
  const isStandard = config.markScheme === 'standard';

  // Table header
  const ftHead = document.getElementById('rcFtTableHead');
  let h = '<th>Subject</th>';
  if (isStandard) {
    h += '<th>IA /10</th><th>UT /30</th><th>TE /60</th>';
  } else {
    h += '<th>IA /20</th><th>TE /80</th>';
  }
  h += '<th>Total /100</th><th>Csl. /200</th><th>Grade</th>';
  ftHead.innerHTML = h;

  // Table body
  document.getElementById('rcFtTableBody').innerHTML = buildTableRows('ft', data, config, isStandard, true);

  // Footer
  const ftCols = isStandard ? 7 : 6;
  const ftColspan = ftCols - 4;
  document.getElementById('rcFtTableFoot').innerHTML = `
    <tr class="rc-term-total">
      <td colspan="${ftColspan}" class="rc-tt-label">Term 2 Total</td>
      <td class="rc-tt-max">Max: ${config.grandTotalMax}</td>
      <td class="rc-tt-val">${data.finalTerm.grandTotal}</td>
      <td class="rc-tt-consol">${data.halfYearly.grandTotal + data.finalTerm.grandTotal}</td>
      <td class="rc-tt-grade">${data.finalTerm.grade}</td>
    </tr>
  `;

  // Summary
  const consol = data.consolidated;
  document.getElementById('rcSumTotal').textContent = consol.grandTotal;
  document.getElementById('rcSumMax').textContent = (config.grandTotalMax * 2);
  document.getElementById('rcSumPct').textContent = formatPct(consol.percentage) + '%';
  document.getElementById('rcSumGrade').textContent = consol.grade;
  document.getElementById('rcSumRank').textContent = data.finalTerm.rank || '—';
  document.getElementById('rcSumTotalStudents').textContent = data.finalTerm.totalStudents || '—';
  document.getElementById('rcSumResult').textContent = consol.result;
  document.getElementById('rcSumResult').style.color = consol.result === 'PASS' ? '#2E7D32' : '#C62828';

  const hyAtt = data.halfYearly.attendance;
  const ftAtt = data.finalTerm.attendance;
  const avgAtt = (hyAtt.total + ftAtt.total) > 0
    ? (((hyAtt.present + ftAtt.present) / (hyAtt.total + ftAtt.total)) * 100)
    : 0;
  document.getElementById('rcSumAtt').textContent = formatPct(avgAtt) + '%';

  const principalEl = document.getElementById('rcPrincipalRemark');
  if (principalEl) {
    principalEl.textContent = data.remarks.finalTerm ? `"${data.remarks.finalTerm}"` : '—';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. TABLE ROW BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildTableRows(term, data, config, isStandard, showConsol) {
  let html = '';
  const subjects = config.subjects;
  const termData = term === 'hy' ? data.halfYearly : data.finalTerm;
  const passmark = config.passmark || 40;
  const pmRatio  = passmark / 100;

  // Proportional sub-component fail thresholds
  const iaThreshStd   = Math.round(10 * pmRatio);
  const utThresh      = Math.round(30 * pmRatio);
  const examThreshStd = Math.round(60 * pmRatio);
  const iaThreshSen   = Math.round(20 * pmRatio);
  const examThreshSen = Math.round(80 * pmRatio);

  const failCls = (val, threshold) =>
    (val !== undefined && val !== null && val !== '' && val < threshold) ? ' rc-cell-fail' : '';

  for (const subj of subjects) {
    const subjData = termData.subjects[subj.key] || {};
    const total = subjData.total || 0;
    const grade = getGradeFromMarks(total);
    const gradeFail = total < passmark ? ' fail' : '';

    let cls = 'rc-row-normal';
    if (subj.isAggregate) cls = 'rc-row-aggregate';
    else if (subj.singleTotal) cls = 'rc-row-single';
    else if (!subj.countInTotal) cls = 'rc-row-component';

    html += `<tr class="${cls}"><td>${subj.label}</td>`;

    const consolSubj = data.consolidated.subjects[subj.key];
    const consolTotal = consolSubj?.total || 0;

    if (subj.isAggregate) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td>—</td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }
    else if (subj.singleTotal) {
      const blanks = isStandard ? 3 : 2;
      for (let i = 0; i < blanks; i++) html += '<td></td>';
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }
    else {
      if (isStandard) {
        html += `<td class="${failCls(subjData.ia, iaThreshStd)}">${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td class="${failCls(subjData.ut, utThresh)}">${subjData.ut !== undefined ? subjData.ut : '—'}</td>`;
        html += `<td class="${failCls(subjData.exam, examThreshStd)}">${subjData.exam !== undefined ? subjData.exam : '—'}</td>`;
      } else {
        html += `<td class="${failCls(subjData.ia, iaThreshSen)}">${subjData.ia !== undefined ? subjData.ia : '—'}</td>`;
        html += `<td class="${failCls(subjData.exam, examThreshSen)}">${subjData.exam !== undefined ? subjData.exam : '—'}</td>`;
      }
      html += `<td class="rc-cell-total${failCls(subjData.total, passmark)}">${total}</td>`;
      if (showConsol) {
        html += `<td class="rc-cell-consol${failCls(consolSubj?.total, passmark * 2)}">${consolTotal}</td>`;
      }
      html += `<td class="rc-cell-grade"><span class="rc-grade-pill${gradeFail}">${grade}</span></td>`;
    }

    html += '</tr>';
  }

  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. CO-SCHOLASTIC BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */
function buildCoScholastic(coData, config) {
  if (!coData) return '';
  let html = `
    <div class="rc-coschol-header">
      <span></span>
      <span class="rc-coschol-hdr-terms"><span>T1</span><span>T2</span></span>
    </div>
  `;
  for (const item of config.coScholastic) {
    const vals = coData[item.key];
    const hyGrade = vals?.halfYearly || '—';
    const ftGrade = vals?.finalTerm  || '—';
    html += `
      <div class="rc-coschol-item">
        <span class="rc-coschol-label">${item.label}</span>
        <span class="rc-coschol-terms">
          <span class="rc-coschol-grade">${hyGrade}</span>
          <span class="rc-coschol-grade">${ftGrade}</span>
        </span>
      </div>
    `;
  }
  return html;
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. FUTURE-READY API SURFACE
   ═══════════════════════════════════════════════════════════════════════════
   The window.SFDS namespace exposes the report-card renderer for external
   orchestration (e.g., bulk-print loops, Firebase hydration, JSON import).
   JSON schema expected in sessionStorage key "sfds_studentData":
   {
     "class": number,
     "section": string,
     "session": string,
     "student": { name, rollNo, admissionNo, dob, house },
     "halfYearly": { attendance:{present,total}, grandTotal, grade, subjects:{...} },
     "finalTerm":  { attendance:{present,total}, grandTotal, grade, rank, totalStudents, subjects:{...} },
     "consolidated": { grandTotal, percentage, grade, result, subjects:{...} },
     "coScholastic": { key: { halfYearly, finalTerm } },
     "remarks": { halfYearly, finalTerm }
   }
   ═══════════════════════════════════════════════════════════════════════════ */
window.SFDS = window.SFDS || {};
window.SFDS.version = '1.0';
window.SFDS.renderReportCard = render;
window.SFDS.getGradeFromMarks = getGradeFromMarks;
window.SFDS.formatPct = formatPct;

/* ═══════════════════════════════════════════════════════════════════════════
   12. INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', render);
