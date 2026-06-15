const fs = require('fs');
const readline = require('readline');

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
            if (data.type === 'USER_INPUT') {
                console.log(`Step ${index}: ${data.content.substring(0, 150).replace(/\n/g, ' ')}`);
            }
        } catch (err) {}
    }
}

run().catch(console.error);
