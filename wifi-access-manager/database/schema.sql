-- Database schema for WiFi Access Point Manager

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access points table
CREATE TABLE access_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ssid VARCHAR(255) NOT NULL,
    bssid VARCHAR(17), -- MAC address format
    security_type VARCHAR(50), -- WPA2, WPA3, WEP, Open, etc
    is_open BOOLEAN DEFAULT FALSE,
    requires_login BOOLEAN DEFAULT FALSE,
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    venue_name VARCHAR(255),
    venue_type VARCHAR(100), -- cafe, library, airport, etc
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ssid, bssid, latitude, longitude)
);

-- Access point passwords table (separate for security)
CREATE TABLE access_point_passwords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    password TEXT NOT NULL, -- Encrypted
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_current BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speed tests table
CREATE TABLE speed_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    download_speed DECIMAL(10, 2), -- Mbps
    upload_speed DECIMAL(10, 2), -- Mbps
    ping DECIMAL(10, 2), -- ms
    test_server VARCHAR(255),
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(access_point_id, user_id)
);

-- Service blocks table (tracking blocked services/apps)
CREATE TABLE service_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL, -- VPN, Netflix, YouTube, etc
    is_blocked BOOLEAN DEFAULT TRUE,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(access_point_id, service_name)
);

-- QR codes table
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    qr_data TEXT NOT NULL,
    qr_image_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, access_point_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_access_points_location ON access_points USING GIST(location);
CREATE INDEX idx_access_points_ssid ON access_points(ssid);
CREATE INDEX idx_access_points_organization ON access_points(organization_id);
CREATE INDEX idx_access_point_passwords_ap ON access_point_passwords(access_point_id);
CREATE INDEX idx_speed_tests_ap ON speed_tests(access_point_id);
CREATE INDEX idx_ratings_ap ON ratings(access_point_id);
CREATE INDEX idx_service_blocks_ap ON service_blocks(access_point_id);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_points_updated_at BEFORE UPDATE ON access_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_point_passwords_updated_at BEFORE UPDATE ON access_point_passwords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_blocks_updated_at BEFORE UPDATE ON service_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();