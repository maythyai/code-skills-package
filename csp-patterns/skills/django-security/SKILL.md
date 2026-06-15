---
name: django-security
description: Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment configurations.
origin: CSP
layer: 4
category: patterns
-------|-------------|
| `DEBUG = False` | Never run with DEBUG in production |
| HTTPS only | Force SSL, secure cookies |
| Strong secrets | Use environment variables for SECRET_KEY |
| Password validation | Enable all password validators |
| CSRF protection | Enabled by default, don't disable |
| XSS prevention | Django auto-escapes, don't use `|safe` with user input |
| SQL injection | Use ORM, never concatenate strings in queries |
| File uploads | Validate file type and size |
| Rate limiting | Throttle API endpoints |
| Security headers | CSP, X-Frame-Options, HSTS |
| Logging | Log security events |
| Updates | Keep Django and dependencies updated |

## Core Security Settings

```python
DEBUG = False  # CRITICAL: Never use True in production
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
X_FRAME_OPTIONS = 'DENY'
```

## Anti-Patterns

- Running with `DEBUG = True` in production
- Hardcoding `SECRET_KEY` in source code
- Disabling CSRF protection without strong justification
- Using `mark_safe()` on user input
- String interpolation in raw SQL queries
- Serving user uploads directly without validation
- Skipping password validators

Remember: Security is a process, not a product. Regularly review and update your security practices.

## References

- [references/auth-security.md](references/auth-security.md) — Authentication, authorization, session management, RBAC, and API security
- [references/injection-prevention.md](references/injection-prevention.md) — SQL injection, XSS prevention, file upload security, environment variables, logging
- [references/csrf-cors.md](references/csrf-cors.md) — CSRF protection, CORS configuration, Content Security Policy, security headers, production settings
