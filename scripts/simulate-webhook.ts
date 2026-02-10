
import crypto from 'crypto';

const output = (id: string) => {
    const secret = 'whsec_test_secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: 'evt_test_webhook',
      object: 'event',
      type: 'payment_intent.succeeded',
      created: timestamp,
      data: {
        object: {
          id: 'pi_bEdevMcbdVXPmL',
          object: 'payment_intent',
          amount: 22800,
          currency: 'usd',
          status: 'succeeded', 
          metadata: {
             orderId: id
          }
        }
      }
    });

    const signaturePayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    const header = `t=${timestamp},v1=${signature}`;
    
    console.log(`Payload: ${payload}`);
    console.log(`Signature: ${header}`);
    
    // Perform the request
    fetch('http://localhost:4006/payments/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'stripe-signature': header
        },
        body: payload
    }).then(res => res.json()).then(console.log).catch(console.error);
};

output('93d8de10-066b-4ddf-9bb3-83d55ef9feb9');
