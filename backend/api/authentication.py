"""
Custom Supabase JWT Authentication Backend for Django REST Framework.
Verifies Supabase JWT tokens passed in the Authorization: Bearer <token> header.
"""
import jwt
from uuid import UUID
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import Profile


class SupabaseUser:
    """
    Lightweight User wrapper for Supabase Auth identity.
    Bypasses Django's default auth user table while providing DRF compatibility.
    """
    def __init__(self, user_id: str, email: str = "", metadata: dict = None, role: str = "authenticated"):
        self.id = user_id
        self.pk = user_id
        self.email = email
        self.metadata = metadata or {}
        self.role = role
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False

    def __str__(self):
        return f"SupabaseUser({self.id}, {self.email})"

    @property
    def profile(self):
        try:
            return Profile.objects.get(id=self.id)
        except Profile.DoesNotExist:
            return None


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication class that validates Supabase JWTs.
    """
    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()

        if not auth_header or auth_header[0].lower() != b"bearer":
            return None

        if len(auth_header) == 1:
            raise exceptions.AuthenticationFailed("Invalid Bearer header. No credentials provided.")
        elif len(auth_header) > 2:
            raise exceptions.AuthenticationFailed("Invalid Bearer header. Token string should not contain spaces.")

        token = auth_header[1].decode("utf-8")

        try:
            jwt_secret = getattr(settings, "SUPABASE_JWT_SECRET", None)
            
            # Verify and decode JWT
            if jwt_secret:
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_exp": True}
                )
            else:
                # Fallback unverified decode for development if secret not set
                payload = jwt.decode(token, options={"verify_signature": False})

            user_id = payload.get("sub")
            if not user_id:
                raise exceptions.AuthenticationFailed("Invalid token payload: missing sub (user ID).")

            email = payload.get("email", "")
            user_metadata = payload.get("user_metadata", {})
            role = payload.get("role", "authenticated")

            user = SupabaseUser(
                user_id=user_id,
                email=email,
                metadata=user_metadata,
                role=role
            )

            # Ensure profile exists or attach to request
            profile, _ = Profile.objects.get_or_create(
                id=user_id,
                defaults={
                    "username": user_metadata.get("username", email.split("@")[0] if email else str(user_id)[:8]),
                    "full_name": user_metadata.get("full_name", "MIO Member"),
                    "avatar_url": user_metadata.get("avatar_url", ""),
                    "headline": user_metadata.get("headline", "AI Systems Practitioner"),
                }
            )

            # Store the profile object directly on request for view convenience
            request.profile = profile

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Supabase JWT token has expired.")
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f"Invalid Supabase JWT token: {str(e)}")
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Authentication failed: {str(e)}")

    def authenticate_header(self, request):
        return 'Bearer realm="supabase"'
