// This file requires the SheetJS library (xlsx.full.min.js) to be included in index.html

/**
 * Exports a simple summary list of customers to an Excel file.
 * Used for the buttons on the Active and Settled account pages.
 */
function exportToExcel(customers, fileName = "customer-data.xlsx") {
  if (!customers || customers.length === 0) {
    alert("No data to export.");
    return;
  }

  const flattenedData = customers.map((customer) => {
    // *** FIX: Added robust check for data integrity ***
    if (!customer.loanDetails || !Array.isArray(customer.emiSchedule)) {
      return {
        Name: customer.name,
        Phone: customer.phone || "N/A",
        Status: "Incomplete/Corrupt Data",
      };
    }

    const paidEmis = customer.emiSchedule.filter((e) => e.status === "Paid");
    const outstanding =
      paidEmis.length > 0
        ? paidEmis[paidEmis.length - 1].remainingBalance
        : customer.loanDetails.principal;
    const totalInterestPaid = paidEmis.reduce(
      (sum, emi) => sum + emi.interestComponent,
      0
    );

    return {
      Name: customer.name,
      Phone: customer.phone || "N/A",
      "Father's Name": customer.fatherName || "N/A",
      Address: customer.address || "N/A",
      Aadhar: customer.aadhar || "N/A",
      PAN: customer.pan || "N/A",
      "Loan Principal (₹)": customer.loanDetails.principal,
      "Interest Rate (%)": customer.loanDetails.annualRate,
      "Tenure (Months)": customer.loanDetails.tenureMonths,
      "EMI Amount (₹)": customer.loanDetails.emiAmount,
      "Loan Date": customer.loanDetails.loanDate,
      Status: customer.status,
      "EMIs Paid": `${paidEmis.length}/${customer.emiSchedule.length}`,
      "Outstanding Balance (₹)": outstanding,
      "Total Interest Paid (₹)": totalInterestPaid,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
  XLSX.writeFile(workbook, fileName);
}
