import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

type Resort = {
  name: string;
  serial_no: number;
  area: string;
  owner_name: string | null;
  owner_phone: string | null;
  room_count: number | null;
};

type ChecklistItem = {
  id: string;
  category: string;
  subcategory: string;
  label: string;
  description: string | null;
  input_type: string;
  min_marks: number;
  max_marks: number;
  options: any[] | null;
  visibility_condition: any | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  A: 'A. Faecal Sludge Management (80 Marks)',
  B: 'B. Solid Waste Management (80 Marks)',
  C: 'C. Grey Water Management (40 Marks)',
};

const NEGATIVE_LABELS: Record<string, string> = {
  single_pit: 'Single-pit toilet',
  septic_tank: 'Septic tank',
  offsite_stp: 'Off-site STP via sewer',
  onsite_stp: 'On-site decentralised STP',
};

const commonStyles = `
  body { font-family: Arial, sans-serif; padding: 16px; color: #1A1A2E; font-size: 12px; }
  .header { text-align: center; margin-bottom: 16px; }
  .header h1 { color: #0D7377; font-size: 20px; margin: 0 0 4px; }
  .resort-name { font-size: 16px; font-weight: 700; color: #1A1A2E; text-align: center; margin-bottom: 16px; }
  .cat-header { background: #D5EFEF; padding: 8px 12px; font-weight: 700; color: #0D7377; font-size: 13px; margin-top: 12px; }
  .item { border-bottom: 1px solid #E0E8EA; padding: 8px 12px; }
  .item-label { font-weight: 600; margin-bottom: 4px; }
  .item-id { color: #0D9DA8; font-weight: 700; margin-right: 6px; }
  .sub-item { margin-left: 20px; padding: 6px 12px; border-left: 2px solid #0D9DA8; margin-top: 4px; }
  table.score-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  table.score-table td, table.score-table th { padding: 6px 12px; border: 1px solid #E0E8EA; font-size: 12px; }
  table.score-table th { background: #0D7377; color: #fff; text-align: left; }
  .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #8A9BAE; }
`;

// ============ PRE-INSPECTION (BLANK) ============

function buildPreInspectionItem(item: ChecklistItem, isConditional = false): string {
  let inputHtml = '';

  if (item.input_type === 'yes_no') {
    inputHtml = `
      <div style="margin-top:4px;color:#555;">
        ☐ Yes (${item.max_marks}) &nbsp;&nbsp; ☐ No (0) &nbsp;&nbsp; ☐ Manual: ____/${item.max_marks}
      </div>`;
  }

  if (item.input_type === 'single_select' && item.options) {
    inputHtml = '<div style="margin-top:4px;color:#555;">';
    item.options.forEach((opt: any) => {
      inputHtml += `<div style="margin:2px 0;">☐ ${escapeHtml(opt.label)} (${opt.marks} marks)</div>`;
    });
    inputHtml += '</div>';
  }

  if (item.input_type === 'negative_select' && item.options) {
    inputHtml = '<div style="margin-top:4px;color:#555;">';
    item.options.forEach((opt: any) => {
      if (opt.marks === -8) {
        inputHtml += `<div style="margin:2px 0;">☐ ${escapeHtml(opt.label)} <span style="color:#E63946;">(-8 marks)</span></div>`;
      } else if (opt.hasDesludge) {
        inputHtml += `
          <div style="margin:2px 0;">☐ ${escapeHtml(opt.label)}</div>
          <div style="margin-left:20px;border-left:2px solid #0D9DA8;padding-left:8px;margin:4px 0 4px 20px;">
            Conformity score: ____/${opt.subScoreMax}<br/>
            Mechanical desludging: ☐ Yes (10) &nbsp; ☐ No (0)
          </div>`;
      } else {
        inputHtml += `
          <div style="margin:2px 0;">☐ ${escapeHtml(opt.label)}</div>
          <div style="margin-left:20px;border-left:2px solid #0D9DA8;padding-left:8px;margin:4px 0 4px 20px;">
            Score: ____/${opt.subScoreMax}
          </div>`;
      }
    });
    inputHtml += '</div>';
  }

  if (item.input_type === 'numerical') {
    inputHtml = `<div style="margin-top:4px;color:#555;">Score: ____/${item.max_marks}</div>`;
  }

  const conditionalNote = isConditional && item.visibility_condition
    ? `<div style="font-size:10px;color:#0D7377;font-style:italic;margin-bottom:2px;">↳ Fill only if parent question answered "${item.visibility_condition.showWhen ?? ''}"</div>`
    : '';

  return `
    <div class="item" ${isConditional ? 'style="margin-left:16px;border-left:2px solid #0D9DA8;padding-left:10px;"' : ''}>
      <div class="item-label"><span class="item-id">${escapeHtml(item.id.toUpperCase())}</span>${escapeHtml(item.label)}</div>
      ${item.description ? `<div style="font-size:11px;color:#8A9BAE;margin-bottom:2px;">${escapeHtml(item.description)}</div>` : ''}
      ${conditionalNote}
      ${inputHtml}
    </div>`;
}

