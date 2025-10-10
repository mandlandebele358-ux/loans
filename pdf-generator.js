async function generateAndDownloadPDF(customerId) {
  const customer = [
    ...window.allCustomers.active,
    ...window.allCustomers.settled,
  ].find((c) => c.id === customerId);

  if (!customer) {
    alert("Could not find customer data.");
    return;
  }

  const { loanDetails, paymentSchedule, name } = customer;
  const formatCurrency = (amount) =>
    `₹${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

  const totalPaid = paymentSchedule.reduce(
    (sum, p) => sum + p.amountPaid,
    0
  );
  const totalRepayable =
    loanDetails.principal * (1 + loanDetails.interestRate / 100);
  const outstanding = totalRepayable - totalPaid;
  const totalInterest =
    loanDetails.principal * (loanDetails.interestRate / 100);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "p",
    unit: "pt",
    format: "a4",
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  let y = 40;

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#4a55a2");
  doc.text("Loan Statement", pageWidth / 2, y, { align: "center" });
  y += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#666");
  doc.text("Your Trusted Lending Partner", pageWidth / 2, y, {
    align: "center",
  });
  y += 15;
  doc.setDrawColor("#4a55a2");
  doc.line(40, y, pageWidth - 40, y);
  y += 30;

  const summaryBody = [
    [
      { content: 'Customer & Loan Details', styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#4a55a2' } },
      { content: 'Account Summary', styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#4a55a2' } }
    ],
    [
        `Customer Name: ${name}\nLoan Date: ${loanDetails.loanDate}\nPrincipal Amount: ${formatCurrency(loanDetails.principal)}\nInterest Rate: ${loanDetails.interestRate}%\nTenure: ${loanDetails.installments} installments\nInstallment Amount: ${formatCurrency(paymentSchedule[0].amountDue)}`,
        `Total Amount Paid: ${formatCurrency(totalPaid)}\nOutstanding Balance: ${formatCurrency(outstanding)}\nTotal Interest Payable: ${formatCurrency(totalInterest)}`
    ]
  ];

  doc.autoTable({
      body: summaryBody,
      startY: y,
      theme: 'grid',
      styles: { cellPadding: 8, fontSize: 10, valign: 'top', lineColor: '#e2e8f0', lineWidth: 1 },
      columnStyles: { 0: { cellWidth: (pageWidth - 80) / 2 }, 1: { cellWidth: (pageWidth - 80) / 2 } }
  });

  y = doc.autoTable.previous.finalY + 30;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#4a55a2");
  doc.text("Installment Repayment Schedule", pageWidth / 2, y, {
    align: "center",
  });
  y += 25;

  const tableHead = [['#', 'Due Date', 'Amount Due', 'Amount Paid', 'Pending', 'Status']];
  const tableBody = paymentSchedule.map(inst => [
      inst.installment,
      inst.dueDate,
      formatCurrency(inst.amountDue),
      formatCurrency(inst.amountPaid),
      formatCurrency(inst.pendingAmount),
      inst.status
  ]);

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: '#4a55a2', textColor: '#ffffff', fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6 },
    didParseCell: function (data) {
        if (data.row.section === 'body' && data.cell.text[0] === 'Paid') {
            data.cell.styles.textColor = '#166534';
            data.cell.styles.fontStyle = 'bold';
        }
         if (data.row.section === 'body' && (data.cell.text[0] === 'Due' || data.cell.text[0] === 'Pending')) {
            data.cell.styles.textColor = '#991b1b';
        }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor("#94a3b8");
    const footerText = "This is a computer-generated statement and does not require a signature.";
    doc.text(footerText, pageWidth / 2, pageHeight - 30, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 30, { align: "right" });
  }

  const pdfName = `Loan-Statement-${name.replace(/ /g, "-")}.pdf`;
  doc.save(pdfName);
}

function openWhatsApp(customer) {
  if (customer && customer.phone) {
    const message = encodeURIComponent(
      `Dear ${customer.name},\n\nThis is a message regarding your loan account with Loan Manager. Please contact us for more details.\n\nThank you!`
    );
    const whatsappUrl = `https://wa.me/${customer.phone.replace(
      /\D/g,
      ""
    )}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  } else {
    alert("This customer does not have a phone number saved.");
  }
}