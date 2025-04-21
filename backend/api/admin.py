from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, CompanyProfile, ViewerProfile, Video, VideoView, VideoLike, VideoShare

class CompanyProfileInline(admin.StackedInline):
    model = CompanyProfile
    can_delete = False

class ViewerProfileInline(admin.StackedInline):
    model = ViewerProfile
    can_delete = False

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = (
        (None, {'fields': ('firebase_uid', 'email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('firebase_uid', 'email', 'password1', 'password2', 'role'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    def get_inlines(self, request, obj=None):
        if obj:
            if obj.role == 'company':
                return [CompanyProfileInline]
            elif obj.role == 'user':
                return [ViewerProfileInline]
        return []

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'uploader', 'visibility', 'views', 'likes', 'upload_date')
    list_filter = ('visibility', 'upload_date')
    search_fields = ('title', 'description', 'uploader__email')
    readonly_fields = ('views', 'likes')
    fieldsets = (
        (None, {'fields': ('title', 'description', 'category', 'visibility', 'uploader')}),
        ('Media', {'fields': ('video_url', 'thumbnail_url', 'duration')}),
        ('Stats', {'fields': ('views', 'likes')}),
        ('Limits', {'fields': ('view_limit', 'auto_private_after')}),
    )

@admin.register(VideoView)
class VideoViewAdmin(admin.ModelAdmin):
    list_display = ('video', 'viewer', 'viewed_at')
    list_filter = ('viewed_at',)
    search_fields = ('video__title', 'viewer__email')
    readonly_fields = ('viewed_at',)

@admin.register(VideoLike)
class VideoLikeAdmin(admin.ModelAdmin):
    list_display = ('video', 'user', 'liked_at')
    list_filter = ('liked_at',)
    search_fields = ('video__title', 'user__email')
    readonly_fields = ('liked_at',)

@admin.register(VideoShare)
class VideoShareAdmin(admin.ModelAdmin):
    list_display = ('video', 'created_by', 'share_token', 'access_count', 'active')
    list_filter = ('active', 'created_at')
    search_fields = ('video__title', 'created_by__email', 'share_token')
    readonly_fields = ('created_at', 'share_token')

admin.site.register(CompanyProfile)
admin.site.register(ViewerProfile)