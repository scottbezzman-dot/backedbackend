module.exports = (data) => {
  const { id, depositAddress, xlmAmount, name, email, phone, transactionId, transactionImg, baseUrl } = data;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Transaction</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
        .container { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h2 { color: #333; }
        p { margin: 8px 0; }
        .highlight { font-weight: bold; color: #2c3e50; }
        a.button {
          display: inline-block;
          margin-top: 10px;
          padding: 10px 15px;
          background: #28a745;
          color: #fff !important;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>New Transaction Submitted</h2>
        <p><span class="highlight">Name:</span> ${name}</p>
        <p><span class="highlight">Email:</span> ${email}</p>
        <p><span class="highlight">Phone:</span> ${phone}</p>
        <p><span class="highlight">Deposit Address:</span> ${depositAddress}</p>
        <p><span class="highlight">XLM Amount:</span> ${xlmAmount}</p>
        <p><span class="highlight">Transaction ID:</span> ${transactionId}</p>
        <p>
          <span class="highlight">Transaction Proof:</span>
          <a class="button" href="${baseUrl}/icon/${transactionImg.filename}" target="_blank">View Image</a>
        </p>
        <hr/>
        <p>This Form was Submited by ${id}.</p>
      </div>
    </body>
    </html>
  `;
};
