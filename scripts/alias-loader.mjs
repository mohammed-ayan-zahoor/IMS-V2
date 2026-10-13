import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const rootPath = path.resolve('.');

function tryExtensions(filePath) {
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
        const full = filePath + ext;
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            return full;
        }
    }
    return filePath;
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
        const mapped = path.resolve(rootPath, specifier.slice(2));
        const resolved = tryExtensions(mapped);
        return nextResolve(pathToFileURL(resolved).href, context);
    }
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        try {
            return await nextResolve(specifier, context);
        } catch (e) {
            const parentDir = path.dirname(new URL(context.parentURL).pathname);
            const candidate = path.resolve(parentDir, specifier);
            const resolved = tryExtensions(candidate);
            if (resolved !== candidate) {
                return nextResolve(pathToFileURL(resolved).href, context);
            }
            throw e;
        }
    }
    return nextResolve(specifier, context);
}
