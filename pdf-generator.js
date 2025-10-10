async function generateAndSharePDF(customerId) {
  const customer = [
    ...window.allCustomers.active,
    ...window.allCustomers.settled,
  ].find((c) => c.id === customerId);

  if (!customer) {
    alert("Could not find customer data.");
    return;
  }

  // 1. Fetch the HTML template
  const response = await fetch("pdf-template.html");
  if (!response.ok) {
    alert("Could not load PDF template.");
    return;
  }
  let template = await response.text();

  // 2. Prepare data for the template
  const { loanDetails, emiSchedule, name, phone } = customer;
  const formatCurrency = (amount) =>
    `₹${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

  const paidEmis = emiSchedule.filter((e) => e.status === "Paid");
  const totalPaid = paidEmis.reduce((sum, emi) => sum + emi.emi, 0);
  const outstanding =
    paidEmis.length > 0
      ? paidEmis[paidEmis.length - 1].remainingBalance
      : loanDetails.principal;
  const totalInterest =
    loanDetails.emiAmount * loanDetails.tenureMonths - loanDetails.principal;

  // 3. Populate the template with data
  template = template.replace("{{customerName}}", name);
  template = template.replace("{{loanDate}}", loanDetails.loanDate);
  template = template.replace(
    "{{principal}}",
    formatCurrency(loanDetails.principal)
  );
  template = template.replace("{{interestRate}}", `${loanDetails.annualRate}%`);
  template = template.replace(
    "{{tenure}}",
    `${loanDetails.tenureMonths} Months`
  );
  template = template.replace(
    "{{emiAmount}}",
    formatCurrency(loanDetails.emiAmount)
  );

  template = template.replace("{{totalPaid}}", formatCurrency(totalPaid));
  template = template.replace("{{outstanding}}", formatCurrency(outstanding));
  template = template.replace(
    "{{totalInterest}}",
    formatCurrency(totalInterest)
  );

  const emiRows = emiSchedule
    .map(
      (emi) => `
    <tr class="${emi.status === "Paid" ? "paid" : ""}">
      <td>${emi.month}</td>
      <td>${emi.dueDate}</td>
      <td>${formatCurrency(emi.emi)}</td>
      <td>${formatCurrency(emi.principalComponent)}</td>
      <td>${formatCurrency(emi.interestComponent)}</td>
      <td>${formatCurrency(emi.remainingBalance)}</td>
      <td><span class="status ${emi.status.toLowerCase()}">${
        emi.status
      }</span></td>
    </tr>
  `
    )
    .join("");
  template = template.replace("{{emiTableRows}}", emiRows);

  // 4. Create a temporary element to render for PDF conversion
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.innerHTML = template;
  document.body.appendChild(container);

  // 5. Use html2canvas and jsPDF to generate the PDF
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(
    container.querySelector(".receipt-container")
  );
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

  // 6. Trigger PDF download
  pdf.save(`Loan-Statement-${name.replace(/ /g, "-")}.pdf`);

  // 7. Clean up the temporary element
  document.body.removeChild(container);

  // 8. Open WhatsApp
  if (phone) {
    const message = encodeURIComponent(
      `Dear ${name},\n\nPlease find your attached loan statement. Thank you!\n\n---\nLoan Manager`
    );
    const whatsappUrl = `https://wa.me/${phone.replace(
      /\D/g,
      ""
    )}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  } else {
    alert("This customer does not have a phone number saved.");
  }
}
