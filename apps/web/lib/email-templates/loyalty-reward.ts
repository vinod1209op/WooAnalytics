export const loyaltyRewardEmailTemplate = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCRDSE Reward Email</title>
  </head>
  <body style="margin:0; padding:0; background:#eaf0f6; font-family:Arial, Helvetica, sans-serif; color:#181b46;">
    <div style="display:none; font-size:1px; color:#eaf0f6; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      Your reward is within reach.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eaf0f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff; border-radius:0; overflow:hidden;">
            <tr>
              <td align="center" style="padding:18px 20px 8px;">
                <img
                  src="https://storage.googleapis.com/msgsndr/bF3HKbWR2CHUb1pETzNN/media/672e654440d0bed602c268ae.png"
                  width="200"
                  alt="MCRDSE"
                  style="display:block; width:200px; height:auto; border:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:10px 20px 6px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif;">
                <p style="margin:0; text-align:left;">
                  Woohoo, <span style="color:#cb912f; font-weight:700;">{{contact.first_name}}</span>!
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 20px 10px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif;">
                <p style="margin:0 0 10px; text-align:left;">
                  Keep the rhythm going. You're close to your next reward, so we wanted to make it easy to see where you stand.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 10px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" style="font-size:13px; color:#6c6f9f; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">
                      {{contact.points_balance}} pts balance
                    </td>
                    <td align="right" style="font-size:13px; color:#6c6f9f; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">
                      {{contact.next_reward_at}} pts target
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:6px; background:#eadcf7; border-radius:999px;">
                  <tr>
                    <td>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="{{points_progress_percent}}%" style="background:#ab4eb8; border-radius:999px;">
                        <tr>
                          <td height="10" style="font-size:0; line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin:8px 0 0; text-align:left;">
                  <strong>{{contact.points_to_next}} points</strong> away from <strong>{{next_reward_title}}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 20px 12px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif;">
                <p style="margin:0 0 6px; text-align:left;">
                  Last reward unlocked: <strong>{{last_reward_title}}</strong>. Thank you for staying consistent.
                </p>
                <p style="margin:0; text-align:left;">
                  Lately you’ve been enjoying <strong>{{top_product}}</strong> — if you want a restock, we’ve got you.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 20px 18px;">
                <a
                  href="{{shop_url}}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="background:#ab4eb8; color:#ffffff; text-decoration:none; padding:12px 30px; border-radius:25px; font-size:18px; font-weight:700; display:inline-block;"
                >
                  Shop Now
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 12px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif;">
                <p style="margin:0; text-align:left;">
                  {{lead_coupon_line}}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 20px 18px; font-size:18px; line-height:1.25; font-family: Arial, Helvetica, sans-serif; color:#ab4eb8;">
                <p style="margin:0; text-align:left;">Mush love,</p>
                <p style="margin:4px 0 0; text-align:left;"><strong>The MCRDSE Team</strong></p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 20px; background:#181b46;">
                <img
                  src="https://storage.googleapis.com/msgsndr/bF3HKbWR2CHUb1pETzNN/media/6847fe8f8e2480438d39c484.png"
                  width="80"
                  alt="MCRDSE"
                  style="display:block; width:80px; height:auto; border:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="background:#181b46; padding:14px 20px; color:#ffffff; font-size:13px; line-height:1.5; text-align:center;">
                <em>Copyright &copy; {{right_now.year}} {{location.name}}, All rights reserved.</em>
                <br /><br />
                <strong>Our email address is:</strong>
                <br />
                {{location.email}}
                <br /><br />
                Want to change how you receive these emails?
                <br />
                You can <a href="{{email.unsubscribe_link}}" style="color:#ffffff; text-decoration:underline;">unsubscribe from this list</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
