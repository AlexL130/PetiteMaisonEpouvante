-- ============================================================
-- init.sql — La Petite Maison de l'Épouvante
-- Base de données PostgreSQL 16
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('BUYER', 'SELLER', 'ADMIN');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE subscription_type AS ENUM ('PAPER', 'DIGITAL', 'BOTH');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE product_status AS ENUM ('DRAFT', 'PUBLISHED', 'OUT_OF_STOCK', 'ARCHIVED');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(60),
    avatar_url      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        user_role NOT NULL,
    granted_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- ============================================================
-- CATEGORIES
-- Figurines, BD, Blu-ray/DVD, Jeux de société, Goodies, Fanzine
-- ============================================================
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url    TEXT,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS (catalogue de vente)
-- ============================================================
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    description     TEXT,
    short_desc      VARCHAR(300),
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    compare_price   NUMERIC(10,2),  -- prix barré (promo)
    currency        VARCHAR(3) DEFAULT 'EUR',
    stock_quantity  INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    sku             VARCHAR(100) UNIQUE,
    weight_grams    INTEGER,
    status          product_status DEFAULT 'DRAFT',
    is_featured     BOOLEAN DEFAULT FALSE,
    is_exclusive    BOOLEAN DEFAULT FALSE,  -- exclusivité Evil Ed
    attributes      JSONB DEFAULT '{}',     -- {format, pages, durée, nb_joueurs, etc.}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

