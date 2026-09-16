import { NextResponse } from 'next/server';
import { getLibraryAuth } from '@/lib/library/auth';
import BookCopy from '@/models/BookCopy';
import Book from '@/models/Book';
import bwipjs from 'bwip-js';

export async function POST(req) {
    try {
        const { instituteId } = await getLibraryAuth();
        const { copyIds } = await req.json();

        if (!Array.isArray(copyIds) || copyIds.length === 0) {
            return NextResponse.json({ error: 'copyIds array required' }, { status: 400 });
        }
        if (copyIds.length > 90) {
            return NextResponse.json({ error: 'Max 90 copies per sheet (3 pages)' }, { status: 400 });
        }

        const copies = await BookCopy.find({ _id: { $in: copyIds }, institute: instituteId })
            .populate('book', 'title authors')
            .lean();

        if (copies.length === 0) return NextResponse.json({ error: 'No copies found' }, { status: 404 });

        // Generate barcode PNGs and encode as base64 for embedding in HTML
        const labels = await Promise.all(copies.map(async (copy) => {
            const png = await bwipjs.toBuffer({
                bcid: 'code128',
                text: copy.accessionNumber,
                scale: 2,
                height: 8,
                includetext: false // text printed separately below barcode
            });
            const b64 = png.toString('base64');
            const title = copy.book?.title || 'Unknown';
            const shortTitle = title.length > 30 ? title.slice(0, 28) + '…' : title;
            return { accessionNumber: copy.accessionNumber, title: shortTitle, barcodeSrc: `data:image/png;base64,${b64}` };
        }));

        // Build Avery-style 3×10 label sheet HTML (A4, 30 labels per page)
        // Label size: ~63.5mm × 29.6mm = ~240px × 112px at 96dpi
        const labelHtml = labels.map(l => `
            <div class="label">
                <img src="${l.barcodeSrc}" alt="barcode" />
                <div class="accession">${l.accessionNumber}</div>
                <div class="title">${l.title}</div>
            </div>`).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; }
  @page { size: A4; margin: 8mm; }
  .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
  .label {
    width: 63.5mm; height: 29.6mm;
    border: 0.3mm solid #ccc;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 1mm; overflow: hidden;
  }
  .label img { max-height: 14mm; max-width: 60mm; }
  .accession { font-size: 7pt; font-weight: bold; margin-top: 1mm; }
  .title { font-size: 5.5pt; color: #555; margin-top: 0.5mm; text-align: center; }
</style>
</head>
<body><div class="sheet">${labelHtml}</div></body>
</html>`;

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (e) {
        if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
        console.error(e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
