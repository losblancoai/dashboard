document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.dashboard-section');
    const navItems = document.querySelectorAll('.nav-item');
    const fileContentDivs = {
        'identity-section': document.getElementById('identity-content'),
        'soul-section': document.getElementById('soul-content'),
        'user-section': document.getElementById('user-content'),
        'agents-section': document.getElementById('agents-content'),
        'monologue-section': document.getElementById('monologue-content'),
        'tasks-section': document.getElementById('tasks-content'),
    };
    const memoryFileList = document.getElementById('memory-file-list');
    const currentMemoryContent = document.getElementById('current-memory-content');

    // Function to show a specific section
    const showSection = (targetId) => {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetId) {
                section.classList.add('active');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.target === targetId) {
                item.classList.add('active');
            }
        });
    };

    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.dataset.target;
            showSection(targetId);
            history.pushState(null, '', e.target.getAttribute('href'));
            
            // Load content if it's a file section
            if (fileContentDivs[targetId]) {
                let fileName = '';
                if (targetId === 'monologue-section') {
                    fileName = 'INTERNAL_MONOLOGUE.md';
                } else if (targetId === 'tasks-section') {
                    fileName = 'TASKS.md';
                } else {
                    fileName = targetId.split('-')[0].toUpperCase() + '.md';
                }
                loadFileContent(fileName, fileContentDivs[targetId]);
            } else if (targetId === 'memory-section') {
                loadMemoryFiles();
            }
        });
    });

    // Function to load system stats
    const loadStats = async () => {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();

            document.getElementById('cpu-usage').textContent = `${data.cpu.usage}%`;
            document.getElementById('cpu-cores').textContent = `Cores: ${data.cpu.cores}`;
            document.getElementById('mem-usage').textContent = `${data.memory.percent}%`;
            document.getElementById('mem-info').textContent = `${data.memory.used} GB / ${data.memory.total} GB`;

            const gpuInfoDiv = document.getElementById('gpu-info');
            gpuInfoDiv.innerHTML = '';
            if (data.gpu.length > 0) {
                data.gpu.forEach(g => {
                    const p = document.createElement('p');
                    p.textContent = `${g.model} (${g.vram})`;
                    gpuInfoDiv.appendChild(p);
                });
            } else {
                gpuInfoDiv.innerHTML = '<p>No GPU detected</p>';
            }

            document.getElementById('os-platform').textContent = `Platform: ${data.os.platform}`;
            document.getElementById('os-distro').textContent = `Distro: ${data.os.distro}`;
            document.getElementById('os-hostname').textContent = `Hostname: ${data.os.hostname}`;
            
        } catch (error) {
            console.error('Error fetching system stats:', error);
            // Update UI to reflect error
        }
    };

    // Function to load Blanco Status
    const loadBlancoStatus = async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            document.getElementById('blanco-status').textContent = data.status;
            document.getElementById('blanco-uptime').textContent = `${(data.uptime / 3600).toFixed(1)} hours`;
            document.getElementById('blanco-version').textContent = data.version;

        } catch (error) {
            console.error('Error fetching Blanco status:', error);
        }
    };

    // Function to load content of a specific file (e.g., IDENTITY.md)
    const loadFileContent = async (fileName, targetDiv) => {
        try {
            targetDiv.innerHTML = 'Loading...';
            const response = await fetch(`/api/file/${fileName}`);
            const data = await response.json();
            if (response.ok) {
                targetDiv.innerHTML = data.html;
            } else {
                targetDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
            }
        } catch (error) {
            console.error(`Error loading ${fileName}:`, error);
            targetDiv.innerHTML = `<p style="color: red;">Failed to load ${fileName}.</p>`;
        }
    };

    // Function to load list of memory files
    const loadMemoryFiles = async () => {
        try {
            memoryFileList.innerHTML = '<li>Loading memory files...</li>';
            const response = await fetch('/api/memory-files');
            const data = await response.json();
            if (response.ok) {
                if (data.files.length > 0) {
                    memoryFileList.innerHTML = '';
                    data.files.forEach(file => {
                        const li = document.createElement('li');
                        li.textContent = file;
                        li.dataset.fileName = file;
                        li.addEventListener('click', () => loadMemoryFileContent(file));
                        memoryFileList.appendChild(li);
                    });
                    // Load the most recent memory file by default
                    if (data.files[0]) {
                        loadMemoryFileContent(data.files[0]);
                    }
                } else {
                    memoryFileList.innerHTML = '<li>No memory files found.</li>';
                }
            } else {
                memoryFileList.innerHTML = `<li style="color: red;">${data.error}</li>`;
            }
        } catch (error) {
            console.error('Error loading memory files:', error);
            memoryFileList.innerHTML = '<li>Failed to load memory files.</li>';
        }
    };

    // Function to load content of a specific memory file
    const loadMemoryFileContent = async (fileName) => {
        try {
            currentMemoryContent.innerHTML = 'Loading...';
            const response = await fetch(`/api/memory/${fileName}`);
            const data = await response.json();
            if (response.ok) {
                currentMemoryContent.innerHTML = `<h3>${fileName}</h3>` + data.html;
            } else {
                currentMemoryContent.innerHTML = `<p style="color: red;">${data.error}</p>`;
            }
        } catch (error) {
            console.error(`Error loading memory file ${fileName}:`, error);
            currentMemoryContent.innerHTML = `<p style="color: red;">Failed to load ${fileName}.</p>`;
        }
    };

    // Initial loads
    loadStats();
    loadBlancoStatus();
    setInterval(loadStats, 5000); // Update stats every 5 seconds
    setInterval(loadBlancoStatus, 60000); // Update status every minute

    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Check URL hash for initial section, otherwise default to stats
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
        const targetSection = document.querySelector(`.nav-item[href="#${initialHash}"]`);
        if (targetSection) {
            showSection(targetSection.dataset.target);
            // Manually trigger content load for initial section if it's a file section
            const targetId = targetSection.dataset.target;
            if (fileContentDivs[targetId]) {
                const fileName = targetId.split('-')[0].toUpperCase() + '.md';
                loadFileContent(fileName, fileContentDivs[targetId]);
            } else if (targetId === 'memory-section') {
                loadMemoryFiles();
            }
        } else {
            showSection('stats-section'); // Default to stats if hash is invalid
        }
    } else {
        showSection('stats-section'); // Default to stats if no hash
    }

});
