const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  standard_divak: "price_1T5PkqHGOpmcV4rto5OMgoEx",
  standard_tym:   "price_1T7wDZHGOpmcV4rt9m7J7y1",
  vip:            "price_1T7wElHGOpmcV4rtvJezbOzZ",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { ticket, mode, qty, email, teamName } = body;

  if (!ticket || !mode || !qty || qty < 1 || qty > 20) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Neplatné parametry." }),
    };
  }

  const priceKey = ticket === "vip" ? "vip" : `standard_${mode}`;
  const priceId  = PRICE_IDS[priceKey];

  const baseUrl = process.env.URL || "https://drinkmaster.netlify.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: parseInt(qty, 10) }],
      customer_email: email || undefined,
      metadata: {
        team_name:   teamName || "",
        ticket_type: ticket,
        participant: mode,
        quantity:    String(qty),
      },
      success_url: `${baseUrl}/?platba=ok`,
      cancel_url:  `${baseUrl}/?platba=zrusena`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
