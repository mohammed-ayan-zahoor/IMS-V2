/**
 * Test script to validate ID card generation data flow
 * Usage: NODE_ENV=development node scripts/test-idcard-data.js
 */

import { connectDB } from '../lib/mongodb.js';
import User from '../models/User.js';
import Batch from '../models/Batch.js';
import IDCardTemplate from '../models/IDCardTemplate.js';
import Institute from '../models/Institute.js';

// Import the getHydratedContext function
const { getHydratedContext } = await import('../services/certificateService.js');

// Test field mapping
const testFieldMapping = {
    // Basic Student Info
    'studentName': 'student.fullName',
    'firstName': 'student.firstName',
    'lastName': 'student.lastName',
    
    // Identification
    'grNumber': 'student.grNumber',
    'enrollmentNo': 'student.enrollmentNo',
    'rollNo': 'student.rollNo',
    
    // Academic Info
    'batchName': 'batch.name',
    'courseName': 'course.name',
    'std': 'std',
    
    // Contact & Personal
    'phone': 'student.phone',
    'email': 'student.email',
    'gender': 'student.gender',
    'dob': 'student.dob',
    
    // Family
    'fatherName': 'student.fatherName',
    'motherName': 'student.motherName',
    
    // Address
    'city': 'student.city',
    'state': 'student.state',
    
    // Academic History
    'admissionDate': 'student.admissionDate',
    'joiningDate': 'student.joiningDate',
    
    // Institute
    'instituteName': 'institute.name',
};

async function testDataFlow() {
    try {
        await connectDB();
        console.log('✓ Connected to MongoDB\n');
        
        // 1. Find a test institute
        const institute = await Institute.findOne().lean();
        if (!institute) {
            console.error('✗ No institute found in database');
            process.exit(1);
        }
        console.log(`✓ Found institute: ${institute.name} (${institute._id})\n`);
        
        // 2. Find a test student
        const student = await User.findOne({ 
            institute: institute._id,
            role: 'student'
        }).lean();
        
        if (!student) {
            console.error('✗ No student found for this institute');
            process.exit(1);
        }
        console.log(`✓ Found student: ${student.email}\n`);
        
        // 3. Find batch for this student
        const batch = await Batch.findOne({
            'enrolledStudents.student': student._id,
            deletedAt: null
        }).populate('course').lean();
        
        if (batch) {
            console.log(`✓ Found batch: ${batch.name}`);
            console.log(`  Course: ${batch.course?.name || 'N/A'}\n`);
        } else {
            console.warn('⚠ No batch found for this student - this may cause missing fields\n');
        }
        
        // 4. Get hydrated context
        console.log('Testing data hydration...\n');
        const context = await getHydratedContext(student._id, institute._id, {
            batchId: batch?._id
        });
        
        // 5. Test field resolution
        console.log('Field Resolution Test:');
        console.log('='.repeat(60));
        
        let availableFields = 0;
        let missingFields = 0;
        
        for (const [fieldName, dataPath] of Object.entries(testFieldMapping)) {
            const parts = dataPath.split('.');
            let value = context;
            
            for (const part of parts) {
                if (value && typeof value === 'object') {
                    value = value[part];
                } else {
                    value = null;
                    break;
                }
            }
            
            if (value !== null && value !== undefined && value !== '') {
                console.log(`✓ ${fieldName.padEnd(20)} = ${String(value).substring(0, 40)}`);
                availableFields++;
            } else {
                console.log(`✗ ${fieldName.padEnd(20)} (path: ${dataPath})`);
                missingFields++;
            }
        }
        
        console.log('='.repeat(60));
        console.log(`\nSummary: ${availableFields} available, ${missingFields} missing`);
        console.log(`Success rate: ${((availableFields / (availableFields + missingFields)) * 100).toFixed(1)}%\n`);
        
        // 6. Find a template
        const template = await IDCardTemplate.findOne({
            institute: institute._id
        }).lean();
        
        if (template) {
            console.log(`✓ Found template: ${template.name}`);
            console.log(`  Front placeholders: ${Object.keys(template.frontPlaceholders || {}).length}`);
            console.log(`  Back placeholders: ${Object.keys(template.backPlaceholders || {}).length}\n`);
            
            // Test front placeholder resolution
            console.log('Front Placeholder Field Resolution:');
            console.log('-'.repeat(60));
            
            const frontPlaceholders = template.frontPlaceholders || {};
            for (const [key, config] of Object.entries(frontPlaceholders)) {
                if (!config.enabled) continue;
                
                const fieldKey = config.fieldKey;
                if (!fieldKey) continue;
                
                const parts = fieldKey.split('.');
                let value = context;
                
                for (const part of parts) {
                    if (value && typeof value === 'object') {
                        value = value[part];
                    } else {
                        value = null;
                        break;
                    }
                }
                
                if (value !== null && value !== undefined && value !== '') {
                    console.log(`✓ ${key.padEnd(25)} (${fieldKey})`);
                } else {
                    console.log(`✗ ${key.padEnd(25)} (${fieldKey})`);
                }
            }
        } else {
            console.warn('⚠ No template found for this institute');
        }
        
        console.log('\n✓ Data flow test complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
testDataFlow();
