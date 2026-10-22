// Client-side export of resume / cover letter text to PDF (pdf-lib) and DOCX (docx).
function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const safe = (s: string) => s.replace(/[^\x20-\x7E\n\u00A0-\u00FF]/g, (c) => ({ "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u2022": "-" } as Record<string, string>)[c] ?? "");

export async function exportPdf(text: string, filename: string) {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 10.5, margin = 50, lh = 14;
  let page = doc.addPage([595, 842]);
  let y = 842 - margin;
  const maxW = 595 - margin * 2;
  for (const para of safe(text).split("\n")) {
    const words = para.split(" ");
    let line = "";
    const flush = () => {
      if (y < margin) { page = doc.addPage([595, 842]); y = 842 - margin; }
      page.drawText(line, { x: margin, y, size, font });
      y -= lh; line = "";
    };
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxW && line) { flush(); line = w; } else line = t;
    }
    flush();
  }
  const bytes = await doc.save();
  download(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${filename}.pdf`);
}

export async function exportDocx(text: string, filename: string) {
  const { Document, Packer, Paragraph } = await import("docx");
  const doc = new Document({ sections: [{ children: text.split("\n").map((t) => new Paragraph({ text: t })) }] });
  download(await Packer.toBlob(doc), `${filename}.docx`);
}
