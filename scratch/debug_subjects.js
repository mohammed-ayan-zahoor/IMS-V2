const mongoose = require('mongoose');

async function debug() {
    await mongoose.connect('mongodb://localhost:27017/ims-v2');
    const Subject = mongoose.model('Subject', new mongoose.Schema({ course: mongoose.Schema.Types.ObjectId, name: String, deletedAt: Date }));
    
    const courseId = '69f2f9bd303c4fb8d0ceaa4a';
    const subjects = await Subject.find({ course: courseId });
    console.log('Subjects for course:', courseId);
    console.log(JSON.stringify(subjects, null, 2));
    
    const allSubjects = await Subject.find({});
    console.log('Total subjects in DB:', allSubjects.length);
    console.log(JSON.stringify(allSubjects, null, 2));
    
    process.exit(0);
}

debug();
