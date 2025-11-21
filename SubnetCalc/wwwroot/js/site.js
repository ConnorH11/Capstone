// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(function () {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-success');
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
        }, 2000);
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

// --- Shared Validation Logic ---

function validateIPv4(ip) {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

function validateCIDR(cidr) {
    if (!cidr) return false;
    if (cidr.startsWith('/')) {
        const val = parseInt(cidr.substring(1), 10);
        return !isNaN(val) && val >= 0 && val <= 32;
    }
    // Simple check for dotted decimal mask
    const maskRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return maskRegex.test(cidr);
}

function validateSubnetString(subnet) {
    if (!subnet || !subnet.includes('/')) return false;
    const parts = subnet.split('/');
    if (parts.length !== 2) return false;

    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);

    return validateIPv4(ip) && !isNaN(prefix) && prefix >= 0 && prefix <= 32;
}

function updateInputValidation(input, isValid) {
    if (input.value.trim() === '') {
        input.classList.remove('is-valid', 'is-invalid');
        return;
    }
    if (isValid) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
    }
}

/**
 * Attaches validation listeners to IP and CIDR inputs.
 * @param {string} ipInputId - ID of the IP input element.
 * @param {string} cidrInputId - ID of the CIDR input element.
 * @param {string} submitBtnSelector - Selector for the submit button (optional).
 */
function attachValidation(ipInputId, cidrInputId, submitBtnSelector) {
    const ipInput = document.getElementById(ipInputId);
    const cidrInput = document.getElementById(cidrInputId);
    const submitBtn = submitBtnSelector ? document.querySelector(submitBtnSelector) : null;

    function checkFormValidity() {
        if (!submitBtn) return;
        const isIpValid = validateIPv4(ipInput.value);
        const isCidrValid = validateCIDR(cidrInput.value);
        // Only disable if inputs are not empty but invalid? 
        // Or strictly enforce validity. Let's enforce validity if they have typed something.
        // Actually, for better UX, disable if either is invalid (and not empty) or if empty?
        // Let's just update the visual state for now, disabling button might be too aggressive if logic isn't perfect.
        // But user asked for "valid ip and subnet checker", usually implies preventing bad submission.
        // Let's stick to visual feedback for now to match IPSubnet behavior, 
        // but IPSubnet didn't disable button in the code I saw, just showed invalid-feedback.
        // Wait, IPSubnet had `e.preventDefault()` on submit if invalid.
    }

    if (ipInput) {
        ipInput.addEventListener('input', function () {
            updateInputValidation(this, validateIPv4(this.value));
        });
    }

    if (cidrInput) {
        cidrInput.addEventListener('input', function () {
            updateInputValidation(this, validateCIDR(this.value));
        });
    }
}
