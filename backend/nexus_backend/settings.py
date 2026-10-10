"""
Django settings for Nexus Network backend.
Configured for Supabase PostgreSQL and Supabase JWT Authentication.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "nexus-super-secret-key-production-grade-2026")

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("true", "1", "t")

ALLOWED_HOSTS = ["*"]

# Application definition
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "corsheaders",
    # Local apps
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # CORS must be at the very top
    "api.middleware.SupabaseJWTMiddleware",   # Strict Supabase JWT Verification middleware
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "nexus_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "nexus_backend.wsgi.application"
ASGI_APPLICATION = "nexus_backend.asgi.application"

# Database Configuration (Supabase PostgreSQL)
# Reads connection details from environment variables or Supabase pooled connection string
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:sojol&@3997@db.lopljazpsnykyfhdjowt.supabase.co:5432/postgres")

SUPABASE_DB_NAME = os.getenv("SUPABASE_DB_NAME", "postgres")
SUPABASE_DB_USER = os.getenv("SUPABASE_DB_USER", "postgres")
SUPABASE_DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "sojol&@3997")
SUPABASE_DB_HOST = os.getenv("SUPABASE_DB_HOST", "db.lopljazpsnykyfhdjowt.supabase.co")
SUPABASE_DB_PORT = os.getenv("SUPABASE_DB_PORT", "5432")

USE_SQLITE = os.getenv("USE_SQLITE", "True").lower() in ("true", "1", "t")

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": SUPABASE_DB_NAME,
            "USER": SUPABASE_DB_USER,
            "PASSWORD": SUPABASE_DB_PASSWORD,
            "HOST": SUPABASE_DB_HOST,
            "PORT": SUPABASE_DB_PORT,
            "OPTIONS": {
                "sslmode": "require",
            },
        }
    }

# Supabase Authentication & JWT Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lopljazpsnykyfhdjowt.supabase.co")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-characters-long")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_kNiNl6i-YTun0flfE8YYSw_N7SDEy2P")
SUPABASE_BUCKET_DP = os.getenv("SUPABASE_BUCKET_DP", "DP")
SUPABASE_BUCKET_POSTS = os.getenv("SUPABASE_BUCKET_POSTS", "posts")
SUPABASE_BUCKET_MESSAGE = os.getenv("SUPABASE_BUCKET_MESSAGE", "Message")

# REST Framework Configuration:
# - Disabled default Session and Basic authentication
# - Custom Supabase JWT Authentication backend
# - Standardized pagination & JSON rendering
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.authentication.SupabaseAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "api.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
}

# CORS Configuration - Strict Allowed Origins
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:[0-9]+$",
    r"^http://127.0.0.1:[0-9]+$",
    r"^https://.*\.run\.app$",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "apikey",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
