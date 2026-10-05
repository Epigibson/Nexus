-- Autenticación propia: reemplaza AWS Cognito (verificación por correo, recuperación de contraseña y 2FA TOTP).
-- Correr una vez en Supabase (SQL Editor) ANTES de desplegar la API nueva. Idempotente.
--
-- Los usuarios existentes quedan con email_verified = TRUE (Cognito ya los verificó) y sin 2FA:
-- Cognito no permite exportar contraseñas ni secretos TOTP, así que cada quien entra la primera vez
-- con "¿Olvidaste tu contraseña?" y, si quiere, vuelve a activar el 2FA.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_hash VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_purpose VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_code_attempts INTEGER NOT NULL DEFAULT 0;
