import fs from 'fs';

const code = fs.readFileSync('components/admin/CertificateTemplateManager.jsx', 'utf8');
let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        if (char === '{') stack.push({ char: '{', line: i + 1 });
        if (char === '(') stack.push({ char: '(', line: i + 1 });
        if (char === '[') stack.push({ char: '[', line: i + 1 });
        
        if (char === '}') {
            let last = stack.pop();
            if (!last || last.char !== '{') {
                console.log(`Unmatched } at line ${i + 1}, col ${j + 1}. Last open: ${JSON.stringify(last)}`);
            }
        }
        if (char === ')') {
            let last = stack.pop();
            if (!last || last.char !== '(') {
                console.log(`Unmatched ) at line ${i + 1}, col ${j + 1}. Last open: ${JSON.stringify(last)}`);
            }
        }
        if (char === ']') {
            let last = stack.pop();
            if (!last || last.char !== '[') {
                console.log(`Unmatched ] at line ${i + 1}, col ${j + 1}. Last open: ${JSON.stringify(last)}`);
            }
        }
    }
}
if (stack.length > 0) {
    console.log('Unclosed brackets:', stack);
} else {
    console.log('All brackets are balanced!');
}
