npm init -y
npm install express sqlite3 jsonwebtoken body-parser bcrypt
npm install -g nodemon
npm install module-alias --save

VS Code Extensions
Thunder Client
SQLite

nodemon server.js



curl -X POST http://localhost/api/register -H "Content-Type: application/json" -d '{"email": "test@test.com", "password": "123", "cpu_id": "0987654321"}'
curl -X POST http://localhost/api/login -H "Content-Type: application/json" -d '{"email": "test@test.com", "password": "123", "cpu_id": "0987654321"}'
curl -X GET http://localhost/api/v1 -H "Authorization: Bearer <DEIN-TOKEN>"
curl -X GET http://localhost/api/v1

curl -X GET http://localhost/api/v1 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY3B1X2lkIjoiMDk4NzY1NDMyMSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQyNTkwODE4LCJleHAiOjE3NDI1OTQ0MTh9.KjMpT8JrpQYYxsglkc7cXcj3Ev16neN2uEzWaLVSKbc"

Passwort Reset
curl -X POST http://localhost/api/request-password-reset -H "Content-Type: application/json" -d '{"email": "test@test.com"}'



http://localhost:8000/admin
http://localhost:5000/admin?filter=example



npm install axios
node test_login_lockout.js


docker compose -f nginx/docker-compose.yml up -d
docker compose -f nginx/docker-compose.yml up --build



CREATE VIEW engine_user_view AS
SELECT
    e.id AS engine_id,
    e.serial_no AS engine_serial_no,
    e.created_at AS engine_created_at,
    c.id AS controller_id,
    c.serial_no AS controller_serial_no,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.created_at AS user_created_at
FROM engine e
JOIN controller c ON e.controller_id = c.id
JOIN users u ON c.user_id = u.id;


SELECT * FROM engine_user_view WHERE user_id = 42;
oder
SELECT * FROM engine_user_view WHERE engine_serial_no = 'ABC123XYZ';


Neue Engine eintragen
INSERT INTO engine (
    created_at,
    updated_at,
    serial_no,
    controller_id,
    -- andere technische Felder...
    remark
) VALUES (
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'NEUE_ENGINE_123',
    42,  -- ID des bestehenden Controllers
    'Ersatzmotor nach Reparatur'
);

CREATE VIEW engine_history_view AS
SELECT
    c.id AS controller_id,
    c.serial_no AS controller_serial_no,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    e.id AS engine_id,
    e.serial_no AS engine_serial_no,
    e.created_at AS engine_created_at,
    e.updated_at AS engine_updated_at,
    e.remark AS engine_remark
FROM engine e
JOIN controller c ON e.controller_id = c.id
JOIN users u ON c.user_id = u.id
ORDER BY c.id, e.created_at;

SELECT * FROM engine_history_view WHERE controller_id = 42;

