import { Router } from "express";
import { Resend } from "resend";

const router = Router();
const api = process.env.RESEND_API;

router.post("/practice_registration", async (req, res) => {
  try {
    const { email } = req.body;
    const resend = new Resend(api);
    const { error } = await resend.emails.send({
from: "Rihanyo <onboarding@resend.dev>",
      to: email,
      subject: "Rihanyo | Complete Your Registration — Please Submit Your HPCSA Documentation",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rihanyo - Practice Registration</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f5f6f8;
      margin: 0;
      padding: 0;
    }

    header {
      background: #1f2937;
      color: white;
      padding: 16px 24px;
      font-size: 18px;
      font-weight: bold;
    }

    .container {
      max-width: 750px;
      margin: 50px auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    h1 {
      font-size: 24px;
      margin-bottom: 15px;
    }

    ul {
      line-height: 1.8;
      padding-left: 20px;
    }

    .note {
      margin-top: 20px;
      padding: 15px;
      background: #fff7cc;
      border-left: 5px solid #f2c94c;
      border-radius: 6px;
    }

    footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>

<body>
  <header>
    Rihanyo
  </header>

  <div class="container">
    <h1>Practice Registration Requirements</h1>

    <p>
      To register your practice, you are required to submit the following documents:
    </p>

    <ul>
      <li>HPCSA medical registration certificate</li>
      <li>Proof of identity (ID or passport)</li>
      <li>Proof of practice address</li>
      <li>Professional qualifications</li>
      <li>Any additional regulatory or compliance documents that may be required</li>
    </ul>

    <div class="note">
      <strong>Important:</strong> If you are unsure about the full list of required documents,
      submit all relevant professional and medical registration documents. Additional requirements
      may be requested during review.
    </div>
  </div>

  <footer>
    © 2026 Rihanyo. All rights reserved.
  </footer>
</body>
</html>`,
    });

    if (error) throw error;

    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

export default router;