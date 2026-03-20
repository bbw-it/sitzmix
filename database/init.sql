CREATE DATABASE IF NOT EXISTS sitzmix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sitzmix;

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

CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#C4B5FD',
    sort_order INT NOT NULL DEFAULT 0,
    x_pos FLOAT NOT NULL DEFAULT 20,
    y_pos FLOAT NOT NULL DEFAULT 20,
    width_pct FLOAT NOT NULL DEFAULT 20,
    height_pct FLOAT NOT NULL DEFAULT 20,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    seat_number INT NOT NULL,
    x_position FLOAT NOT NULL,
    y_position FLOAT NOT NULL,
    area_id INT DEFAULT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    UNIQUE KEY unique_seat_number (room_id, seat_number)
);

-- ── Beispieldaten ──────────────────────────

-- Beispielklasse
INSERT INTO classes (id, name) VALUES (1, 'Beispielklasse 3a');

-- 24 Lernende mit Pastel-Farben
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
    (1, 'ZIMMERMANN Sara',     '#E8BAFF'),
    (1, 'BIANCHI Luca',        '#FFD4BA'),
    (1, 'DIETRICH Nina',       '#BAF0FF'),
    (1, 'EGGER Fiona',         '#E0BAFF'),
    (1, 'HARTMANN Leo',        '#BAFFDA'),
    (1, 'KOCH Mila',           '#FFE0BA'),
    (1, 'ROTH Samuel',         '#BACCFF');

-- Beispielzimmer (mit Default-Floorplan)
INSERT INTO rooms (id, name, floorplan_image_path, image_width, image_height) VALUES
    (1, 'Zimmer 201', 'default-zimmer-201.png', 2207, 1425);

-- 6 Beispiel-Bereiche (Tischgruppen mit Position/Grösse in %)
INSERT INTO areas (id, room_id, name, color, sort_order, x_pos, y_pos, width_pct, height_pct) VALUES
    (1, 1, 'Tisch 1', '#C4B5FD', 0,  6, 10, 20, 24),
    (2, 1, 'Tisch 2', '#93C5FD', 1, 30, 10, 20, 24),
    (3, 1, 'Tisch 3', '#86EFAC', 2, 52, 10, 20, 24),
    (4, 1, 'Tisch 4', '#FCA5A5', 3,  6, 44, 20, 24),
    (5, 1, 'Tisch 5', '#FDBA74', 4, 30, 44, 20, 24),
    (6, 1, 'Tisch 6', '#FDE68A', 5, 52, 44, 20, 24);

-- 24 Sitzplätze passend zum Floorplan (6 Vierer-Tische, 4 Reihen)
-- Reihe 1 oben: Tisch 1, 2, 3
-- Reihe 2: Tisch 1, 2, 3
-- Reihe 3: Tisch 4, 5, 6
-- Reihe 4 unten: Tisch 4, 5, 6
INSERT INTO seats (room_id, seat_number, x_position, y_position, area_id) VALUES
    -- Tisch 1 (oben links)
    (1,  1, 12, 16, 1), (1,  2, 20, 16, 1),
    (1,  3, 12, 28, 1), (1,  4, 20, 28, 1),
    -- Tisch 2 (oben mitte)
    (1,  5, 36, 16, 2), (1,  6, 44, 16, 2),
    (1,  7, 36, 28, 2), (1,  8, 44, 28, 2),
    -- Tisch 3 (oben rechts)
    (1,  9, 58, 16, 3), (1, 10, 66, 16, 3),
    (1, 11, 58, 28, 3), (1, 12, 66, 28, 3),
    -- Tisch 4 (unten links)
    (1, 13, 12, 50, 4), (1, 14, 20, 50, 4),
    (1, 15, 12, 62, 4), (1, 16, 20, 62, 4),
    -- Tisch 5 (unten mitte)
    (1, 17, 36, 50, 5), (1, 18, 44, 50, 5),
    (1, 19, 36, 62, 5), (1, 20, 44, 62, 5),
    -- Tisch 6 (unten rechts)
    (1, 21, 58, 50, 6), (1, 22, 66, 50, 6),
    (1, 23, 58, 62, 6), (1, 24, 66, 62, 6);

-- 2 Beispielregeln (AMMANN Lea & BRUNNER Tim, HUBER Elena & KELLER Jan dürfen nicht nebeneinander)
INSERT INTO rules (class_id, student_a_id, student_b_id) VALUES
    (1, 1, 2),
    (1, 5, 6);
