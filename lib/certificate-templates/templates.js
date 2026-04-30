/**
 * Pre-defined HTML templates for Formal Certificates
 * Now using Handlebars syntax and Plain CSS
 */

export const FORMAL_TEMPLATES = {
    BONAFIDE: {
        name: "Standard Bonafide Certificate",
        category: "BONAFIDE",
        html: `
<div class="document-container bonafide">
    <div class="header">
        <h1>{{institute.name}}</h1>
        <p class="address">{{institute.address}}</p>
        {{#if institute.udiseNumber}}
        <p class="udise">UDISE NO: {{institute.udiseNumber}}</p>
        {{/if}}
    </div>

    <div class="title-section">
        <h2>BONAFIDE CERTIFICATE</h2>
    </div>

    <div class="content">
        <p>This is to certify that Master/Miss <span class="field-value">{{student.fullName}}</span>,</p>
        
        <p>Son/Daughter of Shri <span class="field-value">{{student.fatherName}}</span>,</p>
        
        <p>is a bonafide student of <span class="font-bold">{{institute.name}}</span>, studying in the <span class="font-bold">{{course.name}}</span> course during the academic year <span class="font-bold">{{academicYear}}</span>.</p>
        
        <p>His/Her date of birth as per the school records is <span class="font-bold">{{student.dob}}</span>.</p>
        
        <p>To the best of my knowledge, he/she bears a <span class="font-bold">{{metadata.conduct}}</span> moral character.</p>
    </div>

    <div class="footer">
        <div class="date-place">
            <p><strong>Date:</strong> {{certificate.issueDate}}</p>
            <p><strong>Place:</strong> {{institute.address}}</p>
        </div>
        <div class="signature">
            <div class="sig-line"></div>
            <p class="role">Principal / Director</p>
            <p class="seal">(Seal of the Institute)</p>
        </div>
    </div>
</div>
        `,
        css: `
.document-container {
    padding: 40px;
    border: 10px double #cbd5e1;
    height: 100%;
    box-sizing: border-box;
    font-family: 'Lora', serif;
}
.header {
    text-align: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 20px;
    margin-bottom: 40px;
}
.header h1 {
    font-size: 28px;
    margin: 0;
    text-transform: uppercase;
}
.header .address {
    font-size: 14px;
    color: #475569;
    margin: 5px 0;
}
.title-section {
    text-align: center;
    margin-bottom: 50px;
}
.title-section h2 {
    font-size: 24px;
    text-decoration: underline;
    letter-spacing: 2px;
    margin: 0;
}
.content {
    font-size: 18px;
    line-height: 1.8;
}
.field-value {
    font-weight: 900;
    border-bottom: 1px dotted #000;
    padding: 0 10px;
}
.footer {
    margin-top: 100px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
}
.sig-line {
    width: 200px;
    border-top: 2px solid #000;
    margin-bottom: 5px;
}
.signature {
    text-align: center;
}
.role {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 14px;
    margin: 0;
}
.seal {
    font-size: 10px;
    color: #64748b;
    margin: 0;
}
        `
    },
    LEAVING_CERTIFICATE: {
        name: "Standard School Leaving Certificate",
        category: "LEAVING_CERTIFICATE",
        html: `
<div class="document-container lc">
    <div class="header">
        <h1>{{institute.name}}</h1>
        <p class="address">{{institute.address}}</p>
        <div class="lc-title">School Leaving Certificate</div>
    </div>

    <div class="top-meta">
        <div class="meta-item"><strong>G.R. No:</strong> {{student.grNumber}}</div>
        <div class="meta-item"><strong>Serial No:</strong> {{certificate.number}}</div>
    </div>

    <table class="lc-table">
        <tr>
            <td class="col-idx">1</td>
            <td class="col-label">Name of the Student</td>
            <td class="col-value font-bold">{{student.fullName}}</td>
        </tr>
        <tr>
            <td class="col-idx">2</td>
            <td class="col-label">Mother's Name</td>
            <td class="col-value">{{student.motherName}}</td>
        </tr>
        <tr>
            <td class="col-idx">3</td>
            <td class="col-label">Father's Name</td>
            <td class="col-value">{{student.fatherName}}</td>
        </tr>
        <tr>
            <td class="col-idx">4</td>
            <td class="col-label">Nationality</td>
            <td class="col-value">{{student.nationality}}</td>
        </tr>
        <tr>
            <td class="col-idx">5</td>
            <td class="col-label">Religion & Caste</td>
            <td class="col-value">{{student.religion}} - {{student.caste}}</td>
        </tr>
        <tr>
            <td class="col-idx">6</td>
            <td class="col-label">Place of Birth</td>
            <td class="col-value">{{student.placeOfBirth}}</td>
        </tr>
        <tr>
            <td class="col-idx">7</td>
            <td class="col-label">Date of Birth (Digits)</td>
            <td class="col-value font-bold">{{student.dob}}</td>
        </tr>
        <tr>
            <td class="col-idx">8</td>
            <td class="col-label">Last School Attended</td>
            <td class="col-value">{{student.lastSchool}}</td>
        </tr>
        <tr>
            <td class="col-idx">9</td>
            <td class="col-label">Date of Admission</td>
            <td class="col-value">{{student.admissionDate}}</td>
        </tr>
        <tr>
            <td class="col-idx">10</td>
            <td class="col-label">Progress</td>
            <td class="col-value">{{metadata.progress}}</td>
        </tr>
        <tr>
            <td class="col-idx">11</td>
            <td class="col-label">Conduct</td>
            <td class="col-value">{{metadata.conduct}}</td>
        </tr>
        <tr>
            <td class="col-idx">12</td>
            <td class="col-label">Date of Leaving School</td>
            <td class="col-value">{{metadata.dateOfLeaving}}</td>
        </tr>
        <tr>
            <td class="col-idx">13</td>
            <td class="col-label">Standard Studying</td>
            <td class="col-value">{{course.name}}</td>
        </tr>
        <tr>
            <td class="col-idx">14</td>
            <td class="col-label">Reason for Leaving</td>
            <td class="col-value">{{metadata.leavingReason}}</td>
        </tr>
        <tr>
            <td class="col-idx">15</td>
            <td class="col-label">Remarks</td>
            <td class="col-value italic">{{metadata.remarks}}</td>
        </tr>
    </table>

    <div class="lc-footer">
        <p class="certification">Certified that the above information is in accordance with the School General Register.</p>
        <div class="sig-section">
            <div class="sig-box">Class Teacher</div>
            <div class="sig-box">Clerk</div>
            <div class="sig-box">Principal / Director</div>
        </div>
    </div>
</div>
        `,
        css: `
.document-container {
    padding: 30px;
    border: 2px solid #000;
    height: 100%;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
}
.header {
    text-align: center;
    margin-bottom: 20px;
}
.header h1 {
    font-size: 22px;
    margin: 0;
    text-transform: uppercase;
}
.header .address {
    font-size: 11px;
    margin: 5px 0;
}
.lc-title {
    font-size: 18px;
    font-weight: bold;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 5px 0;
    margin-top: 10px;
    text-transform: uppercase;
}
.top-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
}
.lc-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000;
}
.lc-table td {
    border: 1px solid #000;
    padding: 6px 10px;
}
.col-idx {
    width: 30px;
    text-align: center;
    font-weight: bold;
}
.col-label {
    width: 250px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
}
.col-value {
    font-size: 14px;
}
.font-bold { font-weight: bold; }
.italic { font-style: italic; }
.lc-footer {
    margin-top: 30px;
}
.certification {
    font-size: 11px;
    font-weight: bold;
}
.sig-section {
    display: flex;
    justify-content: space-between;
    margin-top: 50px;
}
.sig-box {
    width: 150px;
    border-top: 1px solid #000;
    padding-top: 5px;
    text-align: center;
    font-weight: bold;
}
        `
    }
};
