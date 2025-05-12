// When the "Convert" button is clicked, handle the conversion process
document.getElementById("convertBtn").addEventListener("click", () => {
    // Read and trim the user input
    const inputValue = document.getElementById("inputValue").value.trim();
    // Determine which input format radio button is selected
    const inputType = document.querySelector('input[name="inputFormat"]:checked').value;
    // Grab the container for displaying results and clear any previous content
    const resultDiv = document.getElementById("conversionResults");
    resultDiv.innerHTML = "";

    let decimalValue;

    try {
        // If the input is binary, validate and parse as base 2
        if (inputType === "binary") {
            if (!/^[01]+$/.test(inputValue)) {
                throw new Error("Invalid binary number.");
            }
            decimalValue = parseInt(inputValue, 2);

            // If the input is hexadecimal, validate and parse as base 16
        } else if (inputType === "hex") {
            if (!/^[0-9a-fA-F]+$/.test(inputValue)) {
                throw new Error("Invalid hexadecimal number.");
            }
            decimalValue = parseInt(inputValue, 16);

            // If the input is decimal, validate and parse as base 10
        } else if (inputType === "decimal") {
            if (!/^\d+$/.test(inputValue)) {
                throw new Error("Invalid decimal number.");
            }
            decimalValue = parseInt(inputValue, 10);

            // Guard against any unexpected input types
        } else {
            throw new Error("Unknown input type.");
        }

        // Convert the parsed decimal value back into binary and hex strings
        const binaryResult = decimalValue.toString(2);
        const hexResult = decimalValue.toString(16).toUpperCase();

        // Render the successful conversion results
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p><strong>Decimal:</strong> ${decimalValue}</p>
                <p><strong>Binary:</strong> ${binaryResult}</p>
                <p><strong>Hexadecimal:</strong> ${hexResult}</p>
            </div>
        `;
    } catch (err) {
        // Display any errors that occurred during validation or parsing
        resultDiv.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
});
