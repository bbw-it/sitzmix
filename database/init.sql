CREATE DATABASE IF NOT EXISTS sitzmix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sitzmix;

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#A0C4FF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_a_id INT NOT NULL,
    student_b_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_a_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (student_b_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pair (class_id, student_a_id, student_b_id)
);

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    floorplan_image_path VARCHAR(500),
    image_width INT DEFAULT 0,
    image_height INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    seat_number INT NOT NULL,
    x_position FLOAT NOT NULL,
    y_position FLOAT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_seat_number (room_id, seat_number)
);

INSERT INTO settings (setting_key, setting_value) VALUES
    ('db_host', 'localhost'),
    ('db_port', '3307'),
    ('db_user', 'user1'),
    ('db_password', 'user123'),
    ('db_name', 'sitzmix');

-- ── Beispieldaten ──────────────────────────

-- Beispielklasse
INSERT INTO classes (id, name) VALUES (1, 'Beispielklasse 3a');

-- 18 Lernende mit Pastel-Farben
INSERT INTO students (class_id, name, color) VALUES
    (1, 'AMMANN Lea',          '#FFB3BA'),
    (1, 'BRUNNER Tim',         '#FFDFBA'),
    (1, 'FISCHER Lara',        '#FFFFBA'),
    (1, 'GERBER Noah',         '#BAFFC9'),
    (1, 'HUBER Elena',         '#BAE1FF'),
    (1, 'KELLER Jan',          '#E8BAFF'),
    (1, 'LANG Sophie',         '#FFB3E6'),
    (1, 'MEIER Lukas',         '#B3FFE6'),
    (1, 'MUELLER Anna',        '#FFE6B3'),
    (1, 'NGUYEN Mia',          '#B3D4FF'),
    (1, 'PETER Elias',         '#D4FFB3'),
    (1, 'RENNER Nora',         '#FFB3B3'),
    (1, 'SCHMID David',        '#FFB3BA'),
    (1, 'STEINER Lina',        '#FFDFBA'),
    (1, 'TANNER Ben',          '#FFFFBA'),
    (1, 'WAGNER Julia',        '#BAFFC9'),
    (1, 'WEBER Marco',         '#BAE1FF'),
    (1, 'ZIMMERMANN Sara',     '#E8BAFF');

-- Beispielzimmer (ohne Grundriss-Bild, 18 Sitzplätze in 3x3 Doppeltisch-Anordnung)
INSERT INTO rooms (id, name) VALUES (1, 'Zimmer 201');

-- 18 Sitzplätze: 3 Reihen x 3 Tische x 2 Plätze
INSERT INTO seats (room_id, seat_number, x_position, y_position) VALUES
    (1,  1, 16, 20), (1,  2, 24, 20),
    (1,  3, 16, 38), (1,  4, 24, 38),
    (1,  5, 42, 20), (1,  6, 50, 20),
    (1,  7, 42, 38), (1,  8, 50, 38),
    (1,  9, 68, 20), (1, 10, 76, 20),
    (1, 11, 68, 38), (1, 12, 76, 38),
    (1, 13, 16, 60), (1, 14, 24, 60),
    (1, 15, 16, 78), (1, 16, 24, 78),
    (1, 17, 42, 60), (1, 18, 50, 60);

-- 2 Beispielregeln (AMMANN Lea & BRUNNER Tim, HUBER Elena & KELLER Jan dürfen nicht nebeneinander)
INSERT INTO rules (class_id, student_a_id, student_b_id) VALUES
    (1, 1, 2),
    (1, 5, 6);
