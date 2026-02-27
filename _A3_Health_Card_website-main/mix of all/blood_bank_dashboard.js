// Blood Bank Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function () {
    setupNavigation();
    updateDateTime();

    // Update time every minute
    setInterval(updateDateTime, 60000);
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item:not(.logout-item)');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Get page to show
            const pageName = this.getAttribute('data-page');

            // Hide all pages
            document.querySelectorAll('.content-page').forEach(page => {
                page.classList.remove('active');
            });

            // Show selected page
            const targetPage = document.getElementById(`${pageName}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
        });
    });
}

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);

    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = dateString;
    }
}

// AJAX Functions

function submitAddUnit() {
    const form = document.getElementById('addUnitForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);

    fetch('/blood_bank/unit/add', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred.');
        });
}

function processRequest(requestId, action) {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    const formData = new FormData();
    formData.append('request_id', requestId);
    formData.append('action', action);

    fetch('/blood_bank/request/action', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred.');
        });
}

// Refresh Button
document.getElementById('refreshBtn')?.addEventListener('click', function () {
    const icon = this.querySelector('i');
    icon.style.transform = 'rotate(360deg)';
    icon.style.transition = 'transform 0.5s ease';

    setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
        location.reload();
    }, 500);
});
