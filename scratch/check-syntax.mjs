import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('components/admin/CertificateTemplateManager.jsx', 'utf8');

try {
    parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
    });
    console.log('✅ Syntax is correct');
} catch (err) {
    console.error('❌ Syntax error:', err.message);
    console.error('Line:', err.loc.line, 'Column:', err.loc.column);
}
