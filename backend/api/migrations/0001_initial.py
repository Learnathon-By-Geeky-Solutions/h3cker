import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="last login"
                    ),
                ),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                ("firebase_uid", models.CharField(max_length=128, unique=True)),
                ("email", models.EmailField(max_length=254, unique=True)),
                (
                    "phone_number",
                    models.CharField(blank=True, max_length=20, null=True),
                ),
                ("first_name", models.CharField(blank=True, max_length=30)),
                ("last_name", models.CharField(blank=True, max_length=30)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("admin", "Admin"),
                            ("company", "Company"),
                            ("user", "User"),
                        ],
                        default="user",
                        max_length=10,
                    ),
                ),
                (
                    "date_joined",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "verbose_name": "User",
                "verbose_name_plural": "Users",
                "db_table": "all_users",
            },
        ),
        migrations.CreateModel(
            name="CompanyProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("company_name", models.CharField(max_length=100)),
                ("company_address", models.TextField(blank=True)),
                ("industry", models.CharField(blank=True, max_length=50)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="company_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "company_profiles",
            },
        ),
        migrations.CreateModel(
            name="ViewerProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("onboarding_completed", models.BooleanField(default=False)),
                ("preferences", models.JSONField(blank=True, default=dict)),
                ("birthday", models.DateField(blank=True, null=True)),
                ("gender", models.CharField(blank=True, max_length=50)),
                ("country", models.CharField(blank=True, max_length=100)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("education_level", models.CharField(blank=True, max_length=100)),
                ("occupation", models.CharField(blank=True, max_length=100)),
                ("content_preferences", models.JSONField(blank=True, default=dict)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="viewer_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "viewer_profiles",
            },
        ),
    ]
