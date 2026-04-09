import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

function getAnswerText(item: ChecklistItem, r: any): string {
    if (!r) return 'Not answered';
    if (item.input_type === 'yes_no') {
        if (r.answer === 'yes') return `Yes`;
        if (r.answer === 'no') return 'No';
        if (r.answer === 'manual') return `Manual: ${r.marks}`;
    }
    if (item.input_type === 'single_select') {
        const opt = item.options?.[r.selected];
        return opt ? opt.label : 'Not answered';
    }
    if (item.input_type === 'negative_select') {
        return NEGATIVE_LABELS[r.selected] || r.selected;
    }
    if (item.input_type === 'numerical') {
        return `${r.score} / ${item.max_marks}`;
    }
    return 'Not answered';
}

function getStarLabel(stars: number): string {
    if (stars === 5) return 'Excellent';
    if (stars === 4) return 'Good';
    if (stars === 3) return 'Average';
    if (stars === 2) return 'Below Average';
    return 'Poor';
}

function isVisible(item: ChecklistItem, responses: Record<string, any>): boolean {
    if (!item.visibility_condition) return true;
    const { dependsOn, showWhen } = item.visibility_condition;
    const parent = responses[dependsOn];
    if (!parent) return false;
    return parent.selected === showWhen;
}

export async function generateAndSharePDF(
    resort: Resort,
    inspection: any,
    items: ChecklistItem[]
) {
    const categories = ['A', 'B', 'C'];
    const responses = inspection.responses || {};
    const stars = '★'.repeat(inspection.stars) + '☆'.repeat(5 - inspection.stars);

    let tableRows = '';
    categories.forEach(cat => {
        const catItems = items.filter(i => i.category === cat && isVisible(i, responses));
        if (catItems.length === 0) return;
        const catScore = catItems.reduce((sum, i) => sum + (responses[i.id]?.marks || 0), 0);

        tableRows += `
      <tr style="background:#D5EFEF;">
        <td colspan="3" style="padding:8px;font-weight:700;color:#0D7377;">${CATEGORY_LABELS[cat]}</td>
        <td style="padding:8px;font-weight:700;color:#0D7377;text-align:right;">${catScore}</td>
      </tr>`;

        catItems.forEach(item => {
            const r = responses[item.id];
            const marks = r?.marks ?? 0;
            const marksColor = marks < 0 ? '#E63946' : '#1A1A2E';
            const answered = !!r;
            tableRows += `
        <tr style="border-bottom:1px solid #E0E8EA;">
          <td style="padding:6px 8px;color:#0D7377;font-weight:600;width:50px;">${item.id.toUpperCase()}</td>
          <td style="padding:6px 8px;color:#1A1A2E;">
            <div style="font-weight: 600; margin-bottom: 2px;">${item.label}</div>
            ${item.description ? `<div style="font-size: 11px; color: #666;">${item.description}</div>` : ''}
          </td>
          <td style="padding:6px 8px;color:${answered ? '#1A1A2E' : '#E63946'};">${getAnswerText(item, r)}</td>
          <td style="padding:6px 8px;text-align:right;font-weight:600;color:${marksColor};">${marks}</td>
        </tr>`;
        });
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1A1A2E; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #0D7377; font-size: 22px; margin: 0; }
        .header h2 { color: #8A9BAE; font-size: 14px; font-weight: normal; margin: 4px 0 0; }
        .info-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
        .info-table td { padding: 6px 12px; border: 1px solid #E0E8EA; font-size: 13px; }
        .info-table .label { background: #EEF4F5; font-weight: 600; width: 140px; color: #0D7377; }
        .score-box { text-align: center; margin: 20px 0; padding: 16px; border: 2px solid #0D9DA8; border-radius: 12px; }
        .score-box .score { font-size: 32px; font-weight: 700; color: #0D7377; }
        .score-box .stars { font-size: 20px; color: #F4A423; margin: 4px 0; }
        .score-box .label { font-size: 14px; color: #0D7377; }
        .checklist { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        .checklist th { background: #0D7377; color: #fff; padding: 8px; text-align: left; }
        .checklist th:last-child { text-align: right; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; }
        .signature-row { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature-box { width: 45%; text-align: center; }
        .signature-line { border-top: 1px solid #1A1A2E; margin-top: 60px; padding-top: 8px; font-size: 12px; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #8A9BAE; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SGLR Inspection Report</h1>
        <h2>Swachha Green Leaf Rating — Bapatla District, Chirala Division</h2>
      </div>

      <table class="info-table">
        <tr><td class="label">Resort Name</td><td>${resort.serial_no}. ${resort.name}</td></tr>
        <tr><td class="label">Area</td><td>${resort.area}</td></tr>
        <tr><td class="label">Owner</td><td>${resort.owner_name || 'N/A'}</td></tr>
        <tr><td class="label">Phone</td><td>${resort.owner_phone || 'N/A'}</td></tr>
        <tr><td class="label">Rooms</td><td>${resort.room_count ?? 'N/A'}</td></tr>
        <tr><td class="label">Status</td><td>${inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1)}</td></tr>
        <tr><td class="label">Inspection Date</td><td>${new Date(inspection.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        ${inspection.district_comments ? `<tr><td class="label">District Comments</td><td>${inspection.district_comments}</td></tr>` : ''}
      </table>

      <table class="checklist">
        <tr>
          <th>ID</th>
          <th>Parameter</th>
          <th>Response</th>
          <th>Marks</th>
        </tr>
        ${tableRows}
      </table>

      <div class="score-box" style="margin-top: 40px; border: 1px solid #E0E8EA; border-radius: 8px; padding: 24px; text-align: center;">
        <div class="stars" style="color: #F4A423; font-size: 36px; letter-spacing: 4px; margin-bottom: 12px;">
           ${stars}
        </div>
        <div class="label" style="font-size: 14px; color: #1A1A2E;">
           ${inspection.stars} out of 5 stars
        </div>
      </div>

      <div class="committee-section" style="margin-top: 50px;">
        <div class="committee-title" style="color: #0D7377; font-size: 14px; margin-bottom: 6px;">Divisional Committee Members</div>
        <div style="border-bottom: 2px solid #0D7377; margin-bottom: 60px;"></div>
        
        <table style="width: 100%; text-align: center; font-size: 11px;">
          <tr>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 1</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 2</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 3</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 4</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 5</div></td>
          </tr>
        </table>
      </div>

      <div class="committee-section" style="margin-top: 50px;">
        <div class="committee-title" style="color: #0D7377; font-size: 14px; margin-bottom: 6px;">District Committee Members</div>
        <div style="border-bottom: 2px solid #0D7377; margin-bottom: 60px;"></div>
        
        <table style="width: 100%; text-align: center; font-size: 11px;">
          <tr>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 1</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 2</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 3</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 4</div></td>
            <td style="width: 2.5%;"></td>
            <td style="width: 18%;"><div style="border-top: 1px solid #1A1A2E; padding-top: 6px;">Member 5</div></td>
          </tr>
        </table>
      </div>

      <div class="footer">
        Generated by SGLR Rating App • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </body>
    </html>
  `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `SGLR Report - ${resort.name}` });
}