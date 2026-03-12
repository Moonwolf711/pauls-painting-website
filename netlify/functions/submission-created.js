// Netlify automatically triggers this function when any form is submitted.
// Function name "submission-created" is a special Netlify event hook.
//
// SMS SETUP: Set these environment variables in Netlify dashboard:
//   SMS_GATEWAY  — Paul's email-to-SMS address (e.g. 7812541192@tmomail.net)
//                  Carrier gateways:
//                    T-Mobile:  number@tmomail.net
//                    AT&T:      number@txt.att.net
//                    Verizon:   number@vtext.com
//                    Sprint:    number@messaging.sprintpcs.com
//                    US Cell:   number@email.uscc.net
//
// Without SMS_GATEWAY set, the function still logs the submission
// and Netlify's built-in email notification handles email alerts.

exports.handler = async function (event) {
  var payload = JSON.parse(event.body).payload;
  var data = payload.data || {};
  var formName = payload.form_name || "unknown";

  var name = data.name || "Someone";
  var phone = data.phone || "no phone";
  var email = data.email || "";
  var service = data.service || "";
  var message = data.message || "";
  var date = data.date || "";
  var bookingType = data["booking-type"] || "";

  // Build notification text
  var lines = [];
  lines.push("NEW " + formName.toUpperCase() + " REQUEST");
  lines.push("From: " + name);
  lines.push("Phone: " + phone);
  if (email) lines.push("Email: " + email);
  if (date) lines.push("Date: " + date);
  if (bookingType) lines.push("Type: " + bookingType);
  if (service) lines.push("Service: " + service);
  if (message) lines.push("Note: " + message.substring(0, 120));

  var body = lines.join("\n");

  console.log("Form submission received:\n" + body);

  // Send SMS via email-to-SMS gateway if configured
  var gateway = process.env.SMS_GATEWAY;
  if (gateway) {
    try {
      // Use Netlify's built-in fetch (Node 18+)
      // We send via a simple SMTP relay or webhook
      // For email-to-SMS, we use a webhook approach
      var webhookUrl = process.env.NOTIFICATION_WEBHOOK;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: gateway,
            subject: "Paul's Painting - New Request",
            text: body
          })
        });
        console.log("SMS notification sent to " + gateway);
      }
    } catch (err) {
      console.error("SMS send failed:", err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Notification processed" })
  };
};
