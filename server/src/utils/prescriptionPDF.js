import PDFDocument from "pdfkit";

const generatePrescriptionPdf = (prescription, res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  doc.pipe(res);

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("DOPEST DOC HEALTHCARE", { align: "center" });

  doc
    .moveDown(0.5)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("MEDICAL PRESCRIPTION", { align: "center" });

  doc.moveDown();

  doc.fontSize(10).font("Helvetica");

  doc.text(`Prescription ID: ${prescription._id}`);
  doc.text(
    `Issued: ${new Date(prescription.issuedAt).toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
    })}`,
  );

  doc.moveDown();

  doc.font("Helvetica-Bold").text("PATIENT INFORMATION");
  doc.font("Helvetica");
  doc.text(`Patient: ${prescription.patient.name}`);
  doc.text(`Doctor: ${prescription.doctor.name}`);

  doc.moveDown();

  doc.font("Helvetica-Bold").text("PRESCRIPTION DETAILS");

  prescription.items.forEach((item, index) => {
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text(`${index + 1}. ${item.medicationName}`);
    doc.font("Helvetica");

    doc.text(`Strength: ${item.strength || "Not specified"}`);
    doc.text(`Dosage: ${item.dosage}`);
    doc.text(`Route: ${item.route || "Not specified"}`);
    doc.text(`Frequency: ${item.frequency}`);
    doc.text(`Duration: ${item.duration}`);
    doc.text(`Quantity: ${item.quantity}`);

    if (item.instructions) {
      doc.text(`Instructions: ${item.instructions}`);
    }
  });

  if (prescription.notes) {
    doc.moveDown();
    doc.font("Helvetica-Bold").text("DOCTOR'S NOTES");
    doc.font("Helvetica").text(prescription.notes);
  }

  doc.moveDown();
  doc
    .fontSize(9)
    .text(
      "This document is generated electronically by DOPEST DOC HEALTHCARE.",
      { align: "center" },
    );

  doc.end();
};

export default generatePrescriptionPdf;
