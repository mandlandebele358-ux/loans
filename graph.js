let portfolioChartInstance, profitChartInstance;
Chart.register(ChartDataLabels);
const getThemeColors = () => {
  const isDarkMode = document.documentElement.dataset.theme === "dark";
  return {
    primary: isDarkMode ? "rgba(129, 140, 248, 1)" : "rgba(74, 85, 162, 1)",
    primary_trans: isDarkMode
      ? "rgba(129, 140, 248, 0.2)"
      : "rgba(74, 85, 162, 0.2)",
    success: isDarkMode ? "rgba(74, 222, 128, 1)" : "rgba(56, 161, 105, 1)",
    danger: isDarkMode ? "rgba(248, 113, 113, 1)" : "rgba(229, 62, 62, 1)",
    grid: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    text: isDarkMode ? "#E2E8F0" : "#4A5568",
    background: isDarkMode ? "#1e293b" : "#ffffff",
  };
};
function renderDashboardCharts(activeLoans, settledLoans, profitData) {
  renderPortfolioChart(activeLoans, settledLoans);
  renderProfitChart(profitData);
}
function renderPortfolioChart(activeLoans, settledLoans) {
  const ctx = document.getElementById("portfolioChart")?.getContext("2d");
  if (!ctx) return;
  let totalPrincipalRepaid = 0,
    totalInterestPaid = 0,
    totalOutstanding = 0;
  [...activeLoans, ...settledLoans]
    .filter((c) => c.loanDetails)
    .forEach((loan) => {
      const paidEmis = loan.emiSchedule.filter((e) => e.status === "Paid");
      totalInterestPaid += paidEmis.reduce(
        (sum, emi) => sum + emi.interestComponent,
        0
      );
      totalPrincipalRepaid += paidEmis.reduce(
        (sum, emi) => sum + emi.principalComponent,
        0
      );
    });
  activeLoans
    .filter((c) => c.loanDetails)
    .forEach((loan) => {
      const paidEmis = loan.emiSchedule.filter((e) => e.status === "Paid");
      totalOutstanding +=
        paidEmis.length > 0
          ? paidEmis[paidEmis.length - 1].remainingBalance
          : loan.loanDetails.principal;
    });
  const theme = getThemeColors();
  const data = {
    labels: ["Outstanding", "Repaid", "Interest"],
    datasets: [
      {
        data: [totalOutstanding, totalPrincipalRepaid, totalInterestPaid],
        backgroundColor: [theme.danger, theme.primary, theme.success],
        borderColor: theme.background,
        borderWidth: 4,
        hoverOffset: 16,
        hoverBorderColor: theme.background,
      },
    ],
  };
  if (portfolioChartInstance) portfolioChartInstance.destroy();
  portfolioChartInstance = new Chart(ctx, {
    type: "doughnut",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 1500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, color: theme.text, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed !== null) {
                label += new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(context.parsed);
              }
              return label;
            },
          },
        },
        datalabels: { display: false },
      },
    },
  });
}
function renderProfitChart(profitData) {
  const ctx = document.getElementById("profitChart")?.getContext("2d");
  if (!ctx) return;
  const theme = getThemeColors();
  const aggregateData = (data, timeframe) => {
    const aggregated = {};
    data.forEach((item) => {
      const date = new Date(item.date);
      let key;
      if (timeframe === "yearly") {
        key = date.getFullYear().toString();
      } else if (timeframe === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      } else {
        key = item.date;
      }
      if (!aggregated[key]) aggregated[key] = 0;
      aggregated[key] += item.profit;
    });
    const sortedKeys = Object.keys(aggregated).sort();
    return {
      labels: sortedKeys,
      values: sortedKeys.map((key) => aggregated[key]),
    };
  };
  const drawChart = (timeframe) => {
    const { labels, values } = aggregateData(profitData, timeframe);
    if (profitChartInstance) {
      profitChartInstance.destroy();
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(1, theme.primary_trans);
    profitChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Interest Earned",
            data: values,
            backgroundColor: gradient,
            borderColor: theme.primary,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: theme.primary,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: theme.text },
            grid: { color: theme.grid },
          },
          x: { ticks: { color: theme.text }, grid: { color: "transparent" } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` Profit: ${new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(context.parsed.y)}`;
              },
            },
          },
          datalabels: { display: false },
        },
      },
    });
  };
  const controls = document.getElementById("profit-chart-controls");
  if (controls) {
    controls.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", (e) => {
        if (e.currentTarget.classList.contains("active")) return;
        controls.querySelector("button.active").classList.remove("active");
        e.currentTarget.classList.add("active");
        drawChart(e.currentTarget.dataset.frame);
      });
    });
  }
  drawChart("monthly");
}
