SELECT 'CREATE DATABASE tactlex_test OWNER tactlex'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tactlex_test')\gexec
