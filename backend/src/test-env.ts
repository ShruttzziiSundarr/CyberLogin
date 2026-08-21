// Populates env vars needed for tests before modules that read them at import time are loaded.
process.env.PORT = process.env.PORT || '4000';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.COOKIE_SECURE = 'false';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-password';
process.env.PF_ADMIN_BASE_URL = process.env.PF_ADMIN_BASE_URL || 'https://pf-admin.test:9999/pf-admin-api/v1';
process.env.PF_ADMIN_USER = process.env.PF_ADMIN_USER || 'administrator';
process.env.PF_ADMIN_PASSWORD = process.env.PF_ADMIN_PASSWORD || 'test-pf-password';
process.env.PF_ADMIN_AUTH_MODE = process.env.PF_ADMIN_AUTH_MODE || 'basic';
process.env.PF_TLS_INSECURE = process.env.PF_TLS_INSECURE || 'false';
process.env.PF_RUNTIME_BASE_URL = process.env.PF_RUNTIME_BASE_URL || 'https://pf-runtime.test:9031';
process.env.PD_LDAP_HOST = process.env.PD_LDAP_HOST || 'localhost:1389';
process.env.PD_BIND_DN = process.env.PD_BIND_DN || 'cn=Directory Manager';
process.env.PD_BIND_PASSWORD = process.env.PD_BIND_PASSWORD || 'test-bind-password';
process.env.PD_SEARCH_BASE = process.env.PD_SEARCH_BASE || 'ou=people,dc=example,dc=com';
process.env.FEATURE_MFA_POLICY_WRITE = process.env.FEATURE_MFA_POLICY_WRITE || 'false';
