# TT – Search Made Easy
## Run
Backend: cd backend && pip install -r requirements.txt && cp .env.example .env (fill it) && create MySQL db `tt_search` (schema.sql) && python app.py
Frontend: cd frontend && npm install && npm run dev  -> http://localhost:5173
## v2: My Projects, Library, Dashboard, section editor, diagrams, background build. If upgrading from v1 run the ALTER in schema.sql.
## Payments
Set PAYMENT_REQUIRED=true and PAYSTACK_SECRET. Set Paystack webhook to https://YOUR_API/api/paystack/webhook
