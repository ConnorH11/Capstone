document.getElementById("convertBtn").addEventListener("click", () => {
    const inputValue = document.getElementById("inputValue").value.trim();
    const inputType = document.querySelector('input[name="inputFormat"]:checked').value;
    const resultDiv = document.getElementById("conversionResults");
    resultDiv.innerHTML = "";

    let decimalValue;

    try {
        if (inputType === "binary") {
            if (!/^[01]+$/.test(inputValue)) throw new Error("Invalid binary number.");
            decimalValue = parseInt(inputValue, 2);
        } else if (inputType === "hex") {
            if (!/^[0-9a-fA-F]+$/.test(inputValue)) throw new Error("Invalid hexadecimal number.");
            decimalValue = parseInt(inputValue, 16);
        } else if (inputType === "decimal") {
            if (!/^\d+$/.test(inputValue)) throw new Error("Invalid decimal number.");
            decimalValue = parseInt(inputValue, 10);
        } else {
            throw new Error("Unknown input type.");
        }

        const binaryResult = decimalValue.toString(2);
        const hexResult = decimalValue.toString(16).toUpperCase();

        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p><strong>Decimal:</strong> ${decimalValue}</p>
                <p><strong>Binary:</strong> ${binaryResult}</p>
                <p><strong>Hexadecimal:</strong> ${hexResult}</p>
            </div>
        `;
    } catch (err) {
        resultDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
});