export async function generatePreInspectionPDF(resort: Resort, items: ChecklistItem[]) {
  const categories = ['A', 'B', 'C'];

  // Group conditional items under their parent so the paper checklist mirrors the screen flow
  const conditionalChildren = new Map<string, ChecklistItem[]>();
  items.forEach(i => {
    const parent = i.visibility_condition?.dependsOn;
    if (parent) {
      if (!conditionalChildren.has(parent)) conditionalChildren.set(parent, []);
      conditionalChildren.get(parent)!.push(i);
    }
  });

  const mainItems = items.filter(i => !i.visibility_condition);

  let body = '';
  categories.forEach(cat => {
    const catItems = mainItems.filter(i => i.category === cat);
    if (catItems.length === 0) return;
    body += `<div class="cat-header">${CATEGORY_LABELS[cat]}</div>`;
    catItems.forEach(item => {
      body += buildPreInspectionItem(item);
      (conditionalChildren.get(item.id) ?? []).forEach(child => {
        body += buildPreInspectionItem(child, true);
      });
    });
  });

  body += `
    <table class="score-table" style="margin-top:20px;">
      <tr><th>Category</th><th>Max Marks</th><th>Marks Awarded</th></tr>
      <tr><td>A. Faecal Sludge Management</td><td>80</td><td></td></tr>
      <tr><td>B. Solid Waste Management</td><td>80</td><td></td></tr>
      <tr><td>C. Grey Water Management</td><td>40</td><td></td></tr>
      <tr style="font-weight:700;"><td>Total</td><td>200</td><td></td></tr>
    </table>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}</style></head><body>
    <div class="header"><h1>SGLR RATING</h1></div>
    <div class="resort-name">${resort.serial_no}. ${escapeHtml(resort.name)}</div>
    ${body}
    <div class="footer">Generated by SGLR Rating App</div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `SGLR Checklist - ${resort.name}` });
}

// ============ POST-INSPECTION (FILLED) ============

function getAnswerText(item: ChecklistItem, r: any): string {
  if (!r) return '<span style="color:#E63946;">Not answered</span>';
  if (item.input_type === 'yes_no') {
    if (r.answer === 'yes') return 'Yes';
    if (r.answer === 'no') return 'No';
    if (r.answer === 'manual') return `Manual: ${r.marks}`;
  }
  if (item.input_type === 'single_select') {
    const opt = item.options?.[r.selected];
    return opt ? escapeHtml(opt.label) : 'Not answered';
  }
  if (item.input_type === 'negative_select') {
    const label = escapeHtml(NEGATIVE_LABELS[r.selected] || r.selected);
    if (r.selected === 'septic_tank') return `${label} (Score: ${r.subScore}/22)`;
    if (r.selected === 'offsite_stp') return `${label} (Score: ${r.subScore}/32)`;
    if (r.selected === 'onsite_stp') return `${label} (Score: ${r.subScore}/32)`;
    return `${label}`;
  }
  if (item.input_type === 'numerical') {
    return `${r.score} / ${item.max_marks}`;
  }
  return 'Not answered';
}

function isVisible(item: ChecklistItem, responses: Record<string, any>): boolean {
  if (!item.visibility_condition) return true;
  const { dependsOn, showWhen } = item.visibility_condition;
  const parent = responses[dependsOn];
  if (!parent) return false;
  return parent.selected === showWhen;
}

function getStarLabel(stars: number): string {
  if (stars === 5) return 'Excellent';
  if (stars === 4) return 'Good';
  if (stars === 3) return 'Average';
  if (stars === 2) return 'Below Average';
  return 'Poor';
}

export async function generatePostInspectionPDF(
  resort: Resort,
  inspection: any,
  items: ChecklistItem[]
) {
  const categories = ['A', 'B', 'C'];
  const responses = inspection.responses || {};
  const stars = '★'.repeat(inspection.stars) + '☆'.repeat(5 - inspection.stars);

  let tableRows = '';
  const catScores: Record<string, number> = {};

  categories.forEach(cat => {
    const catItems = items.filter(i => i.category === cat && isVisible(i, responses));
    if (catItems.length === 0) return;
    const catScore = catItems.reduce((sum, i) => sum + (responses[i.id]?.marks || 0), 0);
    catScores[cat] = catScore;

    tableRows += `<tr style="background:#D5EFEF;"><td colspan="3" style="padding:8px;font-weight:700;color:#0D7377;">${CATEGORY_LABELS[cat]}</td><td style="padding:8px;font-weight:700;color:#0D7377;text-align:right;">${catScore}</td></tr>`;

    catItems.forEach(item => {
      const r = responses[item.id];
      const marks = r?.marks ?? 0;
      const marksColor = marks < 0 ? '#E63946' : '#1A1A2E';
      const answered = !!r;
      const isConditional = !!item.visibility_condition;
      const answerText = getAnswerText(item, r);
      const labelCell = isConditional
        ? `<span style="color:#0D7377;">↳ </span>${escapeHtml(item.label)}`
        : escapeHtml(item.label);
      const rowBg = isConditional ? 'background:#F7FBFB;' : '';

      tableRows += `
        <tr style="border-bottom:1px solid #E0E8EA;${rowBg}">
          <td style="padding:6px 8px;color:#0D9DA8;font-weight:600;width:50px;">${escapeHtml(item.id.toUpperCase())}</td>
          <td style="padding:6px 8px;">${labelCell}</td>
          <td style="padding:6px 8px;color:${answered ? '#1A1A2E' : '#E63946'};">${answerText}</td>
          <td style="padding:6px 8px;text-align:right;font-weight:600;color:${marksColor};">${marks}</td>
        </tr>`;
    });
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${commonStyles}
    .score-box { text-align:center; margin:16px 0; padding:16px; border:2px solid #0D9DA8; border-radius:12px; }
    .score-big { font-size:28px; font-weight:700; color:#0D7377; }
    .stars-big { font-size:18px; color:#F4A423; margin:4px 0; }
    .perf-label { font-size:14px; color:#0D7377; font-weight:600; }
    .info-row { display:flex; gap:20px; margin-bottom:4px; font-size:12px; }
    .info-label { color:#0D7377; font-weight:600; min-width:60px; }
  </style></head><body>
    <div class="header"><h1>SGLR RATING</h1></div>
    <div class="resort-name">${resort.serial_no}. ${escapeHtml(resort.name)}</div>

    <div style="margin-bottom:12px;font-size:12px;">
      <div class="info-row"><span class="info-label">Area:</span> ${escapeHtml(resort.area) || 'N/A'}</div>
      <div class="info-row"><span class="info-label">Owner:</span> ${escapeHtml(resort.owner_name) || 'N/A'}</div>
      <div class="info-row"><span class="info-label">Phone:</span> ${escapeHtml(resort.owner_phone) || 'N/A'}</div>
      <div class="info-row"><span class="info-label">Rooms:</span> ${resort.room_count ?? 'N/A'}</div>
      <div class="info-row"><span class="info-label">Status:</span> ${escapeHtml(inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1))}</div>
      <div class="info-row"><span class="info-label">Date:</span> ${new Date(inspection.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      ${inspection.district_comments ? `<div class="info-row"><span class="info-label">Comments:</span> ${escapeHtml(inspection.district_comments)}</div>` : ''}
    </div>

    <div class="score-box">
      <div class="score-big">${inspection.total_score} / 200</div>
      <div class="stars-big">${stars}</div>
      <div class="perf-label">${getStarLabel(inspection.stars)}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="background:#0D7377;">
        <th style="padding:8px;color:#fff;text-align:left;">ID</th>
        <th style="padding:8px;color:#fff;text-align:left;">Parameter</th>
        <th style="padding:8px;color:#fff;text-align:left;">Response</th>
        <th style="padding:8px;color:#fff;text-align:right;">Marks</th>
      </tr>
      ${tableRows}
    </table>

    <table class="score-table" style="margin-top:16px;">
      <tr><th>Category</th><th>Max</th><th>Awarded</th></tr>
      <tr><td>A. Faecal Sludge Management</td><td>80</td><td>${catScores['A'] || 0}</td></tr>
      <tr><td>B. Solid Waste Management</td><td>80</td><td>${catScores['B'] || 0}</td></tr>
      <tr><td>C. Grey Water Management</td><td>40</td><td>${catScores['C'] || 0}</td></tr>
      <tr style="font-weight:700;"><td>Total</td><td>200</td><td>${inspection.total_score}</td></tr>
    </table>

    <div style="text-align:center;margin-top:16px;font-size:16px;color:#F4A423;">${stars}</div>
    <div style="text-align:center;font-size:14px;color:#0D7377;font-weight:600;">${inspection.stars} out of 5 stars</div>

    <div style="margin-top:40px;">
      <div style="font-weight:700;color:#0D7377;margin-bottom:20px;">Divisional Committee Members</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 1</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 2</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 3</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 4</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 5</td>
        </tr>
      </table>
    </div>

    <div style="margin-top:40px;">
      <div style="font-weight:700;color:#0D7377;margin-bottom:20px;">District Committee Members</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 1</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 2</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 3</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 4</td>
          <td style="width:20%;text-align:center;padding-top:50px;border-top:1px solid #1A1A2E;font-size:11px;">Member 5</td>
        </tr>
      </table>
    </div>
    <div class="footer">Generated by SGLR Rating App • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `SGLR Report - ${resort.name}` });
}