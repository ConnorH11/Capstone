// Check if a string contains only binary digits (0 or 1)
function validateBinary(bin) {
    return /^[01]+$/.test(bin);
}

// Convert a binary string to a BigInt value
function binaryToBigInt(bin) {
    return BigInt('0b' + bin);
}

// Render the result into the page, labeling it as either Sum or Difference
function showResult(binary, decimal, label) {
    const resultDiv = document.getElementById("binaryCalcResult");
    resultDiv.innerHTML = `
        <div class="alert alert-info">
            <p><strong>${label} (Binary):</strong> ${binary}</p>
            <p><strong>${label} (Decimal):</strong> ${decimal}</p>
        </div>
    `;
}

// Handle click on the "Add" button to perform binary addition
document.getElementById("addBtn").addEventListener("click", () => {
    // Retrieve and trim user input
    const bin1 = document.getElementById("binary1").value.trim();
    const bin2 = document.getElementById("binary2").value.trim();

    // Validate both inputs; show error if invalid
    if (!validateBinary(bin1) || !validateBinary(bin2)) {
        return showError("Please enter valid binary numbers.");
    }

    // Perform addition using BigInt to support large binaries
    const result = binaryToBigInt(bin1) + binaryToBigInt(bin2);
    // Display the sum in both binary and decimal
    showResult(result.toString(2), result.toString(10), "Sum");
});

// Handle click on the "Subtract" button to perform binary subtraction
document.getElementById("subtractBtn").addEventListener("click", () => {
    const bin1 = document.getElementById("binary1").value.trim();
    const bin2 = document.getElementById("binary2").value.trim();

    if (!validateBinary(bin1) || !validateBinary(bin2)) {
        return showError("Please enter valid binary numbers.");
    }

    // Perform subtraction using BigInt
    const result = binaryToBigInt(bin1) - binaryToBigInt(bin2);
    // Display the difference in both binary and decimal
    showResult(result.toString(2), result.toString(10), "Difference");
});

// Display an error message when validation fails
function showError(msg) {
    document.getElementById("binaryCalcResult").innerHTML =
        `<div class="alert alert-danger">${msg}</div>`;
}
