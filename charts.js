// ============================
// CHART.JS DARK THEME SETTINGS
// ============================
Chart.defaults.color = "#e5e7eb";         // light gray text
Chart.defaults.borderColor = "#374151";   // dark gray borders
Chart.defaults.font.family = "Inter, sans-serif";

// global chart holders (to destroy and re-render)
let popularBooksChart = null;
let weeklyIssuedChart = null;

// ============================
// LOAD POPULAR BOOKS PIE CHART
// ============================
function loadPopularBooksChart() {
    fetch("/api/charts/popular_books")
        .then(res => res.json())
        .then(data => {
            const labels = data.map(i => i.title);
            const values = data.map(i => i.count);

            const ctx = document.getElementById("popularBooksChart").getContext("2d");

            if (popularBooksChart) popularBooksChart.destroy();

            popularBooksChart = new Chart(ctx, {
                type: "pie",
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            "#6366f1", "#10b981", "#f43f5e",
                            "#f59e0b", "#3b82f6", "#8b5cf6"
                        ]
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: "Most Popular Books This Week",
                            color: "#fff",
                            font: { size: 18 }
                        }
                    }
                }
            });
        });
}

// ============================
// LOAD WEEKLY ISSUED BAR CHART
// ============================
function loadWeeklyIssuedChart() {
    fetch("/api/charts/weekly_issued")
        .then(res => res.json())
        .then(data => {
            const labels = data.map(i => i.day);
            const values = data.map(i => i.count);

            const ctx = document.getElementById("weeklyIssuedChart").getContext("2d");

            if (weeklyIssuedChart) weeklyIssuedChart.destroy();

            weeklyIssuedChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Books Issued",
                        data: values,
                        backgroundColor: "#3b82f6"
                    }]
                },
                options: {
                    scales: {
                        x: {
                            ticks: { color: "#e5e7eb" }
                        },
                        y: {
                            ticks: { color: "#e5e7eb" }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: "Books Issued Per Day (This Week)",
                            color: "#fff",
                            font: { size: 18 }
                        },
                        legend: {
                            labels: { color: "#e5e7eb" }
                        }
                    }
                }
            });
        });
}

// ============================
// LOAD BOTH CHARTS (Dashboard)
// ============================
function loadCharts() {
    loadPopularBooksChart();
    loadWeeklyIssuedChart();
}

// Auto-load charts when admin dashboard is opened
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("popularBooksChart")) {
        loadCharts();
    }
});