CREATE TABLE product_images (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    alt_text    VARCHAR(200),
    position    INTEGER DEFAULT 0,
    is_primary  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================================
-- CART (panier utilisateur)
-- ============================================================
CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_user ON cart_items(user_id);

-- ============================================================
-- ORDERS (commandes)
-- ============================================================
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          order_status DEFAULT 'PENDING',
    total_amount    NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    shipping_cost   NUMERIC(10,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'EUR',
    shipping_name   VARCHAR(200),
    shipping_address TEXT,
    shipping_city   VARCHAR(100),
    shipping_zip    VARCHAR(20),
    shipping_country VARCHAR(2) DEFAULT 'FR',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE SET NULL,
    title       VARCHAR(200) NOT NULL,  -- snapshot du titre au moment de l'achat
    price       NUMERIC(10,2) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- FANZINE — Abonnements & numéros
-- ============================================================
CREATE TABLE fanzine_issues (
    id              SERIAL PRIMARY KEY,
    issue_number    INTEGER NOT NULL UNIQUE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    cover_url       TEXT,
    pdf_url         TEXT,           -- URL du PDF pour la liseuse
    page_count      INTEGER,
    published_at    DATE,
    is_free_preview BOOLEAN DEFAULT FALSE,  -- numéro gratuit (démo)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            subscription_type NOT NULL,
    status          subscription_status DEFAULT 'ACTIVE',
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE NOT NULL,
    auto_renew      BOOLEAN DEFAULT TRUE,
    price_paid      NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Accès aux numéros : un user peut lire un numéro s'il a un abonnement actif
-- ou s'il a acheté le numéro à l'unité
CREATE TABLE user_fanzine_access (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_id    INTEGER NOT NULL REFERENCES fanzine_issues(id) ON DELETE CASCADE,
    source      VARCHAR(20) DEFAULT 'SUBSCRIPTION', -- 'SUBSCRIPTION' ou 'PURCHASE'
    granted_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, issue_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    link        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ============================================================
-- AUDIT LOGS (observabilité — traçabilité des actions)
-- ============================================================
CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    details     JSONB DEFAULT '{}',
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- SEED DATA — Catégories initiales
-- ============================================================
INSERT INTO categories (name, slug, description, sort_order) VALUES
    ('Figurines',       'figurines',    'Figurines et statues de collection',           1),
    ('Blu-ray & DVD',   'bluray-dvd',   'Films d''horreur, fantastique et heroic fantasy', 2),
    ('Bandes dessinées','bd',           'BD, comics et mangas du genre',                3),
    ('Jeux de société', 'jeux',         'Jeux de plateau et jeux de cartes',            4),
    ('Goodies',         'goodies',      'T-shirts, mugs, posters et accessoires',       5),
    ('Fanzine',         'fanzine',      'Numéros du fanzine à l''unité',               6);

-- Sous-catégories Evil Ed (exclusivités)
INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
    ('Exclusivités Evil Ed', 'evil-ed', 'Figurines et produits exclusifs Evil Ed',
     (SELECT id FROM categories WHERE slug = 'figurines'), 10);

-- ============================================================
-- SEED DATA — Quelques produits de démo
-- ============================================================
INSERT INTO products (category_id, title, slug, description, short_desc, price, stock_quantity, status, is_featured, attributes) VALUES
    ((SELECT id FROM categories WHERE slug = 'figurines'),
     'L''Orc — Figurine Collector 30cm',
     'orc-figurine-collector-30cm',
     'Figurine en résine peinte à la main du personnage principal de la web-série L''Orc, produite en édition limitée par Evil Ed.',
     'Figurine résine 30cm — Édition limitée Evil Ed',
     89.99, 50, 'PUBLISHED', TRUE,
     '{"height_cm": 30, "material": "résine", "edition": "limitée 500 ex", "evil_ed_exclusive": true}'
    ),
    ((SELECT id FROM categories WHERE slug = 'bluray-dvd'),
     'Riflesso di un Coltello nella Notte — Blu-ray Restauré',
     'riflesso-coltello-notte-bluray',
     'Film d''horreur italien inédit en France, restauré en 4K par Evil Ed. Inclut livret 32 pages et sous-titres français.',
     'Giallo italien inédit — Restauration 4K Evil Ed',
     24.99, 200, 'PUBLISHED', TRUE,
     '{"format": "Blu-ray", "duration_min": 92, "year": 1978, "director": "Mario Ranieri", "audio": ["italien"], "subtitles": ["français", "anglais"]}'
    ),
    ((SELECT id FROM categories WHERE slug = 'bd'),
     'L''Orc — Tome 1 : Les Terres Maudites',
     'orc-tome-1-terres-maudites',
     'Premier tome de la BD se déroulant dans l''univers de la web-série L''Orc. Scénario et dessins exclusifs.',
     'BD 48 pages — Univers L''Orc',
     14.99, 300, 'PUBLISHED', FALSE,
     '{"pages": 48, "format": "album", "isbn": "978-2-XXXXX-XXX-X"}'
    ),
    ((SELECT id FROM categories WHERE slug = 'jeux'),
     'Nuit d''Épouvante — Jeu de plateau coopératif',
     'nuit-epouvante-jeu-plateau',
     'Survivez ensemble à une nuit dans un manoir hanté. 2 à 6 joueurs, parties de 60 à 90 minutes.',
     'Jeu coopératif 2-6 joueurs — 60-90 min',
     39.99, 100, 'PUBLISHED', TRUE,
     '{"players_min": 2, "players_max": 6, "duration_min": 60, "age_min": 14}'
    ),
    ((SELECT id FROM categories WHERE slug = 'goodies'),
     'T-shirt Evil Ed — Logo Sang',
     'tshirt-evil-ed-logo-sang',
     'T-shirt noir 100% coton bio avec le logo Evil Ed en sérigraphie effet sang. Disponible du S au XXL.',
     'T-shirt noir coton bio — Logo Evil Ed',
     25.00, 150, 'PUBLISHED', FALSE,
     '{"sizes": ["S","M","L","XL","XXL"], "material": "coton bio", "color": "noir"}'
    );

-- Images produits
INSERT INTO product_images (product_id, url, alt_text, position, is_primary) VALUES
    (1, 'https://placehold.co/600x800/1a1a1a/ff0040?text=L''Orc+Figurine', 'Figurine L''Orc face', 0, TRUE),
    (1, 'https://placehold.co/600x800/1a1a1a/7c3aed?text=L''Orc+Dos', 'Figurine L''Orc dos', 1, FALSE),
    (2, 'https://placehold.co/600x800/1a1a1a/ff0040?text=Riflesso+Bluray', 'Blu-ray Riflesso', 0, TRUE),
    (3, 'https://placehold.co/600x800/1a1a1a/ff0040?text=L''Orc+BD', 'BD L''Orc Tome 1', 0, TRUE),
    (4, 'https://placehold.co/600x800/1a1a1a/7c3aed?text=Nuit+Epouvante', 'Jeu Nuit d''Épouvante', 0, TRUE),
    (5, 'https://placehold.co/600x800/1a1a1a/ff0040?text=T-shirt+Evil+Ed', 'T-shirt Evil Ed', 0, TRUE);

-- Numéros du fanzine
INSERT INTO fanzine_issues (issue_number, title, description, cover_url, page_count, published_at, is_free_preview) VALUES
    (1,  'Origines du mal',           'Premier numéro — les racines du cinéma d''horreur',     'https://placehold.co/400x560/1a1a1a/ff0040?text=Fanzine+1',  64, '2020-03-15', TRUE),
    (2,  'Giallo : l''art du suspense', 'Dossier spécial giallo italien',                      'https://placehold.co/400x560/1a1a1a/ff0040?text=Fanzine+2',  72, '2020-06-15', FALSE),
    (3,  'Heroic Fantasy sombre',     'De Conan à Dark Souls : l''heroic fantasy noire',       'https://placehold.co/400x560/1a1a1a/ff0040?text=Fanzine+3',  68, '2020-09-15', FALSE),
    (4,  'Body Horror',               'Cronenberg, Barker et la mutation du corps',            'https://placehold.co/400x560/1a1a1a/ff0040?text=Fanzine+4',  70, '2020-12-15', FALSE),
    (5,  'J-Horror',                  'La vague d''horreur japonaise',                         'https://placehold.co/400x560/1a1a1a/ff0040?text=Fanzine+5',  66, '2021-03-15', FALSE),
    (6,  'L''Orc — Making of',        'Dans les coulisses de la web-série Evil Ed',            'https://placehold.co/400x560/1a1a1a/7c3aed?text=Fanzine+6',  80, '2021-06-15', FALSE);

-- ============================================================
-- SEED DATA — Admin user (password: Admin123!)
-- ============================================================
INSERT INTO users (email, password_hash, display_name) VALUES
    ('admin@petitemaison.fr', '$2b$12$QV1AYsKDDSNhVXMvhZGDyOCfclPS8ViBkxA6mnfVNDWq3dO1DxCLi', 'Admin');
INSERT INTO users (email, password_hash, display_name) VALUES
    ('client@petitemaison.fr', '$2b$12$QV1AYsKDDSNhVXMvhZGDyOCfclPS8ViBkxA6mnfVNDWq3dO1DxCLi', 'Client');
INSERT INTO users (email, password_hash, display_name) VALUES
    ('vendeur@petitemaison.fr', '$2b$12$QV1AYsKDDSNhVXMvhZGDyOCfclPS8ViBkxA6mnfVNDWq3dO1DxCLi', 'Vendeur');
INSERT INTO user_roles (user_id, role) VALUES
    ((SELECT id FROM users WHERE email = 'admin@petitemaison.fr'), 'ADMIN'),
    ((SELECT id FROM users WHERE email = 'admin@petitemaison.fr'), 'BUYER'),
    ((SELECT id FROM users WHERE email = 'client@petitemaison.fr'), 'BUYER'),
    ((SELECT id FROM users WHERE email = 'vendeur@petitemaison.fr'), 'SELLER');
