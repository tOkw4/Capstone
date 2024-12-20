document.addEventListener('DOMContentLoaded', () => {
    const scanHistoryTable = document.getElementById('scan-history-table');
    const totalScannedEl = document.getElementById('total-scanned-count');
    const spamDetectedEl = document.getElementById('spam-detected-count');
    const nonSpamDetectedEl = document.getElementById('non-spam-detected-count');

    let pieChart, barChart;

    function updateCharts(spamDetected, nonSpamDetected) {
        const data = [spamDetected, nonSpamDetected];
        const labels = ['Phishing', 'Safe'];
    
        // Destroy previous instances of charts to avoid overlap
        if (pieChart) pieChart.destroy();
        if (barChart) barChart.destroy();
    
        // Initialize pie chart
        pieChart = new Chart(document.getElementById('pieChart'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scan Results',
                    data: data,
                    backgroundColor: ['#8b0000 ', '#006400 '], // Colors for each section
                    borderColor: '#ffffff', // Border color for the divisions
                    borderWidth: 2 // Border width to make it more visible
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { 
                        position: 'top' 
                    },
                    title: { 
                        display: true, 
                        text: 'Phishing vs. Safe' 
                    }
                }
            }
        });
        
    
        // Initialize bar chart
        barChart = new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Scans',
                    data: data,
                    backgroundColor: ['#8b0000 ', '#006400 '],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Phishing and Safe' }
                }
            }
        });
    }
    
    function loadScanHistory(showAll = false) {
        chrome.storage.local.get(['scanHistory', 'urlHistory'], (data) => {
            const emailHistory = data.scanHistory || [];
            const URLHistory = data.urlHistory || [];
            const combinedHistory = [...emailHistory, ...URLHistory]; // Combine both histories
    
            console.log("Loaded scan history from chrome.storage.local:", combinedHistory);

            const totalScans = combinedHistory.length;
            const spamDetected = combinedHistory.filter(scan => 
                typeof scan.result === 'string' && scan.result.includes('Phishing')
            ).length;
            
            const nonSpamDetected = totalScans - spamDetected;

    
         // Update count elements
            totalScannedEl.textContent = totalScans;
            spamDetectedEl.textContent = spamDetected;  // Update to show Mail count
            nonSpamDetectedEl.textContent = nonSpamDetected; // Update to show URL count
        
            // Clear table and populate with data
            scanHistoryTable.innerHTML = '';
            const header = document.createElement('thead');
            header.innerHTML = `
                <tr>
                    <th></th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Result</th>
                    <th>Date</th>
                    <th>Action</th>
                </tr>
            `;
            scanHistoryTable.appendChild(header);
    
            if (combinedHistory.length === 0) {
                scanHistoryTable.innerHTML += '<tr><td colspan="6" class="no-history">No scan history available</td></tr>';
            } else {
                const displayHistory = showAll ? combinedHistory : combinedHistory.slice(0, 5);
                renderHistoryRows(displayHistory);
    
                // Add "See All" or "Close" button
                const toggleRow = document.createElement('tr');
                toggleRow.innerHTML = `
                    <td colspan="6" class="toggle-row" style="text-align: center;">
                        <button id="toggle-button" style="padding: 10px 20px; background-color: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ${showAll ? 'Close' : 'See All'}
                        </button>
                    </td>
                `;
                scanHistoryTable.appendChild(toggleRow);
    
                // Attach click event to toggle button
                document.getElementById('toggle-button').addEventListener('click', () => {
                    loadScanHistory(!showAll); // Toggle between full and partial view
                });
            }
    
            // Update charts with the latest data
            updateCharts(spamDetected, nonSpamDetected);
        });
    }
    
    function renderHistoryRows(history) {
        history.forEach((scan, index) => {
            const row = document.createElement('tr');
            const type = scan.sender ? 'Email' : 'URL';
            const source = scan.sender ? scan.sender : scan.url;
    
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${type}</td>
                <td>${source}</td>
                <td>${scan.result}</td>
                <td>${scan.timestamp || 'N/A'}</td>
                <td><button class="delete-btn" data-index="${index}"
                    style="background-color: #800000; color: white; border: #191C24; border-radius: 5px; padding: 8px 12px; cursor: pointer;">Delete</button></td>
            `;
            scanHistoryTable.appendChild(row);
        });
    }
    


// Function to delete a specific scan from the history
function deleteScan(index) {
    chrome.storage.local.get(['scanHistory', 'urlHistory'], (data) => {
        const emailHistory = data.scanHistory || [];
        const URLHistory = data.urlHistory || [];
        const combinedHistory = [...emailHistory, ...URLHistory];

        const deletedScan = combinedHistory[index];
        if (deletedScan.sender) {
            // It's an email scan
            emailHistory.splice(emailHistory.findIndex(scan => scan.timestamp === deletedScan.timestamp), 1);
        } else {
            // It's a URL scan
            URLHistory.splice(URLHistory.findIndex(scan => scan.timestamp === deletedScan.timestamp), 1);
        }

        // Save back to storage
        chrome.storage.local.set({
            scanHistory: emailHistory,
            urlHistory: URLHistory
        }, () => {
            loadScanHistory();  // Reload history after deletion
        });
    });
}




    // Handle delete button clicks
    scanHistoryTable.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const index = event.target.getAttribute('data-index');
            deleteScan(index);
        }
    });

    // Initially load scan history and show statistics
    loadScanHistory();
});
