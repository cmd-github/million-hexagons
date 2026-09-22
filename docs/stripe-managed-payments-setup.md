Set up your checkout
Follow these steps to go live with Managed Payments.

New integration
1. Add to code
Update your Checkout Session request to set the managed_payments[enabled] parameter to true and set your version header to 2025-03-31.basil or later.

Command line
curl https://api.stripe.com/v1/checkout/sessions \
  -u {{SECRET_KEY}}: \
  -H "Stripe-Version: 2025-03-31.basil" \
  -d "line_items[0][price]"="{{PRICE_ID}}" \
  -d "line_items[0][quantity]"=1 \
  -d "managed_payments[enabled]"=true \
  -d mode=subscription \
  --data-urlencode success_url="https://example.com/success" \
  --data-urlencode cancel_url="https://example.com/cancel"
2. Remove from code
Some parameters aren't available when creating Checkout Sessions for Managed Payments.

automatic_tax

tax_id_collection

subscription_data.default_tax_rates

payment_method_collection

payment_method_configuration

payment_method_options

payment_method_types

saved_payment_method_options

customer_update[name]

customer_update[address]

shipping_address_collection

shipping_options

subscription_data.application_fee_percent

subscription_data.on_behalf_of

subscription_data.transfer_data

subscription_data.invoice_settings

Show less lines
3. Test your integration
Test that everything works correctly for your customers.

1
Create a Checkout Session
Open the checkout URL from the response and confirm the page shows "Sold through Onelink."
2
Enter different billing addresses
See how tax is calculated for customers in different locations.
3
Process test payment
Enter your email, phone and test card number 4242 4242 4242 4242 with any CVC and future expiration date.