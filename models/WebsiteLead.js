import mongoose from 'mongoose';

const WebsiteLeadSchema = new mongoose.Schema({
    instituteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    websiteConfigId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WebsiteConfig',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'qualified', 'closed'],
        default: 'new'
    },
    source: {
        type: String,
        default: 'website_contact_form'
    },
    metadata: {
        ip: String,
        userAgent: String,
        pageUrl: String
    }
}, { timestamps: true });

export default mongoose.models.WebsiteLead || mongoose.model('WebsiteLead', WebsiteLeadSchema);
