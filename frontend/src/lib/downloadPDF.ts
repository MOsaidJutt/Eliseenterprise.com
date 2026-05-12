export async function downloadPDF(
  contentEl: HTMLElement,
  filename = "plainview-report.pdf",
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Capture the full scrollable content at 2x for clarity
  const canvas = await html2canvas(contentEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#F1F5F9",
    logging: false,
    // Capture full scroll height, not just visible area
    windowWidth: contentEl.scrollWidth,
    windowHeight: contentEl.scrollHeight,
    width: contentEl.scrollWidth,
    height: contentEl.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 portrait in mm
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();   // 210mm
  const pageH = pdf.internal.pageSize.getHeight();  // 297mm

  const imgW  = canvas.width;
  const imgH  = canvas.height;
  const ratio = pageW / imgW;           // scale image to fit page width
  const scaledH = imgH * ratio;         // full height in mm after scaling

  const totalPages = Math.ceil(scaledH / pageH);

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();
    // Shift the image up by one page-height per page
    pdf.addImage(imgData, "PNG", 0, -(i * pageH), pageW, scaledH);
  }

  pdf.save(filename);
}
