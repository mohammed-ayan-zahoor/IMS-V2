const XLSX = require('xlsx');

const filePath = '/Users/apple/Projects/Client/IMS-V2/Student List.xlsx';

function run() {
    try {
        console.log("Reading workbook...");
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        console.log("Sheet names in the Excel file:", sheetNames);

        for (const sheetName of sheetNames) {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            console.log(`Total rows in sheet: ${json.length}`);
            
            if (json.length > 0) {
                console.log("Columns:", Object.keys(json[0]));
                console.log("First 3 rows sample:");
                console.log(JSON.stringify(json.slice(0, 3), null, 2));
            } else {
                console.log("Sheet is empty.");
            }
        }

    } catch (err) {
        console.error("Error reading Excel:", err);
    }
}

run();
