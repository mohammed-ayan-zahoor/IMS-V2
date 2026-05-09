import WebsiteConfig from '../models/WebsiteConfig';
import WebsitePage from '../models/WebsitePage';
import WebsiteNotice from '../models/WebsiteNotice';
import WebsiteMedia from '../models/WebsiteMedia';

/**
 * Website Service - Handles logic for the Website Builder and Public Site
 */

export const getWebsiteConfig = async (instituteId) => {
    return await WebsiteConfig.findOne({ instituteId });
};

export const updateWebsiteConfig = async (instituteId, updateData) => {
    return await WebsiteConfig.findOneAndUpdate(
        { instituteId },
        { $set: updateData },
        { new: true, upsert: true }
    );
};

export const getPages = async (websiteConfigId) => {
    return await WebsitePage.find({ websiteConfigId }).sort({ createdAt: -1 });
};

export const getPageBySlug = async (websiteConfigId, slug) => {
    return await WebsitePage.findOne({ websiteConfigId, slug });
};

export const createPage = async (pageData) => {
    return await WebsitePage.create(pageData);
};

export const updatePage = async (pageId, updateData) => {
    return await WebsitePage.findByIdAndUpdate(pageId, { $set: updateData }, { new: true });
};

export const deletePage = async (pageId) => {
    return await WebsitePage.findByIdAndDelete(pageId);
};

export const getPublicNotices = async (instituteId) => {
    const now = new Date();
    return await WebsiteNotice.find({
        instituteId,
        status: 'active',
        visibility: 'public',
        $or: [
            { scheduledStart: { $lte: now }, scheduledEnd: { $gte: now } },
            { scheduledStart: null, scheduledEnd: null }
        ]
    }).sort({ displayOrder: 1 });
};
