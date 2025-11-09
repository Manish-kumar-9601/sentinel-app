-- Migration: Add SOS Alerts table for Multi-Layer Safety Net
-- Created: 2025-11-09
-- Purpose: Track emergency alerts and multi-layer delivery status

CREATE TABLE IF NOT EXISTS sos_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    location TEXT, -- JSON: {latitude, longitude, address}
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    
    -- Multi-layer delivery tracking
    api_sent TEXT, -- 'success', 'failed', 'skipped'
    whatsapp_sent TEXT, -- 'success', 'failed', 'skipped'
    sms_sent TEXT, -- 'success', 'failed', 'skipped'
    call_made TEXT, -- 'yes', 'no'
    
    contacts_notified TEXT, -- Comma-separated contact IDs or phone numbers
    delivery_details TEXT, -- JSON with detailed results from each layer
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON sos_alerts(created_at DESC);

-- Grant permissions (if needed)
-- GRANT SELECT, INSERT, UPDATE ON sos_alerts TO your_app_user;
