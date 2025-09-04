```javascript
// Add this to main.js or create this file if it doesn't exist
// This file provides common functionality across the whole application

document.addEventListener('DOMContentLoaded', function() {
    // Common feature state management functions that can be used across the application
    window.appHelpers = {
        // Save feature state
        saveFeatureState: function(featureId, stateData) {
            localStorage.setItem(`feature-${featureId}`, JSON.stringify(stateData));
            
            // Optionally save to server
            fetch('/api/save_feature_state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    feature_id: featureId,
                    feature_data: stateData
                })
            })
            .then(response => response.json())
            .catch(error => console.error('Error saving feature state:', error));
        },

        // Load feature state
        loadFeatureState: function(featureId) {
            const savedState = localStorage.getItem(`feature-${featureId}`);
            
            if (savedState) {
                try {
                    return JSON.parse(savedState);
                } catch (error) {
                    console.error('Error parsing saved feature state:', error);
                }
            }
            
            // Try to load from server if not in localStorage
            return fetch(`/api/load_feature_state/${featureId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        return result.data;
                    }
                    return null;
                })
                .catch(error => {
                    console.error('Error loading feature state from server:', error);
                    return null;
                });
        },

        // Format date for display
        formatDate: function(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString();
        },

        // Format currency amounts
        formatCurrency: function(amount, currency) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency || 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
            }).format(amount);
        },

        // Display a toast notification
        showToast: function(message, type = 'success', duration = 3000) {
            // Check if toast container exists
            let toastContainer = document.getElementById('toast-container');
            
            // Create toast container if it doesn't exist
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
                document.body.appendChild(toastContainer);
            }
            
            // Create a unique ID for this toast
            const toastId = 'toast-' + Date.now();
            
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast align-items-center text-white bg-${type} border-0`;
            toast.id = toastId;
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            
            // Create toast content
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;
            
            // Add toast to container
            toastContainer.appendChild(toast);
            
            // Initialize toast and show it
            const bsToast = new bootstrap.Toast(toast, {
                autohide: true,
                delay: duration
            });
            
            bsToast.show();
            
            // Remove toast from DOM after it's hidden
            toast.addEventListener('hidden.bs.toast', function() {
                toast.remove();
            });
        }
    };

    // Add blockchain handler to persist and use the selected blockchain
    const chainSelector = document.getElementById('chainSelector');
    if (chainSelector) {
        // Load saved blockchain selection from localStorage or default to 'solana'
        const savedBlockchain = localStorage.getItem('selectedBlockchain') || 'solana';
        chainSelector.value = savedBlockchain;
        
        // Dispatch initial blockchain selected event
        const initialEvent = new CustomEvent('blockchainChanged', { detail: savedBlockchain });
        document.dispatchEvent(initialEvent);
        
        // Update localStorage when blockchain is changed
        chainSelector.addEventListener('change', function() {
            const selectedBlockchain = this.value;
            localStorage.setItem('selectedBlockchain', selectedBlockchain);
            
            // Dispatch an event so other pages can react to the blockchain change
            const event = new CustomEvent('blockchainChanged', { detail: selectedBlockchain });
            document.dispatchEvent(event);
            
            // Show toast notification
            if (window.appHelpers && window.appHelpers.showToast) {
                window.appHelpers.showToast(`Blockchain switched to ${selectedBlockchain.toUpperCase()}`, 'info');
            }
        });
    }
});
```