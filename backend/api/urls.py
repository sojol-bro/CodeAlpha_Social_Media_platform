"""
API URL Routing for Nexus Network.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProfileViewSet, PostViewSet, NotificationViewSet, ConversationViewSet, MessageViewSet

router = DefaultRouter()
router.register(r"profiles", ProfileViewSet, basename="profile")
router.register(r"posts", PostViewSet, basename="post")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"messages/conversations", ConversationViewSet, basename="conversation")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("", include(router.urls)),
]
