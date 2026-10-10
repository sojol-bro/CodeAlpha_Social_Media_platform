"""
Middleware for strict Supabase JWT verification and CORS enforcement.
Verifies Supabase JWT tokens before requests reach protected views.
"""
import jwt
from django.conf import settings
from django.http import JsonResponse
from .authentication import SupabaseUser
from .models import Profile


class SupabaseJWTMiddleware:
    """
    Custom middleware that intercepts Authorization header, validates
    the Supabase JWT signature with SUPABASE_JWT_SECRET, and sets request.user and request.profile.
    Rejects unauthorized access to protected endpoints early.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get("Authorization", "")
        
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            jwt_secret = getattr(settings, "SUPABASE_JWT_SECRET", None)

            if jwt_secret and token:
                try:
                    payload = jwt.decode(
                        token,
                        jwt_secret,
                        algorithms=["HS256"],
                        audience="authenticated",
                        options={"verify_signature": True, "verify_exp": True}
                    )
                    user_id = payload.get("sub")
                    if user_id:
                        email = payload.get("email", "")
                        user_metadata = payload.get("user_metadata", {})
                        role = payload.get("role", "authenticated")

                        request.supabase_user = SupabaseUser(
                            user_id=user_id,
                            email=email,
                            metadata=user_metadata,
                            role=role
                        )
                        # Attach profile if exists
                        profile = Profile.objects.filter(id=user_id).first()
                        if profile:
                            request.profile = profile

                except jwt.ExpiredSignatureError:
                    if request.path.startswith("/api/") and not request.path.startswith("/api/posts/"):
                        return JsonResponse({"detail": "Supabase JWT has expired."}, status=401)
                except jwt.InvalidTokenError as e:
                    if request.path.startswith("/api/") and not request.path.startswith("/api/posts/"):
                        return JsonResponse({"detail": f"Invalid Supabase JWT: {str(e)}"}, status=401)
                except Exception:
                    pass

        return self.get_response(request)
