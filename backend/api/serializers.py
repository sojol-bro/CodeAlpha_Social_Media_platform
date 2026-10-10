"""
Serializers for Nexus Network REST API.
"""
from rest_framework import serializers
from .models import Profile, Post, PostMedia, Like, Comment, Follow, Notification, SavedPost, Conversation, Message


class ProfileSerializer(serializers.ModelSerializer):
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "full_name",
            "headline",
            "bio",
            "avatar_url",
            "website",
            "location",
            "industry",
            "interests",
            "is_private",
            "followers_count",
            "following_count",
            "is_following",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return Follow.objects.filter(follower_id=request.user.id, following=obj).exists()
        return False


class ProfileSearchSerializer(serializers.ModelSerializer):
    """
    Sanitized profile serializer for User Search & Autocomplete.
    Guarantees no sensitive data (emails, private settings) is leaked.
    """
    followers_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "full_name",
            "headline",
            "avatar_url",
            "location",
            "industry",
            "interests",
            "followers_count",
            "is_following",
        ]

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return Follow.objects.filter(follower_id=request.user.id, following=obj).exists()
        return False


class ProfileRecommendationSerializer(serializers.ModelSerializer):
    """
    Serializer for 'People You May Know' recommendation engine.
    Annotates the primary shared interest or industry overlap.
    """
    followers_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()
    shared_interest = serializers.CharField(read_only=True, default="Similar Technical Focus")

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "full_name",
            "headline",
            "avatar_url",
            "location",
            "industry",
            "interests",
            "followers_count",
            "is_following",
            "shared_interest",
        ]

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return Follow.objects.filter(follower_id=request.user.id, following=obj).exists()
        return False


class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = ["id", "media_url", "media_type", "position_index", "created_at"]


class RecursiveCommentSerializer(serializers.Serializer):
    def to_representation(self, value):
        serializer = self.parent.parent.__class__(value, context=self.context)
        return serializer.data


class CommentSerializer(serializers.ModelSerializer):
    user = ProfileSerializer(read_only=True)
    replies = RecursiveCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "user",
            "parent_comment",
            "content",
            "replies",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["user"] = request.profile
        return super().create(validated_data)


class PostSerializer(serializers.ModelSerializer):
    user = ProfileSerializer(read_only=True)
    media = PostMediaSerializer(many=True, read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    has_liked = serializers.SerializerMethodField()
    has_saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "user",
            "title",
            "caption",
            "location",
            "tags",
            "post_type",
            "metadata",
            "media",
            "likes_count",
            "comments_count",
            "has_liked",
            "has_saved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def get_has_liked(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user_id=request.user.id).exists()
        return False

    def get_has_saved(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return SavedPost.objects.filter(post=obj, user_id=request.user.id).exists()
        return False


class PostCreateSerializer(serializers.ModelSerializer):
    media_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
        help_text="List of media objects: {'media_url': str, 'media_type': str, 'position_index': int}"
    )

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "caption",
            "location",
            "tags",
            "post_type",
            "metadata",
            "media_items",
        ]

    def create(self, validated_data):
        media_items = validated_data.pop("media_items", [])
        request = self.context.get("request")
        validated_data["user"] = request.profile

        post = Post.objects.create(**validated_data)

        for index, item in enumerate(media_items):
            PostMedia.objects.create(
                post=post,
                media_url=item.get("media_url"),
                media_type=item.get("media_type", "image"),
                position_index=item.get("position_index", index),
            )

        return post


class NotificationSerializer(serializers.ModelSerializer):
    actor = ProfileSearchSerializer(read_only=True)
    post_id = serializers.UUIDField(source="post.id", read_only=True, allow_null=True)
    comment_id = serializers.UUIDField(source="comment.id", read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "actor",
            "post_id",
            "comment_id",
            "type",
            "content",
            "metadata",
            "is_read",
            "created_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer(read_only=True)
    is_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "receiver",
            "content",
            "media_url",
            "media_type",
            "media_name",
            "media_size",
            "bucket",
            "is_read",
            "is_current_user",
            "created_at",
        ]

    def get_is_current_user(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "profile"):
            return obj.sender_id == request.profile.id
        return False


class ConversationSerializer(serializers.ModelSerializer):
    participant = serializers.SerializerMethodField()
    messages = MessageSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "participant",
            "last_message",
            "last_message_time",
            "unread_count",
            "messages",
            "created_at",
        ]

    def get_participant(self, obj):
        request = self.context.get("request")
        current_user_id = getattr(request, "profile", None)
        if current_user_id and obj.participant_one_id == current_user_id.id:
            return ProfileSerializer(obj.participant_two).data
        return ProfileSerializer(obj.participant_one).data

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request and hasattr(request, "profile"):
            return obj.messages.filter(receiver=request.profile, is_read=False).count()
        return 0
