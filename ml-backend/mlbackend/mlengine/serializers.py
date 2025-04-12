from .models import Videos,EmotionEntry, EmotionResult
from rest_framework import serializers
class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Videos
        fields = ['video_id','user_id','consumer_id','download_address',]

class EmotionEntrySerializer(serializers.Serializer):
    angry = serializers.FloatField()
    disgust = serializers.FloatField()
    fear = serializers.FloatField()
    happy = serializers.FloatField()
    sad = serializers.FloatField()
    surprise = serializers.FloatField()
    neutral = serializers.FloatField()
    frame = serializers.IntegerField()
    time = serializers.FloatField()

class EmotionResultSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    video_id = serializers.CharField()
    emotion = EmotionEntrySerializer(many=True)

    def create(self, validated_data):
        results_objs = [EmotionEntry(**res) for res in validated_data['emotion']]
        emotion_result = EmotionResult(
            user_id=validated_data['user_id'],
            video_id=validated_data['video_id'],
            emotion=results_objs
        )
        emotion_result.save()
        return emotion_result

