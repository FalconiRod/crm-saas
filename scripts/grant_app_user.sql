-- ============================================================
-- Configuração do papel app_user (isolamento por RLS) — idempotente
-- ============================================================
-- POR QUÊ: a aplicação conecta com o papel `app_user` (SEM BYPASSRLS), que é
-- obrigado a passar pelas policies de RLS. O dono (neondb_owner) tem
-- BYPASSRLS e ignora o RLS — NUNCA conectar a app com a URL do dono.
--
-- COMO USAR (apenas 1 vez por banco, como dono):
--   psql "<DATABASE_URL>" -f scripts/grant_app_user.sql
-- Em seguida, crie/use a connection string do app_user em APP_DATABASE_URL
-- (ver .env.example).
--
-- Pode rodar de novo sem erro (cria o papel só se não existir; GRANTs são
-- cumulativos). Tabelas novas criadas por migrations herdam os privilégios
-- automaticamente via ALTER DEFAULT PRIVILEGES.

-- 1) Cria o papel se ainda não existir (o LOGIN/password vêm da connection
--    string do app_user; defina aqui também se for criar do zero).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
END $$;

-- 2) Acesso ao banco atual e ao schema.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_user', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO app_user;

-- 3) Privilégios nas tabelas/sequências existentes.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 4) Privilégios automáticos para o que vier depois (migrations futuras).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;