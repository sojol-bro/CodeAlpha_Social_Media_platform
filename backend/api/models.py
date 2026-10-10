"""
Database models for Nexus Network.
Maps to Supabase PostgreSQL schema with managed = False or explicit db_table definitions.
"""
import uuid
from django.db import models


class Profile(models.Model):
    """
    Profile model matching public.profiles in Supabase.
    Primary key mirrors Supabase auth.users UUID.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255)
    headline = models.CharField(max_length=300, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    avatar_url = models.URLField(max_length=1000, blank=True, null=True)
    website = models.URLField(max_length=500, blank=True, null=True)
    location = models.CharField(max_length=200, default="San Francisco Bay Area", blank=True, null=True)
    industry = models.CharField(max_length=200, default="Artificial Intelligence", blank=True, null=True)
    interests = models.JSONField(default=list, blank=True)
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} (@{self.username})"

    @property
    def followers_count(self):
        return self.followers.count()

    @property
    def following_count(self):
        return self.following.count()


class UserSettings(models.Model):
    user = models.OneToOneField(Profile, on_delete=models.CASCADE, primary_key=True, related_name="settings")
    theme = models.CharField(max_length=30, default="light")
    notifications_enabled = models.BooleanField(default=True)
    show_activity_status = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_settings"


class Post(models.Model):
    """
    Post model matching public.posts in Supabase.
    Supports technical insights, benchmark summaries, and research documents.
    """
    POST_TYPES = (
        ("standard", "Standard Update"),
        ("benchmark", "Benchmark Analysis"),
        ("research", "Research Paper"),
        ("article", "Long-form Article"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="posts")
    title = models.CharField(max_length=300, blank=True, null=True)
    caption = models.TextField()
    location = models.CharField(max_length=200, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    post_type = models.CharField(max_length=50, choices=POST_TYPES, default="standard")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "posts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post by {self.user.username} at {self.created_at}"

    @property
    def likes_count(self):
        return self.likes.count()

    @property
    def comments_count(self):
        return self.comments.count()


class PostMedia(models.Model):
    """
    Media attachments stored in Supabase Storage buckets (nexus-media).
    """
    MEDIA_TYPES = (
        ("image", "Image"),
        ("video", "Video"),
        ("document", "Document / PDF"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="media")
    media_url = models.URLField(max_length=1500)
    media_type = models.CharField(max_length=50, choices=MEDIA_TYPES, default="image")
    position_index = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "post_media"
        ordering = ["position_index"]


class Like(models.Model):
    """
    Likes linking profiles and posts.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="likes_given")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "likes"
        unique_together = ("post", "user")


class Comment(models.Model):
    """
    Threaded comments on posts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="comments")
    parent_comment = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]


class Follow(models.Model):
    """
    Follower relationships between profiles.
    """
    follower = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="followers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "follows"
        unique_together = ("follower", "following")


class SavedPost(models.Model):
    """
    Saved / Bookmarked posts.
    """
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="saved_posts")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_posts"
        unique_together = ("user", "post")


class Notification(models.Model):
    """
    User notifications (mentions, endorsements, profile views, reposts, opportunities).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications_caused")
    post = models.ForeignKey("Post", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    comment = models.ForeignKey("Comment", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    type = models.CharField(max_length=50)
    content = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]


class Conversation(models.Model):
    """
    Direct messaging channel between two network members.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant_one = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="conversations_started")
    participant_two = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="conversations_received")
    last_message = models.TextField(blank=True, null=True)
    last_message_time = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-last_message_time"]


class Message(models.Model):
    """
    Encrypted direct message with optional media attachment stored in Supabase 'Message' bucket.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="messages_sent")
    receiver = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="messages_received", null=True, blank=True)
    content = models.TextField(blank=True)
    media_url = models.URLField(max_length=1500, blank=True, null=True)
    media_type = models.CharField(max_length=50, blank=True, null=True)
    media_name = models.CharField(max_length=255, blank=True, null=True)
    media_size = models.CharField(max_length=50, blank=True, null=True)
    bucket = models.CharField(max_length=100, default="Message")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

