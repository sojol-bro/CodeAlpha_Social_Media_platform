"""
Views for Nexus Network API.
Handles Profiles, Post Feed with Pagination, Post Creation with Supabase Storage URLs,
Like Toggles, Threaded Comments, and Notifications.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Profile, Post, Like, Comment, Follow, Notification, SavedPost, Conversation, Message
from .serializers import (
    ProfileSerializer,
    ProfileSearchSerializer,
    ProfileRecommendationSerializer,
    PostSerializer,
    PostCreateSerializer,
    CommentSerializer,
    NotificationSerializer,
    ConversationSerializer,
    MessageSerializer,
)
from .pagination import StandardResultsSetPagination


class ProfileViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for User Profiles.
    Supports lookup by UUID (PK) or by username string.
    Optimized with annotate and prefetch_related to prevent N+1 queries.
    """
    queryset = Profile.objects.annotate(
        _followers_count=Count("followers", distinct=True),
        _following_count=Count("following", distinct=True)
    ).prefetch_related("followers", "following", "posts", "settings")
    serializer_class = ProfileSerializer
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ["list", "retrieve", "by_username"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        """
        Allow lookup by UUID primary key OR by username string.
        The router passes the URL segment as `pk`; if it doesn't look like a
        UUID we treat it as a username and filter accordingly.
        """
        pk = self.kwargs.get(self.lookup_field)
        queryset = self.filter_queryset(self.get_queryset())

        # Try UUID lookup first
        try:
            from uuid import UUID as _UUID
            _UUID(str(pk))  # raises ValueError if not a valid UUID
            obj = queryset.filter(pk=pk).first()
        except (ValueError, AttributeError):
            # Treat as username
            obj = queryset.filter(username=pk).first()

        if obj is None:
            from rest_framework.exceptions import NotFound
            raise NotFound(detail=f"Profile '{pk}' not found.")

        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=["get"], url_path=r"by_username/(?P<username>[^/.]+)",
            permission_classes=[permissions.AllowAny])
    def by_username(self, request, username=None):
        """
        Explicit username-based profile lookup: GET /profiles/by_username/<username>/
        Returns 404 if the username does not exist — never falls back to another user.
        """
        if not username:
            return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.filter_queryset(self.get_queryset())
        profile = queryset.filter(username=username).first()

        if not profile:
            return Response(
                {"error": f"Profile with username '{username}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get or update current authenticated user's profile."""
        profile = getattr(request, "profile", None)
        if not profile:
            return Response({"error": "Profile not found for session."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        """Toggle follow/unfollow for target profile."""
        target_profile = self.get_object()
        current_profile = request.profile

        if target_profile.id == current_profile.id:
            return Response({"error": "Cannot follow your own profile."}, status=status.HTTP_400_BAD_REQUEST)

        follow_instance = Follow.objects.filter(follower=current_profile, following=target_profile).first()

        if follow_instance:
            follow_instance.delete()
            return Response({
                "status": "unfollowed",
                "is_following": False,
                "followers_count": target_profile.followers.count(),
            })
        else:
            Follow.objects.create(follower=current_profile, following=target_profile)
            # Create notification for target user
            Notification.objects.create(
                user=target_profile,
                actor=current_profile,
                type="connect_invite",
                content=f"{current_profile.full_name} connected with you.",
            )
            return Response({
                "status": "followed",
                "is_following": True,
                "followers_count": target_profile.followers.count(),
            })

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def search(self, request):
        """
        User Search API endpoint (?q=...).
        Matches profiles by username, full_name, and headline.
        Limits to top 10 results and returns safe profile data (no emails).
        """
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([])

        profiles = Profile.objects.filter(
            Q(username__icontains=query) |
            Q(full_name__icontains=query) |
            Q(headline__icontains=query) |
            Q(industry__icontains=query)
        ).distinct()[:10]

        serializer = ProfileSearchSerializer(profiles, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def recommendations(self, request):
        """
        Recommendation Engine ('People You May Know').
        Analyzes the authenticated user's industry and interests array.
        Returns up to 5 profiles sharing overlapping interests or industry.
        Excludes the current user and any profiles already followed.
        """
        current_user = request.profile
        followed_ids = list(Follow.objects.filter(follower=current_user).values_list("following_id", flat=True))

        user_industry = current_user.industry or "Artificial Intelligence"
        user_interests = current_user.interests if isinstance(current_user.interests, list) else []

        candidates = Profile.objects.exclude(id=current_user.id).exclude(id__in=followed_ids)

        scored = []
        for p in candidates:
            candidate_interests = p.interests if isinstance(p.interests, list) else []
            shared_list = [i for i in user_interests if i in candidate_interests]

            if shared_list:
                shared_label = f"Also interested in {shared_list[0]}"
                score = len(shared_list) * 2
            elif p.industry and p.industry.lower() == user_industry.lower():
                shared_label = f"Also in {p.industry}"
                score = 1
            elif candidate_interests:
                shared_label = f"Specialist in {candidate_interests[0]}"
                score = 1
            else:
                shared_label = "Recommended in Network"
                score = 0

            p.shared_interest = shared_label
            scored.append((score, p))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_profiles = [item[1] for item in scored[:5]]

        serializer = ProfileRecommendationSerializer(top_profiles, many=True, context={"request": request})
        return Response(serializer.data)


class PostViewSet(viewsets.ModelViewSet):
    """
    Feed Generation with pagination, Post Creation (with Supabase Storage URLs),
    and Like Toggles.
    """
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PostCreateSerializer
        return PostSerializer

    def get_queryset(self):
        queryset = Post.objects.select_related("user").prefetch_related(
            "media", "likes", "comments", "comments__user"
        ).annotate(
            _likes_count=Count("likes", distinct=True),
            _comments_count=Count("comments", distinct=True)
        )

        # Optional filtering by user
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Optional filtering by tag
        tag = self.request.query_params.get("tag")
        if tag:
            queryset = queryset.filter(tags__contains=[tag])

        # Optional search query
        q = self.request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) | Q(caption__icontains=q) | Q(user__full_name__icontains=q)
            )

        # Feed ordering / sort
        sort_by = self.request.query_params.get("sort", "recent")
        if sort_by == "top":
            queryset = queryset.annotate(like_count=Count("likes")).order_by("-like_count", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new post with attached Supabase Storage media URLs."""
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()

        # Return full serialized post
        response_serializer = PostSerializer(post, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        """Toggle like state on a post."""
        post = self.get_object()
        current_profile = request.profile

        like_instance = Like.objects.filter(post=post, user=current_profile).first()

        if like_instance:
            like_instance.delete()
            has_liked = False
        else:
            Like.objects.create(post=post, user=current_profile)
            has_liked = True

            # Notify post author if not self
            if post.user_id != current_profile.id:
                Notification.objects.create(
                    user=post.user,
                    actor=current_profile,
                    type="like",
                    content=f"{current_profile.full_name} liked your post.",
                    metadata={"post_id": str(post.id)},
                )

        return Response({
            "has_liked": has_liked,
            "likes_count": post.likes.count(),
        })

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        """Toggle save/bookmark state on a post."""
        post = self.get_object()
        current_profile = request.profile

        saved_instance = SavedPost.objects.filter(post=post, user=current_profile).first()
        if saved_instance:
            saved_instance.delete()
            has_saved = False
        else:
            SavedPost.objects.create(post=post, user=current_profile)
            has_saved = True

        return Response({"has_saved": has_saved})

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def saved(self, request):
        """Retrieve all posts bookmarked by the authenticated user."""
        saved_post_ids = SavedPost.objects.filter(user=request.profile).values_list("post_id", flat=True)
        posts = Post.objects.filter(id__in=saved_post_ids).select_related("user").prefetch_related("media", "likes", "comments").order_by("-created_at")
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        """List or add comments to a specific post."""
        post = self.get_object()

        if request.method == "POST":
            serializer = CommentSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(post=post)

            # Notify post author
            if post.user_id != request.profile.id:
                Notification.objects.create(
                    user=post.user,
                    actor=request.profile,
                    type="comment",
                    content=f"{request.profile.full_name} commented: \"{comment.content[:80]}\"",
                    metadata={"post_id": str(post.id), "comment_id": str(comment.id)},
                )

            return Response(CommentSerializer(comment, context={"request": request}).data, status=status.HTTP_201_CREATED)

        comments = Comment.objects.filter(post=post, parent_comment__isnull=True).select_related("user").order_by("-created_at")
        serializer = CommentSerializer(comments, many=True, context={"request": request})
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    User notifications.
    Supports fetching notifications, marking individual notifications read,
    and bulk marking all as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.profile
        ).select_related("actor", "post", "comment").order_by("-created_at")

    @action(detail=False, methods=["post", "patch"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.profile, is_read=False).update(is_read=True)
        return Response({"status": "all_marked_read", "is_read": True})

    @action(detail=True, methods=["post", "patch"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "marked_read", "is_read": True})


class ConversationViewSet(viewsets.ModelViewSet):
    """
    Direct messaging channels.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.profile
        return Conversation.objects.filter(
            Q(participant_one=user) | Q(participant_two=user)
        ).prefetch_related("messages", "participant_one", "participant_two").order_by("-last_message_time")

    def create(self, request, *args, **kwargs):
        participant_id = request.data.get("participant_id")
        username = request.data.get("username")
        
        target = None
        if participant_id:
            target = Profile.objects.filter(id=participant_id).first()
        elif username:
            target = Profile.objects.filter(username=username).first()

        if not target:
            return Response({"error": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)

        current_user = request.profile
        existing = Conversation.objects.filter(
            (Q(participant_one=current_user) & Q(participant_two=target)) |
            (Q(participant_one=target) & Q(participant_two=current_user))
        ).first()

        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data)

        new_conv = Conversation.objects.create(
            participant_one=current_user,
            participant_two=target,
            last_message="Channel started",
        )
        serializer = self.get_serializer(new_conv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    """
    Direct messages with optional attachment stored in Supabase 'Message' bucket.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.request.query_params.get("conversation_id")
        user = self.request.profile
        qs = Message.objects.filter(
            Q(sender=user) | Q(receiver=user) |
            Q(conversation__participant_one=user) | Q(conversation__participant_two=user)
        )
        if conv_id:
            qs = qs.filter(conversation_id=conv_id)
        return qs.select_related("sender", "receiver").order_by("created_at")

    def perform_create(self, serializer):
        conv_id = self.request.data.get("conversation_id")
        conv = Conversation.objects.filter(id=conv_id).first()
        receiver = None
        if conv:
            receiver = conv.participant_two if conv.participant_one_id == self.request.profile.id else conv.participant_one
            conv.last_message = self.request.data.get("content") or "Sent attachment"
            conv.save()
        serializer.save(
            sender=self.request.profile,
            receiver=receiver,
            bucket=self.request.data.get("bucket", "Message"),
        )

