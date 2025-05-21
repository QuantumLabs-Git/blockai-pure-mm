```javascript
// main.js for BlockAI Pure MM

// Store the selected chain in local storage to persist across page navigation
document.addEventListener('DOMContentLoaded', function() {
    const chainSelector = document.getElementById('chainSelector');
    
    // Set the initial value from local storage if available
    const savedChain = localStorage.getItem('selectedBlockchain');
    if (savedChain) {
        chainSelector.value = savedChain;
    }
    
    // Update local storage when the user changes the selection
    chainSelector.addEventListener('change', function() {
        localStorage.setItem('selectedBlockchain', this.value);
        
        // Trigger any page-specific functions that depend on the blockchain selection
        if (typeof updateBscWalletGeneratorVisibility === 'function') {
            updateBscWalletGeneratorVisibility();
        }
    });
    
    // Trigger a change event to ensure UI is updated properly
    chainSelector.dispatchEvent(new Event('change'));
});

// Format addresses to show ellipsis in the middle (0x1234...5678)
function formatAddress(address, start = 6, end = 4) {
    if (!address || address.length < (start + end + 1)) {
        return address;
    }
    return address.substring(0, start) + '...' + address.substring(address.length - end);
}

// Copy text to clipboard with feedback
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(function() {
        const originalText = element.textContent;
        element.textContent = 'Copied!';
        setTimeout(function() {
            element.textContent = originalText;
        }, 1500);
    }, function() {
        console.error('Failed to copy text');
    });
}

// Format numbers with thousands separators
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Display a notification toast
function showToast(message, type = 'success') {
    // Create toast element if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create the toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type}`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove the toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}
```