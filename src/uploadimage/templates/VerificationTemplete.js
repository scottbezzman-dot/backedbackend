module.exports = (data) => {
  const { firstName, lastName, dob, country, address, idType, idImagePath, id, baseUrl } = data;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>User Verification</title>
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
          background: #007bff;
          color: #fff !important;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>New User Verification Submitted</h2>
        <p><span class="highlight">First Name:</span> ${firstName}</p>
        <p><span class="highlight">Last Name:</span> ${lastName}</p>
        <p><span class="highlight">Date of Birth:</span> ${dob}</p>
        <p><span class="highlight">Country:</span> ${country}</p>
        <p><span class="highlight">Address:</span> ${address}</p>
        <p><span class="highlight">ID Type:</span> ${idType}</p>
        <p>
          <span class="highlight">ID Image:</span>
          <a class="button" href="${baseUrl}${idImagePath}" target="_blank">View ID</a>
        </p>
        <hr/>
        <p>Submitted by user ID: <strong>${id}</strong></p>
      </div>
    </body>
    </html>
  `;
};
