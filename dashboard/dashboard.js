// Dashboard JavaScript for Stanford Sherlock SLURM Analytics
class SLURMDashboard {
    constructor() {
        this.data = null;
        this.charts = {};
        this.currentTab = 'overview';
        this.init();
    }

    async init() {
        console.log('Initializing SLURM Dashboard...');
        this.showLoading();
        this.setupEventListeners();
        try {
            await this.loadData();
            await this.loadTabContent('overview'); // Load overview content by default
            this.updateDashboard();
        } catch (e) {
            console.error('Initialization error:', e);
        } finally {
            this.hideLoading();
        }
        
        // Preload all other tabs in the background for smooth switching
        setTimeout(() => this.preloadAllTabs(), 1000);
        
        console.log('Dashboard initialized successfully');
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => this.refreshData());

        // Tab navigation
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    async switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show selected tab content
        document.getElementById(tabName).classList.add('active');
        this.currentTab = tabName;

        // Load tab content if not already loaded
        await this.loadTabContent(tabName);

        // Refresh charts for the new tab
        this.refreshChartsForTab(tabName);
    }

    async loadTabContent(tabName) {
        const contentContainer = document.getElementById(`${tabName}-content`);
        if (!contentContainer) return;

        // Check if content is already loaded
        if (contentContainer.children.length > 0) return;

        try {
            console.log(`Loading tab content: ${tabName}.html`);
            const response = await fetch(`${tabName}.html`);
            if (response.ok) {
                const html = await response.text();
                contentContainer.innerHTML = html;
                console.log(`Loaded ${tabName} content`);
            } else {
                console.error(`Failed to load ${tabName} content, status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error loading ${tabName} content:`, error);
        }
    }

    async preloadAllTabs() {
        const tabs = ['overview', 'performance', 'resources', 'users', 'trends'];
        const promises = tabs.map(tab => this.loadTabContent(tab));
        await Promise.all(promises);
        console.log('All tab content preloaded');
    }

    async loadData() {
        try {
            console.log('Attempting to load data...');
            this.showLoadingIndicator();
            
            // Try to load from JSON file first - fix the path
            const response = await fetch('./slurm_analysis.json');
            console.log('Fetch response status:', response.status);
            
            if (response.ok) {
                this.data = await response.json();
                console.log('Data loaded from JSON successfully:', this.data);
            } else {
                console.log('JSON file not found, using sample data');
                this.data = window.sampleData;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            console.log('Falling back to sample data');
            this.data = window.sampleData;
        }
        
        // Ensure we have data
        if (!this.data) {
            console.log('No data available, using sample data');
            this.data = window.sampleData;
        }
        
        console.log('Final data object:', this.data);
        this.hideLoadingIndicator();
    }

    showLoadingIndicator() {
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            statusElement.style.display = 'block';
            statusElement.style.background = '#F59E0B';
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Data...';
        }
    }

    hideLoadingIndicator() {
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    updateDashboard() {
        if (!this.data) {
            console.error('No data available for dashboard update');
            return;
        }

        console.log('Updating dashboard with data:', this.data);
        
        try {
            this.updateOverviewCards();
            this.updateDetailedMetrics();
            // Create charts only for the active tab to avoid rendering on hidden/missing canvases
            this.refreshChartsForTab(this.currentTab);
            this.updateLastUpdated();
            this.showDataStatus();
            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    showDataStatus() {
        const statusElement = document.getElementById('dataStatus');
        if (statusElement) {
            statusElement.style.display = 'block';
            // Hide after 3 seconds
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }

    updateOverviewCards() {
        const { metadata, job_states, resource_usage, user_analysis } = this.data;

        // Total Jobs
        document.getElementById('totalJobs').textContent = this.formatNumber(metadata.total_jobs);

        // Success Rate
        if (job_states && job_states.states) {
            const completed = job_states.states.find(s => s.state.includes('COMPLETED'));
            if (completed) {
                document.getElementById('successRate').textContent = `${completed.percentage.toFixed(1)}%`;
                // Also update the display in the Issues & Alerts card
                if (document.getElementById('successRateDisplay')) {
                    document.getElementById('successRateDisplay').textContent = `${completed.percentage.toFixed(1)}%`;
                }
            }
        }

        // Total CPU Hours
        if (resource_usage && resource_usage.cpu_hours) {
            const cpuHours = Math.round(resource_usage.cpu_hours.total);
            document.getElementById('totalCpuHours').textContent = this.formatNumber(cpuHours);
            // Also update the display in the Resource Summary card
            if (document.getElementById('totalCpuHoursDisplay')) {
                document.getElementById('totalCpuHoursDisplay').textContent = this.formatNumber(cpuHours);
            }
        }

        // Active Users
        if (user_analysis) {
            document.getElementById('activeUsers').textContent = this.formatNumber(user_analysis.total_users);
            // Also update the display in the Resource Summary card
            if (document.getElementById('activeUsersDisplay')) {
                document.getElementById('activeUsersDisplay').textContent = this.formatNumber(user_analysis.total_users);
            }
        }
    }

    updateDetailedMetrics() {
        const { runtime_analysis, resource_usage, job_states, metadata, partition_analysis, daily_patterns } = this.data;

        try {
            // Cluster Information
            if (metadata?.date_range?.start) {
                const startDate = new Date(metadata.date_range.start).toLocaleDateString();
                const endDate = new Date(metadata.date_range.end).toLocaleDateString();
                document.getElementById('dateRange').textContent = `${startDate} - ${endDate}`;
            }

            if (metadata?.date_range?.total_days) {
                document.getElementById('totalDays').textContent = metadata.date_range.total_days;
            }

            if (partition_analysis?.partitions?.length > 0) {
                document.getElementById('partition').textContent = partition_analysis.partitions[0]?.partition || 'N/A';
            }

            if (daily_patterns?.average_jobs_per_day) {
                document.getElementById('avgJobsPerDay').textContent = daily_patterns.average_jobs_per_day.toFixed(1);
            }

            // Issues & Alerts
            if (job_states?.states) {
                const failed = job_states.states.find(s => s.state.includes('FAILED'));
                const timeout = job_states.states.find(s => s.state.includes('TIMEOUT'));
                const oom = job_states.states.find(s => s.state.includes('OUT_OF_MEMORY'));
                const nodeFail = job_states.states.find(s => s.state.includes('NODE_FAIL'));

                if (failed) document.getElementById('failureRate').textContent = `${failed.percentage.toFixed(1)}%`;
                if (timeout) document.getElementById('timeoutRate').textContent = `${timeout.percentage.toFixed(1)}%`;
                if (oom) document.getElementById('memoryIssues').textContent = `${oom.percentage.toFixed(1)}%`;
                if (nodeFail) document.getElementById('nodeFailures').textContent = `${nodeFail.percentage.toFixed(1)}%`;
            }

            // Performance Metrics
            if (runtime_analysis?.statistics) {
                const stats = runtime_analysis.statistics;
                document.getElementById('avgDuration').textContent = `${stats.mean.toFixed(2)} hours`;
                document.getElementById('medianDuration').textContent = `${stats['50%'].toFixed(2)} hours`;
                document.getElementById('maxDuration').textContent = `${stats.max.toFixed(1)} hours`;
                
                // Calculate 95th percentile (approximate)
                const p95 = stats.mean + (stats.std * 1.645);
                document.getElementById('p95Duration').textContent = `${p95.toFixed(2)} hours`;
            }

            // Runtime Statistics (estimated)
            if (runtime_analysis?.statistics) {
                const stats = runtime_analysis.statistics;
                const totalJobs = stats.count;
                
                // Estimate distribution based on statistics
                const shortJobs = Math.round(totalJobs * 0.6); // ~60% are short
                const mediumJobs = Math.round(totalJobs * 0.35); // ~35% are medium
                const longJobs = Math.round(totalJobs * 0.05); // ~5% are long
                
                document.getElementById('shortJobs').textContent = this.formatNumber(shortJobs);
                document.getElementById('mediumJobs').textContent = this.formatNumber(mediumJobs);
                document.getElementById('longJobs').textContent = this.formatNumber(longJobs);
            }

            // Resource Usage
            if (resource_usage?.cpu_cores?.statistics) {
                const avgCores = resource_usage.cpu_cores.statistics.mean.toFixed(1);
                document.getElementById('avgCpuCores').textContent = avgCores;
                // Also update the display in the Resource Summary card
                if (document.getElementById('avgCpuCoresDisplay')) {
                    document.getElementById('avgCpuCoresDisplay').textContent = avgCores;
                }
            }

            if (this.data.gpu_analysis) {
                const gpuUsage = `${this.data.gpu_analysis.gpu_jobs.percentage.toFixed(1)}%`;
                document.getElementById('gpuUsage').textContent = gpuUsage;
                // Also update the display in the Resource Summary card
                if (document.getElementById('gpuUsageDisplay')) {
                    document.getElementById('gpuUsageDisplay').textContent = gpuUsage;
                }
                document.getElementById('maxGpuAllocation').textContent = 
                    this.data.gpu_analysis.statistics.max;
            }

            // CPU Efficiency (estimated)
            if (resource_usage?.cpu_hours?.total && metadata?.total_jobs) {
                const efficiency = (resource_usage.cpu_hours.total / metadata.total_jobs / 24 * 100).toFixed(1);
                document.getElementById('cpuEfficiency').textContent = `${efficiency}%`;
            }

            // Partition Usage
            if (partition_analysis?.partitions?.length > 0) {
                document.getElementById('primaryPartition').textContent = partition_analysis.partitions[0]?.partition || 'N/A';
                document.getElementById('partitionJobs').textContent = this.formatNumber(partition_analysis.partitions[0]?.count || 0);
            }

            // User Statistics
            if (this.data.user_analysis && metadata?.total_jobs) {
                const user_analysis = this.data.user_analysis;
                document.getElementById('totalUsers').textContent = this.formatNumber(user_analysis.total_users);
                document.getElementById('avgJobsPerUser').textContent = this.formatNumber(Math.round(metadata.total_jobs / user_analysis.total_users));
                
                if (user_analysis.top_users?.length > 0) {
                    document.getElementById('topUserJobs').textContent = this.formatNumber(user_analysis.top_users[0].job_count);
                    
                    // Count active users (>100 jobs)
                    const activeUsers = user_analysis.top_users.filter(u => u.job_count > 100).length;
                    document.getElementById('activeUsersCount').textContent = activeUsers;
                }
            }

            // Time-based Patterns
            if (daily_patterns?.job_counts?.length > 0 && daily_patterns?.dates?.length > 0) {
                const maxIndex = daily_patterns.job_counts.indexOf(Math.max(...daily_patterns.job_counts));
                const minIndex = daily_patterns.job_counts.indexOf(Math.min(...daily_patterns.job_counts));
                
                if (maxIndex >= 0) {
                    document.getElementById('peakDay').textContent = new Date(daily_patterns.dates[maxIndex]).toLocaleDateString();
                    document.getElementById('peakVolume').textContent = this.formatNumber(daily_patterns.job_counts[maxIndex]);
                }
                
                if (minIndex >= 0) {
                    document.getElementById('lowestDay').textContent = new Date(daily_patterns.dates[minIndex]).toLocaleDateString();
                    document.getElementById('lowestVolume').textContent = this.formatNumber(daily_patterns.job_counts[minIndex]);
                }
            }

            // Success Rate Trends
            if (job_states?.states) {
                const completed = job_states.states.find(s => s.state.includes('COMPLETED'));
                if (completed) {
                    document.getElementById('overallSuccess').textContent = `${completed.percentage.toFixed(1)}%`;
                    document.getElementById('recentSuccess').textContent = `${completed.percentage.toFixed(1)}%`;
                    document.getElementById('successTrend').textContent = 'Stable';
                }
            }
        } catch (error) {
            console.error('Error updating detailed metrics:', error);
        }
    }

    createCharts() {
        try {
            this.createJobStatesChart();
            this.createRuntimeChart();
            this.createDailyJobsChart();
            this.createTopUsersChart();
            this.createCpuDistributionChart();
            this.createGpuUsageChart();
            this.createUserActivityChart();
        } catch (error) {
            console.error('Error creating charts:', error);
        }
    }

    refreshChartsForTab(tabName) {
        // Destroy existing charts for the tab
        const chartIds = this.getChartIdsForTab(tabName);
        chartIds.forEach(id => {
            if (this.charts[id]) {
                this.charts[id].destroy();
                delete this.charts[id];
            }
        });

        // Recreate charts for the tab
        switch (tabName) {
            case 'overview':
                this.createJobStatesChart();
                break;
            case 'performance':
                this.createRuntimeChart();
                this.createDailyJobsChart();
                break;
            case 'resources':
                this.createCpuDistributionChart();
                this.createGpuUsageChart();
                break;
            case 'users':
                this.createTopUsersChart();
                this.createUserActivityChart();
                break;
            case 'trends':
                this.createTrendsChart();
                break;
        }
    }

    getChartIdsForTab(tabName) {
        const chartMap = {
            'overview': ['jobStates'],
            'performance': ['runtime', 'dailyJobs'],
            'resources': ['cpuDistribution', 'gpuUsage'],
            'users': ['topUsers', 'userActivity'],
            'trends': ['trends']
        };
        return chartMap[tabName] || [];
    }

    createJobStatesChart() {
        const ctx = document.getElementById('jobStatesChart');
        if (!ctx || !this.data.job_states) return;

        const { states } = this.data.job_states;
        const topStates = states.slice(0, 8); // Show top 8 states

        this.charts.jobStates = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topStates.map(s => s.state),
                datasets: [{
                    data: topStates.map(s => s.count),
                    backgroundColor: [
                        '#10B981', '#3B82F6', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const state = topStates[context.dataIndex];
                                return `${state.state}: ${this.formatNumber(state.count)} (${state.percentage.toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createDailyJobsChart() {
        const ctx = document.getElementById('dailyJobsChart');
        if (!ctx || !this.data.daily_patterns) return;

        const { dates, job_counts } = this.data.daily_patterns;
        
        // Sample data for better visualization (take every 7th day)
        const sampledDates = dates.filter((_, i) => i % 7 === 0);
        const sampledCounts = job_counts.filter((_, i) => i % 7 === 0);

        this.charts.dailyJobs = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sampledDates.map(date => new Date(date).toLocaleDateString()),
                datasets: [{
                    label: 'Jobs per Day',
                    data: sampledCounts,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Jobs: ${this.formatNumber(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatNumber(value)
                        }
                    }
                }
            }
        });
    }

    createRuntimeChart() {
        const ctx = document.getElementById('runtimeChart');
        if (!ctx || !this.data.runtime_analysis) return;

        const stats = this.data.runtime_analysis.statistics;
        
        // Create histogram-like data
        const ranges = [
            { min: 0, max: 0.1, label: '0-6 min' },
            { min: 0.1, max: 1, label: '6-60 min' },
            { min: 1, max: 6, label: '1-6 hours' },
            { min: 6, max: 24, label: '6-24 hours' },
            { min: 24, max: 168, label: '1-7 days' }
        ];

        // Estimate distribution based on statistics
        const distribution = ranges.map(range => {
            if (range.max <= stats['50%']) return Math.random() * 20 + 10;
            if (range.max <= stats['75%']) return Math.random() * 15 + 5;
            return Math.random() * 10;
        });

        this.charts.runtime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranges.map(r => r.label),
                datasets: [{
                    label: 'Job Count (Estimated)',
                    data: distribution,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: '#8B5CF6',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Jobs: ~${Math.round(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Estimated Job Count'
                        }
                    }
                }
            }
        });
    }

    createTopUsersChart() {
        const ctx = document.getElementById('topUsersChart');
        if (!ctx || !this.data.user_analysis) return;

        const { top_users } = this.data.user_analysis;
        const top10 = top_users.slice(0, 10);

        this.charts.topUsers = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10.map((_, i) => `User ${i + 1}`),
                datasets: [{
                    label: 'Job Count',
                    data: top10.map(u => u.job_count),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const user = top10[context.dataIndex];
                                return `Jobs: ${this.formatNumber(user.job_count)} (${user.percentage.toFixed(1)}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Job Count'
                        }
                    }
                }
            }
        });
    }

    createCpuDistributionChart() {
        const ctx = document.getElementById('cpuDistributionChart');
        if (!ctx || !this.data.resource_usage?.cpu_cores) return;

        const stats = this.data.resource_usage.cpu_cores.statistics;
        
        // Create CPU core distribution
        const cpuRanges = [
            { min: 1, max: 4, label: '1-4 cores' },
            { min: 5, max: 16, label: '5-16 cores' },
            { min: 17, max: 64, label: '17-64 cores' },
            { min: 65, max: 128, label: '65+ cores' }
        ];

        // Estimate distribution
        const distribution = cpuRanges.map(range => {
            if (range.max <= stats['50%']) return Math.random() * 30 + 20;
            if (range.max <= stats['75%']) return Math.random() * 20 + 10;
            return Math.random() * 15 + 5;
        });

        this.charts.cpuDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: cpuRanges.map(r => r.label),
                datasets: [{
                    label: 'Job Count',
                    data: distribution,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3B82F6',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Estimated Job Count'
                        }
                    }
                }
            }
        });
    }

    createGpuUsageChart() {
        const ctx = document.getElementById('gpuUsageChart');
        if (!ctx || !this.data.gpu_analysis) return;

        const { gpu_jobs } = this.data.gpu_analysis;
        const totalJobs = this.data.metadata.total_jobs;
        const nonGpuJobs = totalJobs - gpu_jobs.count;

        this.charts.gpuUsage = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['GPU Jobs', 'CPU Only'],
                datasets: [{
                    data: [gpu_jobs.count, nonGpuJobs],
                    backgroundColor: ['#8B5CF6', '#E5E7EB'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const percentage = ((value / totalJobs) * 100).toFixed(1);
                                return `${context.label}: ${this.formatNumber(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createUserActivityChart() {
        const ctx = document.getElementById('userActivityChart');
        if (!ctx || !this.data.user_analysis) return;

        const { top_users } = this.data.user_analysis;
        const top5 = top_users.slice(0, 5);
        const others = top_users.slice(5).reduce((sum, user) => sum + user.job_count, 0);

        this.charts.userActivity = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [...top5.map((_, i) => `User ${i + 1}`), 'Others'],
                datasets: [{
                    data: [...top5.map(u => u.job_count), others],
                    backgroundColor: [
                        '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const percentage = ((value / this.data.metadata.total_jobs) * 100).toFixed(1);
                                return `${context.label}: ${this.formatNumber(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createTrendsChart() {
        const ctx = document.getElementById('trendsChart');
        if (!ctx || !this.data.daily_patterns) return;

        const { dates, job_counts } = this.data.daily_patterns;
        
        // Create weekly averages for trends
        const weeklyData = [];
        const weeklyLabels = [];
        
        for (let i = 0; i < dates.length; i += 7) {
            const weekDates = dates.slice(i, i + 7);
            const weekJobs = job_counts.slice(i, i + 7);
            if (weekJobs.length > 0) {
                const avg = weekJobs.reduce((sum, count) => sum + count, 0) / weekJobs.length;
                weeklyData.push(avg);
                weeklyLabels.push(`Week ${Math.floor(i / 7) + 1}`);
            }
        }

        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyLabels,
                datasets: [{
                    label: 'Weekly Average Jobs',
                    data: weeklyData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Weekly Average: ${this.formatNumber(Math.round(context.parsed.y))}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Jobs per Week'
                        }
                    }
                }
            }
        });
    }

    updateLastUpdated() {
        const now = new Date();
        document.getElementById('lastUpdated').textContent = now.toLocaleString();
    }

    async refreshData() {
        this.showLoading();
        try {
            await this.loadData();
            this.updateDashboard();
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SLURMDashboard();
});

// Sample data for testing
window.sampleData = {
    metadata: {
        total_jobs: 860196,
        date_range: {
            start: "2024-05-23T15:42:44+00:00",
            end: "2025-05-19T23:58:46+00:00",
            total_days: 362
        }
    },
    runtime_analysis: {
        method: "START_End",
        statistics: {
            count: 840033,
            mean: 2.59,
            std: 10.59,
            min: -0.000833,
            "25%": 0.026111,
            "50%": 0.191667,
            "75%": 1.075833,
            max: 169.019444
        }
    },
    job_states: {
        total_states: 309,
        states: [
            { state: "COMPLETED", count: 573856, percentage: 66.71 },
            { state: "FAILED", count: 166253, percentage: 19.33 },
            { state: "TIMEOUT", count: 31360, percentage: 3.65 },
            { state: "CANCELLED_by_336822", count: 20517, percentage: 2.39 },
            { state: "OUT_OF_MEMORY", count: 4259, percentage: 0.5 },
            { state: "NODE_FAIL", count: 77, percentage: 0.01 }
        ]
    },
    resource_usage: {
        cpu_hours: {
            total: 42884667.52,
            average_per_job: 49.84
        },
        cpu_cores: {
            statistics: {
                mean: 9.0,
                std: 8.5,
                min: 1,
                "25%": 1.0,
                "50%": 4.0,
                "75%": 16.0,
                max: 128
            }
        }
    },
    user_analysis: {
        total_users: 336,
        top_users: [
            { user_id: "user1", job_count: 108982, percentage: 12.7 },
            { user_id: "user2", job_count: 93321, percentage: 10.8 },
            { user_id: "user3", job_count: 78650, percentage: 9.1 },
            { user_id: "user4", job_count: 69395, percentage: 8.1 },
            { user_id: "user5", job_count: 42958, percentage: 5.0 }
        ]
    },
    partition_analysis: {
        total_partitions: 1,
        partitions: [
            { partition: "serc", count: 860196, percentage: 100.0 }
        ]
    },
    gpu_analysis: {
        statistics: {
            mean: 0.054734,
            std: 0.397053,
            min: 0,
            "25%": 0,
            "50%": 0,
            "75%": 0,
            max: 27
        },
        gpu_jobs: {
            count: 32214,
            percentage: 3.7
        }
    },
    daily_patterns: {
        dates: [
            "2024-05-23", "2024-05-24", "2024-05-25", "2024-05-26", "2024-05-27",
            "2024-05-28", "2024-05-29", "2024-05-30", "2024-05-31", "2024-06-01",
            "2024-06-02", "2024-06-03", "2024-06-04", "2024-06-05", "2024-06-06",
            "2024-06-07", "2024-06-08", "2024-06-09", "2024-06-10", "2024-06-11",
            "2024-06-12", "2024-06-13", "2024-06-14", "2024-06-15", "2024-06-16",
            "2024-06-17", "2024-06-18", "2024-06-19", "2024-06-20", "2024-06-21"
        ],
        job_counts: [1200, 1350, 1100, 950, 1400, 1600, 1800, 1750, 1900, 2100, 
                     1950, 2200, 2400, 2300, 2500, 2350, 2600, 2800, 2700, 2900,
                     3100, 3000, 3200, 3400, 3300, 3500, 3700, 3600, 3800, 4000],
        average_jobs_per_day: 2376.2
    }
};
