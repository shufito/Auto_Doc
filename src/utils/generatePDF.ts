import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { statusLabels, type PDFColor, type Project } from "@/types/projects.ts";

const truncateName = (name: string, maxLength: number = 30): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + "...";
};

const splitNameForHeader = (
  name: string,
  maxLineLength: number = 20
): string[] => {
  const truncated = truncateName(name, 30);
  if (truncated.length <= maxLineLength) return [truncated];

  const words = truncated.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLineLength) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [truncated.substring(0, maxLineLength)];
};

const drawRoundedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  doc.roundedRect(x, y, width, height, radius, radius, "F");
};

export const generateProjectPDF = async (
  project: Project,
  headerColor: PDFColor = { r: 139, g: 92, b: 246 },
  opts?: { preview?: boolean; openPrint?: boolean; returnBlob?: boolean }
): Promise<Blob | void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Generate QR Code with higher quality
  const qrCodeDataUrl = await QRCode.toDataURL(project.uniqueCode, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Header background with rounded bottom corners effect
  doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
  doc.rect(0, 0, pageWidth, 55, "F");

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");

  const nameLines = splitNameForHeader(project.name);
  doc.setFontSize(nameLines.length > 1 ? 18 : 22);

  const headerY = nameLines.length > 1 ? 18 : 22;
  nameLines.forEach((line, index) => {
    doc.text(line, 15, headerY + index * 8);
  });

  const infoStartY = headerY + nameLines.length * 8 + 2;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Setor: ${project.sector}`, 15, infoStartY);
  doc.text(`Codigo: ${project.uniqueCode}`, 15, infoStartY + 7);

  // QR Code with white rounded background
  const qrSize = 38;
  const qrX = pageWidth - 48;
  const qrY = 8;

  // Draw white rounded background for QR
  doc.setFillColor(255, 255, 255);
  drawRoundedRect(doc, qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 4);

  // Add QR Code
  doc.addImage(qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  let yPosition = 70;

  // Status badge simulation
  doc.setFillColor(243, 232, 255); // Light purple background
  const statusText = statusLabels[project.status];
  const statusWidth = doc.getTextWidth(statusText) + 12;
  drawRoundedRect(doc, 15, yPosition - 5, statusWidth, 8, 2);
  doc.setFontSize(9);
  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 21, yPosition);

  yPosition += 15;
  doc.setTextColor(0, 0, 0);

  // Project Info Section with card-like styling
  doc.setFillColor(249, 250, 251); // Light gray background
  drawRoundedRect(doc, 15, yPosition - 5, pageWidth - 30, 45, 4);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
  doc.text("Informacoes do Projeto", 20, yPosition + 3);
  yPosition += 12;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const infoItems = [
    ["Data de Inicio", new Date(project.startDate).toLocaleDateString("pt-BR")],
    [
      "Data de Termino",
      project.endDate
        ? new Date(project.endDate).toLocaleDateString("pt-BR")
        : "Nao definida",
    ],
    ["Gerente", project.projectManager],
    [
      "Equipe",
      project.team.slice(0, 3).join(", ") +
        (project.team.length > 3 ? "..." : "") || "Nao definida",
    ],
  ];

  infoItems.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label}:`, 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(String(value), 55, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Description with card styling
  if (project.description) {
    doc.setFillColor(249, 250, 251);
    const descLines = doc.splitTextToSize(project.description, pageWidth - 50);
    const descHeight = Math.min(descLines.length * 4 + 15, 65);
    drawRoundedRect(doc, 15, yPosition - 5, pageWidth - 30, descHeight, 4);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.text("Descricao", 20, yPosition + 3);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(descLines, 20, yPosition);
    yPosition += Math.min(descLines.length, 6) * 5 + 15;
    yPosition += 4;
  }

  // Tech Stack with badges
  if (project.techStack.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.text("Stack Tecnológica", 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    project.techStack.forEach((stack) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
      doc.text(`${stack.category}:`, 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(stack.technologies.join(", "), 35, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }

  // Milestones with better styling
  if (project.milestones.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.text("Pontos do Projeto (Milestones)", 15, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    project.milestones.forEach((milestone, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      // Checkbox style indicator - using simple shapes instead of unicode
      const checkX = 15;
      const checkY = yPosition - 3;

      if (milestone.completed) {
        // Filled circle for completed
        doc.setFillColor(34, 197, 94); // Green
        doc.circle(checkX + 2, checkY, 2, "F");
      } else {
        // Empty circle for pending
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.circle(checkX + 2, checkY, 2, "S");
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(`${index + 1}. ${milestone.title}`, 22, yPosition);
      yPosition += 5;

      if (milestone.description) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        const milestoneLines = doc.splitTextToSize(
          milestone.description,
          pageWidth - 45
        );
        doc.text(milestoneLines.slice(0, 2), 22, yPosition);
        yPosition += Math.min(milestoneLines.length, 2) * 4 + 3;
      }
    });
    yPosition += 5;
  }

  // Repository & Documentation
  if (project.repository || project.documentation) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
    doc.text("Links", 15, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    if (project.repository) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("Repositorio:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
      const repoText =
        project.repository.length > 50
          ? project.repository.substring(0, 50) + "..."
          : project.repository;
      doc.text(repoText, 42, yPosition);
      yPosition += 6;
    }
    if (project.documentation) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("Documentacao:", 15, yPosition);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);
      const docText =
        project.documentation.length > 50
          ? project.documentation.substring(0, 50) + "..."
          : project.documentation;
      doc.text(docText, 47, yPosition);
      yPosition += 10;
    }
  }

  // Notes
  if (project.notes) {
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(249, 250, 251);
    const notesLines = doc.splitTextToSize(project.notes, pageWidth - 50);
    const notesHeight = Math.min(notesLines.length * 5 + 15, 40);
    drawRoundedRect(doc, 15, yPosition - 5, pageWidth - 30, notesHeight, 4);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor.r, headerColor.g, headerColor.b);

    doc.text("Observacoes", 20, yPosition + 3);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(notesLines.slice(0, 4), 20, yPosition);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Gerado em ${new Date().toLocaleString(
        "pt-BR"
      )} | Pagina ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Prepare output
  const safeName = project.name.replace(/\s+/g, "_").substring(0, 20);
  const pdfBlob = doc.output("blob");

  if (opts?.returnBlob) return pdfBlob;

  const blobUrl = URL.createObjectURL(pdfBlob);

  if (opts?.openPrint) {
    const win = window.open("");
    if (win) {
      win.document.write(
        `<html><head><title>Preview PDF</title></head><body style="margin:0"><iframe id="pdfFrame" src="${blobUrl}" style="border:none;width:100%;height:100vh;"></iframe><script>const f=document.getElementById('pdfFrame');f.onload=()=>{setTimeout(()=>{f.contentWindow.print();},500);};</script></body></html>`
      );
      win.document.close();
    } else {
      window.open(blobUrl);
    }
    return;
  }

  // Default: save file
  doc.save(`${project.uniqueCode}-${safeName}.pdf`);
};
