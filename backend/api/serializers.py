from django.contrib.auth.models import User
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'Password']
        extra_kwargs = {'Password': {'write_only': True, 'required': True}}