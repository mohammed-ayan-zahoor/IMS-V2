const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', new mongoose.Schema({
            action: String,
            resource: Object,
            details: Object,
            createdAt: Date
        }, { collection: 'auditlogs' }));

        const logs = await AuditLog.find({ 
            action: 'subject.update',
            'resource.id': new mongoose.Types.ObjectId('69d886ada09c84932ef26136')
        }).sort({ createdAt: -1 }).limit(5).lean();

        console.log('Recent subject update logs:', JSON.stringify(logs, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAudit();
