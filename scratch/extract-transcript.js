const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logFilePath = '/Users/apple/.gemini/antigravity/brain/3b43d6b8-a9e5-41e7-aba2-d320b9875aed/.system_generated/logs/transcript.jsonl';

async function run() {
    const fileStream = fs.createReadStream(logFilePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let index = 0;
    for await (const line of rl) {
        index++;
        try {
            const data = JSON.parse(line);
            if (data.type === 'USER_INPUT' || data.source === 'USER_EXPLICIT') {
                const content = data.content || '';
                if (content.length > 5000) {
                    console.log(`Step ${index}: Type: ${data.type}, Length: ${content.length}`);
                    if (content.includes('Evergreen Academy')) {
                        console.log(`  Contains 'Evergreen Academy'!`);
                        fs.writeFileSync(path.join(__dirname, `user_input_step_${index}.txt`), content);
                        console.log(`  Saved to scratch/user_input_step_${index}.txt`);
                    }
                }
            }
        } catch (err) {
            // Ignore parse errors
        }
    }
}

run().catch(console.error);
