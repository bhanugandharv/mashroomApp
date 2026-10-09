# Auth Testing Playbook (CG Mushroom)

Dual auth: JWT email/password (cookies access_token + refresh_token) and Emergent Google Auth (cookie session_token). Both share the `users` collection keyed by `user_id` (custom string, `_id` never exposed).

## JWT
curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@cgmushroom.in","password":"CGMadmin@2026"}'
curl -b cookies.txt $API/api/auth/me

## Google session (simulate)
mongosh --eval "
use('test_database');
var userId = 'user_test' + Date.now();
var token = 'test_session_' + Date.now();
db.users.insertOne({user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', role: 'customer', picture: '', phone: '', created_at: new Date().toISOString()});
db.user_sessions.insertOne({user_id: userId, session_token: token, expires_at: new Date(Date.now()+7*24*3600*1000).toISOString(), created_at: new Date().toISOString()});
print(token);
"
curl -H "Authorization: Bearer <token>" $API/api/auth/me
Browser: set cookie session_token=<token> (httpOnly, secure, sameSite None) on the app domain.

## Cleanup
db.users.deleteMany({email: /test\.user\.|^test_/i}); db.user_sessions.deleteMany({session_token: /test_session/});
