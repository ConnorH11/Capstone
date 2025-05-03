function validateBinary(bin) {
    return /^[01]+$/.test(bin);
}

function binaryToBigInt(bin) {
    return BigInt('0b' + bin);
}

function showResult(binary, decimal, label) {
    const resultDiv = document.getElementById("binaryCalcResult");
    resultDiv.innerHTML = `
        <div class="alert alert-info">
            <p><strong>${label} (Binary):</strong> ${binary}</p>
            <p><strong>${label} (Decimal):</strong> ${decimal}</p>
        </div>
    `;
}

document.getElementById("addBtn").addEventListener("click", () => {
    const bin1 = document.getElementById("binary1").value.trim();
    const bin2 = document.getElementById("binary2").value.trim();

    if (!validateBinary(bin1) || !validateBinary(bin2)) {
        return showError("Please enter valid binary numbers.");
    }

    const result = binaryToBigInt(bin1) + binaryToBigInt(bin2);
    showResult(result.toString(2), result.toString(10), "Sum");
});

document.getElementById("subtractBtn").addEventListener("click", () => {
    const bin1 = document.getElementById("binary1").value.trim();
    const bin2 = document.getElementById("binary2").value.trim();

    if (!validateBinary(bin1) || !validateBinary(bin2)) {
        return showError("Please enter valid binary numbers.");
    }

    const result = binaryToBigInt(bin1) - binaryToBigInt(bin2);
    showResult(result.toString(2), result.toString(10), "Difference");
});

function showError(msg) {
    document.getElementById("binaryCalcResult").innerHTML =
        `<div class="alert alert-danger">${msg}</div>`;
}
