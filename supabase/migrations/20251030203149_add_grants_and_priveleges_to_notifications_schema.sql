GRANT USAGE ON SCHEMA notifications TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA notifications TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA notifications TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA notifications TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA notifications GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA notifications GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA notifications GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
