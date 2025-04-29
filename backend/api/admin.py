from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpResponse
from django.utils import timezone
import csv
from api.models import (
    User,
    CompanyProfile,
    ViewerProfile,
    Video,
    VideoView,
    VideoLike,
    VideoShare,
)
from api.utils import should_make_private, make_video_private


class CompanyProfileInline(admin.StackedInline):
    model = CompanyProfile
    can_delete = False


class ViewerProfileInline(admin.StackedInline):
    model = ViewerProfile
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    fieldsets = (
        (None, {"fields": ("firebase_uid", "email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        ("Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("firebase_uid", "email", "password1", "password2", "role"),
            },
        ),
    )
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)

    def get_inlines(self, request, obj=None):
        if obj:
            if obj.role == "company":
                return [CompanyProfileInline]
            elif obj.role == "user":
                return [ViewerProfileInline]
        return []


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ("title", "uploader", "visibility", "views", "likes", "upload_date")
    list_filter = ("visibility", "upload_date", "category")
    search_fields = ("title", "description", "uploader__email")
    readonly_fields = ("views", "likes")
    actions = [
        "make_videos_private",
        "make_videos_public",
        "reset_video_statistics",
        "create_new_share_links",
        "check_privacy_limits",
        "export_video_data",
    ]
    list_per_page = 25
    date_hierarchy = "upload_date"
    fieldsets = (
        (
            None,
            {"fields": ("title", "description", "category", "visibility", "uploader")},
        ),
        ("Media", {"fields": ("video_url", "thumbnail_url", "duration")}),
        ("Stats", {"fields": ("views", "likes")}),
        ("Limits", {"fields": ("view_limit", "auto_private_after")}),
    )

    def make_videos_private(self, request, queryset):
        updated = queryset.update(visibility="private")
        self.message_user(
            request, f"{updated} videos were successfully marked as private."
        )

    make_videos_private.short_description = "Mark selected videos as private"

    def make_videos_public(self, request, queryset):
        updated = queryset.update(visibility="public")
        self.message_user(
            request, f"{updated} videos were successfully marked as public."
        )

    make_videos_public.short_description = "Mark selected videos as public"

    def reset_video_statistics(self, request, queryset):
        updated = queryset.update(views=0, likes=0)
        # Also delete related views and likes
        for video in queryset:
            VideoView.objects.filter(video=video).delete()
            VideoLike.objects.filter(video=video).delete()
        self.message_user(request, f"Statistics for {updated} videos were reset.")

    reset_video_statistics.short_description = (
        "Reset views and likes for selected videos"
    )

    def create_new_share_links(self, request, queryset):
        count = 0
        for video in queryset:
            VideoShare.objects.create(
                video=video, created_by=request.user, created_at=timezone.now()
            )
            count += 1
        self.message_user(request, f"Created {count} new share links.")

    create_new_share_links.short_description = (
        "Generate new share links for selected videos"
    )

    def check_privacy_limits(self, request, queryset):
        count = 0
        for video in queryset:
            if should_make_private(video):
                make_video_private(video)
                count += 1
        self.message_user(request, f"{count} videos were made private due to limits.")

    check_privacy_limits.short_description = "Check and update privacy based on limits"

    def export_video_data(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="videos.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "ID",
                "Title",
                "Uploader",
                "Category",
                "Visibility",
                "Views",
                "Likes",
                "Upload Date",
                "Duration",
                "View Limit",
            ]
        )

        for video in queryset:
            writer.writerow(
                [
                    video.id,
                    video.title,
                    video.uploader.email,
                    video.category,
                    video.visibility,
                    video.views,
                    video.likes,
                    video.upload_date.strftime("%Y-%m-%d %H:%M"),
                    video.duration,
                    video.view_limit or "No limit",
                ]
            )

        return response

    export_video_data.short_description = "Export selected videos to CSV"


@admin.register(VideoView)
class VideoViewAdmin(admin.ModelAdmin):
    list_display = ("video", "viewer", "viewed_at")
    list_filter = ("viewed_at",)
    search_fields = ("video__title", "viewer__email")
    readonly_fields = ("viewed_at",)


@admin.register(VideoLike)
class VideoLikeAdmin(admin.ModelAdmin):
    list_display = ("video", "user", "liked_at")
    list_filter = ("liked_at",)
    search_fields = ("video__title", "user__email")
    readonly_fields = ("liked_at",)


@admin.register(VideoShare)
class VideoShareAdmin(admin.ModelAdmin):
    list_display = ("video", "created_by", "share_token", "access_count", "active")
    list_filter = ("active", "created_at")
    search_fields = ("video__title", "created_by__email", "share_token")
    readonly_fields = ("created_at", "share_token")
    actions = ["activate_shares", "deactivate_shares", "reset_access_count"]

    def activate_shares(self, request, queryset):
        updated = queryset.update(active=True)
        self.message_user(request, f"{updated} share links were activated.")

    activate_shares.short_description = "Activate selected share links"

    def deactivate_shares(self, request, queryset):
        updated = queryset.update(active=False)
        self.message_user(request, f"{updated} share links were deactivated.")

    deactivate_shares.short_description = "Deactivate selected share links"

    def reset_access_count(self, request, queryset):
        updated = queryset.update(access_count=0)
        self.message_user(request, f"Access count reset for {updated} share links.")

    reset_access_count.short_description = "Reset access count for selected share links"


admin.site.register(CompanyProfile)
admin.site.register(ViewerProfile)
