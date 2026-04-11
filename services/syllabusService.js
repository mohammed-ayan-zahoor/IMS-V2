import mongoose from 'mongoose';
import Subject from '@/models/Subject';
import Batch from '@/models/Batch';
import Course from '@/models/Course';
import BatchSyllabusProgress from '@/models/BatchSyllabusProgress';
import { connectDB } from '@/lib/mongodb';
import { createAuditLog } from './auditService';

export class SyllabusService {

    // ─────────────────────────────────────────────────────────────────────────
    // SYLLABUS TEMPLATE (Admin only — defines the structure on a Subject)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the full syllabus template for a subject.
     */
    static async getSyllabus(subjectId, instituteId) {
        await connectDB();
        const query = { _id: subjectId, deletedAt: null };
        if (instituteId) query.institute = instituteId;

        const subject = await Subject.findOne(query).lean();
        if (!subject) throw new Error('Subject not found');
        return subject.syllabus || [];
    }

    /**
     * Replace the entire syllabus for a subject.
     * Re-assigns `order` based on array position so the UI doesn't need to track it.
     */
    static async updateSyllabus(subjectId, chapters, actorId, instituteId) {
        await connectDB();
        
        // Explicitly cast to ObjectId to ensure query matches
        const sid = mongoose.Types.ObjectId.isValid(subjectId) ? new mongoose.Types.ObjectId(subjectId) : subjectId;
        const query = { _id: sid, deletedAt: null };
        
        if (instituteId && mongoose.Types.ObjectId.isValid(instituteId)) {
            query.institute = new mongoose.Types.ObjectId(instituteId);
        }

        // Normalize order fields from array positions and strip invalid characters
        const normalizedChapters = (chapters || [])
            .filter(ch => ch.title && ch.title.trim()) // Ensure we don't save empty chapters
            .map((ch, ci) => ({
                _id: ch._id || ch.id, // Preserve existing ID or let Mongoose generate new one
                title: ch.title.trim(),
                order: ci,
                topics: (ch.topics || [])
                    .filter(tp => tp.title && tp.title.trim()) // Ensure we don't save empty topics
                    .map((tp, ti) => ({
                        _id: tp._id || tp.id,
                        title: tp.title.trim(),
                        order: ti,
                        subTopics: (tp.subTopics || [])
                            .filter(st => st.title && st.title.trim()) // Ensure we don't save empty subtopics
                            .map((st, si) => ({ 
                                _id: st._id || st.id,
                                title: st.title.trim(), 
                                order: si 
                            }))
                    }))
            }));

        const subject = await Subject.findOneAndUpdate(
            query,
            { $set: { syllabus: normalizedChapters } },
            { new: true, runValidators: true }
        ).lean();

        if (!subject) {
            console.error(`Syllabus Update Failed: Subject ${subjectId} not found with query:`, query);
            throw new Error('Subject not found or access denied');
        }

        await createAuditLog({
            actor: actorId,
            action: 'subject.update',
            resource: { type: 'Subject', id: subject._id },
            institute: instituteId,
            details: { change: 'syllabus_updated', chapterCount: normalizedChapters.length }
        });

        return subject.syllabus;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BATCH PROGRESS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get or lazily create a progress tracker for a (batch, subject) pair.
     */
    static async getOrCreateProgress(batchId, subjectId, instituteId) {
        await connectDB();

        let progress = await BatchSyllabusProgress.findOne({
            batch: batchId,
            subject: subjectId
        }).lean();

        if (!progress) {
            progress = await BatchSyllabusProgress.create({
                batch: batchId,
                subject: subjectId,
                institute: instituteId,
                completions: [],
                overallProgress: 0
            });
            progress = progress.toObject();
        }

        return progress;
    }

    /**
     * Get all progress records for a batch (across all subjects).
     */
    static async getProgressForBatch(batchId) {
        await connectDB();
        return await BatchSyllabusProgress.find({ batch: batchId })
            .populate('subject', 'name code syllabus')
            .populate('completions.completedBy', 'profile.firstName profile.lastName')
            .populate('completions.unmarkedBy', 'profile.firstName profile.lastName')
            .lean();
    }

    /**
     * Get progress for a specific (batch, subject).
     */
    static async getProgress(batchId, subjectId) {
        await connectDB();
        return await BatchSyllabusProgress.findOne({ batch: batchId, subject: subjectId })
            .populate('subject', 'name code syllabus')
            .populate('completions.completedBy', 'profile.firstName profile.lastName')
            .lean();
    }

    /**
     * Mark or unmark a syllabus item (chapter, topic, or subtopic).
     * Only the batch instructor (or admin) is allowed — enforced at route level.
     *
     * @param {string} progressId   - BatchSyllabusProgress document _id
     * @param {object} payload      - { itemId, itemType, chapterId, topicId, isCompleted, notes }
     * @param {string} actorId      - User making the change
     */
    static async markItem(progressId, payload, actorId) {
        await connectDB();

        const { itemId, itemType, chapterId, topicId, isCompleted, notes } = payload;
        const now = new Date();

        const progress = await BatchSyllabusProgress.findById(progressId).populate('subject');
        if (!progress) throw new Error('Progress tracker not found');
        const syllabus = progress.subject?.syllabus || [];

        // Helper to update or insert a completion record
        const upsertCompletion = (id, type, chId, tpId, isDone) => {
            const idx = progress.completions.findIndex(c => String(c.itemId) === String(id));
            if (idx >= 0) {
                if (progress.completions[idx].isCompleted !== isDone) {
                    progress.completions[idx].isCompleted = isDone;
                    if (isDone) {
                        progress.completions[idx].completedAt = now;
                        progress.completions[idx].completedBy = actorId;
                        progress.completions[idx].notes = notes || progress.completions[idx].notes || '';
                        progress.completions[idx].unmarkedAt = undefined;
                        progress.completions[idx].unmarkedBy = undefined;
                    } else {
                        progress.completions[idx].unmarkedAt = now;
                        progress.completions[idx].unmarkedBy = actorId;
                    }
                }
            } else {
                progress.completions.push({
                    itemId: id,
                    itemType: type,
                    chapterId: chId,
                    topicId: tpId || null,
                    isCompleted: isDone,
                    completedAt: isDone ? now : undefined,
                    completedBy: isDone ? actorId : undefined,
                    notes: notes || '',
                });
            }
        };

        const chNode = syllabus.find(c => String(c._id) === String(chapterId));
        if (!chNode) throw new Error('Invalid chapterId, node not found in syllabus');

        // 1. Initial explicit action
        upsertCompletion(itemId, itemType, chapterId, topicId, isCompleted);

        // 2. Cascade Down
        // If clicking a Chapter, force that state down to all its topics and subtopics
        if (itemType === 'chapter') {
            for (const tp of (chNode.topics || [])) {
                upsertCompletion(tp._id, 'topic', chNode._id, tp._id, isCompleted);
                for (const st of (tp.subTopics || [])) {
                    upsertCompletion(st._id, 'subtopic', chNode._id, tp._id, isCompleted);
                }
            }
        } 
        // If clicking a Topic, force that state down to all its subtopics
        else if (itemType === 'topic') {
            const tpNode = (chNode.topics || []).find(t => String(t._id) === String(topicId));
            if (tpNode) {
                for (const st of (tpNode.subTopics || [])) {
                    upsertCompletion(st._id, 'subtopic', chNode._id, tpNode._id, isCompleted);
                }
            }
        }

        // Helper for Cascade Up check
        const isNodeCompleted = (id) => {
            const c = progress.completions.find(c => String(c.itemId) === String(id));
            return c && c.isCompleted;
        };

        // 3. Cascade Up (Bottom Up calculation for the entire targeted Chapter)
        // Recalculate Topic states based on their SubTopics
        let allTopicsInChapterDone = true;
        for (const tp of (chNode.topics || [])) {
            let tpDone = isNodeCompleted(tp._id); 

            // If topic HAS subtopics, its state strictly depends on subtopics being DONE
            if (tp.subTopics && tp.subTopics.length > 0) {
                let allSubDone = true;
                for (const st of tp.subTopics) {
                    if (!isNodeCompleted(st._id)) {
                        allSubDone = false;
                        break;
                    }
                }
                tpDone = allSubDone;
                // Force update topic based on children
                upsertCompletion(tp._id, 'topic', chNode._id, tp._id, allSubDone);
            }
            
            if (!tpDone) allTopicsInChapterDone = false;
        }

        // Recalculate Chapter state based on its Topics
        if (chNode.topics && chNode.topics.length > 0) {
            // Chapter depends on its topics
            upsertCompletion(chNode._id, 'chapter', chNode._id, null, allTopicsInChapterDone);
        }

        // Recalculate overall progress against total nodes in syllabus
        progress.overallProgress = SyllabusService._calcProgress(progress.completions, progress.subject?.syllabus);
        if (isCompleted) progress.lastActivityAt = now;

        await progress.save();
        return progress.toObject();
    }

    /**
     * Calculate overall progress percentage based on completed leaf nodes.
     * Weighs only the deepest available nodes so that percentage reflects true learning progress
     * rather than getting skewed by parent container nodes.
     */
    static _calcProgress(completions, syllabus) {
        if (!syllabus || syllabus.length === 0) return 0;
        
        let totalLeaves = 0;
        let completedLeaves = 0;

        const isCompleted = (id) => {
            const c = (completions || []).find(c => String(c.itemId) === String(id));
            return c && c.isCompleted;
        };

        for (const ch of syllabus) {
            if (!ch.topics || ch.topics.length === 0) {
                // Chapter is a leaf node
                totalLeaves++;
                if (isCompleted(ch._id)) completedLeaves++;
            } else {
                for (const tp of ch.topics) {
                    if (!tp.subTopics || tp.subTopics.length === 0) {
                        // Topic is a leaf node
                        totalLeaves++;
                        if (isCompleted(tp._id)) completedLeaves++;
                    } else {
                        // Subtopics are leaf nodes
                        for (const st of tp.subTopics) {
                            totalLeaves++;
                            if (isCompleted(st._id)) completedLeaves++;
                        }
                    }
                }
            }
        }
        
        if (totalLeaves === 0) return 0;
        return Math.round((completedLeaves / totalLeaves) * 100);
    }

    /**
     * Get all batches that haven't had syllabus activity in `dayThreshold` days.
     * Used for inactivity notifications/widget.
     */
    static async getStaleBatches(instituteId, dayThreshold = 7) {
        await connectDB();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - dayThreshold);

        const stale = await BatchSyllabusProgress.find({
            institute: instituteId,
            $or: [
                { lastActivityAt: { $lt: cutoff } },
                { lastActivityAt: null }
            ]
        })
            .populate('batch', 'name schedule instructor')
            .populate('subject', 'name')
            .lean();

        return stale;
    }
}
