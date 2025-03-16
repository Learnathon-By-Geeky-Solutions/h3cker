from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, CompanyProfile, ViewerProfile

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

admin.site.register(CompanyProfile)
admin.site.register(ViewerProfile)