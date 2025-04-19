npm init -y
npm install express sqlite3 jsonwebtoken body-parser bcrypt
npm install module-alias --save
npm install --save-dev jest supertest

VS Code Extensions
Thunder Client
SQLite

npm install -g nodemon
mkdir data
node init-admin.js
nodemon server.js

npm install axios

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
JOIN user u ON c.user_id = u.id;


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
JOIN user u ON c.user_id = u.id
ORDER BY c.id, e.created_at;

SELECT * FROM engine_history_view WHERE controller_id = 42;

